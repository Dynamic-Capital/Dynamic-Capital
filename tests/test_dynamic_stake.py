from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_stake import DynamicStakePool


def test_stake_and_rewards_distribution() -> None:
    pool = DynamicStakePool(base_reward_rate=0.05)
    account = pool.stake("alice", 100.0)
    assert account.balance == pytest.approx(100.0)

    snapshot = pool.apply_performance(0.02, timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc))
    assert snapshot.total_stake == pytest.approx(100.0)
    assert snapshot.total_rewards == pytest.approx(7.0)

    claim = pool.claim("alice", timestamp=datetime(2024, 1, 2, tzinfo=timezone.utc))
    assert claim == pytest.approx(7.0)
    assert pool.get_account("alice").rewards == pytest.approx(0.0)


def test_unstake_with_insufficient_balance_raises() -> None:
    pool = DynamicStakePool()
    pool.stake("bob", 50.0)

    with pytest.raises(ValueError):
        pool.unstake("bob", 60.0)


def test_negative_performance_slashes_stake() -> None:
    pool = DynamicStakePool(base_reward_rate=0.0)
    pool.stake("carol", 200.0)

    snapshot = pool.apply_performance(-0.1)
    assert snapshot.total_slashed == pytest.approx(20.0)
    assert pool.get_account("carol").balance == pytest.approx(180.0)


def test_apply_performance_with_no_stakers_records_history() -> None:
    pool = DynamicStakePool()

    snapshot = pool.apply_performance(0.1)
    assert snapshot.total_stake == pytest.approx(0.0)
    assert snapshot.total_rewards == pytest.approx(0.0)
    assert len(pool.history) == 1


def test_metadata_updates_on_restake() -> None:
    pool = DynamicStakePool()
    pool.stake("dave", 25.0, metadata={"tier": "silver"})
    pool.stake("dave", 10.0, metadata={"tier": "gold"})

    account = pool.get_account("dave")
    assert account is not None
    assert account.metadata == {"tier": "gold"}
    assert account.balance == pytest.approx(35.0)
