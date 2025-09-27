"""Tests for the risk management guardrails."""

from dynamic_ai.risk import PositionSizing, RiskContext, RiskManager, RiskParameters


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
