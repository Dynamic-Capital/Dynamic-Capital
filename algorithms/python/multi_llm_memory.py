"""Persistence helpers for sharing multi-LLM artefacts across runs."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, MutableMapping, Protocol, Sequence
from urllib.parse import urlencode

from .supabase_sync import SupabaseRestError, SupabaseTableWriter

__all__ = [
    "MemoryStore",
    "MultiLLMMemoryStore",
]


class MemoryStore(Protocol):  # pragma: no cover - interface definition
    """Minimal protocol implemented by memory stores."""

    def store(self, namespace: str, key: str, artefact: Mapping[str, Any]) -> None:
        """Persist the artefact for the supplied namespace/key combination."""

    def retrieve(
        self,
        namespace: str,
        key: str,
        *,
        limit: int | None = None,
    ) -> Sequence[Mapping[str, Any]]:
        """Return prior artefacts ordered from newest to oldest."""


@dataclass(slots=True)
class MultiLLMMemoryStore:
    """Supabase-backed memory store for sharing lessons between orchestrators.

    The store keeps the latest ``retention_limit`` artefacts per ``(namespace, key)``
    pair. Older entries are purged on insertion to avoid unbounded growth and to keep
    the retrieved context concise enough for prompt composition.
    """

    writer: SupabaseTableWriter
    retention_limit: int = 5

    def store(self, namespace: str, key: str, artefact: Mapping[str, Any]) -> None:
        serialised = json.loads(
            json.dumps(dict(artefact), default=SupabaseTableWriter._json_default)
        )
        payload = {
            "memory_id": str(uuid.uuid4()),
            "namespace": namespace,
            "memory_key": key,
            "payload": serialised,
            "created_at": datetime.now(timezone.utc),
        }
        self.writer.upsert([payload])
        self._enforce_retention(namespace, key)

    def retrieve(
        self,
        namespace: str,
        key: str,
        *,
        limit: int | None = None,
    ) -> Sequence[Mapping[str, Any]]:
        rows = self._fetch_rows(namespace, key, limit=limit)
        return [row.get("payload", {}) for row in rows]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _enforce_retention(self, namespace: str, key: str) -> None:
        limit = max(self.retention_limit, 1)
        rows = self._fetch_rows(namespace, key, limit=limit + 5)
        if len(rows) <= limit:
            return
        stale = rows[limit:]
        identifiers = [row["memory_id"] for row in stale if row.get("memory_id")]
        if not identifiers:
            return
        params = {
            "memory_id": "in.(" + ",".join(identifiers) + ")",
            "namespace": f"eq.{namespace}",
            "memory_key": f"eq.{key}",
        }
        self._dispatch("DELETE", params)

    def _fetch_rows(
        self,
        namespace: str,
        key: str,
        *,
        limit: int | None,
    ) -> Sequence[MutableMapping[str, Any]]:
        params = {
            "namespace": f"eq.{namespace}",
            "memory_key": f"eq.{key}",
            "order": "created_at.desc",
        }
        if limit is not None:
            params["limit"] = str(max(limit, 1))
        status, body = self._dispatch("GET", params)
        if status < 200 or status >= 300:
            raise SupabaseRestError(status, body)
        if not body:
            return []
        return json.loads(body)

    def _dispatch(self, method: str, params: Mapping[str, str]) -> tuple[int, bytes | None]:
        base_url = self.writer._resolve_base_url()  # type: ignore[attr-defined]
        key = self.writer._resolve_service_role_key()  # type: ignore[attr-defined]
        query = urlencode(params)
        url = f"{base_url}/rest/v1/{self.writer.table}?{query}"
        headers = {
            "content-type": "application/json",
            "apikey": key,
            "authorization": f"Bearer {key}",
        }
        body = b""
        if method not in {"GET", "HEAD"}:
            body = b"{}"
        return self.writer.dispatcher(method, url, headers=headers, body=body)
