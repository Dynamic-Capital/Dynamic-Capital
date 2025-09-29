"""In-memory task bus for Build Phase 1 pipelines."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Optional

from .schema import ResultEnvelope, TaskEnvelope


@dataclass(slots=True)
class _QueueStats:
    published: int = 0
    consumed: int = 0


class TaskBus:
    """Lightweight in-memory message bus suitable for tests and prototypes."""

    def __init__(self) -> None:
        self._tasks: Deque[TaskEnvelope] = deque()
        self._results: Deque[ResultEnvelope] = deque()
        self._task_stats = _QueueStats()
        self._result_stats = _QueueStats()

    @property
    def pending_tasks(self) -> int:
        return len(self._tasks)

    @property
    def pending_results(self) -> int:
        return len(self._results)

    def publish_task(self, envelope: TaskEnvelope) -> None:
        self._tasks.append(envelope)
        self._task_stats.published += 1

    def publish_result(self, envelope: ResultEnvelope) -> None:
        self._results.append(envelope)
        self._result_stats.published += 1

    def dequeue_task(self) -> Optional[TaskEnvelope]:
        if not self._tasks:
            return None
        self._task_stats.consumed += 1
        return self._tasks.popleft()

    def dequeue_result(self) -> Optional[ResultEnvelope]:
        if not self._results:
            return None
        self._result_stats.consumed += 1
        return self._results.popleft()

    def task_stats(self) -> _QueueStats:
        return _QueueStats(self._task_stats.published, self._task_stats.consumed)

    def result_stats(self) -> _QueueStats:
        return _QueueStats(self._result_stats.published, self._result_stats.consumed)
