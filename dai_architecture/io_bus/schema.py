"""Schemas for Build Phase 1 task and result envelopes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, MutableMapping


@dataclass(slots=True)
class ConstraintSet:
    """Basic constraint palette enforced during routing."""

    max_latency_ms: int = 1_000
    max_cost_usd: float = 0.25
    min_confidence: float = 0.4

    def as_dict(self) -> MutableMapping[str, float | int]:
        return {
            "max_latency_ms": self.max_latency_ms,
            "max_cost_usd": round(self.max_cost_usd, 4),
            "min_confidence": round(self.min_confidence, 4),
        }


@dataclass(slots=True)
class TaskEnvelope:
    """Normalised request flowing through the task bus."""

    task_id: str
    intent: str
    context: Mapping[str, Any]
    constraints: ConstraintSet = field(default_factory=ConstraintSet)

    def to_dict(self) -> MutableMapping[str, Any]:
        payload: MutableMapping[str, Any] = {
            "task_id": self.task_id,
            "intent": self.intent,
            "context": dict(self.context),
        }
        payload["constraints"] = self.constraints.as_dict()
        return payload


@dataclass(slots=True)
class ResultEnvelope:
    """Response payload emitted after orchestration."""

    task_id: str
    status: str
    payload: Mapping[str, Any]

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "task_id": self.task_id,
            "status": self.status,
            "payload": dict(self.payload),
        }


def coerce_task(payload: Mapping[str, Any]) -> TaskEnvelope:
    """Validate ``payload`` and return a :class:`TaskEnvelope`."""

    task_id = str(payload.get("task_id", "")).strip()
    intent = str(payload.get("intent", "")).strip()
    context = payload.get("context")
    if not task_id:
        raise ValueError("Task payload requires a non-empty 'task_id'")
    if not intent:
        raise ValueError("Task payload requires a non-empty 'intent'")
    if not isinstance(context, Mapping):
        raise ValueError("Task payload requires a mapping 'context'")

    constraint_mapping = payload.get("constraints")
    constraints = ConstraintSet()
    if isinstance(constraint_mapping, Mapping):
        constraints = ConstraintSet(
            max_latency_ms=int(constraint_mapping.get("max_latency_ms", constraints.max_latency_ms)),
            max_cost_usd=float(constraint_mapping.get("max_cost_usd", constraints.max_cost_usd)),
            min_confidence=float(constraint_mapping.get("min_confidence", constraints.min_confidence)),
        )
    return TaskEnvelope(task_id=task_id, intent=intent, context=context, constraints=constraints)
