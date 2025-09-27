"""Dynamic Delegated Proof of Stake (DPoS) coordination primitives."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Mapping, MutableMapping

__all__ = [
    "DelegateState",
    "DynamicDelegatedProofOfStake",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _coerce_non_negative_float(value: float | int) -> float:
    try:
        amount = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("stake must be numeric") from exc
    if amount < 0:
        raise ValueError("stake must be non-negative")
    return amount


def _coerce_positive_int(value: int, *, label: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{label} must be an integer") from exc
    if number <= 0:
        raise ValueError(f"{label} must be positive")
    return number


@dataclass(slots=True, frozen=True)
class DelegateState:
    """Immutable snapshot of a delegate's current support and performance."""

    identifier: str
    votes: float
    supporters: Mapping[str, float]
    total_blocks: int
    last_forged: datetime | None


@dataclass(slots=True)
class _DelegateStats:
    identifier: str
    votes: float = 0.0
    supporters: MutableMapping[str, float] = field(default_factory=dict)
    total_blocks: int = 0
    last_forged: datetime | None = None


class DynamicDelegatedProofOfStake:
    """Tracks stake, delegation and forging order for a DPoS style network."""

    def __init__(self) -> None:
        self._stakes: dict[str, float] = {}
        self._delegations: dict[str, dict[str, float]] = {}
        self._delegates: dict[str, _DelegateStats] = {}

    def set_stake(self, identifier: str, stake: float) -> float:
        """Set the absolute stake for *identifier* and return the new value."""

        identifier = _normalise_identifier(identifier)
        amount = _coerce_non_negative_float(stake)
        if amount == 0:
            self._stakes.pop(identifier, None)
        else:
            self._stakes[identifier] = amount
        self._recalculate_votes()
        return self._stakes.get(identifier, 0.0)

    def adjust_stake(self, identifier: str, delta: float) -> float:
        """Adjust stake for *identifier* by *delta* and return the updated amount."""

        identifier = _normalise_identifier(identifier)
        baseline = self._stakes.get(identifier, 0.0)
        amount = baseline + float(delta)
        if amount < 0:
            raise ValueError("resulting stake must be non-negative")
        return self.set_stake(identifier, amount)

    def get_stake(self, identifier: str) -> float:
        return self._stakes.get(_normalise_identifier(identifier), 0.0)

    def delegate_votes(self, voter: str, allocations: Mapping[str, float]) -> Mapping[str, float]:
        """Assign *voter*'s stake to delegates based on *allocations* weights."""

        voter_id = _normalise_identifier(voter)
        weights: dict[str, float] = {}
        total = 0.0
        for delegate, weight in allocations.items():
            delegate_id = _normalise_identifier(delegate)
            try:
                numeric_weight = float(weight)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
                raise TypeError("allocation weights must be numeric") from exc
            if numeric_weight <= 0:
                continue
            weights[delegate_id] = numeric_weight
            total += numeric_weight
            self._delegates.setdefault(delegate_id, _DelegateStats(delegate_id))

        if not weights:
            self._delegations.pop(voter_id, None)
        else:
            normalised = {key: value / total for key, value in weights.items()}
            self._delegations[voter_id] = normalised

        self._recalculate_votes()
        return self.get_delegation(voter_id)

    def clear_delegation(self, voter: str) -> None:
        voter_id = _normalise_identifier(voter)
        if voter_id in self._delegations:
            self._delegations.pop(voter_id, None)
            self._recalculate_votes()

    def get_delegation(self, voter: str) -> Mapping[str, float]:
        voter_id = _normalise_identifier(voter)
        allocations = self._delegations.get(voter_id)
        if not allocations:
            return {}
        return dict(allocations)

    def register_delegate(self, identifier: str) -> DelegateState:
        delegate_id = _normalise_identifier(identifier)
        stats = self._delegates.setdefault(delegate_id, _DelegateStats(delegate_id))
        return self._to_state(stats)

    def get_delegate(self, identifier: str) -> DelegateState:
        delegate_id = _normalise_identifier(identifier)
        stats = self._delegates.get(delegate_id)
        if stats is None:
            return DelegateState(delegate_id, 0.0, {}, 0, None)
        return self._to_state(stats)

    def get_active_delegates(self, limit: int | None = None) -> tuple[DelegateState, ...]:
        delegates = [self._to_state(stats) for stats in self._delegates.values() if stats.votes > 0]
        delegates.sort(key=self._delegate_sort_key)
        if limit is not None:
            limit = _coerce_positive_int(limit, label="limit")
            delegates = delegates[:limit]
        return tuple(delegates)

    def iter_delegates(self, *, include_zero_votes: bool = False) -> tuple[DelegateState, ...]:
        delegates = [
            self._to_state(stats)
            for stats in self._delegates.values()
            if include_zero_votes or stats.votes > 0
        ]
        delegates.sort(key=self._delegate_sort_key)
        return tuple(delegates)

    def produce_schedule(
        self,
        round_length: int,
        *,
        at: datetime | None = None,
        slot_interval_seconds: int = 2,
    ) -> tuple[dict[str, object], ...]:
        if slot_interval_seconds <= 0:
            raise ValueError("slot_interval_seconds must be positive")
        round_length = _coerce_positive_int(round_length, label="round_length")
        active = list(self.get_active_delegates())
        if not active:
            raise ValueError("no delegates with votes available for scheduling")

        start_time = _ensure_utc(at)
        schedule: list[dict[str, object]] = []
        for slot in range(round_length):
            delegate = active[slot % len(active)]
            scheduled_for = start_time + timedelta(seconds=slot * slot_interval_seconds)
            schedule.append(
                {
                    "slot": slot,
                    "delegate": delegate.identifier,
                    "scheduled_for": scheduled_for,
                    "votes": delegate.votes,
                }
            )
        return tuple(schedule)

    def record_block(self, delegate: str, *, timestamp: datetime | None = None) -> DelegateState:
        delegate_id = _normalise_identifier(delegate)
        stats = self._delegates.setdefault(delegate_id, _DelegateStats(delegate_id))
        stats.total_blocks += 1
        stats.last_forged = _ensure_utc(timestamp)
        return self._to_state(stats)

    def snapshot(self) -> Mapping[str, object]:
        return {
            "stakes": dict(self._stakes),
            "delegations": {voter: dict(allocations) for voter, allocations in self._delegations.items()},
            "delegates": [
                {
                    "identifier": stats.identifier,
                    "votes": stats.votes,
                    "supporters": dict(stats.supporters),
                    "total_blocks": stats.total_blocks,
                    "last_forged": stats.last_forged.isoformat().replace("+00:00", "Z")
                    if stats.last_forged
                    else None,
                }
                for stats in sorted(self._delegates.values(), key=self._delegate_sort_key)
            ],
        }

    def _recalculate_votes(self) -> None:
        for stats in self._delegates.values():
            stats.votes = 0.0
            stats.supporters.clear()

        for voter, allocations in self._delegations.items():
            stake = self._stakes.get(voter, 0.0)
            if stake <= 0:
                continue
            for delegate_id, weight in allocations.items():
                contribution = stake * weight
                stats = self._delegates.setdefault(delegate_id, _DelegateStats(delegate_id))
                stats.votes += contribution
                stats.supporters[voter] = stats.supporters.get(voter, 0.0) + contribution

    @staticmethod
    def _delegate_sort_key(state: DelegateState | _DelegateStats) -> tuple[float, float, str]:
        last = state.last_forged
        last_timestamp = last.timestamp() if last else float("-inf")
        votes = state.votes if isinstance(state, DelegateState) else state.votes
        identifier = state.identifier
        return (-votes, last_timestamp, identifier)

    @staticmethod
    def _to_state(stats: _DelegateStats) -> DelegateState:
        return DelegateState(
            identifier=stats.identifier,
            votes=stats.votes,
            supporters=dict(stats.supporters),
            total_blocks=stats.total_blocks,
            last_forged=stats.last_forged,
        )
