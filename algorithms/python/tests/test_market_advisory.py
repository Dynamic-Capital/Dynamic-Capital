from datetime import datetime, timezone

import pytest

from algorithms.python.market_advisory import (
    MarketAdvisoryEngine,
    MarketAdvisoryReport,
    MarketAdvisoryRequest,
)
from algorithms.python.trade_logic import ActivePosition, MarketSnapshot


def _snapshot(**overrides) -> MarketSnapshot:
    base = dict(
        symbol="EURUSD",
        timestamp=datetime(2024, 3, 4, 8, 0, tzinfo=timezone.utc),
        close=1.0850,
        rsi_fast=62.0,
        adx_fast=26.0,
        rsi_slow=58.0,
        adx_slow=24.0,
        pip_size=0.0001,
        pip_value=10.0,
        seasonal_bias=0.3,
        seasonal_confidence=0.7,
        mechanical_velocity=1.4,
        mechanical_energy=2.5,
    )
    base.update(overrides)
    return MarketSnapshot(**base)


def test_engine_produces_bullish_guidance() -> None:
    request = MarketAdvisoryRequest(
        snapshot=_snapshot(),
        risk_appetite="balanced",
        horizon="swing",
        open_positions=[
            ActivePosition(symbol="EURUSD", direction=1, size=1.0, entry_price=1.08),
            ActivePosition(symbol="EURUSD", direction=-1, size=0.3, entry_price=1.09),
        ],
        macro_thesis=["ECB divergence supports EUR resilience"],
        key_levels={"support": 1.0820, "resistance": 1.0930, "midpoint": 1.0880},
        risk_signals={"volatility": 0.72, "liquidity": 0.5},
        watchlist=["DXY", "EURGBP", "DXY"],
    )

    engine = MarketAdvisoryEngine()
    report = engine.generate(request)

    assert isinstance(report, MarketAdvisoryReport)
    assert report.symbol == "EURUSD"
    assert report.stance == "Bullish"
    assert report.conviction >= 0.6
    assert report.actions[0].startswith("Bias remains constructive")
    assert any("hedge" in hedge.lower() for hedge in report.hedges)
    assert any("volatility" in note.lower() for note in report.risk_notes)
    assert report.telemetry["net_exposure"] == pytest.approx(0.7)
    assert report.telemetry["watchlist"] == ["DXY", "EURGBP"]
    assert "ECB divergence" in report.macro_context[0]
    assert "Monitor confirmation" in report.macro_context[1]


def test_engine_handles_neutral_bias_and_deduplicates_watchlist() -> None:
    snapshot = _snapshot(
        rsi_fast=51.0,
        adx_fast=19.0,
        rsi_slow=49.5,
        adx_slow=18.0,
        seasonal_bias=None,
        seasonal_confidence=None,
        mechanical_velocity=0.0,
        mechanical_energy=0.0,
    )
    request = MarketAdvisoryRequest(
        snapshot=snapshot,
        risk_appetite="defensive",
        horizon="intraday",
        open_positions=[
            ActivePosition(symbol="EURUSD", direction=-1, size=0.25, entry_price=1.0860),
            ActivePosition(symbol="EURUSD", direction=-1, size=0.15, entry_price=1.0875),
        ],
        macro_thesis=["Range-bound conditions into data void"],
        key_levels={"support": 1.0815, "resistance": 1.0905},
        risk_signals={"volatility": 0.45},
        watchlist=["DXY", "EURJPY", "EURJPY"],
    )

    engine = MarketAdvisoryEngine()
    report = engine.generate(request)

    assert report.stance == "Neutral"
    assert report.conviction <= 0.4
    assert "market-neutral" in report.actions[0].lower()
    assert "delta-neutral" in report.hedges[0].lower()
    assert report.telemetry["watchlist"] == ["DXY", "EURJPY"]
    assert any("benign" in note.lower() for note in report.risk_notes)
    assert any("net short" in note.lower() for note in report.risk_notes)
    assert "intraday horizon" in report.macro_context[-1]
