from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Mapping

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.sentiment_feeds import (
    AlternativeMeFearGreedCollector,
    FinnhubNewsSentimentCollector,
    MarketHeadline,
    MarketNewsSyncJob,
    NewsApiTopHeadlinesCollector,
    RedditSentimentCollector,
    SentimentSignal,
    SentimentSyncJob,
    TwitterSentimentCollector,
)
from algorithms.python.supabase_sync import SupabaseTableWriter


class DummyFetcher:
    def __init__(self, responses: list[Mapping[str, Any]]) -> None:
        self._responses = list(responses)

    def __call__(self, *_args: Any, **_kwargs: Any) -> Mapping[str, Any]:
        try:
            return self._responses.pop(0)
        except IndexError:  # pragma: no cover - defensive guard
            raise AssertionError("unexpected fetch call")


class MemoryWriter:
    def __init__(self) -> None:
        self.rows: list[Mapping[str, Any]] = []

    def upsert(self, rows):
        self.rows = list(rows)
        return len(self.rows)


def test_alternative_me_collector_normalises_payload():
    collector = AlternativeMeFearGreedCollector(
        fetcher=DummyFetcher(
            [
                {
                    "data": [
                        {"value": "64", "timestamp": "1711046400"},
                    ]
                }
            ]
        )
    )

    signals = collector.collect()

    assert len(signals) == 1
    signal = signals[0]
    assert signal.source == "alternative.me"
    assert signal.symbol == "FNG"
    assert signal.sentiment == 64.0
    assert signal.long_percent == 64.0
    assert signal.short_percent == 36.0
    assert signal.observed_at.date().isoformat() == "2024-03-21"


def test_finnhub_collector_uses_company_score_when_missing_percentages():
    collector = FinnhubNewsSentimentCollector(
        symbols=["BTCUSD"],
        api_key="token",
        fetcher=DummyFetcher(
            [
                {
                    "companyNewsScore": 0.73,
                    "sentiment": {},
                }
            ]
        ),
    )

    [signal] = collector.collect()
    assert signal.source == "finnhub"
    assert signal.symbol == "BTCUSD"
    assert signal.sentiment == pytest.approx(73.0)
    assert signal.long_percent == pytest.approx(73.0)
    assert signal.short_percent == pytest.approx(27.0)


def test_newsapi_collector_normalises_headlines():
    collector = NewsApiTopHeadlinesCollector(
        api_key="token",
        fetcher=DummyFetcher(
            [
                {
                    "articles": [
                        {
                            "title": "Dollar climbs on rate jitters",
                            "publishedAt": "2024-05-01T12:00:00Z",
                            "source": {"name": "Financial Times"},
                        },
                        {
                            "title": None,
                            "publishedAt": "2024-05-01T12:00:00Z",
                        },
                    ]
                }
            ]
        ),
    )

    headlines = collector.collect()
    assert len(headlines) == 1
    headline = headlines[0]
    assert headline.source == "Financial Times"
    assert headline.headline == "Dollar climbs on rate jitters"
    assert headline.event_time.isoformat() == "2024-05-01T12:00:00+00:00"
    assert headline.impact == "medium"
    assert isinstance(headline.stable_id(), int)


def test_reddit_collector_scores_mentions():
    collector = RedditSentimentCollector(
        symbols=["EURUSD"],
        fetcher=DummyFetcher(
            [
                {
                    "data": {
                        "children": [
                            {
                                "data": {
                                    "title": "EURUSD looks like a breakout",
                                    "selftext": "Long bias here",
                                }
                            },
                            {
                                "data": {
                                    "title": "Other market",
                                    "selftext": "No match",
                                }
                            },
                        ]
                    }
                },
                {"data": {"children": []}},
            ]
        ),
        subreddits=("forex", "macro"),
    )

    signals = collector.collect()
    assert len(signals) == 1
    signal = signals[0]
    assert signal.source == "reddit"
    assert signal.symbol == "EURUSD"
    assert signal.sentiment == 100.0
    assert signal.long_percent == 100.0
    assert signal.short_percent == 0.0


def test_twitter_collector_scans_tweets():
    collector = TwitterSentimentCollector(
        symbols=["BTC"],
        fetcher=DummyFetcher(
            [
                {
                    "data": [
                        {"text": "$BTC looks bull flag"},
                        {"text": "BTC nothing"},
                        {"text": "ETH breakout"},
                    ]
                }
            ]
        ),
    )

    signals = collector.collect()
    assert len(signals) == 1
    signal = signals[0]
    assert signal.source == "twitter"
    assert signal.symbol == "BTC"
    assert signal.sentiment == 100.0
    assert signal.long_percent == 100.0
    assert signal.short_percent == 0.0


def test_sentiment_sync_job_serialises_payload():
    memory = MemoryWriter()

    class Proxy(SupabaseTableWriter):
        def __init__(self) -> None:  # pragma: no cover - simple proxy
            super().__init__(table="sentiment", conflict_column="source,symbol")

        def upsert(self, rows):  # type: ignore[override]
            return memory.upsert(rows)

    job = SentimentSyncJob(writer=Proxy())
    observed = datetime(2024, 5, 1, 12, tzinfo=timezone.utc)
    signals = [
        SentimentSignal(
            source="alt",
            symbol="SPY",
            sentiment=55.0,
            long_percent=55.0,
            short_percent=45.0,
            observed_at=observed,
        )
    ]

    count = job.run(signals)
    assert count == 1
    stored = memory.rows[0]
    assert stored["source"] == "alt"
    assert stored["symbol"] == "SPY"
    assert stored["sentiment"] == 55.0
    assert stored["created_at"] == observed


def test_market_news_sync_job_serialises_headlines():
    memory = MemoryWriter()

    class Proxy(SupabaseTableWriter):
        def __init__(self) -> None:  # pragma: no cover - simple proxy
            super().__init__(table="market_news", conflict_column="id")

        def upsert(self, rows):  # type: ignore[override]
            return memory.upsert(rows)

    job = MarketNewsSyncJob(writer=Proxy())
    event_time = datetime(2024, 5, 1, 12, tzinfo=timezone.utc)
    headlines = [
        MarketHeadline(
            source="news",
            headline="Rate cuts delayed",
            event_time=event_time,
            impact="high",
        )
    ]

    count = job.run(headlines)
    assert count == 1
    stored = memory.rows[0]
    assert stored["id"] == headlines[0].stable_id()
    assert stored["headline"] == "Rate cuts delayed"
    assert stored["impact"] == "high"
