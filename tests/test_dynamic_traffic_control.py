"""Tests for the dynamic traffic control utility."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic.trading.algo.dynamic_traffic import (  # noqa: E402
    DynamicTrafficControl,
    TrafficSignal,
)


def _dt(minutes: int = 0, seconds: int = 0) -> datetime:
    base = datetime(2025, 4, 5, tzinfo=timezone.utc)
    return base + timedelta(minutes=minutes, seconds=seconds)


def test_snapshot_computes_pressure_and_throttle() -> None:
    control = DynamicTrafficControl(window_duration=timedelta(minutes=5))
    control.register_policy(
        "/api/orders",
        target_rpm=30.0,
        max_error_rate=0.05,
        max_latency_ms=450.0,
    )

    control.record(
        TrafficSignal(
            route="/api/orders",
            requests=50,
            allowed=45,
            blocked=5,
            errors=3,
            latency_ms=380.0,
            timestamp=_dt(minutes=-2),
        )
    )
    control.record(
        TrafficSignal(
            route="/api/orders",
            requests=40,
            allowed=38,
            blocked=2,
            errors=1,
            latency_ms=520.0,
            timestamp=_dt(minutes=-1),
        )
    )

    snapshot = control.snapshot("/api/orders", current_time=_dt())

    assert snapshot.request_count == 90
    assert snapshot.allowed_count == 83
    assert snapshot.blocked_count == 7
    assert snapshot.error_count == 4
    assert snapshot.request_rate_per_minute == pytest.approx(41.5, rel=1e-3)
    assert snapshot.utilisation_ratio == pytest.approx(41.5 / 30.0, rel=1e-3)
    assert snapshot.error_ratio == pytest.approx((11 / 90) / 0.05, rel=1e-3)
    assert snapshot.latency_p95_ms == pytest.approx(520.0, rel=1e-3)
    assert snapshot.average_latency_ms == pytest.approx(36860 / 83, rel=1e-3)
    assert snapshot.throttle == pytest.approx(1 / ((11 / 90) / 0.05), rel=1e-3)
    assert snapshot.status == "critical"


def test_decide_enforces_concurrency_and_latency() -> None:
    control = DynamicTrafficControl(window_duration=timedelta(minutes=3))
    control.register_policy(
        "/api/feed",
        target_rpm=120.0,
        max_concurrency=4,
        max_error_rate=0.2,
        max_latency_ms=600.0,
    )

    now = _dt()
    control.record(
        TrafficSignal(
            route="/api/feed",
            requests=30,
            allowed=30,
            latency_ms=220.0,
            timestamp=now - timedelta(seconds=40),
        )
    )

    initial = control.decide(
        "/api/feed", current_concurrency=2, requested_cost=1.0, current_time=now
    )
    assert initial.allowed is True
    assert initial.reason == "ok"
    assert initial.throttle == pytest.approx(1.0, rel=1e-3)

    control.record(
        TrafficSignal(
            route="/api/feed",
            requests=12,
            allowed=9,
            blocked=3,
            errors=2,
            latency_ms=780.0,
            timestamp=now - timedelta(seconds=5),
        )
    )

    decision = control.decide(
        "/api/feed", current_concurrency=4, requested_cost=1.0, current_time=now
    )

    assert decision.allowed is False
    assert decision.reason == "concurrency"
    assert decision.throttle < 1.0
    assert decision.snapshot.latency_ratio > 1.0


def test_ingest_normalises_payloads() -> None:
    control = DynamicTrafficControl(window_duration=timedelta(minutes=2))
    control.register_policy(
        "/status",
        target_rpm=20.0,
        max_error_rate=1.0,
        max_latency_ms=500.0,
    )

    assert control.ingest({}) is False
    assert control.ingest({"path": "/status"}) is True
    assert (
        control.ingest(
            {
                "route": "/status",
                "requests": 5,
                "blocked": 2,
                "errors": 1,
                "latency": 240.0,
                "timestamp": _dt().isoformat(),
            }
        )
        is True
    )

    snapshot = control.snapshot("/status", current_time=_dt(minutes=1))

    assert snapshot.request_count == 5
    assert snapshot.allowed_count == 3
    assert snapshot.blocked_count == 2
    assert snapshot.error_count == 1
    assert snapshot.latency_p95_ms == pytest.approx(240.0, rel=1e-3)
    assert snapshot.status == "stable"
