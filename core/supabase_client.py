"""Lightweight helpers for logging market maker activity into Supabase."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

try:  # pragma: no cover - optional dependency at runtime
    import requests
except Exception:  # pragma: no cover - fall back to no-op logging
    requests = None  # type: ignore

LOGGER = logging.getLogger(__name__)


def log_signal(payload: Dict[str, Any]) -> None:
    """Persist a quoting decision for observability dashboards."""

    _post("SUPABASE_MM_SIGNALS_TABLE", payload)


def log_trade(payload: Dict[str, Any]) -> None:
    """Persist an executed fill for PnL tracking."""

    _post("SUPABASE_MM_TRADES_TABLE", payload)


def _post(table_env: str, payload: Dict[str, Any]) -> None:
    """Send the payload to Supabase if credentials are available."""

    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    table = os.getenv(table_env)

    if not table:
        LOGGER.debug("Supabase logging skipped; environment variable %%s is unset", table_env)
        return

    if not base_url or not service_key or requests is None:
        LOGGER.debug(
            "Supabase logging skipped; missing configuration or requests dependency",
        )
        return

    url = f"{base_url.rstrip('/')}/rest/v1/{table}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    payload_with_timestamp = {**payload}
    payload_with_timestamp.setdefault("created_at", datetime.now(timezone.utc).isoformat())

    try:
        response = requests.post(url, headers=headers, json=payload_with_timestamp, timeout=10)  # type: ignore[operator]
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - network errors are runtime concerns
        LOGGER.warning("Failed to log payload to Supabase table %s: %s", table, exc)


__all__ = ["log_signal", "log_trade"]
