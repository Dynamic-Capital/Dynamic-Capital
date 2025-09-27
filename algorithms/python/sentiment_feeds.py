"""Market sentiment and news collectors for Supabase sync jobs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Callable, Iterable, Mapping, MutableMapping, Protocol, Sequence
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .supabase_sync import SupabaseTableWriter

__all__ = [
    "SentimentSignal",
    "MarketHeadline",
    "HttpJsonFetcher",
    "AlternativeMeFearGreedCollector",
    "FinnhubNewsSentimentCollector",
    "NewsApiTopHeadlinesCollector",
    "RedditSentimentCollector",
    "TwitterSentimentCollector",
    "SentimentSyncJob",
    "MarketNewsSyncJob",
]


@dataclass(slots=True)
class SentimentSignal:
    """Normalized sentiment payload stored in Supabase."""

    source: str
    symbol: str
    sentiment: float
    long_percent: float
    short_percent: float
    observed_at: datetime = field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )


@dataclass(slots=True)
class MarketHeadline:
    """Normalized market news record for Supabase."""

    source: str
    headline: str
    event_time: datetime
    impact: str | None = None
    currency: str | None = None
    forecast: str | None = None
    actual: str | None = None
    created_at: datetime = field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )

    def stable_id(self) -> int:
        payload = f"{self.source}|{self.headline}|{self.event_time.isoformat()}".encode(
            "utf-8"
        )
        digest = hashlib.blake2b(payload, digest_size=8).digest()
        return int.from_bytes(digest, "big", signed=False)


class HttpJsonFetcher(Protocol):
    """Protocol for HTTP JSON fetchers used by collectors."""

    def __call__(
        self,
        url: str,
        *,
        headers: Mapping[str, str] | None = None,
        params: Mapping[str, str] | None = None,
    ) -> Mapping[str, Any]:
        ...


def _default_fetcher(
    url: str,
    *,
    headers: Mapping[str, str] | None = None,
    params: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(url + query, headers=dict(headers or {}))
    with urlopen(request) as response:  # type: ignore[arg-type]
        body = response.read()
    return json.loads(body.decode("utf-8"))


def _clamp(value: float, *, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(min(value, maximum), minimum)


def _score_to_percent(score: float) -> float:
    return _clamp(round(score * 100.0, 4))


class AlternativeMeFearGreedCollector:
    """Collect the Alternative.me Fear & Greed index."""

    def __init__(
        self,
        *,
        fetcher: HttpJsonFetcher = _default_fetcher,
        endpoint: str = "https://api.alternative.me/fng/",
        symbol: str = "FNG",
    ) -> None:
        self._fetcher = fetcher
        self._endpoint = endpoint
        self._symbol = symbol

    def collect(self) -> Sequence[SentimentSignal]:
        payload = self._fetcher(self._endpoint, params={"limit": "1"})
        data = payload.get("data")
        if not isinstance(data, list) or not data:
            return []
        entry = data[0]
        try:
            value = float(entry.get("value", 0.0))
        except (TypeError, ValueError):  # pragma: no cover - defensive guard
            value = 0.0
        timestamp = entry.get("timestamp")
        observed_at = datetime.now(tz=timezone.utc)
        if isinstance(timestamp, str) and timestamp.isdigit():
            observed_at = datetime.fromtimestamp(int(timestamp), tz=timezone.utc)
        sentiment = _clamp(round(value, 4))
        long_percent = sentiment
        short_percent = _clamp(round(100.0 - sentiment, 4))
        return [
            SentimentSignal(
                source="alternative.me",
                symbol=self._symbol,
                sentiment=sentiment,
                long_percent=long_percent,
                short_percent=short_percent,
                observed_at=observed_at,
            )
        ]


class FinnhubNewsSentimentCollector:
    """Collect symbol sentiment from Finnhub's news sentiment API."""

    def __init__(
        self,
        symbols: Sequence[str],
        *,
        api_key: str,
        fetcher: HttpJsonFetcher = _default_fetcher,
        endpoint: str = "https://finnhub.io/api/v1/news-sentiment",
    ) -> None:
        if not symbols:
            raise ValueError("at least one symbol must be supplied")
        self._symbols = tuple(symbols)
        self._api_key = api_key
        self._fetcher = fetcher
        self._endpoint = endpoint

    def collect(self) -> Sequence[SentimentSignal]:
        signals: list[SentimentSignal] = []
        for symbol in self._symbols:
            params = {"symbol": symbol, "token": self._api_key}
            payload = self._fetcher(self._endpoint, params=params)
            sentiment = payload.get("sentiment", {})
            bullish = sentiment.get("bullishPercent")
            bearish = sentiment.get("bearishPercent")
            company_score = payload.get("companyNewsScore")
            long_percent = None
            short_percent = None
            if isinstance(bullish, (int, float)):
                long_percent = _clamp(round(float(bullish), 4))
            if isinstance(bearish, (int, float)):
                short_percent = _clamp(round(float(bearish), 4))
            sentiment_score: float
            if long_percent is not None:
                sentiment_score = long_percent
            elif isinstance(company_score, (int, float)):
                sentiment_score = _score_to_percent(float(company_score))
            else:
                sentiment_score = 50.0
            if short_percent is None:
                short_percent = _clamp(round(100.0 - sentiment_score, 4))
            if long_percent is None:
                long_percent = _clamp(round(sentiment_score, 4))
            signals.append(
                SentimentSignal(
                    source="finnhub",
                    symbol=symbol,
                    sentiment=sentiment_score,
                    long_percent=long_percent,
                    short_percent=short_percent,
                )
            )
        return signals


