"""Tests for the DynamicMetadataAlgo helper."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic.trading.algo import (  # noqa: E402
    DynamicMarketFlow,
    DynamicMetadataAlgo,
    DynamicPoolAlgo,
)


def _build_sample_analysis() -> dict:
    return {
        "action": "BUY",
        "confidence": 0.72,
        "score": 0.38,
        "primary_driver": "technical",
        "components": [
            {"name": "technical", "score": 0.4},
            {"name": "sentiment", "score": 0.1},
        ],
        "notes": ["Momentum aligned across indicators."],
    }


def _build_sample_risk() -> dict:
    return {
        "risk_notes": ["Confidence clipped by guardrail."],
        "treasury_health": 0.92,
        "circuit_breaker": False,
    }


def test_metadata_algo_blends_sources() -> None:
    pool = DynamicPoolAlgo(mark_price=1.25)
    pool.record_deposit("alice", 10_000, dct_amount=8_000)
    pool.record_deposit("bob", 5_000, dct_amount=4_000)
    pool_snapshot = pool.snapshot()

    flow = DynamicMarketFlow()
    flow.record("EURUSD", "BUY", 1.5, price=1.1, profit=24.0)
    flow.record("EURUSD", "SELL", 1.0, price=1.11, profit=-5.0)
    flow_snapshot = flow.snapshot("EURUSD")

    algo = DynamicMetadataAlgo(max_attributes=12)
    metadata = algo.build(
        symbol="eurusd",
        analysis=_build_sample_analysis(),
        flow=flow_snapshot,
        pool=pool_snapshot,
        risk=_build_sample_risk(),
        tags=["fx", "eur"],
        timestamp=datetime(2024, 9, 23, 15, 30, tzinfo=timezone.utc),
        extra={"version": 1},
    )

    assert metadata["symbol"] == "EURUSD"
    assert metadata["timestamp"] == "2024-09-23T15:30:00+00:00"
    assert metadata["sources"] == {
        "analysis": True,
        "market_flow": True,
        "pool": True,
        "risk": True,
    }
    assert "Pool Valuation (USD)" in {a["trait_type"] for a in metadata["attributes"]}
    assert metadata["scores"]["analysis"] == 0.38
    notes_blob = " ".join(metadata["risk_notes"]).lower()
    assert "treasury health" in notes_blob
    assert set(metadata["tags"]) == {
        "dynamic",
        "eur",
        "fx",
        "intelligence",
        "technical",
        flow_snapshot.bias.lower(),
    }
    assert metadata["version"] == 1


def test_metadata_algo_handles_missing_sections() -> None:
    algo = DynamicMetadataAlgo(max_attributes=4)
    metadata = algo.build(symbol="btcusd")

    assert metadata["symbol"] == "BTCUSD"
    assert metadata["sources"] == {
        "analysis": False,
        "market_flow": False,
        "pool": False,
        "risk": False,
    }
    assert metadata["attributes"]  # includes baseline attributes
    assert metadata["tags"] == ["dynamic", "intelligence"]
