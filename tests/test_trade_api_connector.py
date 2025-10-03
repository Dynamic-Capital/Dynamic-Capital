from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pytest

from integrations.trade_api_connector import TradeAPIConnector


class StubResponse:
    def __init__(self, status_code: int, payload: Dict[str, Any], reason: str = "OK") -> None:
        self.status_code = status_code
        self._payload = payload
        self.reason = reason
        self.ok = 200 <= status_code < 300
        self.text = "stub"

    def json(self) -> Dict[str, Any]:
        return self._payload


class StubSession:
    def __init__(self, responses: List[StubResponse]) -> None:
        self.responses = responses
        self.calls: List[Tuple[str, str, Dict[str, Any], Dict[str, str], float]] = []

    def request(
        self,
        method: str,
        url: str,
        *,
        json: Dict[str, Any],
        headers: Dict[str, str],
        timeout: float,
    ) -> StubResponse:
        self.calls.append((method, url, json, headers, timeout))
        if not self.responses:
            raise RuntimeError("no response queued")
        return self.responses.pop(0)


def test_trade_api_connector_submits_orders_with_auth_headers() -> None:
    responses = [
        StubResponse(200, {"id": "abc-123", "price": 1.2345, "profit": 0.0}),
    ]
    session = StubSession(responses)
    connector = TradeAPIConnector(
        "https://broker.test/api",
        api_key="secret",
        client_id="dynamic",
        account_id="A1",
        timeout=5.5,
        session=session,
    )

    result = connector.buy("eurusd", 0.25)

    assert session.calls
    method, url, payload, headers, timeout = session.calls[0]
    assert method == "POST"
    assert url == "https://broker.test/api/orders"
    assert payload["symbol"] == "EURUSD"
    assert payload["quantity"] == pytest.approx(0.25)
    assert payload["account_id"] == "A1"
    assert headers["Authorization"] == "Bearer secret"
    assert headers["X-Client-Id"] == "dynamic"
    assert timeout == pytest.approx(5.5)

    assert result["code"] == 10009
    assert result["symbol"] == "EURUSD"
    assert result["lot"] == pytest.approx(0.25)
    assert result["ticket"] == "abc-123"


def test_trade_api_connector_handles_request_failures() -> None:
    class FailingSession:
        def request(self, *args: Any, **kwargs: Any) -> StubResponse:
            raise RuntimeError("boom")

    connector = TradeAPIConnector("https://broker.test", session=FailingSession())

    result = connector.sell("xauusd", 1.0)

    assert result["status"] == "error"
    assert result["code"] == 0
    assert "boom" in result["message"]


def test_trade_api_connector_supports_hedge_endpoints() -> None:
    responses = [StubResponse(202, {"id": "hedge-1", "status": "queued"})]
    session = StubSession(responses)
    connector = TradeAPIConnector(
        "https://broker.test/trade",
        hedge_endpoint="hedges/open",
        session=session,
    )

    result = connector.open_hedge("tonusd", 0.1, "long_hedge")

    assert session.calls
    _, url, payload, _, _ = session.calls[0]
    assert url == "https://broker.test/trade/hedges/open"
    assert payload["hedge_action"] == "open"
    assert payload["hedge_side"] == "LONG_HEDGE"
    assert result["status"] in {"queued", "executed"}
    assert result["symbol"] == "TONUSD"


def test_trade_api_connector_retries_transient_failures() -> None:
    class FlakySession:
        def __init__(self) -> None:
            self.calls: list[Tuple[str, str]] = []

        def request(
            self,
            method: str,
            url: str,
            *,
            json: Dict[str, Any],
            headers: Dict[str, str],
            timeout: float,
        ) -> StubResponse:
            self.calls.append((method, url))
            if len(self.calls) == 1:
                raise RuntimeError("temporary outage")
            return StubResponse(200, {"id": "retry-1", "price": 1.0, "profit": 0.5})

    session = FlakySession()
    connector = TradeAPIConnector(
        "https://broker.test/api",
        session=session,
        max_attempts=2,
        retry_backoff=0.0,
    )

    result = connector.sell("eurusd", 0.5)

    assert len(session.calls) == 2
    assert result["status"] == "executed"
    assert result["ticket"] == "retry-1"
