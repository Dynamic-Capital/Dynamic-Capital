"""Idempotency ledger utilities for Dynamic Capital workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, Iterable, Literal, Mapping, MutableMapping, TypeVar, cast

__all__ = [
    "DynamicIdempotencyLedger",
    "IdempotencyConflictError",
    "IdempotencyFrame",
    "IdempotencyMetrics",
    "IdempotencyRecord",
    "IdempotencyReplayError",
]

TResult = TypeVar("TResult")

_ALLOWED_STATUSES: tuple[str, ...] = ("pending", "completed", "failed")


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_key(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("idempotency key must not be empty")
    return cleaned


def _normalise_status(value: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in _ALLOWED_STATUSES:
        allowed = ", ".join(_ALLOWED_STATUSES)
        raise ValueError(f"status must be one of: {allowed}")
    return cleaned


def _coerce_ttl(value: float | int | None) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("ttl must be numeric") from exc
    if numeric <= 0.0:
        raise ValueError("ttl must be positive")
    return numeric


def _coerce_mapping(mapping: Mapping[str, object] | None) -> MutableMapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _stringify_error(error: object) -> str:
    if isinstance(error, BaseException):
        return f"{error.__class__.__name__}: {error}"
    return str(error)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class IdempotencyRecord:
    """State container describing a single idempotent workflow."""

    key: str
    status: str = "pending"
    result: object | None = None
    error: str | None = None
    ttl: float | None = None
    created_at: datetime = field(default_factory=_utcnow)
    completed_at: datetime | None = None
    last_seen_at: datetime | None = None
    attempts: int = 0
    metadata: MutableMapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.status = _normalise_status(self.status)
        self.ttl = _coerce_ttl(self.ttl)
        self.created_at = self._ensure_timezone(self.created_at)
        if self.completed_at is not None:
            self.completed_at = self._ensure_timezone(self.completed_at)
        if self.last_seen_at is not None:
            self.last_seen_at = self._ensure_timezone(self.last_seen_at)
        self.metadata = _coerce_mapping(self.metadata)
        self.attempts = int(self.attempts)
        if self.attempts < 0:
            raise ValueError("attempts must be non-negative")

    @staticmethod
    def _ensure_timezone(moment: datetime) -> datetime:
        if moment.tzinfo is None:
            return moment.replace(tzinfo=timezone.utc)
        return moment.astimezone(timezone.utc)

    @property
    def expires_at(self) -> datetime | None:
        if self.ttl is None:
            return None
        reference = self.completed_at or self.created_at
        return reference + timedelta(seconds=self.ttl)

    def is_expired(self, *, now: datetime | None = None) -> bool:
        expires_at = self.expires_at
        if expires_at is None:
            return False
        if now is None:
            now = _utcnow()
        return now >= expires_at

    def remaining_ttl(self, *, now: datetime | None = None) -> float | None:
        expires_at = self.expires_at
        if expires_at is None:
            return None
        if now is None:
            now = _utcnow()
        delta = expires_at - now
        return max(delta.total_seconds(), 0.0)

    def touch(self, *, now: datetime | None = None, increment: bool = True) -> None:
        now = now or _utcnow()
        self.last_seen_at = self._ensure_timezone(now)
        if increment:
            self.attempts += 1

    def mark_completed(
        self,
        *,
        result: object | None = None,
        now: datetime | None = None,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        self.status = "completed"
        self.result = result
        self.error = None
        self.completed_at = self._ensure_timezone(now or _utcnow())
        self.touch(now=self.completed_at, increment=False)
        if ttl is not None:
            self.ttl = _coerce_ttl(ttl)
        if metadata is not None:
            self._merge_metadata(metadata)

    def mark_failed(
        self,
        *,
        error: object,
        now: datetime | None = None,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        self.status = "failed"
        self.result = None
        self.error = _stringify_error(error)
        self.completed_at = self._ensure_timezone(now or _utcnow())
        self.touch(now=self.completed_at, increment=False)
        if ttl is not None:
            self.ttl = _coerce_ttl(ttl)
        if metadata is not None:
            self._merge_metadata(metadata)

    def _merge_metadata(self, new_data: Mapping[str, object]) -> None:
        updated = dict(self.metadata) if self.metadata is not None else {}
        updated.update(_coerce_mapping(new_data) or {})
        self.metadata = updated

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "ttl": self.ttl,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "last_seen_at": self.last_seen_at,
            "attempts": self.attempts,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
            "expires_at": self.expires_at,
        }


@dataclass(slots=True)
class IdempotencyMetrics:
    """Runtime counters describing ledger utilisation."""

    registrations: int = 0
    conflicts: int = 0
    replays: int = 0
    completions: int = 0
    failures: int = 0
    expirations: int = 0
    evictions: int = 0

    def copy(self) -> "IdempotencyMetrics":
        return IdempotencyMetrics(
            registrations=self.registrations,
            conflicts=self.conflicts,
            replays=self.replays,
            completions=self.completions,
            failures=self.failures,
            expirations=self.expirations,
            evictions=self.evictions,
        )

    def as_dict(self) -> MutableMapping[str, int]:
        return {
            "registrations": self.registrations,
            "conflicts": self.conflicts,
            "replays": self.replays,
            "completions": self.completions,
            "failures": self.failures,
            "expirations": self.expirations,
            "evictions": self.evictions,
        }


IdempotencyState = Literal["fresh", "replay-completed", "replay-failed"]


@dataclass(slots=True)
class IdempotencyFrame:
    """Snapshot returned by :meth:`DynamicIdempotencyLedger.begin`."""

    key: str
    record: IdempotencyRecord
    state: IdempotencyState

    @property
    def is_replay(self) -> bool:
        return self.state != "fresh"

    @property
    def has_result(self) -> bool:
        return self.record.result is not None


# ---------------------------------------------------------------------------
# ledger implementation


class IdempotencyConflictError(RuntimeError):
    """Raised when a key is already being processed."""

    def __init__(self, key: str) -> None:
        super().__init__(f"idempotency key '{key}' is already in progress")
        self.key = key


class IdempotencyReplayError(RuntimeError):
    """Raised when replayed idempotent calls cannot be re-executed."""

    def __init__(self, key: str, record: IdempotencyRecord) -> None:
        message = "idempotent request replayed with prior outcome"
        if record.status == "failed" and record.error:
            message = f"{message}: {record.error}"
        elif record.status == "completed":
            message = f"{message}: already completed"
        super().__init__(message)
        self.key = key
        self.record = record


class DynamicIdempotencyLedger:
    """In-memory registry that ensures operations execute at most once."""

    def __init__(
        self,
        *,
        default_ttl: float | int | None = 900.0,
        max_entries: int | None = 4096,
    ) -> None:
        self._default_ttl = _coerce_ttl(default_ttl) if default_ttl is not None else None
        self._max_entries = None if max_entries is None else int(max_entries)
        if self._max_entries is not None and self._max_entries <= 0:
            raise ValueError("max_entries must be positive when provided")
        self._records: Dict[str, IdempotencyRecord] = {}
        self._metrics = IdempotencyMetrics()

    @property
    def metrics(self) -> IdempotencyMetrics:
        return self._metrics.copy()

    def __contains__(self, key: object) -> bool:
        return isinstance(key, str) and key in self._records

    def __len__(self) -> int:
        return len(self._records)

    def keys(self) -> Iterable[str]:
        return tuple(self._records.keys())

    def values(self) -> Iterable[IdempotencyRecord]:
        return tuple(self._records.values())

    def items(self) -> Iterable[tuple[str, IdempotencyRecord]]:
        return tuple(self._records.items())

    def get(self, key: str) -> IdempotencyRecord | None:
        key = _normalise_key(key)
        record = self._records.get(key)
        if record is None:
            return None
        if record.is_expired():
            self._forget(key)
            self._metrics.expirations += 1
            return None
        return record

    def begin(
        self,
        key: str,
        *,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
        now: datetime | None = None,
        allow_retry_on_failure: bool = False,
    ) -> IdempotencyFrame:
        key = _normalise_key(key)
        now = now or _utcnow()
        ttl_value = _coerce_ttl(ttl) if ttl is not None else self._default_ttl
        metadata_value = _coerce_mapping(metadata)
        self.prune(now=now)
        existing = self._records.get(key)
        if existing is not None:
            if existing.status == "pending":
                existing.touch(now=now, increment=False)
                self._metrics.conflicts += 1
                raise IdempotencyConflictError(key)
            if existing.status == "failed" and allow_retry_on_failure:
                self._metrics.replays += 1
                if metadata_value is None and existing.metadata is not None:
                    metadata_value = dict(existing.metadata)
                self._forget(key)
            else:
                existing.touch(now=now, increment=False)
                self._metrics.replays += 1
                state: IdempotencyState = (
                    "replay-failed" if existing.status == "failed" else "replay-completed"
                )
                return IdempotencyFrame(key=key, record=existing, state=state)
        self._enforce_capacity()
        record = IdempotencyRecord(
            key=key,
            status="pending",
            ttl=ttl_value,
            metadata=metadata_value,
        )
        record.touch(now=now, increment=True)
        self._records[key] = record
        self._metrics.registrations += 1
        return IdempotencyFrame(key=key, record=record, state="fresh")

    def complete(
        self,
        record: IdempotencyRecord,
        *,
        result: object | None = None,
        now: datetime | None = None,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> IdempotencyRecord:
        if record.key not in self._records:
            raise KeyError(f"record '{record.key}' is not tracked by this ledger")
        record.mark_completed(result=result, now=now, ttl=ttl, metadata=metadata)
        self._metrics.completions += 1
        return record

    def fail(
        self,
        record: IdempotencyRecord,
        *,
        error: object,
        now: datetime | None = None,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> IdempotencyRecord:
        if record.key not in self._records:
            raise KeyError(f"record '{record.key}' is not tracked by this ledger")
        record.mark_failed(error=error, now=now, ttl=ttl, metadata=metadata)
        self._metrics.failures += 1
        return record

    def execute(
        self,
        key: str,
        handler: Callable[[IdempotencyRecord], TResult],
        *,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
        result_ttl: float | int | None = None,
        result_metadata: Mapping[str, object] | None = None,
        allow_retry_on_failure: bool = False,
    ) -> TResult:
        frame = self.begin(
            key,
            ttl=ttl,
            metadata=metadata,
            allow_retry_on_failure=allow_retry_on_failure,
        )
        if frame.state == "replay-completed":
            return cast(TResult, frame.record.result)
        if frame.state == "replay-failed":
            raise IdempotencyReplayError(key, frame.record)
        try:
            outcome = handler(frame.record)
        except Exception as exc:  # pragma: no cover - passthrough to caller
            self.fail(frame.record, error=exc, now=None, ttl=result_ttl, metadata=result_metadata)
            raise
        self.complete(frame.record, result=outcome, now=None, ttl=result_ttl, metadata=result_metadata)
        return outcome

    def prune(self, *, now: datetime | None = None) -> int:
        now = now or _utcnow()
        expired_keys: list[str] = []
        for key, record in list(self._records.items()):
            if record.is_expired(now=now):
                expired_keys.append(key)
        for key in expired_keys:
            self._forget(key)
        if expired_keys:
            self._metrics.expirations += len(expired_keys)
        return len(expired_keys)

    def forget(self, key: str) -> IdempotencyRecord | None:
        key = _normalise_key(key)
        record = self._forget(key)
        return record

    def _forget(self, key: str) -> IdempotencyRecord | None:
        return self._records.pop(key, None)

    def _enforce_capacity(self) -> None:
        if self._max_entries is None:
            return
        while len(self._records) >= self._max_entries:
            oldest_key = self._find_oldest_key()
            if oldest_key is None:
                break
            self._forget(oldest_key)
            self._metrics.evictions += 1

    def _find_oldest_key(self) -> str | None:
        if not self._records:
            return None
        oldest_key = min(
            self._records.items(),
            key=lambda item: item[1].completed_at or item[1].created_at,
        )[0]
        return oldest_key
