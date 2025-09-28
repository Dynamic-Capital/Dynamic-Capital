"""Dynamic task management engine for prioritising and scheduling work."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Dict, Iterable, List, MutableMapping, Sequence, Set, Tuple

__all__ = [
    "TaskStatus",
    "Task",
    "TaskContext",
    "TaskSlot",
    "DeferredTask",
    "BlockedTask",
    "TaskSchedule",
    "DynamicTaskManager",
]


# ---------------------------------------------------------------------------
# helpers


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` to the inclusive ``[lower, upper]`` range."""

    return max(lower, min(upper, value))


def _normalise_text(value: str, *, fallback: str | None = None) -> str:
    """Return normalised text or ``fallback`` when the string is empty."""

    cleaned = value.strip()
    if cleaned:
        return cleaned
    if fallback is not None:
        return fallback
    raise ValueError("text value must not be empty")


def _to_date(value: date | datetime | str | None) -> date | None:
    """Coerce a value into a :class:`datetime.date` when possible."""

    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive branch
            raise ValueError(f"invalid ISO date string: {value!r}") from exc
    raise TypeError("due_date must be a date, datetime, ISO string, or None")


# ---------------------------------------------------------------------------
# domain model


class TaskStatus(str, Enum):
    """Represents the lifecycle state of a task."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"


@dataclass(slots=True)
class Task:
    """Single unit of work tracked by :class:`DynamicTaskManager`."""

    name: str
    description: str = ""
    priority: float = 0.5
    effort_hours: float = 1.0
    due_date: date | None = None
    status: TaskStatus = TaskStatus.TODO
    progress: float = 0.0
    tags: Tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.description = self.description.strip()
        self.priority = _clamp(float(self.priority))
        self.effort_hours = max(float(self.effort_hours), 0.0)
        self.due_date = _to_date(self.due_date)
        if not isinstance(self.status, TaskStatus):
            self.status = TaskStatus(str(self.status))
        self.progress = _clamp(float(self.progress))
        normalised_tags: List[str] = []
        for tag in self.tags:
            if not tag:
                continue
            cleaned = _normalise_text(tag, fallback="").strip()
            if not cleaned:
                continue
            normalised_tags.append(cleaned.lower())
        self.tags = tuple(normalised_tags)

    @property
    def remaining_hours(self) -> float:
        """Return the estimated hours still required to finish the task."""

        return max(self.effort_hours * (1.0 - self.progress), 0.0)

    def mark_done(self) -> None:
        """Convenience helper to mark a task as complete."""

        self.status = TaskStatus.DONE
        self.progress = 1.0


@dataclass(slots=True)
class TaskContext:
    """Context for producing a schedule."""

    mission: str
    reporting_period: str
    available_hours: float
    current_date: date | datetime | str
    focus_bias: float = 0.5
    risk_tolerance: float = 0.5
    planning_window_days: int = 14
    focus_tags: Tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.reporting_period = _normalise_text(self.reporting_period)
        self.available_hours = max(float(self.available_hours), 0.0)
        self.current_date = _to_date(self.current_date) or date.today()
        self.focus_bias = _clamp(float(self.focus_bias))
        self.risk_tolerance = _clamp(float(self.risk_tolerance))
        self.planning_window_days = max(int(self.planning_window_days), 1)
        normalised_focus: List[str] = []
        for tag in self.focus_tags:
            if not tag:
                continue
            cleaned = _normalise_text(tag, fallback="").strip()
            if not cleaned:
                continue
            normalised_focus.append(cleaned.lower())
        self.focus_tags = tuple(normalised_focus)


@dataclass(slots=True)
class TaskSlot:
    """Represents a scheduled block of time for a task."""

    name: str
    allocated_hours: float
    remaining_hours: float
    status: TaskStatus
    notes: str = ""

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "allocated_hours": self.allocated_hours,
            "remaining_hours": self.remaining_hours,
            "status": self.status.value,
            "notes": self.notes,
        }


@dataclass(slots=True)
class DeferredTask:
    """Task that could not be scheduled or finished."""

    name: str
    reason: str
    status: TaskStatus

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "reason": self.reason,
            "status": self.status.value,
        }


@dataclass(slots=True)
class BlockedTask:
    """Task blocked by outstanding dependencies."""

    name: str
    missing_dependencies: Tuple[str, ...]
    status: TaskStatus

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "missing_dependencies": list(self.missing_dependencies),
            "status": self.status.value,
        }


@dataclass(slots=True)
class TaskSchedule:
    """Full schedule generated by :class:`DynamicTaskManager`."""

    slots: Tuple[TaskSlot, ...]
    deferred: Tuple[DeferredTask, ...]
    blocked: Tuple[BlockedTask, ...]
    summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "slots": [slot.as_dict() for slot in self.slots],
            "deferred": [item.as_dict() for item in self.deferred],
            "blocked": [item.as_dict() for item in self.blocked],
            "summary": self.summary,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicTaskManager:
    """Prioritise and schedule tasks based on urgency, focus, and capacity."""

    def __init__(self) -> None:
        self._tasks: Dict[str, Task] = {}
        self._dependencies: Dict[str, Set[str]] = {}

    # ------------------------------------------------------------- task intake
    def add(self, task: Task) -> None:
        """Register a new task for future scheduling cycles."""

        if not isinstance(task, Task):  # pragma: no cover - defensive guard
            raise TypeError("task must be a Task instance")
        if task.name in self._tasks:
            raise ValueError(f"task with name {task.name!r} already registered")
        self._tasks[task.name] = task
        self._dependencies.setdefault(task.name, set())

    def extend(self, tasks: Iterable[Task]) -> None:
        for task in tasks:
            self.add(task)

    def clear(self) -> None:
        self._tasks.clear()
        self._dependencies.clear()

    # -------------------------------------------------------- dependency API
    def add_dependency(self, task_name: str, depends_on: str) -> None:
        """Declare that ``task_name`` depends on ``depends_on`` being complete."""

        task_name = _normalise_text(task_name)
        depends_on = _normalise_text(depends_on)
        if task_name == depends_on:
            raise ValueError("tasks cannot depend on themselves")
        if task_name not in self._tasks:
            raise KeyError(f"unknown task: {task_name!r}")
        if depends_on not in self._tasks:
            raise KeyError(f"unknown dependency: {depends_on!r}")

        deps = self._dependencies.setdefault(task_name, set())
        if depends_on in deps:
            return

        # prevent introducing dependency cycles
        if self._creates_cycle(task_name, depends_on):
            raise ValueError(
                f"adding dependency {task_name!r} -> {depends_on!r} would create a cycle"
            )
        deps.add(depends_on)

    def _creates_cycle(self, task_name: str, depends_on: str) -> bool:
        """Check whether linking ``task_name`` to ``depends_on`` forms a cycle."""

        stack = [depends_on]
        visited: Set[str] = set()
        while stack:
            current = stack.pop()
            if current == task_name:
                return True
            if current in visited:
                continue
            visited.add(current)
            stack.extend(self._dependencies.get(current, ()))
        return False

    # ----------------------------------------------------------- state API
    def update_status(self, task_name: str, status: TaskStatus) -> None:
        task = self._tasks.get(task_name)
        if task is None:
            raise KeyError(f"unknown task: {task_name!r}")
        task.status = status
        if status is TaskStatus.DONE:
            task.progress = 1.0

    def get(self, task_name: str) -> Task:
        task = self._tasks.get(task_name)
        if task is None:
            raise KeyError(f"unknown task: {task_name!r}")
        return task

    # -------------------------------------------------------------- reporting
    def backlog_snapshot(self, *, include_completed: bool = False) -> Tuple[Task, ...]:
        """Return tasks sorted by scheduling priority."""

        if not self._tasks:
            return tuple()
        context = TaskContext(
            mission="backlog",
            reporting_period="snapshot",
            available_hours=1.0,
            current_date=date.today(),
        )
        ranked = sorted(
            (
                task
                for task in self._tasks.values()
                if include_completed or task.status is not TaskStatus.DONE
            ),
            key=lambda task: self._score(task, context),
            reverse=True,
        )
        return tuple(ranked)

    # ------------------------------------------------------------- scheduling
    def plan(self, context: TaskContext) -> TaskSchedule:
        if not self._tasks:
            raise RuntimeError("no tasks have been registered")

        ready: List[Task] = []
        blocked: List[BlockedTask] = []

        for task in self._tasks.values():
            if task.status is TaskStatus.DONE or task.remaining_hours <= 0.0:
                continue
            deps = self._dependencies.get(task.name, set())
            missing = tuple(sorted(dep for dep in deps if self._tasks[dep].status is not TaskStatus.DONE))
            if missing:
                blocked.append(BlockedTask(task.name, missing, task.status))
                continue
            ready.append(task)

        if not ready and not blocked:
            return TaskSchedule(tuple(), tuple(), tuple(), "no tasks require scheduling")

        ranked_ready = sorted(ready, key=lambda task: self._score(task, context), reverse=True)

        slots: List[TaskSlot] = []
        deferred: List[DeferredTask] = []
        remaining_capacity = context.available_hours

        for task in ranked_ready:
            required = task.remaining_hours
            if required <= 0.0:
                continue
            if remaining_capacity <= 0.0:
                deferred.append(
                    DeferredTask(task.name, "insufficient capacity this cycle", task.status)
                )
                continue

            allocation = min(required, remaining_capacity)
            remaining_capacity -= allocation
            spillover = max(required - allocation, 0.0)

            notes: List[str] = []
            if task.status is TaskStatus.TODO:
                notes.append("kick-off scheduled")
            if spillover > 0.0:
                notes.append("additional sessions required")
                deferred.append(
                    DeferredTask(task.name, "requires additional capacity", task.status)
                )

            projected_status = TaskStatus.IN_PROGRESS
            if task.status is TaskStatus.IN_PROGRESS and spillover <= 0.0:
                projected_status = TaskStatus.IN_PROGRESS
            elif spillover <= 0.0 and required <= allocation:
                projected_status = TaskStatus.DONE if task.progress >= 1.0 else TaskStatus.IN_PROGRESS

            slots.append(
                TaskSlot(
                    name=task.name,
                    allocated_hours=allocation,
                    remaining_hours=spillover,
                    status=projected_status,
                    notes="; ".join(notes),
                )
            )

        summary = self._summarise(slots, deferred, blocked, remaining_capacity)

        return TaskSchedule(tuple(slots), tuple(deferred), tuple(blocked), summary)

    # ----------------------------------------------------------- scoring utils
    def _score(self, task: Task, context: TaskContext) -> float:
        priority = task.priority
        urgency = self._urgency(task, context)
        focus = self._focus_alignment(task, context)
        momentum = 0.15 if task.status is TaskStatus.IN_PROGRESS else 0.0
        effort_balance = 1.0 - _clamp(task.remaining_hours / (context.available_hours + 1e-9))

        weighted = (
            priority * 0.45
            + urgency * 0.3
            + focus * context.focus_bias * 0.15
            + momentum
            + effort_balance * 0.1
        )
        return _clamp(weighted, lower=0.0, upper=1.5)

    def _urgency(self, task: Task, context: TaskContext) -> float:
        if task.due_date is None:
            return 0.3 + (context.risk_tolerance * 0.3)

        delta_days = (task.due_date - context.current_date).days
        if delta_days <= 0:
            return 1.0
        window = float(context.planning_window_days)
        return _clamp(1.0 - (delta_days / window), lower=0.0, upper=1.0)

    def _focus_alignment(self, task: Task, context: TaskContext) -> float:
        if not context.focus_tags or not task.tags:
            return 0.0
        focus_set = set(context.focus_tags)
        overlap = focus_set.intersection(task.tags)
        if not overlap:
            return 0.0
        return _clamp(len(overlap) / max(len(focus_set), 1), lower=0.0, upper=1.0)

    def _summarise(
        self,
        slots: Sequence[TaskSlot],
        deferred: Sequence[DeferredTask],
        blocked: Sequence[BlockedTask],
        remaining_capacity: float,
    ) -> str:
        parts = [
            f"scheduled {len(slots)} task(s)",
            f"blocked {len(blocked)}",
            f"deferred {len(deferred)}",
        ]
        if remaining_capacity > 0.0:
            parts.append(f"{remaining_capacity:.1f}h capacity remaining")
        return ", ".join(parts)
