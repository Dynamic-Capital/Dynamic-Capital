"""Agent persona orchestrating architecture design outputs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from .engine import (
    ArchitectureBlueprint,
    ArchitectureComponent,
    ArchitectureConstraint,
    DynamicArchitect,
)

__all__ = ["DynamicArchitectAgentResult", "DynamicArchitectAgent"]


def _ensure_sequence(value: object) -> Sequence[object]:
    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        return (value,)
    if isinstance(value, Sequence):  # type: ignore[return-value]
        return value
    return (value,)


def _coerce_components(value: object) -> tuple[ArchitectureComponent | Mapping[str, object], ...]:
    components: list[ArchitectureComponent | Mapping[str, object]] = []
    for item in _ensure_sequence(value):
        if isinstance(item, (ArchitectureComponent, Mapping)):
            components.append(item)
    return tuple(components)


def _coerce_constraints(value: object) -> tuple[ArchitectureConstraint | Mapping[str, object], ...]:
    constraints: list[ArchitectureConstraint | Mapping[str, object]] = []
    for item in _ensure_sequence(value):
        if isinstance(item, (ArchitectureConstraint, Mapping)):
            constraints.append(item)
    return tuple(constraints)


def _coerce_focus(value: object) -> tuple[str, ...]:
    focus: list[str] = []
    for item in _ensure_sequence(value):
        text = str(item).strip()
        if text and text not in focus:
            focus.append(text)
    return tuple(focus)


def _extract_vision(value: object | None) -> str:
    text = str(value or "Architecture Vision").strip()
    return text or "Architecture Vision"


def _summarise(blueprint: ArchitectureBlueprint) -> str:
    components = len(blueprint.components)
    risks = len(blueprint.risks)
    focus = blueprint.metrics.get("focus_areas")
    focus_text = f" across {int(focus)} focus areas" if isinstance(focus, (int, float)) and focus else ""
    return f"Blueprint covers {components} component(s){focus_text} with {risks} key risk(s)."


def _confidence(blueprint: ArchitectureBlueprint) -> float:
    reliability = blueprint.metrics.get("reliability_average")
    if isinstance(reliability, (int, float)):
        return max(0.0, min(1.0, float(reliability)))
    return 0.0


@dataclass(slots=True)
class DynamicArchitectAgentResult:
    """Structured payload returned by :class:`DynamicArchitectAgent`."""

    agent: str
    rationale: str
    confidence: float
    blueprint: ArchitectureBlueprint

    def to_dict(self) -> dict[str, object]:
        return {
            "agent": self.agent,
            "rationale": self.rationale,
            "confidence": round(self.confidence, 4),
            "blueprint": self.blueprint.as_dict(),
        }


class DynamicArchitectAgent:
    """Persona that translates system context into architectural guidance."""

    name = "architect"

    def __init__(self, architect: DynamicArchitect | None = None) -> None:
        self.architect = architect or DynamicArchitect()

    def run(self, payload: Mapping[str, object]) -> DynamicArchitectAgentResult:
        components = _coerce_components(payload.get("components"))
        constraints = _coerce_constraints(payload.get("constraints"))
        focus = _coerce_focus(payload.get("focus") or payload.get("themes"))
        vision = _extract_vision(payload.get("vision"))

        blueprint = self.architect.design(
            components,
            vision=vision,
            focus=focus,
            constraints=constraints,
        )

        rationale = _summarise(blueprint)
        confidence = _confidence(blueprint)

        return DynamicArchitectAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            blueprint=blueprint,
        )
