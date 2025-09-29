"""Tests for the dynamic task manager module."""

from __future__ import annotations

import unittest
from datetime import date, timedelta

from dynamic_task_manager import (
    DynamicTaskManager,
    Task,
    TaskContext,
    TaskProgressUpdate,
    TaskSchedule,
    TaskSlot,
    TaskStatus,
)


class TaskSchedulingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.today = date(2024, 1, 1)
        self.manager = DynamicTaskManager()

    def _base_context(self, *, hours: float) -> TaskContext:
        return TaskContext(
            mission="Quarterly OKRs",
            reporting_period="weekly",
            available_hours=hours,
            current_date=self.today,
            focus_bias=0.6,
            risk_tolerance=0.4,
            planning_window_days=10,
            focus_tags=("growth", "experimentation"),
        )

    def test_urgent_tasks_are_prioritised(self) -> None:
        urgent = Task(
            name="Publish customer report",
            priority=0.6,
            effort_hours=3.0,
            due_date=self.today + timedelta(days=1),
            tags=("growth",),
        )
        deep_work = Task(
            name="Refactor analytics pipeline",
            priority=0.9,
            effort_hours=4.0,
            due_date=self.today + timedelta(days=9),
            tags=("architecture",),
        )
        blocked = Task(
            name="Launch experiment",
            priority=0.8,
            effort_hours=2.0,
            due_date=self.today + timedelta(days=2),
            tags=("experimentation",),
        )

        self.manager.extend([urgent, deep_work, blocked])
        self.manager.add_dependency("Launch experiment", "Publish customer report")

        schedule = self.manager.plan(self._base_context(hours=5.0))

        self.assertIsInstance(schedule, TaskSchedule)
        self.assertEqual(len(schedule.slots), 2)
        self.assertEqual(schedule.slots[0].name, "Publish customer report")
        self.assertLessEqual(schedule.slots[0].allocated_hours, 3.0)
        self.assertTrue(any(item.name == "Launch experiment" for item in schedule.blocked))

    def test_partial_allocation_records_deferred_item(self) -> None:
        task = Task(
            name="Migrate billing system",
            priority=0.9,
            effort_hours=5.0,
            tags=("platform",),
        )
        self.manager.add(task)

        schedule = self.manager.plan(self._base_context(hours=2.0))

        self.assertEqual(len(schedule.slots), 1)
        slot = schedule.slots[0]
        self.assertIsInstance(slot, TaskSlot)
        self.assertAlmostEqual(slot.allocated_hours, 2.0)
        self.assertGreater(slot.remaining_hours, 0.0)
        self.assertTrue(any(item.name == task.name for item in schedule.deferred))

    def test_cycle_detection_prevents_invalid_dependencies(self) -> None:
        first = Task(name="Draft strategy", priority=0.8)
        second = Task(name="Review strategy", priority=0.7)

        self.manager.extend([first, second])
        self.manager.add_dependency("Review strategy", "Draft strategy")

        with self.assertRaises(ValueError):
            self.manager.add_dependency("Draft strategy", "Review strategy")

    def test_backlog_snapshot_orders_by_priority(self) -> None:
        a = Task(name="Document architecture", priority=0.5)
        b = Task(name="Ship onboarding", priority=0.9, due_date=self.today)
        c = Task(name="Add telemetry", priority=0.6, status=TaskStatus.IN_PROGRESS, progress=0.3)
        d = Task(name="Archive legacy system", priority=0.4, status=TaskStatus.DONE)

        self.manager.extend([a, b, c, d])

        snapshot = self.manager.backlog_snapshot()

        self.assertEqual(snapshot[0].name, "Ship onboarding")
        self.assertNotIn(d, snapshot)
        self.assertLess(snapshot.index(c), snapshot.index(a))

    def test_run_cycle_updates_progress_and_reports(self) -> None:
        urgent = Task(
            name="Publish customer report",
            priority=0.6,
            effort_hours=3.0,
            due_date=self.today + timedelta(days=1),
            tags=("growth",),
        )
        deep_work = Task(
            name="Refactor analytics pipeline",
            priority=0.9,
            effort_hours=4.0,
            due_date=self.today + timedelta(days=9),
            tags=("architecture",),
        )
        blocked = Task(
            name="Launch experiment",
            priority=0.8,
            effort_hours=2.0,
            due_date=self.today + timedelta(days=2),
            tags=("experimentation",),
        )

        self.manager.extend([urgent, deep_work, blocked])
        self.manager.add_dependency("Launch experiment", "Publish customer report")

        schedule, updates = self.manager.run_cycle(self._base_context(hours=5.0))

        self.assertIsInstance(schedule, TaskSchedule)
        self.assertTrue(updates)
        self.assertTrue(all(isinstance(item, TaskProgressUpdate) for item in updates))

        update_map = {item.name: item for item in updates}

        publish = update_map["Publish customer report"]
        self.assertEqual(publish.status, TaskStatus.DONE)
        self.assertAlmostEqual(publish.progress, 1.0)
        self.assertEqual(publish.remaining_hours, 0.0)
        self.assertIn("completed", publish.note)

        refactor = update_map["Refactor analytics pipeline"]
        self.assertEqual(refactor.status, TaskStatus.IN_PROGRESS)
        self.assertAlmostEqual(refactor.progress, 0.5)
        self.assertAlmostEqual(refactor.remaining_hours, 2.0)
        self.assertIn("requires additional capacity", refactor.note)

        launch = update_map["Launch experiment"]
        self.assertEqual(launch.status, TaskStatus.BLOCKED)
        self.assertIn("Publish customer report", launch.note)

        # Run a second cycle once dependencies clear and ensure work completes.
        follow_up_context = self._base_context(hours=5.0)
        _, second_updates = self.manager.run_cycle(follow_up_context)
        follow_up_map = {item.name: item for item in second_updates}

        refactor_done = follow_up_map["Refactor analytics pipeline"]
        self.assertEqual(refactor_done.status, TaskStatus.DONE)
        self.assertAlmostEqual(refactor_done.progress, 1.0)
        self.assertEqual(refactor_done.remaining_hours, 0.0)

        launch_done = follow_up_map["Launch experiment"]
        self.assertEqual(launch_done.status, TaskStatus.DONE)
        self.assertAlmostEqual(launch_done.progress, 1.0)
        self.assertEqual(launch_done.remaining_hours, 0.0)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
