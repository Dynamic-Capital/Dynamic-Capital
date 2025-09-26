from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.dct_tonstarter_sale import (  # noqa: E402
    DCTTonstarterSaleInputs,
    DCTTonstarterSalePlanner,
    SaleTierInput,
)


@pytest.fixture()
def sample_inputs() -> DCTTonstarterSaleInputs:
    sale_date = datetime(2025, 2, 20, 15, 0, tzinfo=timezone.utc)
    tiers = (
        SaleTierInput(name="Community", weight=0.4, price_ton=0.45, vesting_months=6, cliff_months=1),
        SaleTierInput(name="Public", weight=0.35, price_ton=0.5, vesting_months=3, cliff_months=0),
        SaleTierInput(name="Strategic", weight=0.25, price_ton=0.6, vesting_months=12, cliff_months=3),
    )
    return DCTTonstarterSaleInputs(
        sale_date=sale_date,
        ton_price_usd=2.25,
        target_raise_usd=900_000.0,
        public_sale_share=0.18,
        community_sale_share=0.12,
        treasury_sale_share=0.25,
        liquidity_budget_usd=180_000.0,
        sale_tiers=tiers,
        marketing_channels=("Telegram", "X", "YouTube"),
    )


def test_sale_plan_balances_raise_and_tokens(sample_inputs: DCTTonstarterSaleInputs) -> None:
    planner = DCTTonstarterSalePlanner()
    plan = planner.build_plan(sample_inputs)

    assert len(plan.tiers) == len(sample_inputs.sale_tiers)
    assert sum(tier.expected_raise_usd for tier in plan.tiers) == pytest.approx(
        sample_inputs.target_raise_usd
    )
    expected_raise_ton = sample_inputs.target_raise_usd / sample_inputs.ton_price_usd
    assert plan.expected_raise_ton == pytest.approx(expected_raise_ton)
    assert plan.tonstarter_fee_ton == pytest.approx(expected_raise_ton * sample_inputs.tonstarter_fee_rate)
    assert plan.treasury_net_ton == pytest.approx(plan.expected_raise_ton - plan.tonstarter_fee_ton)
    assert plan.total_tokens_for_sale == pytest.approx(
        sum(tier.expected_raise_ton / tier.price_ton for tier in plan.tiers)
    )
    assert plan.average_price_ton == pytest.approx(plan.expected_raise_ton / plan.total_tokens_for_sale)


def test_plan_contains_marketing_and_milestones(sample_inputs: DCTTonstarterSaleInputs) -> None:
    planner = DCTTonstarterSalePlanner()
    plan = planner.build_plan(sample_inputs)

    assert len(plan.marketing_sprints) == 3
    sprint_names = [sprint.name for sprint in plan.marketing_sprints]
    assert sprint_names == ["Discovery push", "Community warm-up", "Final countdown"]

    assert len(plan.milestones) == 5
    milestone_names = [milestone.name for milestone in plan.milestones]
    assert "Sale go-live" in milestone_names
    assert plan.marketing_sprints[0].start_at < plan.sale_date
    assert plan.summary().startswith("900,000 USD target")
    assert plan.liquidity_plan.pool == planner.liquidity_pool
    assert plan.liquidity_plan.ton_contribution == pytest.approx(
        sample_inputs.liquidity_budget_usd / sample_inputs.ton_price_usd
    )
