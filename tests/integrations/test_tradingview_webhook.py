from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Iterator

import pytest
from flask.testing import FlaskClient

sys.path.append(str(Path(__file__).resolve().parents[2]))

from integrations import tradingview
from dynamic.trading.algo.trading_core import SUCCESS_RETCODE


SECRET_HEADER = "X-Tradingview-Secret"


@pytest.fixture(autouse=True)
def reset_secret(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.delenv("TRADINGVIEW_WEBHOOK_SECRET", raising=False)
    yield


@pytest.fixture()
def stubbed_components(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    class DummySignal:
        def __init__(self) -> None:
            self.action = "BUY"
            self.confidence = 0.75
            self.reasoning = "stubbed"

        def to_dict(self) -> dict[str, object]:
            return {
                "action": self.action,
                "confidence": self.confidence,
                "reasoning": self.reasoning,
            }

    class DummyFusion:
        def generate_signal(self, payload: dict[str, object]) -> DummySignal:
            return DummySignal()

    class DummyTradeResult:
        def __init__(self, lot: float) -> None:
            self.ok = True
            self.retcode = SUCCESS_RETCODE
            self.profit = 42.0
            self.ticket = 1001
            self.symbol = "XAUUSD"
            self.lot = lot

    class DummyTrader:
        def execute_trade(
            self,
            ai_signal: DummySignal,
            *,
            lot: float,
            symbol: str,
        ) -> DummyTradeResult:
            return DummyTradeResult(lot)

    class DummyTreasury:
        def update_from_trade(self, trade_result: DummyTradeResult) -> SimpleNamespace:
            return SimpleNamespace(
                burned=10.0,
                rewards_distributed=5.0,
                profit_retained=2.5,
            )

    class DummyLogger:
        def __init__(self) -> None:
            self.logged_payloads: list[dict[str, object]] = []

        def log_trade(self, payload: dict[str, object]) -> None:
            self.logged_payloads.append(payload)

    class DummyBot:
        def __init__(self) -> None:
            self.messages: list[str] = []

        def notify(self, message: str) -> None:
            self.messages.append(message)

    fusion = DummyFusion()
    trader = DummyTrader()
    treasury = DummyTreasury()
    supabase_logger = DummyLogger()
    bot = DummyBot()

    monkeypatch.setattr(tradingview, "fusion", fusion)
    monkeypatch.setattr(tradingview, "trader", trader)
    monkeypatch.setattr(tradingview, "treasury", treasury)
    monkeypatch.setattr(tradingview, "supabase_logger", supabase_logger)
    monkeypatch.setattr(tradingview, "telegram_bot", bot)

    return SimpleNamespace(
        fusion=fusion,
        trader=trader,
        treasury=treasury,
        supabase_logger=supabase_logger,
        bot=bot,
    )


@pytest.fixture()
def client() -> FlaskClient:
    tradingview.app.testing = True
    return tradingview.app.test_client()


def test_webhook_requires_configured_secret(client) -> None:
    response = client.post("/webhook", json={})

    assert response.status_code == 500
    assert response.get_json() == {"error": "Webhook secret not configured."}


def test_webhook_rejects_invalid_secret(monkeypatch: pytest.MonkeyPatch, client) -> None:
    monkeypatch.setenv("TRADINGVIEW_WEBHOOK_SECRET", "expected-secret")

    response = client.post(
        "/webhook",
        json={},
        headers={SECRET_HEADER: "wrong-secret"},
    )

    assert response.status_code == 401
    assert response.get_json() == {"error": "Unauthorized"}


def test_webhook_processes_payload_with_valid_secret(
    monkeypatch: pytest.MonkeyPatch,
    client,
    stubbed_components: SimpleNamespace,
) -> None:
    monkeypatch.setenv("TRADINGVIEW_WEBHOOK_SECRET", "top-secret")

    payload = {"symbol": "XAUUSD", "lot": 0.25, "signal": "BUY"}
    response = client.post(
        "/webhook",
        json=payload,
        headers={SECRET_HEADER: "top-secret"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "executed"
    assert stubbed_components.supabase_logger.logged_payloads
    assert stubbed_components.bot.messages
    logged_payload = stubbed_components.supabase_logger.logged_payloads[-1]
    assert logged_payload["lot"] == pytest.approx(0.25)
    assert data["trade"]["lot"] == pytest.approx(0.25)


@pytest.mark.parametrize("lot_value", [None, "invalid"])
def test_webhook_defaults_to_minimum_lot(
    lot_value,
    monkeypatch: pytest.MonkeyPatch,
    client,
    stubbed_components: SimpleNamespace,
) -> None:
    monkeypatch.setenv("TRADINGVIEW_WEBHOOK_SECRET", "top-secret")

    payload = {"symbol": "XAUUSD", "lot": lot_value, "signal": "BUY"}
    response = client.post(
        "/webhook",
        json=payload,
        headers={SECRET_HEADER: "top-secret"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "executed"

    assert stubbed_components.supabase_logger.logged_payloads
    logged_payload = stubbed_components.supabase_logger.logged_payloads[-1]
    assert logged_payload["lot"] == pytest.approx(0.1)
    assert data["trade"]["lot"] == pytest.approx(0.1)


def test_webhook_skips_notifications_for_failed_trade(
    monkeypatch: pytest.MonkeyPatch,
    client,
    stubbed_components: SimpleNamespace,
) -> None:
    monkeypatch.setenv("TRADINGVIEW_WEBHOOK_SECRET", "top-secret")

    class FailedTradeResult:
        def __init__(self) -> None:
            self.ok = False
            self.retcode = 10004
            self.profit = -5.0
            self.ticket = None
            self.symbol = "XAUUSD"
            self.lot = 0.5

    def fail_execute_trade(*_, **__) -> FailedTradeResult:
        return FailedTradeResult()

    stubbed_components.trader.execute_trade = fail_execute_trade  # type: ignore[assignment]

    treasury_calls: list[FailedTradeResult] = []

    def record_treasury(trade_result: FailedTradeResult):
        treasury_calls.append(trade_result)
        return None

    stubbed_components.treasury.update_from_trade = record_treasury  # type: ignore[assignment]

    payload = {"symbol": "XAUUSD", "lot": 0.5, "signal": "SELL"}
    response = client.post(
        "/webhook",
        json=payload,
        headers={SECRET_HEADER: "top-secret"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "skipped"
    assert stubbed_components.bot.messages == []
    assert treasury_calls
