from __future__ import annotations

"""Asynchronous breadth-first crawler with pluggable fetch and parsing stages."""

from asyncio import CancelledError, Event, Queue, create_task, gather, get_running_loop
from dataclasses import dataclass
from inspect import isawaitable
from time import perf_counter
from types import MappingProxyType
from typing import (
    Awaitable,
    Callable,
    Iterable,
    Mapping,
    MutableMapping,
    MutableSet,
    Sequence,
)
from urllib.error import HTTPError, URLError
from urllib.parse import urldefrag, urljoin, urlsplit
from urllib.request import Request, urlopen

__all__ = [
    "CrawlPlan",
    "FetchPayload",
    "FetchResult",
    "DynamicCrawler",
]


@dataclass(frozen=True, slots=True)
class CrawlPlan:
    """Description of a crawl task waiting to be fetched."""

    url: str
    depth: int


@dataclass(frozen=True, slots=True)
class FetchPayload:
    """Raw response information returned by the fetcher."""

    status_code: int | None
    headers: Mapping[str, str]
    content: bytes | None
    elapsed: float | None = None
    error: Exception | None = None


@dataclass(frozen=True, slots=True)
class FetchResult:
    """Finalised crawl result distributed to consumers."""

    url: str
    depth: int
    status_code: int | None
    headers: Mapping[str, str]
    content: bytes | None
    elapsed: float | None
    error: Exception | None = None

    def text(self, encoding: str | None = None, errors: str = "strict") -> str:
        """Decode the response body to text using best-effort charset detection."""

        if self.content is None:
            return ""

        text_encoding = encoding
        if text_encoding is None:
            content_type = self.headers.get("content-type") if self.headers else None
            if content_type:
                for part in content_type.split(";"):
                    part = part.strip()
                    if part.lower().startswith("charset="):
                        text_encoding = part.split("=", 1)[1].strip()
                        break
        if text_encoding is None:
            text_encoding = "utf-8"

        return self.content.decode(text_encoding, errors=errors)


Fetcher = Callable[[str], Awaitable[FetchPayload]]
LinkExtractor = Callable[[FetchResult], Iterable[str]]
UrlNormaliser = Callable[[str, str | None], str | None]
ResultCallback = Callable[[FetchResult], Awaitable[None] | None]


