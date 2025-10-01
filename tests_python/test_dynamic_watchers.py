from datetime import timedelta

import pytest

from dynamic_watchers import (
    DynamicWatcher,
    MetricSummary,
    WatcherAlert,
    WatcherRule,
)


def test_report_groups_metrics_and_emits_alerts() -> None:
    watcher = DynamicWatcher(
        history=10,
        rules=[WatcherRule(metric="cpu_load", upper=0.8, severity="critical")],
    )

    watcher.observe({"metric": "cpu_load", "value": 0.5})
    watcher.observe({"metric": "cpu_load", "value": 0.9})

    report = watcher.report()

    assert report.window == 2
    assert report.alerts
    alert = report.alerts[0]
    assert isinstance(alert, WatcherAlert)
    assert alert.metric == "cpu_load"
    assert alert.severity == "critical"

    summary = {metric.metric: metric for metric in report.metrics}
    assert "cpu_load" in summary
    cpu_summary = summary["cpu_load"]
    assert isinstance(cpu_summary, MetricSummary)
    assert cpu_summary.samples == 2
    assert pytest.approx(cpu_summary.minimum) == 0.5
    assert pytest.approx(cpu_summary.maximum) == 0.9
    assert pytest.approx(cpu_summary.trend) == 0.4


def test_report_respects_window_and_tolerance() -> None:
    watcher = DynamicWatcher(history=6)
    watcher.register_rule({"metric": "latency", "upper": 120, "tolerance": 5})

    watcher.extend(
        {
            "metric": "latency",
            "value": value,
            "timestamp": watcher.signals[-1].timestamp + timedelta(minutes=5)
            if watcher.signals
            else None,
        }
        for value in (100, 115, 123)
    )

    baseline_report = watcher.report()
    assert baseline_report.window == 3
    # All values stay within tolerance so no alert is generated.
    assert not baseline_report.alerts

    watcher.observe(
        {
            "metric": "latency",
            "value": 130,
            "timestamp": watcher.signals[-1].timestamp + timedelta(minutes=5),
        }
    )

    tail_report = watcher.report(window=1)
    assert tail_report.window == 1
    assert tail_report.alerts
    assert tail_report.alerts[0].value == pytest.approx(130)


def test_report_requires_observations() -> None:
    watcher = DynamicWatcher()

    with pytest.raises(RuntimeError):
        watcher.report()
