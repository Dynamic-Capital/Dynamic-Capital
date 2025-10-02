"""Agent persona orchestrating operations planning outputs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from .engine import (
    OperationalConstraint,
    OperationalTask,
    OperationsPlan,
    DynamicOperator,
)

__all__ = ["DynamicOperatorAgentResult", "DynamicOperatorAgent"]


def _ensure_sequence(value: object) -> Sequence[object]:
    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        return (value,)
    if isinstance(value, Sequence):  # type: ignore[return-value]
        return value
    return (value,)


def _coerce_tasks(value: object) -> tuple[OperationalTask | Mapping[str, object], ...]:
    tasks: list[OperationalTask | Mapping[str, object]] = []
    for item in _ensure_sequence(value):
        if isinstance(item, (OperationalTask, Mapping)):
            tasks.append(item)
    return tuple(tasks)


def _coerce_constraints(value: object) -> tuple[OperationalConstraint | Mapping[str, object], ...]:
    constraints: list[OperationalConstraint | Mapping[str, object]] = []
    for item in _ensure_sequence(value):
        if isinstance(item, (OperationalConstraint, Mapping)):
            constraints.append(item)
    return tuple(constraints)


def _coerce_focus(value: object) -> tuple[str, ...]:
    focus: list[str] = []
    for item in _ensure_sequence(value):
        text = str(item).strip()
        if text and text not in focus:
            focus.append(text)
    return tuple(focus)


def _extract_objective(value: object | None) -> str:
    text = str(value or "Operations Objective").strip()
    return text or "Operations Objective"


def _summarise(plan: OperationsPlan) -> str:
    count = len(plan.tasks)
    total_effort = plan.metrics.get("total_effort_hours", 0.0)
    risk = plan.metrics.get("average_risk", 0.0)
    coverage = plan.metrics.get("focus_coverage", 0.0)
    return (
        f"Plan covers {count} task(s) requiring {total_effort:.1f}h. "
        f"Average risk {risk:.2f}; focus coverage {coverage:.0%}."
    )


def _confidence(plan: OperationsPlan) -> float:
    risk = plan.metrics.get("average_risk", 0.0)
    if not isinstance(risk, (int, float)):
        return 0.0
    pressure = max(
        float(value)
        for key, value in plan.metrics.items()
        if key.startswith("constraint::")
    ) if any(key.startswith("constraint::") for key in plan.metrics) else 0.0
    confidence = 1.0 - min(1.0, float(risk)) - min(0.3, max(0.0, pressure - 1.0))
    return max(0.0, min(1.0, confidence))


@dataclass(slots=True)
class DynamicOperatorAgentResult:
    """Structured payload returned by :class:`DynamicOperatorAgent`."""

    agent: str
    rationale: str
    confidence: float
    plan: OperationsPlan

    def to_dict(self) -> dict[str, object]:
        return {
            "agent": self.agent,
            "rationale": self.rationale,
            "confidence": round(self.confidence, 4),
            "plan": self.plan.as_dict(),
        }


class DynamicOperatorAgent:
    """Persona that translates operational context into a prioritised plan."""

    name = "operator"

    def __init__(self, operator: DynamicOperator | None = None) -> None:
        self.operator = operator or DynamicOperator()

    def run(self, payload: Mapping[str, object]) -> DynamicOperatorAgentResult:
        tasks = _coerce_tasks(payload.get("tasks") or payload.get("work"))
        constraints = _coerce_constraints(payload.get("constraints"))
        focus = _coerce_focus(payload.get("focus") or payload.get("themes"))
        objective = _extract_objective(payload.get("objective"))

        plan = self.operator.orchestrate(
            tasks,
            objective=objective,
            focus=focus,
            constraints=constraints,
        )

        rationale = _summarise(plan)
        confidence = _confidence(plan)

        return DynamicOperatorAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            plan=plan,
        )
