"""Tests for the Dynamic Capital Token orchestration engine."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.dct_token_sync import (
    DCTAllocationEngine,
    DCTAllocationRule,
    DCTLLMAdjustment,
    DCTLLMOptimisationResult,
    DCTMarketSnapshot,
    DCTPriceInputs,
    DCTProductionInputs,
    DCTProductionPlanner,
)

from dynamic.platform.token.engine import (
    DCTCommitteeSignals,
    DynamicCapitalTokenEngine,
    committee_signals_from_optimisation,
)
from dynamic.platform.token.treasury import DynamicTreasuryAlgo


class _TradeResult:
    retcode = 10009
    profit = 250.0


def _build_snapshot() -> DCTMarketSnapshot:
    return DCTMarketSnapshot(
        as_of=datetime(2024, 1, 1, tzinfo=timezone.utc),
        ton_price_usd=2.4,
        trailing_ton_price_usd=2.0,
        demand_index=0.6,
        performance_index=0.7,
        volatility_index=0.3,
        policy_adjustment=0.1,
        usd_reward_budget=50_000.0,
        previous_epoch_mint=10_000.0,
        circulating_supply=12_000_000.0,
    )


def test_engine_orchestrates_pricing_production_and_treasury() -> None:
    snapshot = _build_snapshot()
    rules = (
        DCTAllocationRule("Stakers", weight=3, member_count=300),
        DCTAllocationRule("Ecosystem", weight=2),
    )

    engine = DynamicCapitalTokenEngine(
        allocation_rules=rules,
        treasury_starting_balance=50_000.0,
    )

    signals = DCTCommitteeSignals(
        adjustment=DCTLLMAdjustment(
            policy_adjustment_delta=0.1,
            demand_index_multiplier=1.2,
            allocation_multipliers={"Ecosystem": 1.1},
        ),
        production_scale=0.8,
        notes=("Boost staking rewards",),
    )

    report = engine.orchestrate(
        snapshot,
        signals=signals,
        trade_result=_TradeResult(),
    )

    assert report.price_breakdown.final_price == pytest.approx(1.275, rel=1e-6)
    assert report.effective_plan.final_mint == pytest.approx(24211.764706, rel=1e-6)
    assert len(report.allocations) == 2
    assert report.allocations[0].adjusted_allocation == pytest.approx(
        13968.325791, rel=1e-6
    )
    assert report.allocations[0].per_member == pytest.approx(46.561085, rel=1e-6)
    assert report.allocations[1].adjusted_allocation == pytest.approx(
        10243.438914, rel=1e-6
    )
    assert report.treasury_event is not None
    assert report.treasury_event.burned == pytest.approx(50.0)
    assert report.treasury_event.rewards_distributed == pytest.approx(75.0)
    assert report.treasury_event.profit_retained == pytest.approx(125.0)
    assert report.treasury_event.loss_covered == pytest.approx(0.0)
    assert report.treasury_balance_before == pytest.approx(50_000.0)
    assert report.treasury_balance_after == pytest.approx(50_125.0)
    assert "Boost staking rewards" in report.notes
    assert any("Scaled allocations down" in note for note in report.notes)
    assert report.allocation_total == pytest.approx(
        report.effective_plan.final_mint, rel=1e-6
    )

    payload = report.to_dict()
    assert payload["price"] == pytest.approx(report.price_breakdown.final_price)
    assert payload["treasury_event"]["burned"] == pytest.approx(50.0)
    assert payload["treasury_balance_after"] == pytest.approx(50_125.0)
    assert payload["notes"][-1].startswith("Scaled allocations down")


def test_committee_signals_helper_converts_llm_results() -> None:
    adjustment = DCTLLMAdjustment(
        policy_adjustment_delta=0.05,
        demand_index_multiplier=1.1,
        allocation_multipliers={"Ops": 0.9},
    )
    optimisation = DCTLLMOptimisationResult(
        adjustment=adjustment,
        notes=("Alpha", "Beta"),
        recommendations=({"foo": "bar"},),
        agent_cycle={"step": 1},
        agent_summary={"status": "ok"},
        agent_production_scale=1.15,
    )

    signals = committee_signals_from_optimisation(optimisation)

    assert signals.adjustment is adjustment
    assert signals.production_scale == pytest.approx(1.15)
    assert signals.notes == ("Alpha", "Beta")
    assert "recommendations" in signals.metadata

    base_inputs = DCTPriceInputs(
        ton_price_usd=2.0,
        trailing_ton_price_usd=2.0,
        demand_index=0.5,
        performance_index=0.6,
        volatility_index=0.2,
        policy_adjustment=0.0,
    )
    adjusted_inputs = signals.apply_to_price_inputs(base_inputs)
    assert adjusted_inputs.policy_adjustment == pytest.approx(0.05)

    engine = DCTAllocationEngine((DCTAllocationRule("Ops", weight=1.0),))
    adjusted_engine = signals.apply_to_allocation_engine(engine)
    allocation = adjusted_engine.distribute(100.0)[0]
    assert allocation.multiplier == pytest.approx(0.9)

    planner = DCTProductionPlanner()
    plan = planner.plan(
        DCTProductionInputs(
            usd_budget=1_000.0,
            circulating_supply=1_000_000.0,
            previous_epoch_mint=100.0,
        ),
        final_price=1.0,
    )
    scaled_plan = signals.scale_plan(plan)
    assert scaled_plan.final_mint == pytest.approx(plan.final_mint * 1.15)


def test_production_plan_scale_respects_zero_cap() -> None:
    planner = DCTProductionPlanner()
    plan = planner.plan(
        DCTProductionInputs(
            usd_budget=10_000.0,
            circulating_supply=0.0,
            previous_epoch_mint=0.0,
            max_emission=0.0,
        ),
        final_price=1.0,
    )

    assert plan.final_mint == pytest.approx(0.0)

    scaled_plan = plan.scale(3.0)
    assert scaled_plan.final_mint == pytest.approx(0.0)
    assert scaled_plan.cap_applied is True


def test_treasury_algo_handles_losses_and_shortfall_notes() -> None:
    treasury = DynamicTreasuryAlgo(starting_balance=500.0)

    class _LossResult:
        retcode = 10009
        profit = -750.0

    event = treasury.update_from_trade(_LossResult())
    assert event is not None
    assert event.loss_covered == pytest.approx(500.0)
    assert event.burned == pytest.approx(0.0)
    assert event.rewards_distributed == pytest.approx(0.0)
    assert event.profit_retained == pytest.approx(0.0)
    assert treasury.treasury_balance == pytest.approx(0.0)
    assert event.notes and "Loss exceeded treasury reserves" in event.notes[0]


def test_treasury_algo_respects_custom_distribution() -> None:
    treasury = DynamicTreasuryAlgo(
        starting_balance=0.0, burn_share=0.1, reward_share=0.4
    )

    class _WinResult:
        retcode = 10009
        profit = 1000.0

    event = treasury.update_from_trade(_WinResult())
    assert event is not None
    assert event.burned == pytest.approx(100.0)
    assert event.rewards_distributed == pytest.approx(400.0)
    assert event.profit_retained == pytest.approx(500.0)
    assert event.loss_covered == pytest.approx(0.0)
    assert treasury.treasury_balance == pytest.approx(500.0)
