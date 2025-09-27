"""Supabase logging helper for executed trades."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:  # pragma: no cover - optional dependency
    from supabase import create_client  # type: ignore
except Exception:  # pragma: no cover
    create_client = None  # type: ignore


class SupabaseLogger:
    """Persist trade metadata into Supabase when credentials are present."""

    def __init__(self, *, table_name: str = "trade_logs") -> None:
        self.table_name = table_name
        self.logger = logging.getLogger(self.__class__.__name__)
        self.client = self._initialise_client()

    def log_trade(self, payload: Dict[str, Any]) -> Optional[Any]:
        if not self.client:
            self.logger.info("Skipping Supabase logging; client unavailable.")
            return None

        enriched_payload = dict(payload)
        enriched_payload.setdefault("created_at", datetime.now(timezone.utc).isoformat())

        try:
            return self.client.table(self.table_name).insert(enriched_payload).execute()
        except Exception as exc:  # pragma: no cover - network dependent
            self.logger.error("Failed to log trade to Supabase: %s", exc)
            return None

    def _initialise_client(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        if not url or not key or create_client is None:
            return None
        try:
            return create_client(url, key)
        except Exception as exc:  # pragma: no cover - network dependent
            self.logger.error("Supabase client initialisation failed: %s", exc)
            return None
