from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.market_movers_sync import (
    MarketMoversSyncJob,
    MomentumDataPoint,
)


class DummyProvider:
    def __init__(self, entries):
        self._entries = entries

    def fetch(self):
        return list(self._entries)


class MemoryWriter:
    def __init__(self):
        self.rows = []

    def upsert(self, rows):
        self.rows = list(rows)
        return len(self.rows)


def test_market_movers_sync_orders_and_classifies():
    provider = DummyProvider(
        [
            MomentumDataPoint(symbol="B", display="Asset B", score=42.4),
            MomentumDataPoint(symbol="A", display="Asset A", score=88.2),
            MomentumDataPoint(
                symbol="C",
                display="Asset C",
                score=25.0,
                classification="Very Bearish",
                updated_at=datetime(2024, 9, 1, tzinfo=timezone.utc),
            ),
        ]
    )
    writer = MemoryWriter()
    job = MarketMoversSyncJob(provider=provider, writer=writer)

    count = job.run()

    assert count == 3
    assert [row["symbol"] for row in writer.rows] == ["A", "B", "C"]
    assert writer.rows[0]["classification"] == "Very Bullish"
    assert writer.rows[1]["classification"] == "Bearish"
    # classification provided by the provider is preserved
    assert writer.rows[2]["classification"] == "Very Bearish"
    assert writer.rows[2]["updated_at"].isoformat() == "2024-09-01T00:00:00+00:00"


def test_market_movers_sync_respects_score_floor():
    provider = DummyProvider(
        [
            MomentumDataPoint(symbol="HIGH", display="High", score=90),
            MomentumDataPoint(symbol="LOW", display="Low", score=5),
        ]
    )
    writer = MemoryWriter()
    job = MarketMoversSyncJob(provider=provider, writer=writer, score_min=10)

    job.run()

    assert [row["symbol"] for row in writer.rows] == ["HIGH"]
    assert writer.rows[0]["score"] == pytest.approx(90)
