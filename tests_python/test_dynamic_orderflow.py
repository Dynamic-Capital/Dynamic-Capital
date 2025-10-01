"""Tests for dynamic orderflow telemetry primitives."""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

import pytest

import dynamic_orderflow.engine as engine
from dynamic_orderflow import DynamicOrderFlow, OrderEvent, OrderFlowWindow


def _ts(offset_seconds: float = 0.0) -> datetime:
    """Helper to build timezone-aware timestamps anchored at a fixed epoch."""

    return datetime(2024, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=offset_seconds)


def test_order_flow_window_drops_expired_events(monkeypatch: pytest.MonkeyPatch) -> None:
    base_time = _ts()
    monkeypatch.setattr(engine, "_utcnow", lambda: base_time)

    window = OrderFlowWindow(horizon=timedelta(seconds=60))
    stale_event = OrderEvent(
        symbol="ETHUSD",
        side="buy",
        size=2,
        price=1800,
        timestamp=_ts(-300),
    )

    window.add(stale_event)

    assert len(window.events) == 0
    assert window.total_notional == 0.0


def test_order_flow_window_prunes_on_access(monkeypatch: pytest.MonkeyPatch) -> None:
    base_time = _ts()
    monkeypatch.setattr(engine, "_utcnow", lambda: base_time)

    window = OrderFlowWindow(horizon=timedelta(seconds=30))
    fresh_event = OrderEvent(
        symbol="BTCUSD",
        side="sell",
        size=0.5,
        price=30000,
        timestamp=base_time,
    )
    window.add(fresh_event)

    assert window.total_notional == pytest.approx(fresh_event.notional)

    later_time = base_time + timedelta(seconds=120)
    monkeypatch.setattr(engine, "_utcnow", lambda: later_time)

    imbalance = window.imbalance()
    assert imbalance.total_notional == 0.0
    assert imbalance.delta == 0.0
    assert len(window.events) == 0


def test_dynamic_order_flow_health_reflects_current_pressure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    base_time = _ts()
    monkeypatch.setattr(engine, "_utcnow", lambda: base_time)

    telemetry = DynamicOrderFlow(horizon=timedelta(seconds=45))
    buy_event = OrderEvent(
        symbol="AAPL",
        side="buy",
        size=10,
        price=150,
        timestamp=base_time,
    )
    telemetry.record(buy_event)

    initial_health = telemetry.health()
    assert initial_health["dominant_side"] == "buy"
    assert initial_health["intensity"] == pytest.approx(1.0)
    assert initial_health["bias"] == pytest.approx(1.0)

    later_time = base_time + timedelta(minutes=5)
    monkeypatch.setattr(engine, "_utcnow", lambda: later_time)

    stale_health = telemetry.health()
    assert stale_health["dominant_side"] == "neutral"
    assert stale_health["intensity"] == pytest.approx(0.0)
    assert stale_health["bias"] == pytest.approx(0.5)

