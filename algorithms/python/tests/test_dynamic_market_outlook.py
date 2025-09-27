"""Tests for the Dynamic Market Outlook engine."""

from __future__ import annotations

import math
from datetime import datetime, timezone

import pytest

from algorithms.python.dynamic_market_outlook import (
    DynamicMarketOutlookEngine,
    MarketOutlookReport,
    MarketOutlookTelemetry,
    OutlookSignal,
)


@pytest.fixture
def engine() -> DynamicMarketOutlookEngine:
    return DynamicMarketOutlookEngine()


def test_generate_outlook_computes_weighted_score(engine: DynamicMarketOutlookEngine) -> None:
    telemetry = MarketOutlookTelemetry(
        macro=(
            OutlookSignal(name="GDP surprise", score=72.0, rationale="GDP beat consensus"),
            OutlookSignal(name="Rate path", score=68.0, rationale="Forward rates stabilising"),
        ),
        flow=(
            OutlookSignal(name="Dark pool accumulation", score=65.0, rationale="Large caps absorbing supply"),
        ),
        sentiment=(
            OutlookSignal(name="Fear & Greed", score=40.0, rationale="Fear remains elevated"),
        ),
        horizon="intraday",
    )

    report = engine.generate(telemetry)

    expected_macro = (72.0 + 68.0) / 2
    expected_score = expected_macro * 0.4 + 65.0 * 0.35 + 40.0 * 0.25
    assert math.isclose(report.score, expected_score, rel_tol=1e-4)
    assert report.macro_score == pytest.approx(expected_macro, rel=1e-4)
    assert report.tier == "risk_on"
    assert "GDP beat consensus" in report.drivers
    assert "Fear remains elevated" in report.cautions
    assert report.metadata["horizon"] == "intraday"
    assert report.metadata["executor"] == "DynamicTradingAlgo"


def test_generate_outlook_handles_missing_inputs(engine: DynamicMarketOutlookEngine) -> None:
    timestamp = datetime(2025, 2, 1, tzinfo=timezone.utc)
    telemetry = MarketOutlookTelemetry(timestamp=timestamp)

    report = engine.generate(telemetry)

    assert isinstance(report, MarketOutlookReport)
    assert report.score == 50.0
    assert report.tier == "neutral"
    assert report.conviction == 0.0
    assert report.metadata["coverage"] == 0.0
    assert report.metadata["timestamp"] == timestamp


def test_generate_outlook_flags_hedge_tier(engine: DynamicMarketOutlookEngine) -> None:
    telemetry = MarketOutlookTelemetry(
        macro=(
            OutlookSignal(name="Recession probability", score=25.0, rationale="Probability above 60%"),
        ),
        flow=(
            OutlookSignal(name="ETF outflows", score=30.0, rationale="Largest weekly outflow of the year"),
        ),
        sentiment=(
            OutlookSignal(name="Put/Call skew", score=20.0, rationale="Skew blowing out"),
        ),
    )

    report = engine.generate(telemetry)

    assert report.tier == "hedge"
    assert report.score == pytest.approx(25.5, rel=1e-3)
    assert any("Reduce gross exposure" in action for action in report.hedging_actions)
    assert report.conviction > 0.0
    assert "Probability above 60%" in report.cautions
