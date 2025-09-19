"""Minimal Supabase REST client tailored to the bridge."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests

from src.config.settings import Settings

logger = logging.getLogger(__name__)


class SupabaseError(RuntimeError):
    """Raised when Supabase returns a non-successful response."""


class SupabaseClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = settings.supabase_url.rstrip("/") + "/rest/v1/"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "apikey": settings.supabase_service_key,
                "Authorization": f"Bearer {settings.supabase_service_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        )

    def _url(self, table: str) -> str:
        return urljoin(self.base_url, table)

    def _handle_response(self, response: requests.Response) -> List[Dict[str, Any]]:
        if response.status_code >= 400:
            raise SupabaseError(
                f"Supabase error {response.status_code}: {response.text}"
            )
        if not response.text:
            return []
        try:
            data = response.json()
        except ValueError as exc:
            raise SupabaseError(f"Invalid JSON response: {exc}") from exc
        if isinstance(data, list):
            return data
        return [data]

    def fetch_pending_signals(self) -> List[Dict[str, Any]]:
        params = {
            self.settings.supabase_status_column: f"eq.{self.settings.supabase_pending_status}",
            "order": "created_at.asc",
            "limit": str(self.settings.supabase_batch_size),
        }
        response = self._request(
            "get",
            self._url(self.settings.supabase_signals_table),
            params=params,
        )
        return self._handle_response(response)

    def claim_signal(self, signal_id: Any, node_id: str) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            self.settings.supabase_status_column: self.settings.supabase_queued_status,
            "bridge_claimed_at": now,
            "bridge_node_id": node_id,
            "bridge_expires_at": datetime.fromtimestamp(
                time.time() + self.settings.supabase_claim_ttl_seconds,
                tz=timezone.utc,
            ).isoformat(),
        }
        params = {
            "id": f"eq.{signal_id}",
            self.settings.supabase_status_column: f"eq.{self.settings.supabase_pending_status}",
        }
        headers = {"Prefer": "return=representation"}
        response = self._request(
            "patch",
            self._url(self.settings.supabase_signals_table),
            params=params,
            json=payload,
            headers=headers,
        )
        data = self._handle_response(response)
        return data[0] if data else None

    def mark_in_progress(self, signal_id: Any) -> None:
        payload = {
            self.settings.supabase_status_column: self.settings.supabase_in_progress_status,
            "bridge_started_at": datetime.now(timezone.utc).isoformat(),
        }
        self._update_signal(signal_id, payload)

    def mark_failed(self, signal_id: Any, message: str) -> None:
        payload = {
            self.settings.supabase_status_column: self.settings.supabase_failed_status,
            "bridge_error": message,
            "bridge_finished_at": datetime.now(timezone.utc).isoformat(),
        }
        self._update_signal(signal_id, payload)

    def mark_filled(self, signal_id: Any, ticket: str, price: float, volume: float) -> None:
        payload = {
            self.settings.supabase_status_column: self.settings.supabase_filled_status,
            "mt5_ticket_id": ticket,
            "executed_price": price,
            "executed_volume": volume,
            "bridge_finished_at": datetime.now(timezone.utc).isoformat(),
        }
        self._update_signal(signal_id, payload)

    def mark_error(self, signal_id: Any, message: str) -> None:
        payload = {
            self.settings.supabase_status_column: self.settings.supabase_error_status,
            "bridge_error": message,
            "bridge_finished_at": datetime.now(timezone.utc).isoformat(),
        }
        self._update_signal(signal_id, payload)

    def _update_signal(self, signal_id: Any, payload: Dict[str, Any]) -> None:
        params = {"id": f"eq.{signal_id}"}
        headers = {"Prefer": "return=representation"}
        response = self._request(
            "patch",
            self._url(self.settings.supabase_signals_table),
            params=params,
            json=payload,
            headers=headers,
        )
        self._handle_response(response)

    def _request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            return response
        except requests.RequestException as exc:
            raise SupabaseError(f"Supabase request failed: {exc}") from exc


__all__ = ["SupabaseClient", "SupabaseError"]
