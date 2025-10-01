from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic.trading.algo.dynamic_tracking import DynamicTrackingAlgo  # noqa: E402


def _dt(days: int = 0, hours: int = 0) -> datetime:
    base = datetime(2025, 3, 1, tzinfo=timezone.utc)
    return base + timedelta(days=days, hours=hours)


def test_snapshot_compiles_funnel_metrics() -> None:
    algo = DynamicTrackingAlgo(["awareness", "consideration", "conversion"], lookback_window=timedelta(days=10))

    algo.track("user-1", "awareness", value=1.0, timestamp=_dt(days=-3))
    algo.track("user-1", "consideration", value=2.5, timestamp=_dt(days=-2))
    algo.track("user-1", "conversion", value=3.0, timestamp=_dt(days=-1))
    algo.track("user-2", "awareness", value=1.2, timestamp=_dt(days=-1, hours=3))
    algo.track("user-2", "conversion", value=5.0, timestamp=_dt())

    snapshot = algo.snapshot(current_time=_dt())

    assert snapshot.total_events == 5
    assert snapshot.total_users == 2

    stage_map = {summary.stage: summary for summary in snapshot.stage_summaries}
    assert stage_map["AWARENESS"].event_count == 2
    assert stage_map["CONSIDERATION"].unique_users == 1
    assert stage_map["CONVERSION"].unique_users == 2
    assert stage_map["CONVERSION"].conversion_rate == pytest.approx(1.0, rel=1e-3)
    assert stage_map["CONVERSION"].drop_off_rate == pytest.approx(0.0, rel=1e-3)

    assert snapshot.overall_conversion == pytest.approx(1.0, rel=1e-3)
    assert snapshot.velocity_per_day == pytest.approx(5 / 3, rel=1e-3)
    assert abs(snapshot.anomaly_score) <= 3.0


def test_ingest_handles_payloads_and_windowing() -> None:
    algo = DynamicTrackingAlgo(["lead", "qualified", "customer"], lookback_window=timedelta(days=1), max_events=3)

    assert algo.ingest({"user_id": "42", "stage": "lead", "timestamp": _dt(days=-2).isoformat()}) is True
    assert algo.snapshot(current_time=_dt()).total_events == 0

    assert algo.ingest({"user": "42", "step": "lead", "event": "signup", "value": 2, "timestamp": _dt(hours=-5).isoformat()}) is True
    assert algo.ingest({"uid": "42", "stage": "qualified", "amount": 5.5, "timestamp": _dt(hours=-4).isoformat()}) is True
    assert algo.ingest({"user_id": "42", "stage": "customer", "score": 8, "timestamp": _dt(hours=-3).isoformat()}) is True

    snapshot = algo.snapshot(current_time=_dt())
    assert snapshot.total_events == 3
    assert snapshot.stage_summaries[-1].conversion_rate == pytest.approx(1.0, rel=1e-3)

    assert algo.ingest({}) is False
