from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_block import DynamicBlock


def test_schedule_preserves_order_and_timing() -> None:
    block = DynamicBlock(
        start_time=datetime(2024, 1, 1, 9, 0, tzinfo=timezone.utc),
        target_duration=timedelta(hours=3),
    )
    block.add_task("Planning", timedelta(minutes=45), priority=0.4)
    block.add_task("Deep Work", timedelta(minutes=90), priority=0.9)
    block.add_task("Review", timedelta(minutes=30))

    schedule = block.schedule()

    assert [task.name for task in schedule] == ["Planning", "Deep Work", "Review"]
    assert schedule[0].start == datetime(2024, 1, 1, 9, 0, tzinfo=timezone.utc)
    assert schedule[0].end == datetime(2024, 1, 1, 9, 45, tzinfo=timezone.utc)
    assert schedule[-1].end == datetime(2024, 1, 1, 11, 45, tzinfo=timezone.utc)

    metrics = block.metrics
    assert metrics.scheduled_duration == timedelta(minutes=165)
    assert metrics.remaining_duration == timedelta(minutes=15)
    assert pytest.approx(metrics.utilisation, rel=1e-5) == 165 / 180


def test_rebalance_trims_low_priority_flexible_tasks() -> None:
    block = DynamicBlock(
        start_time=datetime(2024, 2, 1, 13, 0, tzinfo=timezone.utc),
        target_duration=timedelta(hours=2),
    )
    block.add_task("Feature work", timedelta(minutes=80), priority=0.9)
    block.add_task(
        "Support",
        timedelta(minutes=70),
        priority=0.2,
        flexible=True,
        minimum_duration=timedelta(minutes=20),
    )
    block.add_task(
        "Exploration",
        timedelta(minutes=50),
        priority=0.4,
        flexible=True,
        minimum_duration=timedelta(minutes=10),
    )

    block.rebalance()

    durations = {task.name: task.duration for task in block.tasks}
    assert durations["Feature work"] == timedelta(minutes=80)
    assert durations["Support"] == timedelta(minutes=20)
    assert durations["Exploration"] == timedelta(minutes=20)
    assert block.total_duration == timedelta(hours=2)


def test_rebalance_raises_when_no_slack() -> None:
    block = DynamicBlock(
        start_time=datetime(2024, 3, 1, 15, 0, tzinfo=timezone.utc),
        target_duration=timedelta(hours=1),
    )
    block.add_task("Sync", timedelta(minutes=40))
    block.add_task("Review", timedelta(minutes=30))

    with pytest.raises(ValueError, match="insufficient flexible slack"):
        block.rebalance()


def test_metrics_signal_pressure_without_rebalance() -> None:
    block = DynamicBlock(
        start_time=datetime(2024, 4, 1, 10, 0, tzinfo=timezone.utc),
        target_duration=timedelta(minutes=60),
        buffer=timedelta(minutes=15),
    )
    block.add_task("Audit", timedelta(minutes=50))
    block.add_task("Report", timedelta(minutes=40))

    metrics = block.metrics
    assert metrics.scheduled_duration == timedelta(minutes=90)
    assert metrics.target_duration == timedelta(minutes=75)
    assert metrics.is_over_capacity is True
    assert pytest.approx(metrics.pressure, rel=1e-5) == 90 / 75
    assert metrics.flexible_slack == timedelta(0)
