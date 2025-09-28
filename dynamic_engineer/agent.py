"""Agent persona wrapping :mod:`dynamic_engineer.engine`."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from .engine import DynamicEngineer, EngineeringBlueprint, EngineeringTask

__all__ = ["DynamicEngineerAgentResult", "DynamicEngineerAgent"]


def _ensure_sequence(value: object) -> Sequence[object]:
    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        return (value,)
    if isinstance(value, Sequence):  # type: ignore[return-value]
        return value
    return (value,)


def _coerce_tasks(value: object) -> tuple[EngineeringTask | Mapping[str, object], ...]:
    tasks: list[EngineeringTask | Mapping[str, object]] = []
    for item in _ensure_sequence(value):
        if isinstance(item, (EngineeringTask, Mapping)):
            tasks.append(item)
    return tuple(tasks)


def _coerce_objectives(value: object) -> tuple[str, ...]:
    objectives: list[str] = []
    for item in _ensure_sequence(value):
        text = str(item).strip()
        if text and text not in objectives:
            objectives.append(text)
    return tuple(objectives)


def _extract_iteration(value: object | None) -> str:
    text = str(value or "Iteration").strip()
    return text or "Iteration"


def _summarise_blueprint(blueprint: EngineeringBlueprint) -> str:
    scheduled = len(blueprint.scheduled_tasks)
    deferred = len(blueprint.deferred_tasks)
    focus = ", ".join(blueprint.objectives) if blueprint.objectives else "core delivery"
    return (
        f"Planned {scheduled} task(s) toward {focus}."
        + (f" Deferred {deferred}." if deferred else "")
    )


def _calculate_confidence(blueprint: EngineeringBlueprint) -> float:
    confidence = blueprint.notes.get("confidence")
    if isinstance(confidence, (int, float)):
        return max(0.0, min(1.0, float(confidence)))
    utilisation = blueprint.notes.get("capacity_utilised_hours")
    remaining = blueprint.notes.get("capacity_remaining_hours")
    if isinstance(utilisation, (int, float)) and isinstance(remaining, (int, float)):
        total = float(utilisation) + float(remaining)
        if total > 0:
            return max(0.0, min(1.0, float(utilisation) / total))
    return 0.0


@dataclass(slots=True)
class DynamicEngineerAgentResult:
    """Structured payload returned by :class:`DynamicEngineerAgent`."""

    agent: str
    rationale: str
    confidence: float
    blueprint: EngineeringBlueprint

    def to_dict(self) -> dict[str, object]:
        return {
            "agent": self.agent,
            "rationale": self.rationale,
            "confidence": round(self.confidence, 4),
            "blueprint": self.blueprint.as_dict(),
        }


class DynamicEngineerAgent:
    """Persona that translates backlog context into an engineering blueprint."""

    name = "engineer"

    def __init__(self, engineer: DynamicEngineer | None = None) -> None:
        self.engineer = engineer or DynamicEngineer()

    def run(self, payload: Mapping[str, object]) -> DynamicEngineerAgentResult:
        tasks = _coerce_tasks(payload.get("tasks"))
        iteration = _extract_iteration(payload.get("iteration"))
        objectives = _coerce_objectives(payload.get("objectives"))
        horizon_value = payload.get("horizon_days") or payload.get("horizon")
        try:
            horizon = max(1, int(horizon_value)) if horizon_value is not None else 5
        except (TypeError, ValueError):
            horizon = 5

        blueprint = self.engineer.assess_iteration(
            tasks,
            iteration=iteration,
            objectives=objectives,
            horizon_days=horizon,
        )

        rationale = _summarise_blueprint(blueprint)
        confidence = _calculate_confidence(blueprint)

        return DynamicEngineerAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            blueprint=blueprint,
        )
