"""Tests for the task automation executor."""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from dynamic_task_manager import (
    AutomationTask,
    AutomationTaskPriority,
    AutomationTaskStatus,
    TaskExecutor,
)


class TaskExecutorAsyncTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._temp_dir.cleanup)
        self.db_path = Path(self._temp_dir.name) / "tasks.db"
        self.executor = TaskExecutor(self.db_path, default_handler_delay=0.01)

    async def test_default_handler_completes_validation_tasks(self) -> None:
        task = AutomationTask(
            id="task-1",
            name="Data validation",
            description="Run validation suite",
            status=AutomationTaskStatus.PENDING,
            priority=AutomationTaskPriority.MEDIUM,
        )
        self.executor.add_task(task)

        ready = self.executor.get_ready_tasks()
        self.assertEqual(len(ready), 1)

        result = await self.executor.execute_task(task)

        self.assertTrue(result)
        self.assertEqual(task.status, AutomationTaskStatus.COMPLETED)
        self.assertIsNotNone(task.actual_duration)

    async def test_handlers_are_matched_by_pattern(self) -> None:
        events: list[str] = []

        async def handler(task: AutomationTask) -> bool:
            events.append(task.id)
            task.metadata["executed"] = True
            return True

        self.executor.register_handler("deploy", handler)

        task = AutomationTask(
            id="deploy-1",
            name="Deploy service",
            description="",
            status=AutomationTaskStatus.PENDING,
            priority=AutomationTaskPriority.HIGH,
        )
        self.executor.add_task(task)

        await self.executor.execute_task(task)

        self.assertEqual(events, ["deploy-1"])
        self.assertTrue(task.metadata.get("executed"))
        self.assertEqual(task.status, AutomationTaskStatus.COMPLETED)

    async def test_dependencies_block_until_completed(self) -> None:
        async def root_handler(task: AutomationTask) -> bool:
            return True

        self.executor.register_handler("root", root_handler)

        root_task = AutomationTask(
            id="root",
            name="Root task",
            description="",
            status=AutomationTaskStatus.PENDING,
            priority=AutomationTaskPriority.CRITICAL,
        )
        dependent = AutomationTask(
            id="dependent",
            name="Dependent task",
            description="",
            status=AutomationTaskStatus.PENDING,
            priority=AutomationTaskPriority.HIGH,
            dependencies=["root"],
        )

        self.executor.add_task(root_task)
        self.executor.add_task(dependent)

        ready_initial = self.executor.get_ready_tasks()
        self.assertEqual([task.id for task in ready_initial], ["root"])

        await self.executor.execute_task(root_task)

        ready_after = self.executor.get_ready_tasks()
        self.assertEqual([task.id for task in ready_after], ["dependent"])


class TaskExecutorSyncTest(unittest.TestCase):
    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._temp_dir.cleanup)
        self.db_path = Path(self._temp_dir.name) / "tasks.db"
        self.executor = TaskExecutor(self.db_path, default_handler_delay=0.0)

    def test_tasks_load_from_json(self) -> None:
        json_data = {
            "tasks": [
                {
                    "id": "alpha",
                    "name": "Alpha",
                    "priority": AutomationTaskPriority.CRITICAL.value,
                    "estimated_minutes": 45,
                },
                {
                    "id": "beta",
                    "name": "Beta",
                    "priority": AutomationTaskPriority.HIGH.value,
                    "dependencies": ["alpha"],
                },
            ]
        }

        json_path = Path(self._temp_dir.name) / "tasks.json"
        json_path.write_text(json.dumps(json_data), encoding="utf-8")

        self.executor.load_tasks_from_json(json_path)

        self.assertEqual(len(self.executor.tasks), 2)
        self.assertIn("alpha", self.executor.tasks)
        self.assertIn("beta", self.executor.tasks)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM tasks")
            (count,) = cursor.fetchone()
            self.assertEqual(count, 2)

    def test_generate_report(self) -> None:
        completed = AutomationTask(
            id="completed",
            name="Completed",
            description="",
            status=AutomationTaskStatus.COMPLETED,
            priority=AutomationTaskPriority.MEDIUM,
            actual_duration=timedelta(minutes=10),
            completed_at=None,
        )
        failed = AutomationTask(
            id="failed",
            name="Failed",
            description="",
            status=AutomationTaskStatus.FAILED,
            priority=AutomationTaskPriority.LOW,
        )
        pending = AutomationTask(
            id="pending",
            name="Pending",
            description="",
            status=AutomationTaskStatus.PENDING,
            priority=AutomationTaskPriority.HIGH,
            dependencies=["completed"],
        )

        for task in (completed, failed, pending):
            self.executor.add_task(task)

        report = self.executor.generate_report()

        self.assertEqual(report["total_tasks"], 3)
        self.assertEqual(report["completed"], 1)
        self.assertEqual(report["failed"], 1)
        self.assertEqual(report["pending"], 1)
        self.assertEqual(report["failed_tasks"], [{"id": "failed", "name": "Failed"}])
        self.assertEqual(
            report["blocked_tasks"],
            [{"id": "pending", "name": "Pending", "dependencies": ["completed"]}],
        )


if __name__ == "__main__":  # pragma: no cover
    unittest.main()

