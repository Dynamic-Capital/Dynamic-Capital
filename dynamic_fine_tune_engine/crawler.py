"""Composable crawlers for sourcing fine-tune records."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, Iterator, Mapping, MutableMapping, Sequence

from .engine import FineTuneRecord

CrawlerPayload = Mapping[str, object] | FineTuneRecord
CrawlerFetcher = Callable[[], Iterable[CrawlerPayload]]


@dataclass(slots=True)
class FineTuneCrawler:
    """Collect payloads from registered fetchers."""

    sources: MutableMapping[str, CrawlerFetcher] = field(default_factory=dict)

    def register(self, name: str, fetcher: CrawlerFetcher) -> None:
        if not callable(fetcher):  # pragma: no cover - defensive guard
            raise TypeError("fetcher must be callable")
        self.sources[name] = fetcher

    def crawl(self) -> Iterator[tuple[str, CrawlerPayload]]:
        for name, fetcher in self.sources.items():
            for payload in fetcher():
                yield name, payload

    def gather(self) -> Sequence[tuple[str, CrawlerPayload]]:
        return list(self.crawl())

