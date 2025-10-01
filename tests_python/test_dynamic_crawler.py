"""Tests for the dynamic crawler orchestration engine."""

from __future__ import annotations

import asyncio
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dynamic_agents
import dynamic_bots
import dynamic_builders
import dynamic_helpers
import dynamic_keepers
from dynamic_crawl.crawler import DynamicCrawler, FetchPayload, FetchResult


def test_crawler_respects_limit_and_deduplication() -> None:
    pages: dict[str, list[str]] = {
        "https://root": ["https://child-1", "https://child-2"],
        "https://child-1": ["https://grandchild"],
        "https://child-2": [],
        "https://grandchild": [],
    }

    fetch_calls: list[str] = []

    async def fetcher(url: str) -> FetchPayload:
        fetch_calls.append(url)
        return FetchPayload(status_code=200, headers={}, content=b"", elapsed=0.01)

    def link_extractor(result: FetchResult) -> list[str]:
        return pages.get(result.url, [])

    crawler = DynamicCrawler(
        max_depth=3,
        max_concurrency=1,
        fetcher=fetcher,
        link_extractor=link_extractor,  # type: ignore[arg-type]
        url_normaliser=lambda candidate, parent: candidate,
    )

    results = asyncio.run(crawler.crawl(["https://root"], limit=2))

    assert [result.url for result in results] == ["https://root", "https://child-1"]
    assert fetch_calls == ["https://root", "https://child-1"]


def test_crawler_retries_failures_before_surface() -> None:
    attempts = defaultdict(int)

    async def flaky_fetcher(url: str) -> FetchPayload:
        attempts[url] += 1
        if attempts[url] < 2:
            raise RuntimeError("temporary network issue")
        return FetchPayload(status_code=200, headers={}, content=b"ok", elapsed=0.01)

    crawler = DynamicCrawler(
        max_depth=0,
        fetcher=flaky_fetcher,
        url_normaliser=lambda candidate, parent: candidate,
        retry_attempts=2,
        backoff_factor=0.0,
    )

    results = asyncio.run(crawler.crawl(["https://retry"], limit=None))

    assert len(results) == 1
    assert results[0].error is None
    assert attempts["https://retry"] == 2


def test_should_follow_filters_links() -> None:
    pages: dict[str, list[str]] = {
        "https://root": ["https://keep", "https://skip"],
        "https://keep": [],
        "https://skip": [],
    }

    async def fetcher(url: str) -> FetchPayload:
        return FetchPayload(status_code=200, headers={}, content=b"", elapsed=0.01)

    def link_extractor(result: FetchResult) -> list[str]:
        return pages.get(result.url, [])

    def should_follow(result: FetchResult, link: str) -> bool:
        return "skip" not in link

    crawler = DynamicCrawler(
        max_depth=1,
        max_concurrency=2,
        fetcher=fetcher,
        link_extractor=link_extractor,  # type: ignore[arg-type]
        url_normaliser=lambda candidate, parent: candidate,
        should_follow=should_follow,  # type: ignore[arg-type]
    )

    results = asyncio.run(crawler.crawl(["https://root"], limit=None))

    visited = {result.url for result in results}
    assert visited == {"https://root", "https://keep"}


def test_crawler_reexported_via_compatibility_packages() -> None:
    from dynamic_crawl import CrawlPlan, FetchPayload as PublicFetchPayload, FetchResult as PublicFetchResult

    modules = [
        dynamic_agents,
        dynamic_builders,
        dynamic_keepers,
        dynamic_helpers,
        dynamic_bots,
    ]

    for module in modules:
        assert getattr(module, "DynamicCrawler") is DynamicCrawler
        assert getattr(module, "CrawlPlan") is CrawlPlan
        assert getattr(module, "FetchPayload") is PublicFetchPayload
        assert getattr(module, "FetchResult") is PublicFetchResult

