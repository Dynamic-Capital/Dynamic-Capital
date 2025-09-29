"""Volatile context buffers for Build Phase 1."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, MutableMapping

from ..io_bus.schema import TaskEnvelope


@dataclass(slots=True)
class ContextState:
    """Mutable L0 context associated with a task."""

    task_id: str
    values: MutableMapping[str, Any] = field(default_factory=dict)


class L0ContextManager:
    """Tracks ephemeral execution context for in-flight tasks."""

    def __init__(self) -> None:
        self._contexts: MutableMapping[str, ContextState] = {}

    def prepare(self, envelope: TaskEnvelope) -> Mapping[str, Any]:
        """Return a merged context for ``envelope`` and initialise storage."""

        state = self._contexts.setdefault(envelope.task_id, ContextState(task_id=envelope.task_id))
        state.values["intent"] = envelope.intent
        # Always refresh values from the latest envelope so downstream adapters see
        # the most recent telemetry.  ``setdefault`` would retain stale data from
        # older runs when keys overlap, so we explicitly overwrite instead.
        for key, value in envelope.context.items():
            state.values[key] = value
        return dict(state.values)

    def update(self, task_id: str, **updates: Any) -> None:
        state = self._contexts.setdefault(task_id, ContextState(task_id=task_id))
        state.values.update(updates)

    def get(self, task_id: str) -> Mapping[str, Any]:
        state = self._contexts.get(task_id)
        return dict(state.values) if state else {}

    def discard(self, task_id: str) -> None:
        self._contexts.pop(task_id, None)
