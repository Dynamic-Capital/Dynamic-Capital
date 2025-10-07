from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest

from dynamic_watchers import ApiWatcherResult, run_api_watcher


def _event(host: str, offset_seconds: int) -> dict[str, object]:
    base = datetime(2025, 10, 7, 11, 7, 33, tzinfo=timezone.utc)
    event_time = base + timedelta(seconds=offset_seconds)
    microseconds = int(event_time.timestamp() * 1_000_000)
    body = {
        "component": "api",
        "error": "context canceled",
        "level": "error",
        "msg": "watcher is exiting",
        "host": host,
        "time": event_time.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }
    return {
        "id": f"event-{host}-{offset_seconds}",
        "timestamp": microseconds,
        "metadata": [body],
        "event_message": json.dumps(body),
    }


def test_run_api_watcher_flags_fast_restarts() -> None:
    events = [
        _event("db-1", 0),
        _event("db-1", 60),
        _event("db-2", 600),
    ]

    result = run_api_watcher(events, history=10, min_gap_seconds=120.0)
    assert isinstance(result, ApiWatcherResult)
    assert result.processed_events == 3
    assert result.hosts == ("db-1", "db-2")

    report = result.report
    assert report.window == 3
    assert report.metrics

    metrics = {summary.metric: summary for summary in report.metrics}
    metric_key = "api_watcher.exit_gap_seconds.db-1"
    assert metric_key in metrics
    assert pytest.approx(metrics[metric_key].last) == 60.0

    assert report.alerts
    alert = report.alerts[0]
    assert alert.metric == metric_key
    assert alert.severity == "critical"
    assert "too quickly" in alert.message
    assert pytest.approx(alert.value) == 60.0

