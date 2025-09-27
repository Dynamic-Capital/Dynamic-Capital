"""Real-time market mover synchronisation utilities."""

from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import isclose
from typing import List, Protocol, Sequence

from .supabase_sync import SupabaseTableWriter

__all__ = [
    "MomentumDataPoint",
    "MomentumProvider",
    "MarketMoversSyncJob",
]


@dataclass(slots=True)
class MomentumDataPoint:
    """Represents a single real-time momentum snapshot."""

    symbol: str
    display: str
    score: float
    classification: str | None = None
    updated_at: datetime | None = None


class MomentumProvider(Protocol):  # pragma: no cover - behaviour defined by implementations
    """Interface for adapters that fetch real-time momentum data."""

    def fetch(self) -> Sequence[MomentumDataPoint]:
        """Return the latest momentum readings for tracked instruments."""


_DEFAULT_THRESHOLDS: List[tuple[float, str]] = [
    (80.0, "Very Bullish"),
    (60.0, "Bullish"),
    (40.0, "Bearish"),
    (0.0, "Very Bearish"),
]


@dataclass(slots=True)
class MarketMoversSyncJob:
    """Fetches momentum data and upserts it into the Supabase cache."""

    provider: MomentumProvider
    writer: SupabaseTableWriter
    score_min: float = 0.0
    thresholds: Sequence[tuple[float, str]] = tuple(_DEFAULT_THRESHOLDS)
    _threshold_values: tuple[float, ...] = field(init=False, repr=False, default=())
    _threshold_labels: tuple[str, ...] = field(init=False, repr=False, default=())

    def __post_init__(self) -> None:
        """Pre-compute sorted threshold data for O(log n) classification."""

        cleaned: list[tuple[float, str]] = []
        for raw_threshold, label in self.thresholds:
            try:
                threshold = float(raw_threshold)
            except (TypeError, ValueError):
                continue
            cleaned.append((threshold, str(label)))

        if not cleaned:
            self._threshold_values = ()
            self._threshold_labels = ()
            return

        cleaned.sort(key=lambda item: item[0])
        deduped: list[tuple[float, str]] = []
        for threshold, label in cleaned:
            if deduped and isclose(threshold, deduped[-1][0], rel_tol=0.0, abs_tol=1e-9):
                deduped[-1] = (threshold, label)
            else:
                deduped.append((threshold, label))

        self._threshold_values = tuple(threshold for threshold, _ in deduped)
        self._threshold_labels = tuple(label for _, label in deduped)

    def run(self) -> int:
        """Fetch, normalise, and persist the latest market movers dataset."""

        entries = [
            self._normalise(entry)
            for entry in self.provider.fetch()
            if entry.score >= self.score_min
        ]
        entries.sort(key=lambda entry: entry["score"], reverse=True)
        return self.writer.upsert(entries)

    def _normalise(self, entry: MomentumDataPoint) -> dict[str, object]:
        score = float(max(self.score_min, min(entry.score, 100.0)))
        classification = entry.classification or self._classify(score)
        updated_at = entry.updated_at or datetime.now(tz=timezone.utc)
        return {
            "symbol": entry.symbol,
            "display": entry.display,
            "score": round(score, 4),
            "classification": classification,
            "updated_at": updated_at,
        }

    def _classify(self, score: float) -> str:
        if not self._threshold_values:
            return "Neutral"

        index = bisect_right(self._threshold_values, score) - 1
        if index < 0:
            index = 0
        return self._threshold_labels[index]
