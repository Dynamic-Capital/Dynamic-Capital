from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Iterator, Optional

import pytest
from flask.testing import FlaskClient

sys.path.append(str(Path(__file__).resolve().parents[2]))

from integrations import tradingview


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
        def dai_lorentzian_params(self, vol: float, news_bias: float, session: object) -> dict[str, object]:
            return {
                "window": 10,
                "alpha": 0.5,
                "mode": "cauchy",
                "enter_z": 1.5,
                "exit_z": 0.5,
                "style": "mean_rev",
            }

        def build_lorentzian_component(self, prices, params):
            return None

        def combine(self, components, *, default_signal: str = "NEUTRAL") -> DummySignal:
            return DummySignal()

        def generate_signal(self, payload: dict[str, object]) -> DummySignal:
            return DummySignal()

    class DummyTradeResult:
        def __init__(self) -> None:
            self.ok = True
            self.retcode = 1
            self.profit = 42.0
            self.ticket = 1001
            self.symbol = "XAUUSD"
            self.lot = 0.1

    class DummyTrader:
        def execute_trade(
            self,
            ai_signal: DummySignal,
            *,
            base_lot: float,
            symbol: str,
            context: Optional[dict[str, object]] = None,
        ) -> DummyTradeResult:
            result = DummyTradeResult()
            result.symbol = symbol
            result.lot = base_lot
            return result

    class DummyTreasury:
        def update_from_trade(
            self, trade_result: DummyTradeResult, market_context: Optional[dict[str, object]] = None
        ) -> SimpleNamespace:
            return SimpleNamespace(
                burned=10.0,
                rewards_distributed=5.0,
                profit_retained=2.5,
                policy_buyback=0.0,
                policy_burn=0.0,
                policy_spread_target_bps=6.0,
                policy_regime="calm",
                policy_notes=["stub"],
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
