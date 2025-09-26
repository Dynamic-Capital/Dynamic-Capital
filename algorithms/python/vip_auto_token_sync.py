"""VIP membership auto synchronisation and tokenisation helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Iterable, Mapping, MutableMapping, Protocol, Sequence

from .supabase_sync import SupabaseTableWriter

__all__ = [
    "TableWriter",
    "VipMembershipSnapshot",
    "VipMembershipProvider",
    "VipTokenGrant",
    "VipTokenisationStrategy",
    "VipAutoSyncReport",
    "VipAutoSyncJob",
]


class TableWriter(Protocol):
    """Protocol describing the table writer dependency."""

    def upsert(self, rows: Iterable[Mapping[str, Any]]) -> int:
        """Persist the supplied rows, returning the number of rows written."""


@dataclass(slots=True)
class VipMembershipSnapshot:
    """Current VIP membership state for a Telegram user."""

    telegram_user_id: int
    username: str | None
    memberships: Mapping[str, bool]
    subscription_active: bool
    trailing_spend: float = 0.0
    last_activity_at: datetime | None = None

    def active_channels(self) -> tuple[str, ...]:
        """Return the channels where the member is currently active."""

        return tuple(sorted(channel for channel, active in self.memberships.items() if active))

    def inactive_channels(self) -> tuple[str, ...]:
        """Return the channels where the member is no longer active."""

        return tuple(sorted(channel for channel, active in self.memberships.items() if not active))

    def to_membership_row(self, synced_at: datetime) -> MutableMapping[str, Any]:
        """Convert the snapshot into a Supabase compatible row."""

        trailing_spend = max(0.0, round(self.trailing_spend, 2))
        last_activity = None
        if self.last_activity_at is not None:
            last_activity = self.last_activity_at.astimezone(timezone.utc)
        return {
            "telegramUserId": self.telegram_user_id,
            "username": self.username,
            "activeChannels": list(self.active_channels()),
            "inactiveChannels": list(self.inactive_channels()),
            "membershipScore": len(self.active_channels()),
            "subscriptionActive": self.subscription_active,
            "trailingSpend": trailing_spend,
            "lastActivityAt": last_activity,
            "syncedAt": synced_at,
        }


class VipMembershipProvider(Protocol):  # pragma: no cover - interface definition
    """Interface for providers that surface VIP membership snapshots."""

    def fetch(self) -> Sequence[VipMembershipSnapshot]:
        """Return the current snapshots for users that require synchronisation."""


@dataclass(slots=True)
class VipTokenGrant:
    """Token distribution calculated for a VIP user."""

    telegram_user_id: int
    username: str | None
    tokens: float
    breakdown: Mapping[str, float]
    active_channels: int
    subscription_active: bool

    def to_row(self, synced_at: datetime) -> MutableMapping[str, Any]:
        """Return a Supabase row capturing the token grant."""

        rounded_breakdown = {key: round(value, 6) for key, value in self.breakdown.items()}
        return {
            "telegramUserId": self.telegram_user_id,
            "username": self.username,
            "tokens": round(self.tokens, 6),
            "breakdown": rounded_breakdown,
            "activeChannels": self.active_channels,
            "subscriptionActive": self.subscription_active,
            "syncedAt": synced_at,
        }


@dataclass(slots=True)
class VipTokenisationStrategy:
    """Deterministic strategy that converts membership into token grants."""

    base_reward: float = 10.0
    channel_reward: float = 2.5
    subscription_bonus: float = 15.0
    spend_ratio: float = 0.05
    max_reward: float = 120.0

    def tokenise(self, snapshot: VipMembershipSnapshot) -> VipTokenGrant:
        """Return the calculated token grant for ``snapshot``."""

        active_channels = len(snapshot.active_channels())
        base_component = max(0.0, self.base_reward)
        subscription_component = self.subscription_bonus if snapshot.subscription_active else 0.0
        channel_component = active_channels * max(0.0, self.channel_reward)
        spend_component = max(0.0, snapshot.trailing_spend) * max(0.0, self.spend_ratio)

        raw_total = base_component + subscription_component + channel_component + spend_component
        capped_total = min(max(0.0, self.max_reward), raw_total)
        cap_reduction = max(0.0, raw_total - capped_total)

        breakdown: dict[str, float] = {
            "base": base_component,
            "subscription": subscription_component,
            "channels": channel_component,
            "spend": spend_component,
        }
        if cap_reduction > 0:
            breakdown["cap_reduction"] = cap_reduction

        return VipTokenGrant(
            telegram_user_id=snapshot.telegram_user_id,
            username=snapshot.username,
            tokens=capped_total,
            breakdown=breakdown,
            active_channels=active_channels,
            subscription_active=snapshot.subscription_active,
        )


@dataclass(slots=True)
class VipAutoSyncReport:
    """Summary of a completed auto synchronisation run."""

    synced_at: datetime
    memberships_synced: int
    tokens_synced: int
    total_tokens_issued: float
    grants: Sequence[VipTokenGrant] = field(default_factory=tuple)

    def summary(self) -> str:
        """Return a concise string describing the run outcome."""

        return (
            f"{self.memberships_synced} memberships synced, "
            f"{self.tokens_synced} token grants ({self.total_tokens_issued:.2f} DCT)"
        )

    def to_dict(self) -> MutableMapping[str, Any]:
        """Return a JSON friendly representation of the report."""

        return {
            "syncedAt": self.synced_at.isoformat(),
            "membershipsSynced": self.memberships_synced,
            "tokensSynced": self.tokens_synced,
            "totalTokensIssued": round(self.total_tokens_issued, 6),
            "grants": [
                {
                    "telegramUserId": grant.telegram_user_id,
                    "username": grant.username,
                    "tokens": round(grant.tokens, 6),
                    "breakdown": {key: round(value, 6) for key, value in grant.breakdown.items()},
                    "activeChannels": grant.active_channels,
                    "subscriptionActive": grant.subscription_active,
                }
                for grant in self.grants
            ],
        }


@dataclass(slots=True)
class VipAutoSyncJob:
    """Synchronise VIP memberships and persist token grants."""

    provider: VipMembershipProvider
    membership_writer: TableWriter
    token_writer: TableWriter
    tokenisation: VipTokenisationStrategy = field(default_factory=VipTokenisationStrategy)

    def run(self) -> VipAutoSyncReport:
        """Execute the synchronisation pipeline and return a report."""

        snapshots = list(self.provider.fetch())
        synced_at = datetime.now(tz=timezone.utc)

        membership_rows = [snapshot.to_membership_row(synced_at) for snapshot in snapshots]
        memberships_synced = 0
        if membership_rows:
            memberships_synced = self.membership_writer.upsert(membership_rows)

        grants = [self.tokenisation.tokenise(snapshot) for snapshot in snapshots]
        token_rows = [grant.to_row(synced_at) for grant in grants]
        tokens_synced = 0
        if token_rows:
            tokens_synced = self.token_writer.upsert(token_rows)

        total_tokens_issued = sum(grant.tokens for grant in grants)
        return VipAutoSyncReport(
            synced_at=synced_at,
            memberships_synced=memberships_synced,
            tokens_synced=tokens_synced,
            total_tokens_issued=total_tokens_issued,
            grants=tuple(grants),
        )


if TYPE_CHECKING:  # pragma: no cover - import-time type assertion only
    _supabase_writer: TableWriter = SupabaseTableWriter(table="", conflict_column="")
