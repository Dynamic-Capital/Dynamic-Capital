from __future__ import annotations

from datetime import datetime, timezone

from algorithms.python.awesome_api import AwesomeAPIAutoMetrics
from algorithms.python.market_sentiment_sync import (
    AwesomeAPIMarketSentimentProvider,
    MarketSentimentSnapshot,
    MarketSentimentSyncJob,
    SentimentInstrument,
)


class DummyCalculator:
    def compute_metrics(self, pair, history=None, bars=None):  # pragma: no cover - simple stub
        assert pair == "USD-BRL"
        return AwesomeAPIAutoMetrics(
            pair=pair,
            sample_size=5,
            latest_close=102.0,
            previous_close=100.0,
            absolute_change=2.0,
            percentage_change=2.0,
            average_close=100.5,
            high=105.0,
            low=95.0,
            price_range=10.0,
            cumulative_return=0.05,
            average_daily_change=0.4,
            volatility=1.25,
            trend_strength=0.05,
        )


class MemoryWriter:
    def __init__(self):
        self.rows = []

    def upsert(self, rows):
        self.rows = list(rows)
        return len(self.rows)


def test_awesomeapi_sentiment_provider_derives_percentages():
    provider = AwesomeAPIMarketSentimentProvider(
        instruments=[SentimentInstrument(symbol="USDBRL", pair="USD-BRL")],
        calculator=DummyCalculator(),
        default_source="awesome",
    )

    snapshots = provider.fetch()

    assert len(snapshots) == 1
    snapshot = snapshots[0]
    assert snapshot.source == "awesome"
    assert snapshot.symbol == "USDBRL"
    assert snapshot.sentiment == snapshot.long_percent
    assert snapshot.sentiment == 51.2129
    assert snapshot.short_percent == 48.7871


def test_market_sentiment_sync_job_persists_rows():
    provider = DummyProvider()
    writer = MemoryWriter()
    job = MarketSentimentSyncJob(provider=provider, writer=writer)

    count = job.run()

    assert count == 1
    assert writer.rows[0]["symbol"] == "EURUSD"
    assert writer.rows[0]["sentiment"] == 60.0
    assert writer.rows[0]["longPercent"] == 60.0
    assert writer.rows[0]["shortPercent"] == 40.0
    assert writer.rows[0]["createdAt"].isoformat() == "2024-05-01T12:00:00+00:00"


class DummyProvider:
    def fetch(self):  # pragma: no cover - simple stub
        return [
            MarketSentimentSnapshot(
                source="awesome",
                symbol="EURUSD",
                sentiment=60.0,
                long_percent=60.0,
                short_percent=40.0,
                created_at=datetime(2024, 5, 1, 12, tzinfo=timezone.utc),
            )
        ]
