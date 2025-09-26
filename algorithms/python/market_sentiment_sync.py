"""AwesomeAPI-backed market sentiment synchronisation utilities."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol, Sequence

from .awesome_api import AwesomeAPIAutoCalculator, AwesomeAPIAutoMetrics
from .supabase_sync import SupabaseTableWriter

__all__ = [
    "SentimentInstrument",
    "MarketSentimentSnapshot",
    "MarketSentimentProvider",
    "AwesomeAPIMarketSentimentProvider",
    "MarketSentimentSyncJob",
]


@dataclass(slots=True)
class SentimentInstrument:
    """Configuration describing how to fetch sentiment for a market."""

    symbol: str
    pair: str
    source: str | None = None


@dataclass(slots=True)
class MarketSentimentSnapshot:
    """Calculated market sentiment snapshot ready for persistence."""

    source: str
    symbol: str
    sentiment: float
    long_percent: float
    short_percent: float
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


class MarketSentimentProvider(Protocol):  # pragma: no cover - interface definition
    """Interface for adapters that provide sentiment snapshots."""

    def fetch(self) -> Sequence[MarketSentimentSnapshot]:
        """Return the latest snapshots for configured instruments."""


@dataclass(slots=True)
class AwesomeAPIMarketSentimentProvider:
    """Compute sentiment metrics using AwesomeAPI analytics."""

    instruments: Sequence[SentimentInstrument]
    calculator: AwesomeAPIAutoCalculator = field(default_factory=AwesomeAPIAutoCalculator)
    default_source: str = "awesomeapi"

    def fetch(self) -> Sequence[MarketSentimentSnapshot]:
        snapshots = []
        for instrument in self.instruments:
            metrics = self.calculator.compute_metrics(instrument.pair)
            sentiment, long_percent, short_percent = self._derive_sentiment(metrics)
            snapshots.append(
                MarketSentimentSnapshot(
                    source=instrument.source or self.default_source,
                    symbol=instrument.symbol,
                    sentiment=sentiment,
                    long_percent=long_percent,
                    short_percent=short_percent,
                )
            )
        return snapshots

    def _derive_sentiment(
        self, metrics: AwesomeAPIAutoMetrics
    ) -> tuple[float, float, float]:
        if metrics.average_close:
            average_bias = (metrics.latest_close - metrics.average_close) / metrics.average_close
        else:  # pragma: no cover - guard against zero values from API
            average_bias = 0.0
        momentum = metrics.percentage_change / 100.0
        trend = metrics.trend_strength
        if metrics.latest_close:
            volatility_penalty = min(metrics.volatility / metrics.latest_close, 1.0)
        else:  # pragma: no cover - guard against zero values from API
            volatility_penalty = 0.0

        raw_score = (
            0.55 * average_bias
            + 0.3 * momentum
            + 0.25 * trend
            - 0.2 * volatility_penalty
        )
        raw_score = max(min(raw_score, 1.0), -1.0)

        long_ratio = (raw_score + 1.0) / 2.0
        long_percent = max(min(long_ratio * 100.0, 100.0), 0.0)
        short_percent = max(min((1.0 - long_ratio) * 100.0, 100.0), 0.0)
        sentiment = long_percent

        return (
            round(sentiment, 4),
            round(long_percent, 4),
            round(short_percent, 4),
        )


@dataclass(slots=True)
class MarketSentimentSyncJob:
    """Fetch sentiment snapshots and upsert them into Supabase."""

    provider: MarketSentimentProvider
    writer: SupabaseTableWriter

    def run(self) -> int:
        rows = [
            {
                "source": snapshot.source,
                "symbol": snapshot.symbol,
                "sentiment": round(snapshot.sentiment, 4),
                "longPercent": round(snapshot.long_percent, 4),
                "shortPercent": round(snapshot.short_percent, 4),
                "createdAt": snapshot.created_at,
            }
            for snapshot in self.provider.fetch()
        ]
        return self.writer.upsert(rows)