class NewsApiTopHeadlinesCollector:
    """Collect market headlines from NewsAPI."""

    def __init__(
        self,
        *,
        api_key: str,
        fetcher: HttpJsonFetcher = _default_fetcher,
        endpoint: str = "https://newsapi.org/v2/top-headlines",
        category: str = "business",
        language: str = "en",
        page_size: int = 50,
    ) -> None:
        self._api_key = api_key
        self._fetcher = fetcher
        self._endpoint = endpoint
        self._category = category
        self._language = language
        self._page_size = page_size

    def collect(self) -> Sequence[MarketHeadline]:
        params = {
            "category": self._category,
            "language": self._language,
            "pageSize": str(self._page_size),
            "apiKey": self._api_key,
        }
        payload = self._fetcher(self._endpoint, params=params)
        articles = payload.get("articles")
        if not isinstance(articles, list):
            return []
        headlines: list[MarketHeadline] = []
        for article in articles:
            title = article.get("title")
            published_at = article.get("publishedAt")
            source = (article.get("source") or {}).get("name") or article.get("author")
            if not title or not published_at:
                continue
            try:
                event_time = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            except ValueError:  # pragma: no cover - API anomaly guard
                continue
            headlines.append(
                MarketHeadline(
                    source=source or "newsapi",
                    headline=title,
                    event_time=event_time,
                    impact="medium",
                )
            )
        return headlines


class _KeywordClassifier:
    def __init__(self, *, bullish: Iterable[str], bearish: Iterable[str]):
        self._bullish = tuple(token.lower() for token in bullish)
        self._bearish = tuple(token.lower() for token in bearish)

    def classify(self, text: str) -> tuple[int, int]:
        normalised = text.lower()
        bull = 1 if any(token in normalised for token in self._bullish) else 0
        bear = 1 if any(token in normalised for token in self._bearish) else 0
        return bull, bear


class RedditSentimentCollector:
    """Estimate sentiment for symbols based on Reddit discussions."""

    def __init__(
        self,
        symbols: Sequence[str],
        *,
        fetcher: HttpJsonFetcher = _default_fetcher,
        classifier: _KeywordClassifier | None = None,
        subreddits: Sequence[str] = ("wallstreetbets", "forex"),
    ) -> None:
        self._symbols = tuple(symbols)
        self._fetcher = fetcher
        self._classifier = classifier or _KeywordClassifier(
            bullish=("long", "bull", "buy", "call"),
            bearish=("short", "bear", "sell", "put"),
        )
        self._subreddits = tuple(subreddits)

    def collect(self) -> Sequence[SentimentSignal]:
        posts: list[Mapping[str, Any]] = []
        for subreddit in self._subreddits:
            endpoint = f"https://www.reddit.com/r/{subreddit}/new.json"
            payload = self._fetcher(endpoint, params={"limit": "100"})
            data = payload.get("data", {})
            children = data.get("children", [])
            for child in children:
                post = child.get("data")
                if isinstance(post, Mapping):
                    posts.append(post)
        if not posts:
            return []
        now = datetime.now(tz=timezone.utc)
        signals: list[SentimentSignal] = []
        for symbol in self._symbols:
            bullish_votes = 0
            bearish_votes = 0
            mentions = 0
            for post in posts:
                title = str(post.get("title", ""))
                body = str(post.get("selftext", ""))
                content = f"{title} {body}".strip()
                if not content:
                    continue
                token = symbol.upper()
                if token not in content.upper() and f"${token}" not in content.upper():
                    continue
                mentions += 1
                bull, bear = self._classifier.classify(content)
                bullish_votes += bull
                bearish_votes += bear
            if mentions == 0:
                continue
            total_votes = max(bullish_votes + bearish_votes, 1)
            long_percent = _clamp(round(bullish_votes / total_votes * 100.0, 4))
            short_percent = _clamp(round(bearish_votes / total_votes * 100.0, 4))
            sentiment = long_percent if long_percent > 0 else 50.0
            signals.append(
                SentimentSignal(
                    source="reddit",
                    symbol=symbol,
                    sentiment=sentiment,
                    long_percent=long_percent,
                    short_percent=short_percent,
                    observed_at=now,
                )
            )
        return signals


