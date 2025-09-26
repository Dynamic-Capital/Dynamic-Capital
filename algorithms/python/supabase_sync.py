"""Utilities for syncing algorithm output into Supabase tables."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Iterable, Mapping, MutableMapping, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

__all__ = [
    "SupabaseRestError",
    "SupabaseTableWriter",
]


class SupabaseRestError(RuntimeError):
    """Raised when the Supabase REST API responds with a non-2xx status."""

    def __init__(self, status: int, body: str | bytes | None) -> None:
        self.status = status
        self.body = body.decode("utf-8", errors="replace") if isinstance(body, bytes) else body
        super().__init__(f"Supabase REST error {status}: {self.body}")


class _RequestDispatcher(Protocol):
    def __call__(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str],
        body: bytes,
    ) -> tuple[int, bytes | None]:
        ...


def _default_dispatcher(
    method: str,
    url: str,
    *,
    headers: Mapping[str, str],
    body: bytes,
) -> tuple[int, bytes | None]:
    request = Request(url, data=body, method=method)
    for key, value in headers.items():
        request.add_header(key, value)
    try:
        with urlopen(request) as response:  # type: ignore[arg-type]
            return response.status, response.read()
    except HTTPError as error:  # pragma: no cover - network edge case
        return error.code, error.read()
    except URLError as error:  # pragma: no cover - network edge case
        raise SupabaseRestError(0, str(error.reason)) from error


@dataclass(slots=True)
class SupabaseTableWriter:
    """Simple helper that upserts rows into a Supabase table via REST."""

    table: str
    conflict_column: str
    dispatcher: _RequestDispatcher = _default_dispatcher
    base_url: str | None = None
    service_role_key: str | None = None

    def _resolve_base_url(self) -> str:
        base = self.base_url or os.getenv("SUPABASE_URL")
        if not base:
            raise RuntimeError("SUPABASE_URL is not configured")
        return base.rstrip("/")

    def _resolve_service_role_key(self) -> str:
        key = self.service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not key:
            raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured")
        return key

    def upsert(self, rows: Iterable[Mapping[str, Any]]) -> int:
        payload = [self._serialise(row) for row in rows]
        if not payload:
            return 0

        url = f"{self._resolve_base_url()}/rest/v1/{self.table}?on_conflict={self.conflict_column}"
        body = json.dumps(payload, default=self._json_default).encode("utf-8")
        key = self._resolve_service_role_key()
        headers = {
            "content-type": "application/json",
            "apikey": key,
            "authorization": f"Bearer {key}",
            "prefer": "resolution=merge-duplicates",
        }
        status, response_body = self.dispatcher(
            "POST",
            url,
            headers=headers,
            body=body,
        )
        if status < 200 or status >= 300:
            raise SupabaseRestError(status, response_body)
        return len(payload)

    @staticmethod
    def _json_default(value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        raise TypeError(f"Object of type {type(value).__name__} is not JSON serialisable")

    @staticmethod
    def _serialise(row: Mapping[str, Any]) -> MutableMapping[str, Any]:
        return dict(row)
