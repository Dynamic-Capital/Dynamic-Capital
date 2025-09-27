"""Tests for the DCT buyback planning algorithm."""

from __future__ import annotations

import math

import pytest

from algorithms.python.dct_buyback_algo import (
    DynamicDCTBuybackAlgorithm,
    DCTBuybackInputs,
)


def _build_inputs(**overrides: float) -> DCTBuybackInputs:
    base = {
        "treasury_nav": 5_000_000.0,
        "liquid_reserves": 1_000_000.0,
        "monthly_profit": 200_000.0,
        "penalty_fees": 20_000.0,
        "circulating_supply": 10_000_000.0,
        "spot_price": 0.52,
        "price_history": [0.52, 0.51, 0.53],
        "roi_history": [0.06, 0.04, 0.05],
        "buyback_allocation_pct": 0.3,
        "penalty_burn_pct": 0.5,
        "max_buyback_pct_of_profit": 0.5,
        "accelerate_threshold": 0.95,
        "tranche_size_usd": 25_000.0,
        "max_tranches": 6,
        "minimum_tranche_usd": 7_500.0,
    }
    base.update(overrides)
    return DCTBuybackInputs(**base)


def test_profit_driven_allocation_creates_balanced_tranches() -> None:
    algo = DynamicDCTBuybackAlgorithm()
    inputs = _build_inputs()

    plan = algo.generate_plan(inputs)

    assert plan.should_accelerate is False
    assert plan.accelerated_budget_usd == pytest.approx(0.0)
    assert plan.total_buyback_usd == pytest.approx(plan.buyback_budget_usd)
    assert plan.total_buyback_usd > 0
    assert plan.penalty_contribution_usd == pytest.approx(inputs.penalty_fees * inputs.penalty_burn_pct)
    assert plan.expected_burn_dct == pytest.approx(
        (plan.total_buyback_usd + plan.penalty_contribution_usd) / inputs.spot_price
    )
    assert plan.reserves_after_execution == pytest.approx(
        inputs.liquid_reserves - plan.total_buyback_usd
    )

    assert len(plan.tranches) == 3
    assert {tranche.delay_minutes for tranche in plan.tranches} == {0, 45, 90}
    for tranche in plan.tranches:
        assert math.isclose(tranche.amount_usd, plan.total_buyback_usd / 3, rel_tol=1e-6)


def test_discounted_market_triggers_accelerated_buybacks() -> None:
    algo = DynamicDCTBuybackAlgorithm()
    inputs = _build_inputs(
        liquid_reserves=600_000.0,
        monthly_profit=300_000.0,
        penalty_fees=5_000.0,
        spot_price=0.42,
        price_history=[0.50, 0.49, 0.48, 0.47],
        roi_history=[0.12, 0.08, 0.1],
    )

    plan = algo.generate_plan(inputs)

    assert plan.should_accelerate is True
    assert plan.accelerated_budget_usd > 0
    assert plan.total_buyback_usd > plan.buyback_budget_usd
    assert plan.reserves_after_execution == pytest.approx(
        inputs.liquid_reserves - plan.total_buyback_usd
    )
    assert all(tranche.delay_minutes % 30 == 0 for tranche in plan.tranches)
    assert plan.tranches[0].amount_usd > plan.tranches[-1].amount_usd


def test_invalid_inputs_raise_errors() -> None:
    algo = DynamicDCTBuybackAlgorithm()
    inputs = _build_inputs(circulating_supply=0.0)

    with pytest.raises(ValueError):
        algo.generate_plan(inputs)
