"""Asynchronous task execution utilities for automation workflows."""

from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import inspect
from pathlib import Path
from typing import Awaitable, Callable, Dict, List, Optional

__all__ = [
    "AutomationTaskStatus",
    "AutomationTaskPriority",
    "AutomationTask",
    "TaskExecutor",
]


class AutomationTaskStatus(str, Enum):
    """Lifecycle states recognised by :class:`TaskExecutor`."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class AutomationTaskPriority(int, Enum):
    """Priority levels used when ordering tasks for execution."""

    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


@dataclass(slots=True)
class AutomationTask:
    """Represents a task tracked by :class:`TaskExecutor`."""

    id: str
    name: str
    description: str = ""
    status: AutomationTaskStatus = AutomationTaskStatus.PENDING
    priority: AutomationTaskPriority = AutomationTaskPriority.MEDIUM
    dependencies: List[str] = field(default_factory=list)
    estimated_duration: timedelta = field(default_factory=lambda: timedelta(minutes=30))
    actual_duration: Optional[timedelta] = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    metadata: Dict[str, object] = field(default_factory=dict)

    def to_record(self) -> Dict[str, object]:
        """Return a serialisable representation of the task."""

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "priority": int(self.priority),
            "dependencies": list(self.dependencies),
            "estimated_duration": int(self.estimated_duration.total_seconds()),
            "actual_duration": int(self.actual_duration.total_seconds())
            if self.actual_duration
            else None,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "metadata": self.metadata,
        }


AutomationHandler = Callable[[AutomationTask], Awaitable[bool] | bool]


class TaskExecutor:
    """Main executor responsible for orchestrating automated tasks."""

    def __init__(
        self,
        db_path: str | Path = "tasks.db",
        *,
        default_handler_delay: float = 0.1,
    ) -> None:
        self.db_path = str(db_path)
        self.default_handler_delay = max(default_handler_delay, 0.0)
        self.tasks: Dict[str, AutomationTask] = {}
        self.execution_handlers: Dict[str, AutomationHandler] = {}
        self._logger: Optional[logging.Logger] = None
        self.setup_logging()
        self.setup_database()

    # ------------------------------------------------------------------ logging
    def setup_logging(self) -> None:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler("task_automation.log"),
                logging.StreamHandler(),
            ],
        )
        self._logger = logging.getLogger("TaskExecutor")

    @property
    def logger(self) -> logging.Logger:
        if self._logger is None:  # pragma: no cover - defensive
            self.setup_logging()
        assert self._logger is not None
        return self._logger

    # -------------------------------------------------------------------- storage
    def setup_database(self) -> None:
        """Initialise the SQLite database used for task tracking."""

        database_path = Path(self.db_path)
        if database_path.parent and not database_path.parent.exists():
            database_path.parent.mkdir(parents=True, exist_ok=True)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    dependencies TEXT,
                    estimated_duration INTEGER,
                    actual_duration INTEGER,
                    created_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    metadata TEXT
                )
                """
            )

    # ------------------------------------------------------------------ task API
    def add_task(self, task: AutomationTask) -> None:
        """Register a task with the executor and persist it to the database."""

        if task.id in self.tasks:
            raise ValueError(f"task with id {task.id!r} already registered")
        self.tasks[task.id] = task
        self.update_task_in_db(task)

    def register_handler(self, task_pattern: str, handler: AutomationHandler) -> None:
        """Register an automation handler for tasks whose name matches a pattern."""

        key = task_pattern.lower()
        self.execution_handlers[key] = handler
        self.logger.info("Registered handler for task pattern: %s", task_pattern)

    def load_tasks_from_json(self, json_file: str | Path) -> None:
        """Load tasks from a JSON configuration file."""

        json_path = Path(json_file)
        with json_path.open("r", encoding="utf-8") as file:
            task_data = json.load(file)

        for task_dict in task_data.get("tasks", []):
            status_value = str(task_dict.get("status", AutomationTaskStatus.PENDING.value)).lower()
            priority_value = int(
                task_dict.get("priority", AutomationTaskPriority.MEDIUM.value)
            )
            task = AutomationTask(
                id=str(task_dict["id"]),
                name=str(task_dict["name"]),
                description=str(task_dict.get("description", "")),
                status=AutomationTaskStatus(status_value),
                priority=AutomationTaskPriority(priority_value),
                dependencies=list(task_dict.get("dependencies", [])),
                estimated_duration=timedelta(
                    minutes=int(task_dict.get("estimated_minutes", 30))
                ),
                metadata=dict(task_dict.get("metadata", {})),
            )
            self.add_task(task)

        self.logger.info("Loaded %s tasks from %s", len(self.tasks), json_path)

    def get_ready_tasks(self) -> List[AutomationTask]:
        """Return tasks with dependencies satisfied and pending execution."""

        ready_tasks: List[AutomationTask] = []

        for task in self.tasks.values():
            if task.status is not AutomationTaskStatus.PENDING:
                continue

            dependencies_met = True
            for dependency in task.dependencies:
                dependent_task = self.tasks.get(dependency)
                if dependent_task is None or dependent_task.status is not AutomationTaskStatus.COMPLETED:
                    dependencies_met = False
                    break

            if dependencies_met:
                ready_tasks.append(task)

        return sorted(ready_tasks, key=lambda task: int(task.priority))

    async def execute_task(self, task: AutomationTask) -> bool:
        """Execute a single task using its registered handler or the default handler."""

        task.status = AutomationTaskStatus.IN_PROGRESS
        self.update_task_in_db(task)

        start_time = datetime.now()
        self.logger.info("Starting task: %s (ID: %s)", task.name, task.id)

        try:
            handler = self._match_handler(task)

            result = handler(task)
            if inspect.isawaitable(result):
                success = await result
            else:
                success = bool(result)

            if success:
                task.status = AutomationTaskStatus.COMPLETED
                task.completed_at = datetime.now()
                task.actual_duration = task.completed_at - start_time
                self.logger.info(
                    "Completed task: %s in %s", task.name, task.actual_duration
                )
            else:
                task.status = AutomationTaskStatus.FAILED
                self.logger.error("Failed task: %s", task.name)

            self.update_task_in_db(task)
            return success

        except Exception as exc:  # pragma: no cover - defensive guard
            task.status = AutomationTaskStatus.FAILED
            self.update_task_in_db(task)
            self.logger.error("Error executing task %s: %s", task.name, exc)
            return False

    async def default_handler(self, task: AutomationTask) -> bool:
        """Fallback handler for tasks without a registered automation."""

        self.logger.warning(
            "No specific handler for task: %s, using default handler", task.name
        )

        await asyncio.sleep(self.default_handler_delay)

        auto_complete_patterns = ("test", "validate", "validation", "check", "verify")
        name_lower = task.name.lower()
        if any(pattern in name_lower for pattern in auto_complete_patterns):
            return True

        return False

    def _match_handler(self, task: AutomationTask) -> AutomationHandler:
        name_lower = task.name.lower()
        for pattern, handler in self.execution_handlers.items():
            if pattern in name_lower or pattern in task.id.lower():
                return handler
        return self.default_handler

    def update_task_in_db(self, task: AutomationTask) -> None:
        """Persist task state to the SQLite database."""

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO tasks (
                    id,
                    name,
                    description,
                    status,
                    priority,
                    dependencies,
                    estimated_duration,
                    actual_duration,
                    created_at,
                    completed_at,
                    metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.id,
                    task.name,
                    task.description,
                    task.status.value,
                    int(task.priority),
                    json.dumps(task.dependencies),
                    int(task.estimated_duration.total_seconds()),
                    int(task.actual_duration.total_seconds())
                    if task.actual_duration
                    else None,
                    task.created_at.isoformat(),
                    task.completed_at.isoformat() if task.completed_at else None,
                    json.dumps(task.metadata),
                ),
            )

    async def run_automation_loop(self, *, max_concurrent: int = 3) -> None:
        """Run the automation loop until all tasks have reached a terminal state."""

        self.logger.info("Starting automation loop...")

        semaphore = asyncio.Semaphore(max_concurrent)

        async def run_with_semaphore(execution_task: AutomationTask) -> bool:
            async with semaphore:
                return await self.execute_task(execution_task)

        while True:
            ready_tasks = self.get_ready_tasks()

            if not ready_tasks:
                completed_count = sum(
                    1
                    for item in self.tasks.values()
                    if item.status is AutomationTaskStatus.COMPLETED
                )
                total_count = len(self.tasks)

                if completed_count == total_count:
                    self.logger.info("All tasks completed!")
                    break

                blocked_tasks = [
                    task
                    for task in self.tasks.values()
                    if task.status is AutomationTaskStatus.PENDING and task.dependencies
                ]
                self.logger.warning(
                    "No ready tasks. %s tasks blocked by dependencies",
                    len(blocked_tasks),
                )
                await asyncio.sleep(1.0)
                continue

            tasks_to_execute = ready_tasks[:max_concurrent]
            self.logger.info(
                "Executing %s task(s) concurrently", len(tasks_to_execute)
            )

            await asyncio.gather(
                *(run_with_semaphore(task) for task in tasks_to_execute),
                return_exceptions=True,
            )

            await asyncio.sleep(0)

    # ---------------------------------------------------------------- reporting
    def generate_report(self) -> Dict[str, object]:
        """Generate a summary report of task execution outcomes."""

        completed = [
            task for task in self.tasks.values() if task.status is AutomationTaskStatus.COMPLETED
        ]
        failed = [
            task for task in self.tasks.values() if task.status is AutomationTaskStatus.FAILED
        ]
        pending = [
            task for task in self.tasks.values() if task.status is AutomationTaskStatus.PENDING
        ]

        total_duration = sum(
            (task.actual_duration or timedelta()).total_seconds() for task in completed
        )

        total_tasks = len(self.tasks)
        completion_rate = (len(completed) / total_tasks * 100.0) if total_tasks else 0.0

        return {
            "total_tasks": total_tasks,
            "completed": len(completed),
            "failed": len(failed),
            "pending": len(pending),
            "completion_rate": completion_rate,
            "total_duration_seconds": total_duration,
            "failed_tasks": [
                {"id": task.id, "name": task.name} for task in failed
            ],
            "blocked_tasks": [
                {
                    "id": task.id,
                    "name": task.name,
                    "dependencies": list(task.dependencies),
                }
                for task in pending
                if task.dependencies
            ],
        }