class TwitterSentimentCollector:
    """Estimate sentiment by scanning recent tweets for key phrases."""

    def __init__(
        self,
        symbols: Sequence[str],
        *,
        fetcher: HttpJsonFetcher = _default_fetcher,
        classifier: _KeywordClassifier | None = None,
        query: str = "(forex OR crypto) lang:en",
    ) -> None:
        self._symbols = tuple(symbols)
        self._fetcher = fetcher
        self._classifier = classifier or _KeywordClassifier(
            bullish=("bull", "breakout", "long", "buy", "call"),
            bearish=("bear", "breakdown", "short", "sell", "put"),
        )
        self._query = query

    def collect(self) -> Sequence[SentimentSignal]:
        url = "https://api.twitter.com/2/tweets/search/recent"
        payload = self._fetcher(
            url,
            params={
                "query": self._query,
                "max_results": "100",
                "tweet.fields": "created_at,public_metrics,text",
            },
        )
        tweets = payload.get("data")
        if not isinstance(tweets, list):
            return []
        now = datetime.now(tz=timezone.utc)
        signals: list[SentimentSignal] = []
        for symbol in self._symbols:
            bullish_votes = 0
            bearish_votes = 0
            mentions = 0
            token = symbol.upper()
            for tweet in tweets:
                text = tweet.get("text")
                if not isinstance(text, str):
                    continue
                upper = text.upper()
                if token not in upper and f"${token}" not in upper:
                    continue
                mentions += 1
                bull, bear = self._classifier.classify(text)
                bullish_votes += bull
                bearish_votes += bear
            if mentions == 0:
                continue
            total_votes = max(bullish_votes + bearish_votes, 1)
            long_percent = _clamp(round(bullish_votes / total_votes * 100.0, 4))
            short_percent = _clamp(round(bearish_votes / total_votes * 100.0, 4))
            sentiment = long_percent if long_percent > 0 else 50.0
            signals.append(
                SentimentSignal(
                    source="twitter",
                    symbol=symbol,
                    sentiment=sentiment,
                    long_percent=long_percent,
                    short_percent=short_percent,
                    observed_at=now,
                )
            )
        return signals


def _serialise_signal(signal: SentimentSignal) -> MutableMapping[str, Any]:
    return {
        "source": signal.source,
        "symbol": signal.symbol,
        "sentiment": round(signal.sentiment, 4),
        "long_percent": round(signal.long_percent, 4),
        "short_percent": round(signal.short_percent, 4),
        "created_at": signal.observed_at,
    }


def _serialise_headline(headline: MarketHeadline) -> MutableMapping[str, Any]:
    return {
        "id": headline.stable_id(),
        "source": headline.source,
        "headline": headline.headline,
        "event_time": headline.event_time,
        "impact": headline.impact,
        "currency": headline.currency,
        "forecast": headline.forecast,
        "actual": headline.actual,
        "created_at": headline.created_at,
    }


class SentimentSyncJob:
    """Persist sentiment signals into Supabase."""

    def __init__(self, *, writer: SupabaseTableWriter) -> None:
        self._writer = writer

    def run(self, signals: Iterable[SentimentSignal]) -> int:
        rows = [_serialise_signal(signal) for signal in signals]
        if not rows:
            return 0
        return self._writer.upsert(rows)


class MarketNewsSyncJob:
    """Persist market headlines into Supabase."""

    def __init__(self, *, writer: SupabaseTableWriter) -> None:
        self._writer = writer

    def run(self, headlines: Iterable[MarketHeadline]) -> int:
        rows = [_serialise_headline(headline) for headline in headlines]
        if not rows:
            return 0
        return self._writer.upsert(rows)
