from pathlib import Path
import sys
from datetime import datetime, timezone

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic.trading.algo.dynamic_pool import DynamicPoolAlgo


def _dt(hour: int, minute: int = 0) -> datetime:
    return datetime(2025, 1, 1, hour, minute, tzinfo=timezone.utc)


def test_snapshot_with_mixed_deposits() -> None:
    pool = DynamicPoolAlgo(mark_price=1.5)
    pool.record_deposit(
        "investor-a",
        amount_usd=200.0,
        valuation_usd=200.0,
        dct_amount=80.0,
        timestamp=_dt(9),
    )
    pool.record_deposit(
        "investor-b",
        amount_usd=150.0,
        valuation_usd=150.0,
        timestamp=_dt(10),
    )

    snapshot = pool.snapshot()
    assert snapshot.total_contribution_usd == pytest.approx(350.0)
    assert snapshot.total_marked_valuation_usd == pytest.approx(270.0)
    assert snapshot.total_dct_balance == pytest.approx(80.0)

    allocations = {alloc.investor_id: alloc for alloc in snapshot.allocations}
    assert allocations["investor-a"].share_percentage == pytest.approx(57.142857, rel=1e-6)
    assert allocations["investor-b"].share_percentage == pytest.approx(42.857143, rel=1e-6)
    assert allocations["investor-a"].marked_valuation_usd == pytest.approx(120.0)
    assert allocations["investor-b"].marked_valuation_usd == pytest.approx(150.0)


def test_withdrawal_reduces_contribution_and_tokens() -> None:
    pool = DynamicPoolAlgo(mark_price=1.0)
    pool.record_deposit(
        "investor-a",
        amount_usd=200.0,
        valuation_usd=200.0,
        dct_amount=100.0,
        timestamp=_dt(8),
    )
    pool.record_withdrawal(
        "investor-a",
        amount_usd=100.0,
        net_amount_usd=80.0,
        timestamp=_dt(12),
    )

    snapshot = pool.snapshot()
    allocation = snapshot.allocations[0]
    assert allocation.investor_id == "investor-a"
    assert allocation.contribution_usd == pytest.approx(120.0)
    assert allocation.marked_valuation_usd == pytest.approx(20.0)
    assert allocation.dct_balance == pytest.approx(20.0)
    assert allocation.share_percentage == pytest.approx(100.0)


def test_full_withdrawal_zeroes_share() -> None:
    pool = DynamicPoolAlgo(mark_price=2.0)
    pool.record_deposit("investor-a", amount_usd=50.0, valuation_usd=50.0, dct_amount=10.0)
    pool.record_withdrawal("investor-a", amount_usd=50.0)

    snapshot = pool.snapshot()
    allocation = snapshot.allocations[0]
    assert allocation.share_percentage == pytest.approx(0.0)
    assert allocation.contribution_usd == pytest.approx(0.0)
    assert allocation.dct_balance == pytest.approx(0.0)
    assert snapshot.total_contribution_usd == pytest.approx(0.0)
    assert snapshot.total_marked_valuation_usd == pytest.approx(0.0)


def test_mark_price_override_updates_snapshot() -> None:
    pool = DynamicPoolAlgo(mark_price=1.0)
    pool.record_deposit("investor-a", amount_usd=100.0, valuation_usd=100.0, dct_amount=40.0)

    original = pool.snapshot()
    override = pool.snapshot(mark_price=2.5)

    assert original.total_marked_valuation_usd == pytest.approx(40.0)
    assert override.total_marked_valuation_usd == pytest.approx(100.0)
    alloc = {a.investor_id: a for a in override.allocations}["investor-a"]
    assert alloc.marked_valuation_usd == pytest.approx(100.0)
