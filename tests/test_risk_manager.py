"""Tests for the risk management guardrails."""

from dynamic_ai.risk import (
    LeverageGuidance,
    PositionSizing,
    RiskContext,
    RiskManager,
    RiskParameters,
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


def test_dynamic_leverage_reacts_to_drawdown_and_utilisation() -> None:
    manager = RiskManager(RiskParameters(max_leverage=2.5, circuit_breaker_drawdown=0.15))
    context = RiskContext(
        daily_drawdown=-0.12,
        treasury_utilisation=0.5,
        treasury_health=0.9,
        volatility=0.8,
    )

    guidance = manager.dynamic_leverage(context, confidence=0.8)

    assert isinstance(guidance, LeverageGuidance)
    assert guidance.leverage < 1.3
    assert "drawdown" in guidance.notes.lower()
    assert guidance.band == "capital_preservation"


def test_dynamic_leverage_acknowledges_positive_regime_bias() -> None:
    manager = RiskManager(RiskParameters(max_leverage=3.0))
    context = RiskContext(
        daily_drawdown=0.0,
        treasury_utilisation=0.1,
        treasury_health=1.3,
        volatility=0.2,
    )

    guidance = manager.dynamic_leverage(context, confidence=0.85, regime_bias=0.8)

    assert guidance.leverage <= manager.params.max_leverage
    assert guidance.leverage > 1.6
    assert guidance.band in {"growth", "aggressive"}
    assert "regime bias" in guidance.notes.lower()
