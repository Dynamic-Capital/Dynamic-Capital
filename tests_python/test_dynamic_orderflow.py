"""Tests for the optimised dynamic orderflow utilities."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_orderflow import DynamicOrderFlow, OrderEvent, OrderFlowWindow


def _now() -> datetime:
    return datetime.now(timezone.utc)


def test_orderflow_window_accumulates_and_expires() -> None:
    window = OrderFlowWindow(timedelta(seconds=60))

    reference = _now()
    stale_event = OrderEvent(
        symbol="ES",
        side="buy",
        size=5,
        price=4305.0,
        timestamp=reference - timedelta(minutes=10),
    )
    window.add(stale_event)
    assert window.event_count == 0

    buy_event = OrderEvent(
        symbol="ES",
        side="buy",
        size=2,
        price=4300.5,
        timestamp=reference - timedelta(seconds=20),
    )
    sell_event = OrderEvent(
        symbol="ES",
        side="sell",
        size=1,
        price=4301.0,
        timestamp=reference - timedelta(seconds=5),
    )

    window.add(buy_event)
    window.add(sell_event)

    assert window.event_count == 2
    assert window.buy_notional == pytest.approx(buy_event.notional)
    assert window.sell_notional == pytest.approx(sell_event.notional)
    assert window.total_notional == pytest.approx(buy_event.notional + sell_event.notional)
    assert window.event_rate() == pytest.approx(8.0, rel=1e-3)

    assert window.total_notional == pytest.approx(buy_event.notional + sell_event.notional)


def test_dynamic_orderflow_health_includes_flow_metrics() -> None:
    flow = DynamicOrderFlow(horizon=timedelta(seconds=90), max_samples=10)

    reference = _now()
    flow.record(
        OrderEvent(
            symbol="CL",
            side="buy",
            size=3,
            price=82.5,
            timestamp=reference - timedelta(seconds=6),
        )
    )
    flow.record(
        OrderEvent(
            symbol="CL",
            side="sell",
            size=1,
            price=82.8,
            timestamp=reference - timedelta(seconds=3),
        )
    )

    health = flow.health()

    assert health["event_count"] == 2
    assert health["average_notional"] == pytest.approx(
        (82.5 * 3 + 82.8 * 1) / 2,
        rel=1e-3,
    )
    assert health["events_per_minute"] > 0.0
    assert health["dominant_side"] in {"buy", "sell", "neutral"}
