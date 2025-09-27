"""Tests for the Dynamic Market snapshot builder."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.dynamic_market_outlook import (
    DynamicMarketOutlookEngine,
    MarketOutlookTelemetry,
    OutlookSignal,
)
from algorithms.python.dynamic_market_snapshot import DynamicMarketSnapshotBuilder


@pytest.fixture()
def builder() -> DynamicMarketSnapshotBuilder:
    return DynamicMarketSnapshotBuilder(leader_limit=2, laggard_limit=2)


def _sample_outlook() -> MarketOutlookTelemetry:
    return MarketOutlookTelemetry(
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


def test_compose_snapshot_blends_outlook_and_flows(builder: DynamicMarketSnapshotBuilder) -> None:
    engine = DynamicMarketOutlookEngine()
    outlook_report = engine.generate(_sample_outlook())

    flows = [
        {
            "symbol": "eurusd",
            "pressure": 0.42,
            "bias": "buy",
            "net_volume": 2.4,
            "gross_volume": 5.8,
            "trade_count": 8,
            "realised_pnl": 185.0,
            "last_trade_at": datetime(2025, 1, 5, 10, 0, tzinfo=timezone.utc),
        },
        {
            "symbol": "btcusd",
            "pressure": -0.55,
            "bias": "sell",
            "net_volume": -3.1,
            "gross_volume": 6.5,
            "trade_count": 6,
            "realised_pnl": -240.0,
            "last_trade_at": "2025-01-05T10:05:00+00:00",
        },
        {
            "symbol": "xauusd",
            "pressure": 0.08,
            "net_volume": 1.2,
            "gross_volume": 2.1,
            "trade_count": 4,
            "realised_pnl": 42.0,
        },
    ]

    snapshot = builder.compose(
        outlook=outlook_report,
        flows=flows,
        liquidity={"uptime": 99.2, "spread_bps": 8.5, "depth_usd": 550_000.0},
        volatility_index=28.0,
        timestamp=datetime(2025, 1, 5, 10, 6, tzinfo=timezone.utc),
        notes=("Desk check", "Overnight calm"),
        metadata={"source": "unit-test"},
    )

    assert snapshot.score == pytest.approx(outlook_report.score, rel=1e-4)
    assert snapshot.tone == "risk_on"
    assert snapshot.liquidity.status == "robust"
    assert snapshot.volatility.status == "calm"
    assert snapshot.participation.status in {"active", "steady"}
    assert snapshot.leaders[0].symbol == "EURUSD"
    assert snapshot.laggards[0].symbol == "BTCUSD"
    assert "risk on" in snapshot.summary.lower()
    assert snapshot.metadata["flow_count"] == 3
    assert snapshot.metadata["outlook"]["tier"] == outlook_report.tier

    payload = snapshot.to_dict()
    assert payload["leaders"][0]["symbol"] == "EURUSD"
    assert payload["metadata"]["timestamp"] == "2025-01-05T10:06:00+00:00"
    assert payload["metadata"]["source"] == "unit-test"


def test_compose_snapshot_handles_missing_inputs(builder: DynamicMarketSnapshotBuilder) -> None:
    snapshot = builder.compose()

    assert snapshot.score == 50.0
    assert snapshot.tone == "balanced"
    assert snapshot.leaders == []
    assert snapshot.laggards == []
    assert snapshot.liquidity.status == "unknown"
    assert snapshot.volatility.status == "unknown"
    assert snapshot.participation.status == "unknown"
    assert snapshot.alerts == []

    payload = snapshot.to_dict()
    assert payload["leaders"] == []
    assert payload["metadata"]["flow_count"] == 0


def test_compose_snapshot_flags_defensive_conditions(builder: DynamicMarketSnapshotBuilder) -> None:
    defensive_outlook = DynamicMarketOutlookEngine().generate(
        MarketOutlookTelemetry(
            macro=(OutlookSignal(name="PMI", score=28.0, rationale="Contraction"),),
            flow=(OutlookSignal(name="ETF outflows", score=30.0, rationale="Sell pressure"),),
            sentiment=(OutlookSignal(name="Vol spike", score=20.0, rationale="Stress"),),
        )
    )

    flows = [
        {
            "symbol": "ethusd",
            "pressure": -0.62,
            "bias": "sell",
            "net_volume": -1.4,
            "gross_volume": 1.6,
            "trade_count": 2,
            "realised_pnl": -58.0,
        }
    ]

    snapshot = builder.compose(
        outlook=defensive_outlook,
        flows=flows,
        liquidity={"uptime": 88.0, "spread_bps": 26.0, "depth_usd": 90_000.0},
        volatility_index=85.0,
    )

    assert snapshot.tone == "defensive"
    assert snapshot.liquidity.status == "stressed"
    assert snapshot.volatility.status == "elevated"
    assert "defensive" in snapshot.summary.lower()
    assert any("liquidity" in alert.lower() for alert in snapshot.alerts)
    assert any("volatility" in alert.lower() for alert in snapshot.alerts)
