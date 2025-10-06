"""Utilities for forwarding TradingView alerts to Supabase edge functions."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional


class SupabaseTradingSignalForwarder:
    """Send TradingView alerts to the Supabase trading-signal edge function."""

    DEFAULT_TIMEOUT = 5.0

    def __init__(
        self,
        *,
        function_url: Optional[str] = None,
        session: Optional[Any] = None,
    ) -> None:
        self.logger = logging.getLogger(self.__class__.__name__)
        self._provided_url = function_url
        self._session = session

    @property
    def function_url(self) -> Optional[str]:
        override = self._provided_url or os.environ.get("SUPABASE_TRADING_SIGNAL_URL")
        if override:
            trimmed = override.strip()
            if trimmed:
                return trimmed
        base_url = os.environ.get("SUPABASE_URL")
        if not base_url:
            return None
        return f"{base_url.rstrip('/')}/functions/v1/trading-signal"

    @property
    def secret(self) -> Optional[str]:
        secret = os.environ.get("SUPABASE_TRADING_SIGNAL_SECRET")
        if secret:
            secret = secret.strip()
            if secret:
                return secret
        fallback = os.environ.get("TRADING_SIGNALS_WEBHOOK_SECRET")
        if not fallback:
            return None
        trimmed = fallback.strip()
        return trimmed or None

    def _ensure_session(self):
        if self._session is not None:
            return self._session
        try:  # pragma: no cover - optional dependency
            import requests  # type: ignore
        except Exception:  # pragma: no cover
            self.logger.warning(
                "requests package not available; skipping Supabase webhook forwarding.",
            )
            return None
        self._session = requests.Session()
        return self._session

    def _timeout(self) -> float:
        raw = os.environ.get("SUPABASE_WEBHOOK_TIMEOUT", "")
        if not raw:
            return self.DEFAULT_TIMEOUT
        try:
            timeout = float(raw)
        except ValueError:
            self.logger.debug(
                "Invalid SUPABASE_WEBHOOK_TIMEOUT '%s'; falling back to default.",
                raw,
            )
            return self.DEFAULT_TIMEOUT
        return timeout if timeout > 0 else self.DEFAULT_TIMEOUT

    def forward_tradingview_alert(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Post the raw TradingView alert to Supabase if configuration exists."""

        function_url = self.function_url
        if not function_url:
            self.logger.info(
                "Skipping Supabase trading-signal forward; function URL not configured.",
            )
            return None

        secret = self.secret
        if not secret:
            self.logger.info(
                "Skipping Supabase trading-signal forward; secret unavailable.",
            )
            return None

        session = self._ensure_session()
        if not session:
            return None

        try:
            response = session.post(
                function_url,
                json=payload,
                headers={"x-tradingview-secret": secret},
                timeout=self._timeout(),
            )
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - network dependent
            self.logger.error(
                "Failed to forward TradingView alert to Supabase: %s",
                exc,
                extra={"function_url": function_url},
            )
            return None

        try:
            return response.json()
        except (ValueError, json.JSONDecodeError):
            self.logger.warning(
                "Supabase trading-signal function returned non-JSON response.",
            )
            return None


__all__ = ["SupabaseTradingSignalForwarder"]
