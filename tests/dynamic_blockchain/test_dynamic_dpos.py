from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_blockchain import DynamicDelegatedProofOfStake


def test_delegation_weights_and_votes_propagate() -> None:
    dpos = DynamicDelegatedProofOfStake()
    dpos.set_stake("alice", 100)
    dpos.set_stake("bob", 50)
    dpos.set_stake("carol", 25)

    allocation = dpos.delegate_votes("alice", {"dan": 2, "erin": 1})
    assert pytest.approx(allocation["dan"], rel=1e-6) == pytest.approx(2 / 3, rel=1e-6)
    assert pytest.approx(allocation["erin"], rel=1e-6) == pytest.approx(1 / 3, rel=1e-6)

    dpos.delegate_votes("bob", {"dan": 1})
    dpos.delegate_votes("carol", {"erin": 1})

    dan = dpos.get_delegate("dan")
    erin = dpos.get_delegate("erin")

    assert pytest.approx(dan.votes, rel=1e-6) == pytest.approx(100 * (2 / 3) + 50, rel=1e-6)
    assert pytest.approx(erin.votes, rel=1e-6) == pytest.approx(100 * (1 / 3) + 25, rel=1e-6)
    assert pytest.approx(dan.votes + erin.votes, rel=1e-6) == pytest.approx(175, rel=1e-6)
    assert set(dan.supporters) == {"alice", "bob"}
    assert set(erin.supporters) == {"alice", "carol"}


def test_schedule_respects_votes_and_recent_activity() -> None:
    dpos = DynamicDelegatedProofOfStake()
    dpos.set_stake("alice", 10)
    dpos.set_stake("bob", 10)

    dpos.delegate_votes("alice", {"dan": 1})
    dpos.delegate_votes("bob", {"erin": 1})

    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    schedule = dpos.produce_schedule(4, at=start, slot_interval_seconds=8)

    assert [entry["delegate"] for entry in schedule] == ["dan", "erin", "dan", "erin"]
    assert schedule[1]["scheduled_for"] == start + timedelta(seconds=8)

    # Dan forges a block which should push Erin earlier when votes are equal.
    dpos.record_block("dan", timestamp=start)
    refreshed = dpos.produce_schedule(2, at=start + timedelta(seconds=32))

    assert [entry["delegate"] for entry in refreshed] == ["erin", "dan"]


def test_schedule_requires_active_delegates() -> None:
    dpos = DynamicDelegatedProofOfStake()
    dpos.register_delegate("orphan")

    with pytest.raises(ValueError):
        dpos.produce_schedule(1)
