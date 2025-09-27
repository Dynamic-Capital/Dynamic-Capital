"""Tests for the situational analysis engine."""

from __future__ import annotations

from datetime import UTC, datetime

from algorithms.python.situational_analysis import (
    SituationalAnalysisEngine,
    SituationalAnalysisRequest,
)
from algorithms.python.trade_logic import ActivePosition, MarketSnapshot


def _snapshot(**overrides):
    base = dict(
        symbol="EURUSD",
        timestamp=datetime(2024, 6, 3, 12, 0, tzinfo=UTC),
        close=1.0832,
        rsi_fast=55.0,
        adx_fast=26.0,
        rsi_slow=53.0,
        adx_slow=24.0,
        pip_size=0.0001,
        pip_value=10.0,
        mechanical_velocity=0.0004,
        mechanical_acceleration=0.0002,
        mechanical_jerk=0.0001,
        mechanical_energy=0.85,
        mechanical_stress_ratio=0.45,
        mechanical_state="Bullish",
        seasonal_bias=0.2,
        seasonal_confidence=0.6,
        correlation_scores={"DXY": -0.45},
    )
    base.update(overrides)
    return MarketSnapshot(**base)


def test_offensive_posture_when_bias_strong_and_risk_contained() -> None:
    snapshot = _snapshot()
    request = SituationalAnalysisRequest(
        snapshot=snapshot,
        open_positions=(
            ActivePosition(symbol="EURUSD", direction=1, size=1.8, entry_price=1.0780),
        ),
        news_sentiment={"ecb": 0.5, "liquidity": 0.3},
        catalysts=("ECB signals patience",),
    )
    engine = SituationalAnalysisEngine()

    report = engine.analyse(request)

    assert report.bias == "Bullish"
    assert report.posture == "Offensive"
    assert report.opportunity_score > 0.5
    assert report.risk_score < engine.offensive_risk_ceiling
    assert "bullish" in report.narrative.lower()
    assert report.telemetry["catalyst_count"] == 1


def test_defensive_signals_when_risk_and_stress_elevated() -> None:
    snapshot = _snapshot(
        rsi_fast=38.0,
        rsi_slow=42.0,
        adx_fast=18.0,
        adx_slow=16.0,
        mechanical_velocity=-0.0008,
        mechanical_acceleration=-0.0006,
        mechanical_jerk=-0.0004,
        mechanical_energy=1.4,
        mechanical_stress_ratio=3.5,
        mechanical_state="Bearish",
        seasonal_bias=-0.4,
        seasonal_confidence=0.7,
        correlation_scores={"SPX": 0.9},
    )
    request = SituationalAnalysisRequest(
        snapshot=snapshot,
        open_positions=(
            ActivePosition(symbol="EURUSD", direction=1, size=4.0, entry_price=1.09),
            ActivePosition(symbol="EURUSD", direction=1, size=4.0, entry_price=1.0915),
        ),
        news_sentiment={"fomc": -0.6},
        risk_events=("FOMC", "Payrolls", "Inflation"),
    )
    engine = SituationalAnalysisEngine()

    report = engine.analyse(request)

    assert report.bias == "Bearish"
    assert report.posture == "Defensive"
    assert report.risk_score >= engine.defensive_risk_floor
    assert report.opportunity_score <= 0.1
    assert any("correlation" in flag for flag in report.flags)
    assert any("mechanical stress" in flag.lower() for flag in report.flags)
    assert any("risk score" in flag.lower() for flag in report.flags)
    assert "defensive" in report.narrative.lower()
