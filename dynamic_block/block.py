"""Dynamic block scheduling primitives for adaptive time management."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Mapping, MutableSequence, Sequence

__all__ = [
    "BlockMetrics",
    "BlockTask",
    "DynamicBlock",
    "ScheduledTask",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _coerce_duration(value: timedelta | float | int) -> timedelta:
    if isinstance(value, timedelta):
        duration = value
    else:
        try:
            minutes = float(value)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
            raise TypeError("duration must be numeric minutes or timedelta") from exc
        duration = timedelta(minutes=minutes)
    if duration.total_seconds() <= 0:
        raise ValueError("duration must be positive")
    return duration


def _coerce_non_negative_duration(value: timedelta | float | int) -> timedelta:
    if isinstance(value, timedelta):
        duration = value
    else:
        try:
            minutes = float(value)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
            raise TypeError("duration must be numeric minutes or timedelta") from exc
        duration = timedelta(minutes=minutes)
    if duration.total_seconds() < 0:
        raise ValueError("duration must be non-negative")
    return duration


def _coerce_minimum(duration: timedelta, minimum: timedelta | float | int | None, *, flexible: bool) -> timedelta:
    if not flexible:
        return duration
    if minimum is None:
        return timedelta(0)
    minimum_duration = _coerce_non_negative_duration(minimum)
    if minimum_duration > duration:
        raise ValueError("minimum duration must be less than or equal to duration")
    return minimum_duration


def _normalise_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise ValueError("task name must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    unique: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            unique.append(cleaned)
    return tuple(unique)


def _clamp_priority(priority: float | int) -> float:
    try:
        numeric = float(priority)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("priority must be numeric") from exc
    if numeric < 0.0 or numeric > 1.0:
        raise ValueError("priority must be between 0 and 1")
    return numeric


@dataclass(slots=True)
class BlockTask:
    """Represents a task that occupies time within a block."""

    name: str
    duration: timedelta
    priority: float = 0.5
    flexible: bool = False
    minimum_duration: timedelta = field(default_factory=timedelta)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.duration = _coerce_duration(self.duration)
        self.priority = _clamp_priority(self.priority)
        if self.flexible:
            self.minimum_duration = _coerce_minimum(self.duration, self.minimum_duration, flexible=True)
        else:
            self.minimum_duration = self.duration
        self.tags = _normalise_tags(self.tags)

    @property
    def slack(self) -> timedelta:
        """Returns how much time can be reclaimed from the task."""

        slack = self.duration - self.minimum_duration
        return slack if slack.total_seconds() > 0 else timedelta(0)

    def trim(self, delta: timedelta) -> timedelta:
        """Trim the task by ``delta`` (or the remaining slack)."""

        if delta.total_seconds() <= 0:
            return timedelta(0)
        if not self.flexible:
            return timedelta(0)
        allowable = min(self.slack, delta)
        if allowable.total_seconds() <= 0:
            return timedelta(0)
        self.duration -= allowable
        return allowable


@dataclass(slots=True)
class ScheduledTask:
    """Represents a task positioned within the block timeline."""

    name: str
    start: datetime
    end: datetime
    duration: timedelta
    priority: float
    tags: tuple[str, ...]
    metadata: Mapping[str, object] | None


@dataclass(slots=True)
class BlockMetrics:
    """Summary metrics describing block utilisation."""

    target_duration: timedelta
    scheduled_duration: timedelta
    flexible_slack: timedelta

    @property
    def remaining_duration(self) -> timedelta:
        remaining = self.target_duration - self.scheduled_duration
        return remaining if remaining.total_seconds() > 0 else timedelta(0)

    @property
    def utilisation(self) -> float:
        if self.target_duration.total_seconds() == 0:
            return 0.0
        ratio = self.scheduled_duration.total_seconds() / self.target_duration.total_seconds()
        return max(0.0, min(ratio, 1.0))

    @property
    def pressure(self) -> float:
        if self.target_duration.total_seconds() == 0:
            return 0.0
        ratio = self.scheduled_duration.total_seconds() / self.target_duration.total_seconds()
        return max(0.0, ratio)

    @property
    def is_over_capacity(self) -> bool:
        return self.scheduled_duration > self.target_duration


class DynamicBlock:
    """Adaptive planner that organises tasks inside a time block."""

    def __init__(
        self,
        *,
        start_time: datetime | None = None,
        target_duration: timedelta | float | int,
        buffer: timedelta | float | int | None = None,
    ) -> None:
        self.start_time = _ensure_utc(start_time)
        self.target_duration = _coerce_duration(target_duration)
        self.buffer = _coerce_non_negative_duration(buffer) if buffer is not None else timedelta(0)
        self._tasks: MutableSequence[BlockTask] = []

    def add_task(
        self,
        name: str,
        duration: timedelta | float | int,
        *,
        priority: float = 0.5,
        flexible: bool = False,
        minimum_duration: timedelta | float | int | None = None,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> BlockTask:
        task_duration = _coerce_duration(duration)
        if minimum_duration is None:
            minimum_value = task_duration if not flexible else timedelta(0)
        else:
            minimum_value = _coerce_non_negative_duration(minimum_duration)
        task = BlockTask(
            name=name,
            duration=task_duration,
            priority=priority,
            flexible=flexible,
            minimum_duration=minimum_value,
            tags=tags or (),
            metadata=metadata,
        )
        self._tasks.append(task)
        return task

    def remove_task(self, name: str) -> bool:
        normalised = _normalise_name(name)
        for index, task in enumerate(self._tasks):
            if task.name == normalised:
                del self._tasks[index]
                return True
        return False

    def clear(self) -> None:
        self._tasks.clear()

    @property
    def tasks(self) -> tuple[BlockTask, ...]:
        return tuple(self._tasks)

    @property
    def total_duration(self) -> timedelta:
        return sum((task.duration for task in self._tasks), timedelta(0))

    @property
    def flexible_slack(self) -> timedelta:
        return sum((task.slack for task in self._tasks if task.flexible), timedelta(0))

    @property
    def end_time(self) -> datetime:
        return self.start_time + self.target_duration

    def rebalance(self) -> None:
        """Trim flexible tasks until the block fits within its capacity."""

        capacity = self.target_duration + self.buffer
        overage = self.total_duration - capacity
        if overage <= timedelta(0):
            return
        adjustable: list[BlockTask] = sorted(
            (task for task in self._tasks if task.flexible and task.slack > timedelta(0)),
            key=lambda task: task.priority,
        )
        remaining = overage
        for task in adjustable:
            recovered = task.trim(remaining)
            remaining -= recovered
            if remaining <= timedelta(0):
                break
        if remaining > timedelta(0):
            raise ValueError("insufficient flexible slack to fit within the block")

    def schedule(self, *, auto_rebalance: bool = True) -> list[ScheduledTask]:
        if auto_rebalance:
            self.rebalance()
        cursor = self.start_time
        scheduled: list[ScheduledTask] = []
        for task in self._tasks:
            end = cursor + task.duration
            scheduled.append(
                ScheduledTask(
                    name=task.name,
                    start=cursor,
                    end=end,
                    duration=task.duration,
                    priority=task.priority,
                    tags=task.tags,
                    metadata=task.metadata,
                )
            )
            cursor = end
        return scheduled

    @property
    def metrics(self) -> BlockMetrics:
        return BlockMetrics(
            target_duration=self.target_duration + self.buffer,
            scheduled_duration=self.total_duration,
            flexible_slack=self.flexible_slack,
        )
