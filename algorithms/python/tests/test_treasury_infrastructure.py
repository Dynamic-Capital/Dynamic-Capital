from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.treasury_infrastructure import (
    AllocationAction,
    OracleIntegrationPlan,
    TreasuryInfrastructureBuilder,
    TreasuryInfrastructurePlan,
    TreasuryPolicy,
    TreasuryStatus,
)


def _action_by_slug(plan: TreasuryInfrastructurePlan, slug: str) -> AllocationAction:
    return next(action for action in plan.allocation_schedule if action.wallet_slug == slug)


def _oracle_by_pair(plan: TreasuryInfrastructurePlan, pair: str) -> OracleIntegrationPlan:
    return next(oracle for oracle in plan.oracle_integrations if oracle.asset_pair == pair)


def test_plan_prioritises_risk_buffer_and_rebalances_allocations() -> None:
    status = TreasuryStatus(
        nav=12_000_000,
        monthly_profit=1_200_000,
        monthly_operational_cost=400_000,
        multisig_members=("Alice", "Bob", "Carlos", "Dana"),
        existing_balances={"risk_buffer": 1_500_000},
        oracle_preferences={"DCT/USDT": ("DexScreener", "Gate.io")},
    )
    policy = TreasuryPolicy(risk_buffer_target_months=6.0, buyback_cadence_hours=8)
    plan = TreasuryInfrastructureBuilder(policy).build(status)

    assert [wallet.slug for wallet in plan.wallets] == [
        "buybacks",
        "staking_rewards",
        "reserves",
        "risk_buffer",
    ]
    total_transfers = sum(action.amount for action in plan.allocation_schedule)
    assert total_transfers == pytest.approx(status.monthly_profit, rel=1e-6)

    risk_buffer_action = _action_by_slug(plan, "risk_buffer")
    assert risk_buffer_action.amount == pytest.approx(900_000, rel=1e-6)

    buyback_action = _action_by_slug(plan, "buybacks")
    assert buyback_action.amount == pytest.approx(100_000, rel=1e-6)

    staking_action = _action_by_slug(plan, "staking_rewards")
    assert staking_action.amount == pytest.approx(83_333.333333, rel=1e-3)

    reserve_action = _action_by_slug(plan, "reserves")
    assert reserve_action.amount == pytest.approx(116_666.666666, rel=1e-3)

    assert plan.risk_buffer_target == pytest.approx(2_400_000, rel=1e-6)
    assert plan.risk_buffer_gap == pytest.approx(0.0, abs=1e-6)
    assert plan.runway_months == pytest.approx(30.0, rel=1e-6)

    first_wallet = plan.wallets[0]
    assert first_wallet.threshold == 3
    assert any("timelock" in control.lower() for control in first_wallet.controls)

    oracle = _oracle_by_pair(plan, "DCT/USDT")
    assert oracle.primary == "DexScreener"
    assert list(oracle.fallbacks) == ["Gate.io"]

    risk_notes = risk_buffer_action.notes
    assert any("months of operating expenses" in note for note in risk_notes)
    assert any("runway" in note.lower() for note in risk_notes)


def test_plan_handles_zero_profit_and_serialises() -> None:
    status = TreasuryStatus(
        nav=750_000,
        monthly_profit=0.0,
        monthly_operational_cost=150_000,
        multisig_members=("Alice", "Bob"),
        existing_balances={"risk_buffer": 800_000},
        oracle_assets=("USDT/TON",),
    )
    plan = TreasuryInfrastructureBuilder().build(status)

    assert all(action.amount == 0 for action in plan.allocation_schedule)
    assert math.isinf(plan.runway_months) is False  # finite runway when burn > 0
    assert plan.risk_buffer_gap == pytest.approx(100_000.0, abs=1e-6)

    wallet = plan.wallets[-1]
    assert wallet.slug == "risk_buffer"
    assert wallet.threshold == 2
    assert tuple(wallet.signers) == ("Alice", "Bob")

    payload = plan.to_dict()
    assert payload["wallets"][0]["slug"] == "buybacks"
    assert payload["allocation_schedule"][0]["wallet"] == "buybacks"
    assert payload["oracle_integrations"][0]["primary"] == "Chainlink"
    assert payload["policy_notes"]

