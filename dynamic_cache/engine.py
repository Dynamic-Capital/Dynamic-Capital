"""Adaptive caching primitives for Dynamic Capital."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CacheEntry",
    "CacheMetrics",
    "CacheSnapshot",
    "DynamicCache",
]


# ---------------------------------------------------------------------------
# helper functions


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_key(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("key must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_ttl(ttl: float | int | None) -> float | None:
    if ttl is None:
        return None
    try:
        numeric = float(ttl)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("ttl must be numeric") from exc
    if numeric <= 0.0:
        raise ValueError("ttl must be positive")
    return numeric


def _coerce_weight(weight: float | int) -> float:
    try:
        numeric = float(weight)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("weight must be numeric") from exc
    if numeric < 0.0:
        raise ValueError("weight must be non-negative")
    return numeric


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class CacheEntry:
    """Container for a cached value with adaptive metadata."""

    key: str
    value: object
    ttl: float | None = None
    weight: float = 1.0
    priority: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    created_at: datetime = field(default_factory=_utcnow)
    last_accessed: datetime | None = None
    access_count: int = 0

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.ttl = _coerce_ttl(self.ttl)
        self.weight = _coerce_weight(self.weight)
        self.priority = _clamp(float(self.priority))
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)
        if self.last_accessed is not None:
            if self.last_accessed.tzinfo is None:
                self.last_accessed = self.last_accessed.replace(tzinfo=timezone.utc)
            else:
                self.last_accessed = self.last_accessed.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)
        self.access_count = int(self.access_count)
        if self.access_count < 0:
            raise ValueError("access_count must be non-negative")

    @property
    def expires_at(self) -> datetime | None:
        if self.ttl is None:
            return None
        return self.created_at + timedelta(seconds=self.ttl)

    def is_expired(self, *, now: datetime | None = None) -> bool:
        if self.ttl is None:
            return False
        if now is None:
            now = _utcnow()
        return now >= self.created_at + timedelta(seconds=self.ttl)

    def remaining_ttl(self, *, now: datetime | None = None) -> float | None:
        if self.ttl is None:
            return None
        if now is None:
            now = _utcnow()
        delta = self.created_at + timedelta(seconds=self.ttl) - now
        return max(delta.total_seconds(), 0.0)

    def touch(
        self,
        *,
        now: datetime | None = None,
        ttl: float | int | None = None,
        priority: float | None = None,
    ) -> None:
        now = now or _utcnow()
        if ttl is not None:
            self.ttl = _coerce_ttl(ttl)
        if self.ttl is not None:
            self.created_at = now
        if priority is not None:
            self.priority = _clamp(float(priority))
        self.last_accessed = now

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "value": self.value,
            "ttl": self.ttl,
            "weight": self.weight,
            "priority": self.priority,
            "tags": list(self.tags),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
            "created_at": self.created_at,
            "last_accessed": self.last_accessed,
            "access_count": self.access_count,
        }


@dataclass(slots=True)
class CacheMetrics:
    """Runtime metrics describing cache health."""

    hits: int = 0
    misses: int = 0
    insertions: int = 0
    updates: int = 0
    evictions: int = 0
    expirations: int = 0
    sweeps: int = 0

    def copy(self) -> "CacheMetrics":
        return CacheMetrics(
            hits=self.hits,
            misses=self.misses,
            insertions=self.insertions,
            updates=self.updates,
            evictions=self.evictions,
            expirations=self.expirations,
            sweeps=self.sweeps,
        )

    def as_dict(self) -> MutableMapping[str, int]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "insertions": self.insertions,
            "updates": self.updates,
            "evictions": self.evictions,
            "expirations": self.expirations,
            "sweeps": self.sweeps,
        }


@dataclass(slots=True)
class CacheSnapshot:
    """Immutable snapshot of cache state."""

    created_at: datetime
    size: int
    total_weight: float
    keys: tuple[str, ...]
    active_tags: tuple[str, ...]
    metrics: CacheMetrics

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "created_at": self.created_at,
            "size": self.size,
            "total_weight": self.total_weight,
            "keys": list(self.keys),
            "active_tags": list(self.active_tags),
            "metrics": self.metrics.as_dict(),
        }


# ---------------------------------------------------------------------------
# dynamic cache engine


class DynamicCache:
    """In-memory cache with adaptive eviction and observability hooks."""

    def __init__(
        self,
        *,
        max_items: int = 256,
        max_weight: float = 1_000.0,
        default_ttl: float | int | None = 300.0,
        time_provider: Callable[[], datetime] | None = None,
    ) -> None:
        if max_items <= 0:
            raise ValueError("max_items must be positive")
        self._max_items = int(max_items)
        self._max_weight = _coerce_weight(max_weight)
        self._default_ttl = _coerce_ttl(default_ttl)
        self._time_provider = time_provider or _utcnow
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()
        self._total_weight = 0.0
        self._metrics = CacheMetrics()

    # -- internals ----------------------------------------------------
    def _now(self) -> datetime:
        current = self._time_provider()
        if current.tzinfo is None:
            return current.replace(tzinfo=timezone.utc)
        return current.astimezone(timezone.utc)

    def _resolve_ttl(self, ttl: float | int | None) -> float | None:
        resolved = _coerce_ttl(ttl)
        if resolved is not None:
            return resolved
        return self._default_ttl

    def _remove_entry(self, key: str, *, expired: bool = False) -> None:
        entry = self._entries.pop(key)
        self._total_weight -= entry.weight
        if expired:
            self._metrics.expirations += 1
        self._metrics.evictions += 1

    def _evict_if_needed(self) -> None:
        while len(self._entries) > self._max_items or self._total_weight > self._max_weight:
            if not self._entries:  # pragma: no cover - defensive guard
                break
            candidate_key = self._select_eviction_candidate()
            self._remove_entry(candidate_key)

    def _select_eviction_candidate(self) -> str:
        # Select entry with lowest priority, break ties by oldest access then creation
        def sort_key(entry: CacheEntry) -> tuple[float, datetime, datetime]:
            last_accessed = entry.last_accessed or entry.created_at
            return (entry.priority, last_accessed, entry.created_at)

        candidate = min(self._entries.values(), key=sort_key)
        return candidate.key

    def _get_entry(self, key: str) -> CacheEntry | None:
        normalised = _normalise_key(key)
        entry = self._entries.get(normalised)
        if entry is None:
            return None
        now = self._now()
        if entry.is_expired(now=now):
            self._entries.pop(normalised)
            self._total_weight -= entry.weight
            self._metrics.expirations += 1
            self._metrics.evictions += 1
            return None
        if entry.last_accessed is None or entry.last_accessed < now:
            entry.last_accessed = now
        entry.access_count += 1
        self._entries.move_to_end(normalised)
        return entry

    # -- public API ---------------------------------------------------
    def set(
        self,
        key: str,
        value: object,
        *,
        ttl: float | int | None = None,
        weight: float | int = 1.0,
        priority: float = 0.5,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> CacheEntry:
        normalised_key = _normalise_key(key)
        now = self._now()
        resolved_ttl = self._resolve_ttl(ttl)
        entry = CacheEntry(
            key=normalised_key,
            value=value,
            ttl=resolved_ttl,
            weight=_coerce_weight(weight),
            priority=_clamp(float(priority)),
            tags=_normalise_tags(tags),
            metadata=_coerce_mapping(metadata),
            created_at=now,
            last_accessed=now,
        )

        previous = self._entries.get(normalised_key)
        if previous is None:
            self._metrics.insertions += 1
        else:
            self._total_weight -= previous.weight
            self._metrics.updates += 1
        self._entries[normalised_key] = entry
        self._entries.move_to_end(normalised_key)
        self._total_weight += entry.weight
        self._evict_if_needed()
        return entry

    def get(self, key: str, default: object | None = None) -> object | None:
        entry = self._get_entry(key)
        if entry is None:
            self._metrics.misses += 1
            return default
        self._metrics.hits += 1
        return entry.value

    def peek(self, key: str, default: object | None = None) -> object | None:
        normalised = _normalise_key(key)
        entry = self._entries.get(normalised)
        if entry is None:
            self._metrics.misses += 1
            return default
        now = self._now()
        if entry.is_expired(now=now):
            self._entries.pop(normalised)
            self._total_weight -= entry.weight
            self._metrics.expirations += 1
            self._metrics.evictions += 1
            return default
        self._metrics.hits += 1
        return entry.value

    def delete(self, key: str) -> bool:
        normalised = _normalise_key(key)
        if normalised not in self._entries:
            return False
        self._remove_entry(normalised)
        return True

    def touch(
        self,
        key: str,
        *,
        ttl: float | int | None = None,
        priority: float | None = None,
    ) -> CacheEntry | None:
        entry = self._entries.get(_normalise_key(key))
        if entry is None:
            return None
        now = self._now()
        if entry.is_expired(now=now):
            self._remove_entry(entry.key, expired=True)
            return None
        if ttl is not None:
            entry.ttl = _coerce_ttl(ttl)
        if entry.ttl is not None:
            entry.created_at = now
        if priority is not None:
            entry.priority = _clamp(float(priority))
        entry.last_accessed = now
        self._entries.move_to_end(entry.key)
        return entry

    def sweep(self) -> int:
        now = self._now()
        expired_keys = [key for key, entry in self._entries.items() if entry.is_expired(now=now)]
        for key in expired_keys:
            self._remove_entry(key, expired=True)
        if expired_keys:
            self._metrics.sweeps += 1
        return len(expired_keys)

    def prune(self, *, tags: Sequence[str] | None = None) -> int:
        if not tags:
            removed = len(self._entries)
            if removed:
                keys = list(self._entries.keys())
                for key in keys:
                    self._remove_entry(key)
            return removed
        lookup = set(_normalise_tags(tags))
        removed = 0
        for key, entry in list(self._entries.items()):
            if lookup.intersection(entry.tags):
                self._remove_entry(key)
                removed += 1
        return removed

    def contains(self, key: str) -> bool:
        return self._get_entry(key) is not None

    def __contains__(self, key: object) -> bool:  # pragma: no cover - convenience
        if not isinstance(key, str):
            return False
        return self.contains(key)

    def __len__(self) -> int:
        return len(self._entries)

    @property
    def total_weight(self) -> float:
        return self._total_weight

    @property
    def metrics(self) -> CacheMetrics:
        return self._metrics.copy()

    def snapshot(self) -> CacheSnapshot:
        now = self._now()
        active_tags: set[str] = set()
        for entry in self._entries.values():
            active_tags.update(entry.tags)
        return CacheSnapshot(
            created_at=now,
            size=len(self._entries),
            total_weight=self._total_weight,
            keys=tuple(self._entries.keys()),
            active_tags=tuple(sorted(active_tags)),
            metrics=self._metrics.copy(),
        )

    def items(self) -> Iterable[tuple[str, object]]:  # pragma: no cover - convenience
        for key, entry in self._entries.items():
            yield key, entry.value

    def clear(self) -> None:
        self._entries.clear()
        self._total_weight = 0.0

