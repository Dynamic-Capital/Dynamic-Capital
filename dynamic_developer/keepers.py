from __future__ import annotations

"""Stateful helpers for coordinating developer iteration planning."""

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, MutableMapping, Sequence

from dynamic_dev_engine import DevelopmentTask

from .agents import DeveloperAgent, DeveloperAgentResultEnvelope
from .helpers import ensure_capacity_payload, ensure_task_sequence

__all__ = [
    "DeveloperKeeperRecord",
    "DeveloperKeeper",
]


@dataclass(slots=True)
class DeveloperKeeperRecord:
    """History entry describing a developer iteration synchronisation."""

    iteration: str
    result: DeveloperAgentResultEnvelope
    tasks: tuple[DevelopmentTask | Mapping[str, Any], ...]
    capacity: object | None = None
    context: Mapping[str, Any] | None = None

    def to_dict(self) -> MutableMapping[str, Any]:
        """Serialise the record for persistence."""

        payload: MutableMapping[str, Any] = {
            "iteration": self.iteration,
            "result": self.result.to_dict(),
            "tasks": [
                task.as_dict() if isinstance(task, DevelopmentTask) else dict(task)
                for task in self.tasks
            ],
        }
        if self.capacity is not None:
            payload["capacity"] = self.capacity
        if self.context:
            payload["context"] = dict(self.context)
        return payload


class DeveloperKeeper:
    """Simple orchestrator that keeps track of iteration history."""

    def __init__(self, agent: DeveloperAgent | None = None) -> None:
        self._agent = agent or DeveloperAgent()
        self._history: list[DeveloperKeeperRecord] = []

    @property
    def history(self) -> tuple[DeveloperKeeperRecord, ...]:
        return tuple(self._history)

    def sync(
        self,
        tasks: Sequence[DevelopmentTask | Mapping[str, Any]] | Mapping[str, Any] | DevelopmentTask,
        *,
        capacity: object | Iterable[object] | None = None,
        iteration: str | None = None,
        objectives: Sequence[str] | object | None = None,
        context: Mapping[str, Any] | None = None,
        horizon_days: int = 5,
    ) -> DeveloperAgentResultEnvelope:
        """Generate an iteration plan and persist it to the history."""

        task_sequence = ensure_task_sequence(tasks)
        capacity_payload = ensure_capacity_payload(capacity)
        result = self._agent.run(
            task_sequence,
            capacity=capacity_payload,
            iteration=iteration,
            objectives=objectives,
            context=context,
            horizon_days=horizon_days,
        )
        record = DeveloperKeeperRecord(
            iteration=result.model.iteration,
            result=result,
            tasks=task_sequence,
            capacity=capacity_payload,
            context=context,
        )
        self._history.append(record)
        return result

    def last(self) -> DeveloperKeeperRecord | None:
        """Return the most recent history entry if it exists."""

        return self._history[-1] if self._history else None

    def summaries(self) -> tuple[str, ...]:
        """Return the textual summary for each recorded iteration."""

        return tuple(record.result.summary() for record in self._history)
