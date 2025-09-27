"""Dynamic staking pool with deterministic reward accounting."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import isfinite
from types import MappingProxyType
from typing import Mapping, MutableMapping

__all__ = [
    "StakeAccount",
    "RewardSnapshot",
    "DynamicStakePool",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError("identifier must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _coerce_positive_float(value: float | int) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    if not isfinite(result):
        raise ValueError("value must be finite")
    if result <= 0:
        raise ValueError("value must be positive")
    return result


def _coerce_non_negative_float(value: float | int) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    if not isfinite(result):
        raise ValueError("value must be finite")
    if result < 0:
        raise ValueError("value must be non-negative")
    return result


def _coerce_float(value: float | int) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    if not isfinite(result):
        raise ValueError("value must be finite")
    return result


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class StakeAccount:
    """Represents a participant staking DCT."""

    identifier: str
    balance: float = 0.0
    rewards: float = 0.0
    metadata: Mapping[str, object] | None = None
    last_updated: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.balance = _coerce_non_negative_float(self.balance)
        self.rewards = _coerce_non_negative_float(self.rewards)
        self.metadata = _coerce_metadata(self.metadata)
        self.last_updated = _ensure_timestamp(self.last_updated)

    def credit(self, amount: float, timestamp: datetime | None = None) -> None:
        amount = _coerce_positive_float(amount)
        self.balance += amount
        self.last_updated = _ensure_timestamp(timestamp)

    def debit(self, amount: float, timestamp: datetime | None = None) -> None:
        amount = _coerce_positive_float(amount)
        if amount > self.balance + 1e-9:
            raise ValueError("insufficient staked balance")
        self.balance = max(0.0, self.balance - amount)
        self.last_updated = _ensure_timestamp(timestamp)

    def accrue_rewards(self, amount: float, timestamp: datetime | None = None) -> float:
        amount = _coerce_non_negative_float(amount)
        if amount == 0:
            return 0.0
        self.rewards += amount
        self.last_updated = _ensure_timestamp(timestamp)
        return self.rewards

    def claim(self, timestamp: datetime | None = None) -> float:
        claimed = self.rewards
        self.rewards = 0.0
        self.last_updated = _ensure_timestamp(timestamp)
        return claimed


@dataclass(slots=True)
class RewardSnapshot:
    """Summary of a reward distribution cycle."""

    timestamp: datetime
    total_stake: float
    total_rewards: float
    performance_rate: float
    total_slashed: float = 0.0

    def __post_init__(self) -> None:
        self.timestamp = _ensure_timestamp(self.timestamp)
        self.total_stake = _coerce_non_negative_float(self.total_stake)
        self.total_rewards = _coerce_non_negative_float(self.total_rewards)
        self.total_slashed = _coerce_non_negative_float(self.total_slashed)
        self.performance_rate = _coerce_float(self.performance_rate)


class DynamicStakePool:
    """Manage staking balances and distribute performance-linked rewards."""

    def __init__(self, base_reward_rate: float = 0.12) -> None:
        base_reward_rate = _coerce_float(base_reward_rate)
        if base_reward_rate < 0:
            raise ValueError("base_reward_rate must be non-negative")
        self.base_reward_rate = base_reward_rate
        self._accounts: MutableMapping[str, StakeAccount] = {}
        self.history: list[RewardSnapshot] = []

    def __len__(self) -> int:
        return len(self._accounts)

    @property
    def accounts(self) -> Mapping[str, StakeAccount]:
        return MappingProxyType(self._accounts)

    @property
    def total_stake(self) -> float:
        return sum(account.balance for account in self._accounts.values())

    @property
    def total_rewards_available(self) -> float:
        return sum(account.rewards for account in self._accounts.values())

    def get_account(self, identifier: str) -> StakeAccount | None:
        key = _normalise_identifier(identifier)
        return self._accounts.get(key)

    def _require_account(self, identifier: str) -> StakeAccount:
        key = _normalise_identifier(identifier)
        try:
            return self._accounts[key]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown account '{key}'") from exc

    def stake(
        self,
        identifier: str,
        amount: float,
        *,
        timestamp: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> StakeAccount:
        amount = _coerce_positive_float(amount)
        key = _normalise_identifier(identifier)
        timestamp = _ensure_timestamp(timestamp)
        metadata_mapping = _coerce_metadata(metadata)

        account = self._accounts.get(key)
        if account is None:
            account = StakeAccount(
                identifier=key,
                balance=0.0,
                metadata=metadata_mapping,
                last_updated=timestamp,
            )
            self._accounts[key] = account
        elif metadata_mapping is not None:
            account.metadata = metadata_mapping

        account.credit(amount, timestamp)
        return account

    def unstake(
        self,
        identifier: str,
        amount: float,
        *,
        timestamp: datetime | None = None,
    ) -> StakeAccount:
        account = self._require_account(identifier)
        account.debit(amount, timestamp)
        return account

    def claim(
        self,
        identifier: str,
        *,
        timestamp: datetime | None = None,
    ) -> float:
        account = self._require_account(identifier)
        return account.claim(timestamp)

    def apply_performance(
        self,
        performance_rate: float,
        *,
        timestamp: datetime | None = None,
    ) -> RewardSnapshot:
        timestamp = _ensure_timestamp(timestamp)
        performance_rate = _coerce_float(performance_rate)
        total_stake = self.total_stake

        effective_rate = self.base_reward_rate + performance_rate
        total_rewards = 0.0
        total_slashed = 0.0

        if total_stake > 0:
            if effective_rate >= 0:
                for account in self._accounts.values():
                    reward = account.balance * effective_rate
                    if reward <= 0:
                        continue
                    account.accrue_rewards(reward, timestamp)
                    total_rewards += reward
            else:
                penalty_rate = abs(effective_rate)
                for account in self._accounts.values():
                    penalty = min(account.balance, account.balance * penalty_rate)
                    if penalty <= 0:
                        continue
                    account.debit(penalty, timestamp)
                    total_slashed += penalty

        snapshot = RewardSnapshot(
            timestamp=timestamp,
            total_stake=total_stake,
            total_rewards=total_rewards,
            performance_rate=effective_rate,
            total_slashed=total_slashed,
        )
        self.history.append(snapshot)
        return snapshot


