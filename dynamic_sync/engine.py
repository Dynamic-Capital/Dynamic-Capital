"""Dynamic synchronisation and latency monitoring."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import fmean, pstdev
from typing import Deque, Iterable, Mapping, MutableMapping

__all__ = [
    "SyncSample",
    "SyncWindow",
    "SyncStatus",
    "DynamicSync",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_source(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("source must not be empty")
    return cleaned


def _ensure_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(slots=True)
class SyncSample:
    """Single synchronisation heartbeat."""

    source: str
    latency: float
    offset: float = 0.0
    captured_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.source = _normalise_source(self.source)
        self.latency = max(float(self.latency), 0.0)
        self.offset = float(self.offset)
        self.captured_at = _ensure_timestamp(self.captured_at)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "source": self.source,
            "latency": self.latency,
            "offset": self.offset,
            "captured_at": self.captured_at.isoformat(),
        }


@dataclass(slots=True)
class SyncWindow:
    """Rolling window of sync samples for a source."""

    horizon: timedelta
    samples: Deque[SyncSample] = field(default_factory=deque)

    def __post_init__(self) -> None:
        if isinstance(self.horizon, (int, float)):
            self.horizon = timedelta(seconds=float(self.horizon))
        if self.horizon <= timedelta(0):
            raise ValueError("horizon must be positive")

    def add(self, sample: SyncSample) -> None:
        self.samples.append(sample)
        self._expire(sample.captured_at)

    def extend(self, samples: Iterable[SyncSample]) -> None:
        for sample in samples:
            self.add(sample)

    def _expire(self, now: datetime | None = None) -> None:
        cutoff = (now or _utcnow()) - self.horizon
        while self.samples and self.samples[0].captured_at < cutoff:
            self.samples.popleft()

    def latency_stats(self) -> tuple[float, float]:
        if not self.samples:
            return (0.0, 0.0)
        values = [sample.latency for sample in self.samples]
        return fmean(values), pstdev(values) if len(values) > 1 else 0.0

    def offset_stats(self) -> tuple[float, float]:
        if not self.samples:
            return (0.0, 0.0)
        values = [sample.offset for sample in self.samples]
        return fmean(values), pstdev(values) if len(values) > 1 else 0.0


@dataclass(slots=True)
class SyncStatus:
    """Aggregated synchronisation health."""

    source: str
    average_latency: float
    latency_stability: float
    average_offset: float
    offset_stability: float
    locked: bool

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "source": self.source,
            "average_latency": self.average_latency,
            "latency_stability": self.latency_stability,
            "average_offset": self.average_offset,
            "offset_stability": self.offset_stability,
            "locked": self.locked,
        }


@dataclass(slots=True)
class DynamicSync:
    """Coordinates synchronisation data across market services."""

    horizon: timedelta = field(default_factory=lambda: timedelta(minutes=3))
    max_jitter: float = 0.35
    offset_tolerance: float = 0.2
    _windows: dict[str, SyncWindow] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        if isinstance(self.horizon, (int, float)):
            self.horizon = timedelta(seconds=float(self.horizon))
        if self.horizon <= timedelta(0):
            raise ValueError("horizon must be positive")
        if self.max_jitter < 0:
            raise ValueError("max_jitter must be non-negative")
        if self.offset_tolerance < 0:
            raise ValueError("offset_tolerance must be non-negative")

    def record(self, sample: SyncSample) -> None:
        window = self._windows.setdefault(sample.source, SyncWindow(self.horizon))
        window.add(sample)

    def ingest(self, samples: Iterable[SyncSample]) -> None:
        for sample in samples:
            self.record(sample)

    def status(self) -> tuple[SyncStatus, ...]:
        statuses: list[SyncStatus] = []
        for source, window in self._windows.items():
            avg_latency, latency_stdev = window.latency_stats()
            avg_offset, offset_stdev = window.offset_stats()
            locked = avg_latency <= self.max_jitter and abs(avg_offset) <= self.offset_tolerance
            statuses.append(
                SyncStatus(
                    source=source,
                    average_latency=avg_latency,
                    latency_stability=latency_stdev,
                    average_offset=avg_offset,
                    offset_stability=offset_stdev,
                    locked=locked,
                )
            )
        return tuple(statuses)

    def health(self) -> Mapping[str, Mapping[str, object]]:
        return {status.source: status.as_dict() for status in self.status()}
