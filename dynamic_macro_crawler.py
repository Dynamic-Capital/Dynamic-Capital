"""Crawling utilities for sourcing macro research context."""

from __future__ import annotations

import asyncio
from typing import Iterable

from dynamic_crawl import DynamicCrawler, FetchResult

__all__ = [
    "gather_macro_pages",
    "collect_macro_pages",
]


async def gather_macro_pages(
    urls: Iterable[str],
    *,
    crawler: DynamicCrawler | None = None,
    limit: int | None = None,
) -> dict[str, FetchResult]:
    """Fetch the provided URLs and return a mapping of URL → result."""

    local_crawler = crawler or DynamicCrawler(max_depth=0, max_concurrency=3)
    results = await local_crawler.crawl(urls, limit=limit)
    return {result.url: result for result in results}


def collect_macro_pages(
    urls: Iterable[str],
    *,
    crawler: DynamicCrawler | None = None,
    limit: int | None = None,
) -> dict[str, FetchResult]:
    """Synchronous helper that runs :func:`gather_macro_pages` using ``asyncio``."""

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(gather_macro_pages(urls, crawler=crawler, limit=limit))

    if loop.is_running():  # pragma: no cover - defensive branch for interactive use
        raise RuntimeError("collect_macro_pages cannot be called inside a running event loop")

    return loop.run_until_complete(gather_macro_pages(urls, crawler=crawler, limit=limit))
