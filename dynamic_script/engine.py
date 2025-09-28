"""Domain-specific script engine for orchestrating operational playbooks."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ScriptDirective",
    "ScriptContext",
    "ScriptStep",
    "ScriptPlan",
    "DynamicScriptEngine",
]


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _normalise_tuple(items: Iterable[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class ScriptDirective:
    """High-level intent for an automation or process script."""

    name: str
    objective: str
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    impact: float = 0.5
    effort: float = 0.5
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.objective = _normalise_text(self.objective)
        self.dependencies = _normalise_tuple(self.dependencies)
        self.impact = _clamp(self.impact)
        self.effort = _clamp(self.effort)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class ScriptContext:
    """Constraints and environment references for executing a script."""

    environment: str
    guardrails: tuple[str, ...] = field(default_factory=tuple)
    change_window: str | None = None
    approval_reference: str | None = None

    def __post_init__(self) -> None:
        self.environment = _normalise_text(self.environment)
        self.guardrails = _normalise_tuple(self.guardrails)
        if self.change_window is not None:
            self.change_window = _normalise_text(self.change_window)
        if self.approval_reference is not None:
            self.approval_reference = _normalise_text(self.approval_reference)


@dataclass(slots=True)
class ScriptStep:
    """Single executable step inside a generated script plan."""

    name: str
    action: str
    readiness: float
    notes: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "action": self.action,
            "readiness": self.readiness,
            "notes": list(self.notes),
        }


@dataclass(slots=True)
class ScriptPlan:
    """Materialised plan for executing directives in a safe sequence."""

    context: ScriptContext
    steps: tuple[ScriptStep, ...]
    coverage: float
    issued_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "context": {
                "environment": self.context.environment,
                "guardrails": list(self.context.guardrails),
                "change_window": self.context.change_window,
                "approval_reference": self.context.approval_reference,
            },
            "steps": [step.as_dict() for step in self.steps],
            "coverage": self.coverage,
            "issued_at": self.issued_at.isoformat(),
        }


class DynamicScriptEngine:
    """Compile script directives into a coherent, dependency-aware plan."""

    def _topological_order(self, directives: Sequence[ScriptDirective]) -> list[ScriptDirective]:
        dependency_map: dict[str, set[str]] = {}
        dependents: dict[str, set[str]] = {}
        nodes: dict[str, ScriptDirective] = {}

        for directive in directives:
            name = directive.name
            if name in nodes:
                raise ValueError(f"duplicate directive name detected: {name}")
            nodes[name] = directive
            dependency_map[name] = set(directive.dependencies)
            for dep in directive.dependencies:
                dependents.setdefault(dep, set()).add(name)

        queue: deque[str] = deque(
            sorted(name for name, deps in dependency_map.items() if not deps)
        )
        ordered: list[ScriptDirective] = []
        resolved: set[str] = set()

        while queue:
            current = queue.popleft()
            resolved.add(current)
            ordered.append(nodes[current])
            for dependent in sorted(dependents.get(current, ())):
                remaining = dependency_map[dependent]
                remaining.discard(current)
                if not remaining and dependent not in resolved:
                    queue.append(dependent)

        if len(ordered) != len(directives):
            unresolved = sorted(
                name for name, deps in dependency_map.items() if deps
            )
            raise ValueError(
                "cycle detected in directives: " + ", ".join(unresolved)
            )
        return ordered

    def build_plan(
        self,
        directives: Sequence[ScriptDirective],
        context: ScriptContext,
    ) -> ScriptPlan:
        if not directives:
            raise ValueError("at least one directive is required to build a plan")

        name_to_directive = {directive.name: directive for directive in directives}
        for directive in directives:
            unknown = [dep for dep in directive.dependencies if dep not in name_to_directive]
            if unknown:
                joined = ", ".join(unknown)
                raise ValueError(
                    f"directive '{directive.name}' references unknown dependencies: {joined}"
                )

        ordered = self._topological_order(directives)

        max_impact = max(directive.impact for directive in ordered) or 1.0
        cumulative_impact = 0.0
        steps: list[ScriptStep] = []

        for directive in ordered:
            readiness = (directive.impact * 0.7) + (1.0 - directive.effort) * 0.3
            readiness = _clamp(readiness)
            notes: list[str] = []
            if directive.dependencies:
                notes.append("Depends on: " + ", ".join(directive.dependencies))
            if directive.metadata:
                notes.append("Context: " + ", ".join(sorted(directive.metadata.keys())))
            step = ScriptStep(
                name=directive.name,
                action=directive.objective,
                readiness=readiness,
                notes=tuple(notes),
            )
            steps.append(step)
            cumulative_impact += directive.impact

        coverage = _clamp(cumulative_impact / (max_impact * len(ordered)))
        return ScriptPlan(context=context, steps=tuple(steps), coverage=coverage)
