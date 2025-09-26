"""Tests for the DCT treasury growth planner heuristics."""

from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.dct_treasury_growth import TreasuryGrowthPlanner, TreasurySnapshot


def build_planner() -> TreasuryGrowthPlanner:
    return TreasuryGrowthPlanner()


def test_defensive_posture_prioritises_runway_and_suppresses_buybacks() -> None:
    planner = build_planner()
    snapshot = TreasurySnapshot(
        operations_balance=1_000_000,  # 10 months of runway
        liquidity_reserve=1_500_000,
        monthly_burn=100_000,
        protocol_fees=80_000,
        penalty_fees=20_000,
        dct_price=1.02,
        dct_90d_ma=1.05,
        volatility=0.30,
        liquidity_depth=1_200_000,
        in_range_ratio=0.70,
    )

    plan = planner.build_plan(snapshot)

    assert plan.posture == "defensive"
    assert plan.levers.operations_top_up == 800_000  # top-up to 18 month runway
    assert plan.levers.buybacks == 0
    assert plan.governance_review_required is True
    assert any("Buybacks suppressed" in note for note in plan.notes)


def test_discounted_price_with_strong_runway_allocates_buybacks_and_burns() -> None:
    planner = build_planner()
    snapshot = TreasurySnapshot(
        operations_balance=3_000_000,  # 30 months of runway
        liquidity_reserve=2_000_000,
        monthly_burn=100_000,
        protocol_fees=100_000,
        penalty_fees=20_000,
        dct_price=0.90,
        dct_90d_ma=1.05,
        volatility=0.25,
        liquidity_depth=1_500_000,
        in_range_ratio=0.80,
    )

    plan = planner.build_plan(snapshot)

    assert plan.posture == "balanced"
    assert plan.levers.buybacks == 24_000  # capped at 20% of net fees (120k)
    assert plan.levers.burns == 10_000  # 50% of penalty fees
    assert plan.levers.yield_deployments == 86_000  # remainder of net fees
    assert plan.governance_review_required is False


def test_liquidity_shortfalls_trigger_reinforcement_and_throttle() -> None:
    planner = build_planner()
    snapshot = TreasurySnapshot(
        operations_balance=2_800_000,  # 28 months of runway
        liquidity_reserve=1_100_000,
        monthly_burn=100_000,
        protocol_fees=60_000,
        penalty_fees=10_000,
        dct_price=1.00,
        dct_90d_ma=1.02,
        volatility=0.40,
        liquidity_depth=800_000,  # below 1M target
        in_range_ratio=0.50,  # below 65% target
    )

    plan = planner.build_plan(snapshot)

    assert plan.levers.liquidity_reinforcement == 200_000
    assert plan.throttle_emissions is True
    assert 0 < plan.emission_throttle_ratio <= planner.EMISSION_THROTTLE_MAX
    assert plan.governance_review_required is True
    assert any("liquidity" in note.lower() for note in plan.notes)
