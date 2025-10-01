"""Tests for the risk management guardrails."""

import pytest

from dynamic.intelligence.ai_apps.risk import (
    PositionSizing,
    RiskContext,
    RiskManager,
    RiskParameters,
    assign_sl_tp,
)


def test_risk_manager_enforces_circuit_breaker() -> None:
    manager = RiskManager(RiskParameters(max_daily_drawdown=0.05, circuit_breaker_drawdown=0.1))
    context = RiskContext(daily_drawdown=-0.12, treasury_utilisation=0.2, treasury_health=1.0)

    signal = {"action": "BUY", "confidence": 0.8}
    adjusted = manager.enforce(signal, context)

    assert adjusted["action"] == "NEUTRAL"
    assert adjusted["confidence"] <= 0.2
    assert adjusted.get("circuit_breaker") is True
    assert "Circuit breaker" in " ".join(adjusted.get("risk_notes", []))


def test_position_sizing_reflects_confidence_and_volatility() -> None:
    manager = RiskManager()
    context = RiskContext(treasury_health=1.2, treasury_utilisation=0.3, volatility=0.6)

    sizing = manager.sizing(context, confidence=0.7, volatility=0.6)

    assert isinstance(sizing, PositionSizing)
    assert sizing.notional > 0
    assert 1.0 <= sizing.leverage <= 3.0


def test_assign_sl_tp_buy_blends_volatility_and_fibonacci() -> None:
    sl, tp = assign_sl_tp(
        entry=100,
        signal="BUY",
        volatility=10,
        rr=2.0,
        fibonacci_retrace=96,
        fibonacci_extension=118,
    )

    assert sl == pytest.approx(90.5)
    assert tp == pytest.approx(118.5)


def test_assign_sl_tp_sell_treasury_expands_targets() -> None:
    sl, tp = assign_sl_tp(
        entry=220,
        signal="SELL",
        volatility=12,
        rr=1.5,
        fibonacci_retrace=228,
        fibonacci_extension=190,
        treasury_health=1.4,
    )

    assert sl == pytest.approx(234.3)
    assert tp == pytest.approx(194.28)


def test_assign_sl_tp_tightens_with_low_treasury() -> None:
    baseline_sl, _ = assign_sl_tp(entry=150, signal="BUY", volatility=8)
    tightened_sl, _ = assign_sl_tp(
        entry=150,
        signal="BUY",
        volatility=8,
        treasury_health=0.4,
    )

    assert baseline_sl is not None and tightened_sl is not None
    assert tightened_sl > baseline_sl


def test_assign_sl_tp_invalid_signal() -> None:
    sl, tp = assign_sl_tp(entry=100, signal="HOLD", volatility=5)

    assert sl is None and tp is None
