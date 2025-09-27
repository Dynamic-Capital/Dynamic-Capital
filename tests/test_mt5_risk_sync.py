from __future__ import annotations

import os
from typing import Any, Dict

import pytest

from dynamic_ai.risk import RiskContext
from dynamic_ai.risk_sync import (
    PositionSnapshot,
    build_mt5_risk_adjustments,
    sync_mt5_risk_adjustments,
)


def test_build_mt5_risk_adjustments_generates_levels() -> None:
    context = RiskContext()
    positions = [
        PositionSnapshot(
            ticket="100",
            symbol="XAUUSD",
            side="buy",
            entry_price=1950.0,
            volatility=2.5,
            treasury_health=0.9,
        )
    ]

    adjustments = build_mt5_risk_adjustments(positions, context)
    assert len(adjustments) == 1
    adj = adjustments[0]
    assert adj["ticket"] == "100"
    assert adj["symbol"] == "XAUUSD"
    assert adj["desired_stop_loss"] is not None
    assert adj["desired_take_profit"] is not None
    assert adj["trailing_stop_distance"] == pytest.approx(1.88, rel=1e-2)


def test_sync_requires_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MT5_RISK_WEBHOOK_URL", raising=False)
    monkeypatch.delenv("MT5_RISK_WEBHOOK_SECRET", raising=False)

    with pytest.raises(RuntimeError):
        sync_mt5_risk_adjustments([], RiskContext())

    monkeypatch.setenv("MT5_RISK_WEBHOOK_URL", "https://example.com")
    with pytest.raises(RuntimeError):
        sync_mt5_risk_adjustments([], RiskContext())


def test_sync_posts_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: Dict[str, Any] = {}

    def fake_request(url: str, payload: Dict[str, Any], *, secret: str) -> None:
        captured["url"] = url
        captured["payload"] = payload
        captured["secret"] = secret

    monkeypatch.setenv("MT5_RISK_WEBHOOK_URL", "https://example.com/mt5-risk")
    monkeypatch.setenv("MT5_RISK_WEBHOOK_SECRET", "secret")
    monkeypatch.setitem(os.environ, "MT5_RISK_WEBHOOK_SECRET", "secret")

    monkeypatch.setattr("dynamic_ai.risk_sync._request", fake_request)

    adjustments = sync_mt5_risk_adjustments(
        [
            PositionSnapshot(
                ticket="200",
                symbol="EURUSD",
                side="sell",
                entry_price=1.1,
                volatility=0.5,
            )
        ],
        RiskContext(),
    )

    assert adjustments
    assert captured["url"] == "https://example.com/mt5-risk"
    assert captured["secret"] == "secret"
    assert captured["payload"]["adjustments"][0]["ticket"] == "200"
