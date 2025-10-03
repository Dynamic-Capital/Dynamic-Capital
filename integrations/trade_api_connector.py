"""HTTP connector that submits Dynamic Trading Algo orders to broker APIs."""

from __future__ import annotations

import logging
import time
from typing import Any, Callable, Mapping, MutableMapping, Optional

SUCCESS_RETCODE = 10009


def _normalise_symbol(symbol: str) -> str:
    text = str(symbol).strip().upper()
    if not text:
        raise ValueError("symbol must not be empty")
    return text


def _coerce_positive(value: float, name: str) -> float:
    numeric = float(value)
    if numeric <= 0.0:
        raise ValueError(f"{name} must be positive")
    return numeric


class TradeAPIConnector:
    """Minimal wrapper that posts trade instructions to an HTTP endpoint.

    The connector mirrors the ``buy``/``sell``/``open_hedge``/``close_hedge``
    surface expected by :class:`dynamic.trading.algo.trading_core.DynamicTradingAlgo`
    while remaining framework agnostic.  Callers can provide a custom session
    object implementing ``request`` (e.g. ``requests.Session``) to control
    authentication or retry semantics.  When omitted the connector attempts to
    instantiate ``requests.Session`` lazily so environments without the
    dependency can still inject a stub during testing.
    """

    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        client_id: str | None = None,
        account_id: str | None = None,
        timeout: float = 10.0,
        order_endpoint: str = "/orders",
        hedge_endpoint: str = "/hedges",
        max_attempts: int = 1,
        retry_backoff: float = 0.0,
        session: Any | None = None,
    ) -> None:
        base = str(base_url).strip()
        if not base:
            raise ValueError("base_url must not be empty")
        self.base_url = base.rstrip("/")
        self.api_key = api_key
        self.client_id = client_id
        self.account_id = account_id
        self.timeout = _coerce_positive(timeout, "timeout")
        self.order_endpoint = self._normalise_endpoint(order_endpoint)
        self.hedge_endpoint = self._normalise_endpoint(hedge_endpoint)
        self.logger = logging.getLogger(self.__class__.__name__)

        attempts = int(max_attempts)
        if attempts < 1:
            raise ValueError("max_attempts must be at least 1")
        self.max_attempts = attempts

        self.retry_backoff = float(retry_backoff)
        if self.retry_backoff < 0:
            raise ValueError("retry_backoff cannot be negative")

        self._sleep: Callable[[float], None] = time.sleep

        if session is None:
            self._session = self._build_session()
            self._owns_session = True
        else:
            self._session = session
            self._owns_session = False

    def close(self) -> None:
        if self._owns_session and hasattr(self._session, "close"):
            try:
                self._session.close()
            except Exception:  # pragma: no cover - defensive logging
                self.logger.debug("Failed to close trade API session", exc_info=True)

    # ------------------------------------------------------------------
    # Public trading surface

    def buy(self, symbol: str, lot: float) -> MutableMapping[str, Any]:
        return self._submit_order("BUY", symbol, lot)

    def sell(self, symbol: str, lot: float) -> MutableMapping[str, Any]:
        return self._submit_order("SELL", symbol, lot)

    def open_hedge(self, symbol: str, lot: float, side: str) -> MutableMapping[str, Any]:
        payload = {
            "hedge_action": "open",
            "hedge_side": side.upper(),
            "order_type": "hedge",
        }
        return self._submit_order("HEDGE", symbol, lot, endpoint=self.hedge_endpoint, extra=payload)

    def close_hedge(self, symbol: str, lot: float, side: str) -> MutableMapping[str, Any]:
        payload = {
            "hedge_action": "close",
            "hedge_side": side.upper(),
            "order_type": "hedge",
        }
        return self._submit_order("HEDGE_CLOSE", symbol, lot, endpoint=self.hedge_endpoint, extra=payload)

    # ------------------------------------------------------------------
    # Internal helpers

    def _build_session(self) -> Any:
        try:
            import requests  # type: ignore
        except Exception as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "TradeAPIConnector requires the 'requests' package when a custom session is not supplied"
            ) from exc
        return requests.Session()

    def _normalise_endpoint(self, endpoint: str) -> str:
        cleaned = str(endpoint).strip() or "/"
        if not cleaned.startswith("/"):
            cleaned = f"/{cleaned}"
        return cleaned

    def _build_url(self, endpoint: str) -> str:
        return f"{self.base_url}{self._normalise_endpoint(endpoint)}"

    def _should_retry_response(self, response: Any) -> bool:
        status = getattr(response, "status_code", 0)
        if status in {408, 409, 425, 429}:
            return True
        return 500 <= status < 600

    def _request(self, method: str, endpoint: str, payload: Mapping[str, Any]) -> MutableMapping[str, Any]:
        url = self._build_url(endpoint)
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.client_id:
            headers["X-Client-Id"] = self.client_id

        response: Any | None = None
        last_error: Exception | None = None
        delay = self.retry_backoff

        for attempt in range(1, self.max_attempts + 1):
            try:
                response = self._session.request(
                    method.upper(),
                    url,
                    json=dict(payload),
                    headers=headers,
                    timeout=self.timeout,
                )
            except Exception as exc:  # pragma: no cover - network variability
                last_error = exc
                self.logger.warning(
                    "Trade API request to %s failed on attempt %s/%s: %s",
                    url,
                    attempt,
                    self.max_attempts,
                    exc,
                )
            else:
                if response.ok or not self._should_retry_response(response) or attempt == self.max_attempts:
                    break
                self.logger.warning(
                    "Trade API request to %s returned HTTP %s; retrying (%s/%s)",
                    url,
                    getattr(response, "status_code", "unknown"),
                    attempt,
                    self.max_attempts,
                )
            if attempt < self.max_attempts and delay > 0:
                try:
                    self._sleep(delay)
                except Exception:  # pragma: no cover - defensive sleep hook
                    pass
                delay *= 2

        if response is None:
            error = last_error or RuntimeError("request_failed")
            self.logger.error("Trade API request to %s failed: %s", url, error)
            return {
                "status": "error",
                "code": 0,
                "message": f"request_failed: {error}",
                "error": str(error),
            }

        data: Any
        try:
            data = response.json()
        except Exception:  # pragma: no cover - non JSON payloads
            data = {"raw": getattr(response, "text", "")}

        result: MutableMapping[str, Any]
        if isinstance(data, Mapping):
            result = dict(data)
        else:
            result = {"raw": data}

        status_code = getattr(response, "status_code", 0)
        result.setdefault("http_status", status_code)
        if response.ok:
            result.setdefault("code", SUCCESS_RETCODE)
            result.setdefault("status", "executed")
        else:
            result.setdefault("code", status_code)
            result.setdefault("status", "error")

        if isinstance(data, Mapping):
            ticket = data.get("ticket") or data.get("order_id") or data.get("id")
            price = data.get("price") or data.get("fill_price")
            profit = data.get("profit") or data.get("pnl") or data.get("pl")
            if ticket is not None:
                result.setdefault("ticket", ticket)
            if price is not None:
                result.setdefault("price", price)
            if profit is not None:
                result.setdefault("profit", profit)

        message = result.get("message") or getattr(response, "reason", "")
        if not message:
            message = "OK" if response.ok else "HTTP error"
        result["message"] = str(message)
        result.setdefault("profit", 0.0)
        return result

    def _submit_order(
        self,
        side: str,
        symbol: str,
        lot: float,
        *,
        endpoint: str | None = None,
        extra: Optional[Mapping[str, Any]] = None,
    ) -> MutableMapping[str, Any]:
        normalised_symbol = _normalise_symbol(symbol)
        quantity = _coerce_positive(lot, "lot")

        payload: MutableMapping[str, Any] = {
            "symbol": normalised_symbol,
            "side": side.upper(),
            "quantity": quantity,
            "type": "market",
        }
        if self.account_id:
            payload["account_id"] = self.account_id
        if extra:
            payload.update(extra)

        response = self._request("POST", endpoint or self.order_endpoint, payload)
        response.setdefault("symbol", normalised_symbol)
        response.setdefault("lot", quantity)
        response.setdefault("side", side.upper())
        return response

    def __del__(self) -> None:  # pragma: no cover - non-deterministic GC
        try:
            self.close()
        except Exception:
            pass


__all__ = ["TradeAPIConnector"]
