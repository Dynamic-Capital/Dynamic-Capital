from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.dct_token_sync import (
    DCTAllocationEngine,
    DCTAllocationRule,
    DCTMarketSnapshot,
    DCTPriceCalculator,
    DCTPriceInputs,
    DCTProductionInputs,
    DCTProductionPlanner,
    DCTSyncJob,
)
from algorithms.python.supabase_sync import SupabaseTableWriter


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

