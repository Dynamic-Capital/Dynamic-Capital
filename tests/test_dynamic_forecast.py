from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_forecast import DynamicForecast, ForecastObservation


def _observation(value: float, *, days: int, start: datetime) -> ForecastObservation:
    return ForecastObservation(
        value=value,
        timestamp=start + timedelta(days=days),
        confidence=0.8,
        label=f"day-{days}",
        drivers=("demand", "pricing"),
    )


def test_snapshot_reports_trend_and_readiness() -> None:
    engine = DynamicForecast(window=5)
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)

    for index in range(6):
        engine.register(_observation(100 + index * 5, days=index, start=start))

    summary = engine.snapshot()
    assert summary.count == 5
    assert summary.latest == pytest.approx(125)
    assert summary.change == pytest.approx(20)
    assert summary.slope > 0
    assert summary.volatility >= 0
    assert 0.0 <= summary.readiness <= 1.0
    assert summary.timestamp is not None


def test_projection_generates_scenarios() -> None:
    engine = DynamicForecast(window=4)
    start = datetime(2024, 3, 1, tzinfo=timezone.utc)

    engine.register({"value": 200.0, "timestamp": start, "confidence": 0.7})
    engine.register({"value": 210.0, "timestamp": start + timedelta(days=1), "confidence": 0.8})
    engine.register({"value": 226.0, "timestamp": start + timedelta(days=2), "confidence": 0.9})

    projections = engine.project(periods=3, cadence=timedelta(days=1))

    assert len(projections) == 3
    first = projections[0]
    assert first.baseline > 226.0
    assert first.optimistic >= first.baseline
    assert first.pessimistic <= first.baseline
    assert 0.0 <= first.confidence <= 1.0
    assert first.timestamp == start + timedelta(days=3)

    final = projections[-1]
    assert final.timestamp == start + timedelta(days=5)
