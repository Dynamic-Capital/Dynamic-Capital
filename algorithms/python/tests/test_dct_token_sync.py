from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Mapping, Sequence, Tuple

import pytest

from algorithms.python.dct_token_sync import (
    DCTAllocationEngine,
    DCTAllocationRule,
    DCTMarketSnapshot,
    DCTPriceCalculator,
    DCTPriceInputs,
    DCTProductionInputs,
    DCTProductionPlan,
    DCTProductionPlanner,
    DCTLLMAdjustment,
    DCTLLMOptimisationResult,
    DCTMultiLLMOptimiser,
    DCTSyncJob,
)
from algorithms.python.supabase_sync import SupabaseTableWriter
from algorithms.python.multi_llm import LLMConfig



class _StubLLMClient:
    def __init__(self, responses: Sequence[str]) -> None:
        self.responses = list(responses)
        self.calls: list[Dict[str, Any]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self.responses:
            return ""
        return self.responses.pop(0)


class _StubWriter(SupabaseTableWriter):
    def __init__(self) -> None:
        super().__init__(table="test", conflict_column="id")
        self.rows: list[dict[str, object]] = []

    def upsert(self, rows: list[dict[str, object]]) -> int:  # type: ignore[override]
        self.rows.extend(rows)
        return len(rows)


def test_price_calculation_balances_components() -> None:
    calculator = DCTPriceCalculator(
        baseline_price=1.0,
        ton_weight=0.4,
        demand_weight=0.2,
        performance_weight=0.25,
        volatility_weight=0.15,
        policy_sensitivity=0.1,
        min_price=0.8,
        max_price=2.0,
        volatility_floor=0.25,
    )
    breakdown = calculator.compute(
        DCTPriceInputs(
            ton_price_usd=2.3,
            trailing_ton_price_usd=2.0,
            demand_index=0.7,
            performance_index=0.65,
            volatility_index=0.35,
            policy_adjustment=0.5,
        )
    )
    assert pytest.approx(breakdown.final_price, rel=1e-4) == 1.25
    assert breakdown.final_price <= 2.0
    assert breakdown.final_price >= 0.8
    assert breakdown.volatility_penalty > 0


def test_production_planner_applies_smoothing_and_caps() -> None:
    planner = DCTProductionPlanner(emission_cap_ratio=0.02, smoothing_factor=0.6)
    plan = planner.plan(
        DCTProductionInputs(
            usd_budget=120_000,
            circulating_supply=5_000_000,
            previous_epoch_mint=150_000,
            buffer_ratio=0.1,
            max_emission=None,
        ),
        final_price=1.2,
    )
    assert pytest.approx(plan.target_mint, rel=1e-4) == 100000
    assert pytest.approx(plan.buffered_mint, rel=1e-4) == 110000
    assert plan.final_mint <= plan.cap
    assert plan.cap_applied


def test_production_plan_scale_respects_cap_and_factor() -> None:
    plan = DCTProductionPlan(
        target_mint=100_000,
        buffered_mint=110_000,
        smoothed_mint=95_000,
        final_mint=90_000,
        cap=92_000,
        cap_applied=True,
    )

    scaled_down = plan.scale(0.5)
    assert pytest.approx(scaled_down.target_mint, rel=1e-6) == 50_000
    assert pytest.approx(scaled_down.smoothed_mint, rel=1e-6) == 47_500
    assert pytest.approx(scaled_down.final_mint, rel=1e-6) == 47_500
    assert not scaled_down.cap_applied

    scaled_up = plan.scale(1.2)
    assert pytest.approx(scaled_up.target_mint, rel=1e-6) == 120_000
    assert pytest.approx(scaled_up.smoothed_mint, rel=1e-6) == 114_000
    assert pytest.approx(scaled_up.final_mint, rel=1e-6) == plan.cap
    assert scaled_up.cap_applied


def test_allocation_engine_respects_weights_and_multipliers() -> None:
    engine = DCTAllocationEngine(
        rules=[
            DCTAllocationRule("VIP", weight=3, multiplier=1.2, member_count=50),
            DCTAllocationRule("Labs", weight=2, multiplier=0.8, member_count=20),
            DCTAllocationRule("Treasury", weight=5, multiplier=1.0),
        ]
    )
    allocations = engine.distribute(100_000)
    assert len(allocations) == 3
    vip = allocations[0]
    labs = allocations[1]
    treasury = allocations[2]
    assert pytest.approx(vip.adjusted_allocation, rel=1e-4) == 36_000
    assert pytest.approx(labs.adjusted_allocation, rel=1e-4) == 16_000
    assert pytest.approx(treasury.adjusted_allocation, rel=1e-4) == 50_000
    assert pytest.approx(vip.per_member or 0.0, rel=1e-4) == 720


def test_allocation_engine_scales_when_minimums_exceed_budget() -> None:
    engine = DCTAllocationEngine(
        rules=[
            DCTAllocationRule("VIP", weight=3, multiplier=1.0, min_allocation=80_000),
            DCTAllocationRule("Labs", weight=2, multiplier=1.0, min_allocation=40_000),
        ]
    )
    allocations = engine.distribute(100_000)
    assert len(allocations) == 2
    total_base = sum(entry.base_allocation for entry in allocations)
    assert total_base == pytest.approx(100_000, rel=1e-6)
    vip_allocation, labs_allocation = allocations
    expected_vip = 100_000 * (80_000 / 120_000)
    expected_labs = 100_000 * (40_000 / 120_000)
    assert vip_allocation.base_allocation == pytest.approx(expected_vip, rel=1e-6)
    assert labs_allocation.base_allocation == pytest.approx(expected_labs, rel=1e-6)


def test_sync_job_compiles_payload_and_writes_to_supabase() -> None:
    calculator = DCTPriceCalculator()
    planner = DCTProductionPlanner()
    engine = DCTAllocationEngine(
        [
            DCTAllocationRule("VIP", weight=2, multiplier=1.1, member_count=20),
            DCTAllocationRule("Treasury", weight=3, multiplier=1.0),
        ]
    )
    writer = _StubWriter()
    job = DCTSyncJob(calculator, planner, engine, writer)

    snapshot = DCTMarketSnapshot(
        as_of=datetime(2024, 5, 1, 12, 0, tzinfo=timezone.utc),
        ton_price_usd=2.4,
        trailing_ton_price_usd=2.0,
        demand_index=0.65,
        performance_index=0.6,
        volatility_index=0.3,
        policy_adjustment=0.2,
        usd_reward_budget=50_000,
        previous_epoch_mint=20_000,
        circulating_supply=1_000_000,
        buffer_ratio=0.05,
        max_emission=None,
    )

    rows_written = job.run(snapshot)
    assert rows_written == 1
    assert writer.rows
    payload = writer.rows[0]
    assert payload["price"] == pytest.approx(payload["price_components"]["final_price"], rel=1e-6)  # type: ignore[index]
    allocations = payload["allocations"]  # type: ignore[index]
    assert len(allocations) == 2
    vip_allocation = allocations[0]
    assert vip_allocation["label"] == "VIP"  # type: ignore[index]
    assert vip_allocation["per_member"] is not None  # type: ignore[index]



def test_multi_llm_optimiser_aggregates_responses() -> None:
    snapshot = DCTMarketSnapshot(
        as_of=datetime(2024, 6, 1, 15, 0, tzinfo=timezone.utc),
        ton_price_usd=2.6,
        trailing_ton_price_usd=2.4,
        demand_index=0.7,
        performance_index=0.62,
        volatility_index=0.28,
        policy_adjustment=0.15,
        usd_reward_budget=120_000,
        previous_epoch_mint=40_000,
        circulating_supply=1_500_000,
        buffer_ratio=0.08,
        max_emission=None,
    )
    rules = [
        DCTAllocationRule("VIP", weight=3, multiplier=1.1, member_count=30),
        DCTAllocationRule("Treasury", weight=2, multiplier=1.0),
    ]

    response_one = json.dumps(
        {
            "policy_adjustment_delta": 0.1,
            "demand_multiplier": 1.1,
            "performance_multiplier": 0.9,
            "volatility_multiplier": 0.95,
            "allocation_overrides": {"VIP": 1.25, "Treasury": 0.9},
            "notes": ["Boost VIP rewards"],
        }
    )
    response_two = json.dumps(
        {
            "policy_adjustment_delta": 0.0,
            "demand_multiplier": 1.05,
            "performance_multiplier": 1.1,
            "volatility_multiplier": 0.85,
            "allocation_overrides": [{"label": "VIP", "multiplier": 1.15}],
            "notes": ["Reduce treasury drift"],
        }
    )

    client_one = _StubLLMClient([response_one])
    client_two = _StubLLMClient([response_two])
    config_one = LLMConfig(name="treasury", client=client_one, temperature=0.2, nucleus_p=0.9, max_tokens=256)
    config_two = LLMConfig(name="growth", client=client_two, temperature=0.25, nucleus_p=0.85, max_tokens=256)

    optimiser = DCTMultiLLMOptimiser(
        models=[config_one, config_two], multiplier_upper_bound=1.4, enable_agents=False
    )
    result = optimiser.optimise(snapshot, rules)

    assert isinstance(result, DCTLLMOptimisationResult)
    assert len(result.runs) == 2
    assert "Dynamic Capital Token" in client_one.calls[0]["prompt"]
    assert "allocation" in client_two.calls[0]["prompt"].lower()
    assert pytest.approx(result.adjustment.policy_adjustment_delta, rel=1e-6) == 0.05
    assert pytest.approx(result.adjustment.demand_index_multiplier, rel=1e-6) == 1.075
    assert pytest.approx(result.adjustment.performance_index_multiplier, rel=1e-6) == 1.0
    assert pytest.approx(result.adjustment.volatility_index_multiplier, rel=1e-6) == 0.9
    assert result.adjustment.allocation_multipliers["VIP"] == pytest.approx(1.2, rel=1e-6)
    assert result.adjustment.allocation_multipliers["Treasury"] == pytest.approx(0.9, rel=1e-6)
    assert set(result.notes) == {"Boost VIP rewards", "Reduce treasury drift"}
    assert result.serialised_runs() is not None


def test_multi_llm_optimiser_applies_agent_guidance() -> None:
    snapshot = DCTMarketSnapshot(
        as_of=datetime(2024, 6, 15, 9, 0, tzinfo=timezone.utc),
        ton_price_usd=2.5,
        trailing_ton_price_usd=2.3,
        demand_index=0.68,
        performance_index=0.6,
        volatility_index=0.35,
        policy_adjustment=0.2,
        usd_reward_budget=90_000,
        previous_epoch_mint=25_000,
        circulating_supply=1_250_000,
        buffer_ratio=0.07,
        max_emission=None,
    )
    rules = [
        DCTAllocationRule("VIP", weight=3, multiplier=1.2, member_count=40),
        DCTAllocationRule("Treasury", weight=2, multiplier=1.0),
    ]

    response = json.dumps(
        {
            "policy_adjustment_delta": 0.3,
            "demand_multiplier": 1.2,
            "performance_multiplier": 1.1,
            "volatility_multiplier": 0.85,
            "allocation_overrides": {"VIP": 1.3},
        }
    )

    agent_calls: list[Mapping[str, Any]] = []

    def agent_runner(context: Mapping[str, Any]) -> Mapping[str, Any]:
        agent_calls.append(context)
        return {
            "decision": {"action": "SELL", "confidence": 0.35},
            "agents": {
                "risk": {
                    "confidence": 0.25,
                    "escalations": ["treasury_utilisation"],
                }
            },
        }

    client = _StubLLMClient([response])
    config = LLMConfig(name="policy", client=client, temperature=0.2, nucleus_p=0.85, max_tokens=256)

    optimiser = DCTMultiLLMOptimiser(models=[config], agent_runner=agent_runner)
    result = optimiser.optimise(snapshot, rules)

    assert agent_calls, "Agent runner should receive context"
    context = agent_calls[0]
    assert "research_payload" in context
    assert "market_payload" in context
    assert "risk_payload" in context

    assert isinstance(result.agent_cycle, Mapping)
    assert result.agent_cycle["decision"]["action"] == "SELL"
    assert result.adjustment.policy_adjustment_delta <= 0.0
    assert result.adjustment.demand_index_multiplier <= 1.0
    assert result.adjustment.allocation_multipliers["VIP"] <= 1.0
    assert any(note.startswith("Agent decision") for note in result.notes)
    assert result.agent_production_scale < 1.0
    assert result.agent_summary is not None
    assert pytest.approx(
        result.agent_summary["production_scale"], rel=1e-6
    ) == result.agent_production_scale
    risk_summary = result.agent_summary.get("risk", {})  # type: ignore[index]
    assert "escalations" in risk_summary


def test_sync_job_includes_llm_adjustments() -> None:
    calculator = DCTPriceCalculator()
    planner = DCTProductionPlanner()
    engine = DCTAllocationEngine(
        [
            DCTAllocationRule("VIP", weight=2, multiplier=1.0, member_count=25),
            DCTAllocationRule("Treasury", weight=3, multiplier=1.0),
        ]
    )
    writer = _StubWriter()

    class _StubOptimiser:
        def __init__(self) -> None:
            self.calls: list[Tuple[DCTMarketSnapshot, Tuple[DCTAllocationRule, ...]]] = []

        def optimise(
            self,
            snapshot: DCTMarketSnapshot,
            rules: Sequence[DCTAllocationRule],
        ) -> DCTLLMOptimisationResult:
            self.calls.append((snapshot, tuple(rules)))
            adjustment = DCTLLMAdjustment(
                policy_adjustment_delta=0.2,
                demand_index_multiplier=1.1,
                performance_index_multiplier=1.0,
                volatility_index_multiplier=0.9,
                allocation_multipliers={"VIP": 1.25},
                index_lower_bound=0.0,
                index_upper_bound=1.5,
                policy_lower_bound=-1.0,
                policy_upper_bound=1.0,
            )
            return DCTLLMOptimisationResult(
                adjustment=adjustment,
                runs=(),
                recommendations=({"notes": ["Boost VIP rewards"]},),
                notes=("Boost VIP rewards",),
                agent_cycle={"decision": {"action": "HOLD", "confidence": 0.5}},
                agent_summary={
                    "decision": {"action": "HOLD", "confidence": 0.5},
                    "production_scale": 0.75,
                },
                agent_production_scale=0.75,
            )

    optimiser = _StubOptimiser()
    job = DCTSyncJob(calculator, planner, engine, writer, optimizer=optimiser)

    snapshot = DCTMarketSnapshot(
        as_of=datetime(2024, 7, 1, 10, 0, tzinfo=timezone.utc),
        ton_price_usd=2.2,
        trailing_ton_price_usd=2.0,
        demand_index=0.6,
        performance_index=0.58,
        volatility_index=0.32,
        policy_adjustment=0.1,
        usd_reward_budget=80_000,
        previous_epoch_mint=30_000,
        circulating_supply=1_200_000,
        buffer_ratio=0.05,
        max_emission=None,
    )

    rows_written = job.run(snapshot)
    assert rows_written == 1
    assert optimiser.calls

    payload = writer.rows[0]
    expected_adjustment = DCTLLMAdjustment(
        policy_adjustment_delta=0.2,
        demand_index_multiplier=1.1,
        performance_index_multiplier=1.0,
        volatility_index_multiplier=0.9,
        allocation_multipliers={"VIP": 1.25},
        index_lower_bound=0.0,
        index_upper_bound=1.5,
        policy_lower_bound=-1.0,
        policy_upper_bound=1.0,
    )
    adjusted_inputs = expected_adjustment.apply_to_price_inputs(snapshot.price_inputs())
    adjusted_breakdown = calculator.compute(adjusted_inputs)
    expected_plan = planner.plan(snapshot.production_inputs(), adjusted_breakdown.final_price)
    expected_smoothed = expected_plan.smoothed_mint * 0.75
    expected_final = min(expected_smoothed, expected_plan.cap)

    assert "llm_adjustment" in payload
    assert payload["llm_adjustment"]["allocation_multipliers"]["VIP"] == pytest.approx(1.25, rel=1e-6)
    allocations = payload["allocations"]  # type: ignore[index]
    vip_allocation = next(entry for entry in allocations if entry["label"] == "VIP")
    assert pytest.approx(vip_allocation["multiplier"], rel=1e-6) == 1.25
    assert "llm_notes" in payload
    assert payload["llm_notes"][0] == "Boost VIP rewards"
    assert payload["llm_recommendations"][0]["notes"][0] == "Boost VIP rewards"
    assert payload["llm_agent_cycle"]["decision"]["action"] == "HOLD"
    assert payload["llm_agent_summary"]["production_scale"] == pytest.approx(0.75, rel=1e-6)
    assert payload["llm_agent_production_scale"] == pytest.approx(0.75, rel=1e-6)
    assert payload["production_plan"]["smoothed_mint"] == pytest.approx(expected_smoothed, rel=1e-6)
    assert payload["production_plan"]["final_mint"] == pytest.approx(expected_final, rel=1e-6)
