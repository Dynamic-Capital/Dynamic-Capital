"""ForexFactory attachment loader leveraging the r.jina.ai proxy."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterator, Mapping, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from .engine import CorpusExtractionContext, ExtractionLoader

__all__ = [
    "ForexFactoryAttachment",
    "build_forexfactory_attachment_loader",
    "fetch_forexfactory_attachment_text",
    "parse_forexfactory_proxy_payload",
]

_JINA_PROXY_PREFIX = "https://r.jina.ai/"
_DEFAULT_USER_AGENT = "DynamicCorpusExtractor/1.0"


@dataclass(frozen=True, slots=True)
class ForexFactoryAttachment:
    """Representation of a ForexFactory attachment to be extracted."""

    url: str
    identifier: str


def _normalise_attachment_url(url: str) -> ForexFactoryAttachment:
    candidate = (url or "").strip()
    if not candidate:
        raise ValueError("attachment url must not be empty")

    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("attachment url must include http or https scheme")

    path = parsed.path.rstrip("/")
    identifier = path.split("/")[-1]
    if not identifier:
        raise ValueError("unable to derive identifier from attachment url")

    return ForexFactoryAttachment(url=candidate, identifier=identifier)


def _build_proxy_request(url: str, *, user_agent: str, timeout: float | None) -> Request:
    proxy_url = url if url.startswith(_JINA_PROXY_PREFIX) else f"{_JINA_PROXY_PREFIX}{url}"
    request = Request(proxy_url)
    request.add_header("User-Agent", user_agent)
    if timeout is not None and timeout <= 0:
        raise ValueError("timeout must be positive when provided")
    return request


def fetch_forexfactory_attachment_text(
    url: str,
    *,
    user_agent: str = _DEFAULT_USER_AGENT,
    timeout: float | None = 30.0,
) -> str:
    """Download and decode a ForexFactory attachment via the Jina proxy."""

    request = _build_proxy_request(url, user_agent=user_agent, timeout=timeout)
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = response.read()
    except HTTPError as error:  # pragma: no cover - network failure surface
        raise RuntimeError(
            f"ForexFactory attachment request failed with {error.code} {error.reason}"
        ) from error
    except URLError as error:  # pragma: no cover - network failure surface
        raise RuntimeError(f"ForexFactory attachment request failed: {error.reason}") from error

    try:
        return payload.decode("utf-8")
    except UnicodeDecodeError:
        return payload.decode("utf-8", errors="replace")


def parse_forexfactory_proxy_payload(
    payload: str,
) -> tuple[str | None, str | None, str | None, str]:
    """Extract metadata and markdown content from the proxy response."""

    normalised = (payload or "").replace("\r\n", "\n").strip()
    if not normalised:
        raise ValueError("payload must not be empty")

    marker = "Markdown Content:"
    header: str
    body: str
    if marker in normalised:
        header, body = normalised.split(marker, 1)
    else:
        header, body = "", normalised

    def _extract(label: str) -> str | None:
        token = f"{label}:"
        start = header.find(token)
        if start == -1:
            return None
        start += len(token)
        end = header.find("\n", start)
        value = header[start:end if end != -1 else None].strip()
        return value or None

    title = _extract("Title")
    source_url = _extract("URL Source")
    published = _extract("Published Time")
    content = body.strip()
    if not content:
        raise ValueError("markdown content extracted from payload is empty")

    return title, source_url, published, content


def build_forexfactory_attachment_loader(
    urls: Sequence[str],
    *,
    tags: Sequence[str] | None = ("forexfactory", "attachment"),
    fetch_text: Callable[[str], str] | None = None,
) -> ExtractionLoader:
    """Create a loader that streams ForexFactory attachments as documents."""

    attachments = tuple(_normalise_attachment_url(url) for url in urls)
    default_tags = tuple(tags or ())
    fetcher = fetch_text or fetch_forexfactory_attachment_text

    def loader(context: CorpusExtractionContext) -> Iterator[Mapping[str, object]]:
        remaining = context.limit
        for attachment in attachments:
            if remaining is not None and remaining <= 0:
                break

            raw_text = fetcher(attachment.url)
            title, source_url, published, content = parse_forexfactory_proxy_payload(raw_text)
            metadata: dict[str, object] = {"attachment_url": attachment.url}
            if title:
                metadata["title"] = title
            if source_url:
                metadata["source_url"] = source_url
            if published:
                metadata["published_time"] = published

            yield {
                "identifier": f"forexfactory-{attachment.identifier}",
                "content": content,
                "metadata": metadata,
                "tags": default_tags,
            }

            if remaining is not None:
                remaining -= 1

    return loader
