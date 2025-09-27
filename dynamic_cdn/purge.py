"""Cache purge helpers for the Dynamic CDN."""

from __future__ import annotations

import json
import re
from typing import Iterable
from urllib import error, request

_PURGE_SPLIT_PATTERN = re.compile(r"[,\n]")


class CDNCachePurgeError(RuntimeError):
    """Raised when a CDN cache purge request fails."""


def parse_purge_paths(value: str | None) -> tuple[str, ...]:
    """Normalise a comma or newline separated list of purge paths."""

    if not value:
        return ()

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in _PURGE_SPLIT_PATTERN.split(value):
        candidate = item.strip()
        if not candidate:
            continue
        if candidate != "*" and not candidate.startswith("/"):
            candidate = f"/{candidate}"
        if candidate not in seen:
            seen.add(candidate)
            cleaned.append(candidate)
    return tuple(cleaned)


def purge_cdn_cache(
    endpoint_id: str,
    token: str,
    files: Iterable[str],
    *,
    user_agent: str = "dynamic-cdn/1.0",
    timeout: float = 30.0,
) -> None:
    """Issue a cache purge request to the DigitalOcean CDN API."""

    if not endpoint_id:
        raise ValueError("endpoint_id must be provided for CDN cache purges")
    if not token:
        raise ValueError("token must be provided for CDN cache purges")

    payload = tuple(path.strip() for path in files if path.strip())
    if not payload:
        raise ValueError("files must contain at least one path to purge")

    body = json.dumps({"files": list(payload)}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": user_agent,
    }
    url = f"https://api.digitalocean.com/v2/cdn/endpoints/{endpoint_id}/cache"

    req = request.Request(url, data=body, headers=headers)
    req.get_method = lambda: "DELETE"  # type: ignore[assignment]

    try:
        with request.urlopen(req, timeout=timeout) as response:  # nosec: B310
            status = getattr(response, "status", None)
            if status is not None and status >= 400:
                raise CDNCachePurgeError(
                    f"DigitalOcean CDN cache purge failed with status {status}"
                )
    except error.HTTPError as exc:  # pragma: no cover - urllib error path
        message = f"DigitalOcean API cache purge failed with status {exc.code}"
        try:
            payload = json.loads(exc.read().decode("utf-8"))
        except Exception:  # pragma: no cover - defensive
            payload = None
        if isinstance(payload, dict) and payload.get("message"):
            message = f"{message}: {payload['message']}"
        raise CDNCachePurgeError(message) from exc


__all__ = ["CDNCachePurgeError", "parse_purge_paths", "purge_cdn_cache"]
