"""Real-time market mover synchronisation utilities."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
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
        for threshold, label in self.thresholds:
            if score >= threshold:
                return label
        if not self.thresholds:
            return "Neutral"
        return self.thresholds[-1][1]
