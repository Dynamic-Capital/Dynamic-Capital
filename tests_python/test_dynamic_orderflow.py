"""Tests for dynamic_orderflow engine organisation."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import sys

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))


from dynamic_orderflow import (  # noqa: E402  - imported after sys.path mutation
    DynamicOrderFlow,
    OrderEvent,
    OrderFlowStream,
)
from dynamic_orderflow.engine import OrderFlowSummary, _utcnow  # noqa: E402


def _make_event(symbol: str, side: str, size: float, price: float, *, seconds_ago: int = 0) -> OrderEvent:
    timestamp = _utcnow() - timedelta(seconds=seconds_ago)
    return OrderEvent(symbol=symbol, side=side, size=size, price=price, timestamp=timestamp)


def test_order_flow_stream_summary_dict_contains_latest_timestamp() -> None:
    stream = OrderFlowStream(symbol="CL", horizon=timedelta(seconds=60), max_samples=5)
    event = _make_event("CL", "buy", 2.0, 50.0, seconds_ago=2)
    stream.record(event)

    summary = stream.summary()
    assert isinstance(summary, OrderFlowSummary)
    payload = summary.as_dict()

    assert payload["symbol"] == "CL"
    assert payload["dominant_side"] == "buy"
    assert payload["total_notional"] == pytest.approx(100.0)
    assert payload["event_count"] == 1
    assert "last_timestamp" in payload


def test_dynamic_order_flow_overview_organises_by_symbol() -> None:
    flow = DynamicOrderFlow(horizon=timedelta(seconds=120), max_samples=10)
    flow.ingest(
        [
            _make_event("AAPL", "buy", 2.0, 100.0, seconds_ago=10),
            _make_event("AAPL", "sell", 1.0, 110.0, seconds_ago=8),
            _make_event("TSLA", "sell", 0.5, 200.0, seconds_ago=5),
        ]
    )

    summaries = flow.overview()
    assert [summary.symbol for summary in summaries] == ["AAPL", "TSLA"]

    aapl = summaries[0]
    assert aapl.dominant_side == "buy"
    assert aapl.total_notional == pytest.approx(2.0 * 100.0 + 1.0 * 110.0)

    tsla = summaries[1]
    assert tsla.dominant_side == "sell"
    assert tsla.event_count == 1


def test_dynamic_order_flow_health_includes_stream_breakdown() -> None:
    flow = DynamicOrderFlow(horizon=timedelta(seconds=30), max_samples=4)
    event = _make_event("ES", "sell", 1.0, 4300.0, seconds_ago=1)
    flow.record(event)

    health = flow.health()
    assert health["dominant_side"] == "sell"
    assert health["streams"][0]["symbol"] == "ES"
    assert health["streams"][0]["event_count"] == 1