class DynamicCrawler:
    """Coordinate asynchronous crawling with configurable behaviour."""

    def __init__(
        self,
        *,
        max_depth: int = 1,
        max_concurrency: int = 5,
        user_agent: str = "DynamicCrawler/1.0",
        request_timeout: float | None = 10.0,
        fetcher: Fetcher | None = None,
        link_extractor: LinkExtractor | None = None,
        url_normaliser: UrlNormaliser | None = None,
    ) -> None:
        if max_depth < 0:
            raise ValueError("max_depth must be non-negative")
        if max_concurrency <= 0:
            raise ValueError("max_concurrency must be a positive integer")

        self._max_depth = max_depth
        self._max_concurrency = max_concurrency
        self._user_agent = user_agent
        self._request_timeout = request_timeout
        self._fetcher = fetcher or self._default_fetcher
        self._link_extractor = link_extractor or self._default_link_extractor
        self._url_normaliser = url_normaliser or self._default_url_normaliser

    async def crawl(
        self,
        seeds: Iterable[str],
        *,
        limit: int | None = None,
        on_result: ResultCallback | None = None,
    ) -> list[FetchResult]:
        """Crawl from the provided seed URLs and return collected results."""

        queue: Queue[CrawlPlan] = Queue()
        seen: MutableSet[str] = set()
        results: list[FetchResult] = []
        stop_event = Event()

        for seed in seeds:
            normalised = self._url_normaliser(seed, None)
            if not normalised:
                continue
            if normalised in seen:
                continue
            seen.add(normalised)
            await queue.put(CrawlPlan(url=normalised, depth=0))

        if queue.empty():
            return []

        async def worker() -> None:
            while True:
                try:
                    plan = await queue.get()
                except CancelledError:
                    break
                if stop_event.is_set():
                    queue.task_done()
                    continue

                if limit is not None and stop_event.is_set():
                    queue.task_done()
                    continue

                fetch_result = await self._execute_fetch(plan)
                results.append(fetch_result)

                if on_result is not None:
                    callback_result = on_result(fetch_result)
                    if isawaitable(callback_result):
                        await callback_result  # type: ignore[arg-type]

                if limit is not None and len(results) >= limit:
                    stop_event.set()

                if (
                    not stop_event.is_set()
                    and fetch_result.error is None
                    and fetch_result.content
                    and plan.depth < self._max_depth
                ):
                    for link in self._link_extractor(fetch_result):
                        next_url = self._url_normaliser(link, fetch_result.url)
                        if not next_url or next_url in seen:
                            continue
                        seen.add(next_url)
                        await queue.put(CrawlPlan(url=next_url, depth=plan.depth + 1))

                queue.task_done()

                if stop_event.is_set() and queue.empty():
                    break

        workers = [create_task(worker()) for _ in range(self._max_concurrency)]

        await queue.join()

        stop_event.set()
        for worker in workers:
            worker.cancel()

        await gather(*workers, return_exceptions=True)

        return results if limit is None else results[:limit]

    async def _execute_fetch(self, plan: CrawlPlan) -> FetchResult:
        try:
            payload = await self._fetcher(plan.url)
        except Exception as exc:  # pragma: no cover - network failures are acceptable
            return FetchResult(
                url=plan.url,
                depth=plan.depth,
                status_code=None,
                headers=MappingProxyType({}),
                content=None,
                elapsed=None,
                error=exc,
            )

        headers = MappingProxyType(dict(payload.headers)) if payload.headers else MappingProxyType({})

        return FetchResult(
            url=plan.url,
            depth=plan.depth,
            status_code=payload.status_code,
            headers=headers,
            content=payload.content,
            elapsed=payload.elapsed,
            error=payload.error,
        )

    async def _default_fetcher(self, url: str) -> FetchPayload:
        loop = get_running_loop()
        return await loop.run_in_executor(None, self._sync_fetch, url)

    def _sync_fetch(self, url: str) -> FetchPayload:
        request = Request(url, headers={"User-Agent": self._user_agent})
        start = perf_counter()
        try:
            with urlopen(request, timeout=self._request_timeout) as response:
                content = response.read()
                status_code = response.getcode()
                headers: MutableMapping[str, str] = {
                    str(key).lower(): str(value)
                    for key, value in response.headers.items()
                }
        except (HTTPError, URLError) as exc:
            elapsed = perf_counter() - start
            return FetchPayload(
                status_code=getattr(exc, "code", None),
                headers=MappingProxyType({}),
                content=None,
                elapsed=elapsed,
                error=exc,
            )
        except Exception as exc:  # pragma: no cover - unexpected errors bubble up to callers
            elapsed = perf_counter() - start
            return FetchPayload(
                status_code=None,
                headers=MappingProxyType({}),
                content=None,
                elapsed=elapsed,
                error=exc,
            )
        elapsed = perf_counter() - start
        return FetchPayload(
            status_code=status_code,
            headers=MappingProxyType(dict(headers)),
            content=content,
            elapsed=elapsed,
        )

    @staticmethod
    def _default_link_extractor(result: FetchResult) -> Iterable[str]:
        from html.parser import HTMLParser

        class _LinkParser(HTMLParser):
            def __init__(self) -> None:
                super().__init__()
                self.links: list[str] = []

            def handle_starttag(self, tag: str, attrs: Sequence[tuple[str, str | None]]) -> None:
                if tag.lower() != "a":
                    return
                for name, value in attrs:
                    if name.lower() == "href" and value:
                        self.links.append(value)
                        break

        if not result.content:
            return []

        parser = _LinkParser()
        try:
            parser.feed(result.text(errors="ignore"))
        except Exception:
            return []
        return parser.links

    @staticmethod
    def _default_url_normaliser(candidate: str, parent: str | None) -> str | None:
        candidate = candidate.strip()
        if not candidate:
            return None

        lowered = candidate.lower()
        if lowered.startswith("javascript:") or lowered.startswith("mailto:"):
            return None

        base = parent or ""
        absolute = urljoin(base, candidate)
        if not absolute:
            return None

        scheme = urlsplit(absolute).scheme.lower()
        if scheme not in {"http", "https"}:
            return None

        return urldefrag(absolute)[0]
