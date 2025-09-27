"""Tests for the Dynamic Market index builder."""

from __future__ import annotations

import pytest

from algorithms.python.dynamic_market_index import (
    DynamicMarketIndexBuilder,
    MarketConstituentConfig,
    MarketFlowSignal,
)
from algorithms.python.dynamic_market_outlook import (
    DynamicMarketOutlookEngine,
    MarketOutlookTelemetry,
    OutlookSignal,
)


@pytest.fixture()
def builder() -> DynamicMarketIndexBuilder:
    return DynamicMarketIndexBuilder(
        base_constituents=(
            MarketConstituentConfig(symbol="BTCUSD", weight=0.5, tags=("crypto",)),
            MarketConstituentConfig(symbol="ETHUSD", weight=0.3, tags=("crypto", "defi")),
            MarketConstituentConfig(symbol="XAUUSD", weight=0.2, tags=("commodities",)),
        )
    )


def _risk_on_outlook() -> MarketOutlookTelemetry:
    return MarketOutlookTelemetry(
        macro=(
            OutlookSignal(name="GDP", score=72.0, rationale="Growth momentum"),
            OutlookSignal(name="Inflation", score=65.0, rationale="Inflation cooling"),
        ),
        flow=(OutlookSignal(name="ETF inflows", score=70.0, rationale="Inflow surge"),),
        sentiment=(OutlookSignal(name="Fear & Greed", score=60.0, rationale="Greed building"),),
    )


def test_build_dynamic_market_index_with_flows_and_outlook(
    builder: DynamicMarketIndexBuilder,
) -> None:
    engine = DynamicMarketOutlookEngine()
    outlook_report = engine.generate(_risk_on_outlook())

    flows = (
        MarketFlowSignal(
            symbol="btcusd",
            pressure=0.55,
            return_pct=0.08,
            confidence=0.8,
            liquidity=0.92,
            volatility=0.4,
        ),
        MarketFlowSignal(
            symbol="ethusd",
            pressure=0.35,
            return_pct=0.05,
            confidence=0.7,
            liquidity=0.88,
        ),
        {
            "symbol": "eurusd",
            "pressure": -0.2,
            "return_pct": -0.01,
            "confidence": 0.55,
            "liquidity": 0.8,
            "volatility": 0.22,
            "weight": 0.2,
            "tags": ("fx", "macro"),
            "category": "fx",
        },
    )

    result = builder.build(flows=flows, outlook=outlook_report)

    snapshot = result.snapshot
    assert snapshot.top_constituents[0] == "BTCUSD"
    assert snapshot.net_exposure > 0.0
    assert snapshot.momentum > 0.0
    assert "BTCUSD" in snapshot.top_constituents
    assert "EURUSD" in snapshot.top_constituents

    assert result.regime == "risk_on"
    assert result.conviction >= outlook_report.conviction
    assert result.metadata["outlook_tier"] == outlook_report.tier
    assert result.metadata["flow_count"] == 3
    assert "themes" in result.metadata
    assert result.metadata["themes"]
    assert any("risk on" in highlight.lower() for highlight in result.highlights)

    payload = result.to_dict()
    assert payload["regime"] == "risk_on"
    assert payload["snapshot"]["top_constituents"][0] == "BTCUSD"
    assert payload["metadata"]["constituent_count"] >= 3


def test_build_dynamic_market_index_handles_missing_inputs() -> None:
    builder = DynamicMarketIndexBuilder()

    result = builder.build()

    snapshot = result.snapshot
    assert snapshot.value == 0.0
    assert result.regime == "balanced"
    assert result.conviction == 0.0
    assert result.metadata["flow_count"] == 0
    assert result.highlights == ("index is empty",)

    payload = result.to_dict()
    assert payload["metadata"]["constituent_count"] == 0
    assert payload["highlights"] == ["index is empty"]
