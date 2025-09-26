from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Sequence

import pytest

from algorithms.python.vip_auto_token_sync import (
    VipAutoSyncJob,
    VipMembershipSnapshot,
    VipTokenisationStrategy,
)


class StubWriter:
    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []

    def upsert(self, rows: Iterable[Mapping[str, Any]]) -> int:
        batch = [dict(row) for row in rows]
        self.rows.extend(batch)
        return len(batch)


class StaticProvider:
    def __init__(self, snapshots: Sequence[VipMembershipSnapshot]) -> None:
        self._snapshots = list(snapshots)

    def fetch(self) -> Sequence[VipMembershipSnapshot]:
        return list(self._snapshots)


def test_auto_sync_job_updates_memberships_and_tokens() -> None:
    provider = StaticProvider(
        [
            VipMembershipSnapshot(
                telegram_user_id=111,
                username="alpha",
                memberships={"@vip": True, "@alpha": True},
                subscription_active=True,
                trailing_spend=200.0,
            ),
            VipMembershipSnapshot(
                telegram_user_id=222,
                username="beta",
                memberships={"@vip": False, "@alpha": True},
                subscription_active=False,
                trailing_spend=0.0,
            ),
        ]
    )
    membership_writer = StubWriter()
    token_writer = StubWriter()
    strategy = VipTokenisationStrategy(
        base_reward=12.0,
        channel_reward=3.0,
        subscription_bonus=20.0,
        spend_ratio=0.02,
        max_reward=80.0,
    )

    job = VipAutoSyncJob(
        provider=provider,
        membership_writer=membership_writer,
        token_writer=token_writer,
        tokenisation=strategy,
    )

    report = job.run()

    assert report.memberships_synced == 2
    assert report.tokens_synced == 2
    assert pytest.approx(report.total_tokens_issued, rel=1e-6) == 57.0
    assert len(membership_writer.rows) == 2
    assert membership_writer.rows[0]["activeChannels"] == ["@alpha", "@vip"]
    assert membership_writer.rows[0]["membershipScore"] == 2
    assert membership_writer.rows[1]["activeChannels"] == ["@alpha"]
    assert token_writer.rows[0]["tokens"] == pytest.approx(42.0)
    assert token_writer.rows[1]["tokens"] == pytest.approx(15.0)
    summary = report.summary()
    assert "2 memberships" in summary
    assert "57.00" in summary


def test_tokenisation_strategy_applies_cap_and_breakdown() -> None:
    snapshot = VipMembershipSnapshot(
        telegram_user_id=333,
        username="gamma",
        memberships={"@vip": True, "@elite": True, "@macro": True},
        subscription_active=True,
        trailing_spend=1000.0,
        last_activity_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )
    strategy = VipTokenisationStrategy(
        base_reward=10.0,
        channel_reward=5.0,
        subscription_bonus=10.0,
        spend_ratio=0.2,
        max_reward=60.0,
    )

    grant = strategy.tokenise(snapshot)

    assert grant.tokens == pytest.approx(60.0)
    assert grant.breakdown["cap_reduction"] == pytest.approx(175.0)

    synced_at = datetime(2024, 2, 1, tzinfo=timezone.utc)
    row = snapshot.to_membership_row(synced_at)
    token_row = grant.to_row(synced_at)

    assert row["lastActivityAt"] == snapshot.last_activity_at
    assert row["syncedAt"] == synced_at
    assert token_row["syncedAt"] == synced_at
    assert token_row["breakdown"]["cap_reduction"] == pytest.approx(175.0)
