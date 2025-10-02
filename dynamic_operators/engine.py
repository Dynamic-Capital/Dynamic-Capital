"""Operations planning utilities for the Dynamic Operator persona."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from statistics import fmean
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "OperationalTask",
    "OperationalConstraint",
    "OperationsPlan",
    "DynamicOperatorEngine",
    "DynamicOperator",
]


def _normalise_name(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("name must not be empty")
    return text


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback:
        fallback_text = fallback.strip()
        if fallback_text:
            return fallback_text
    raise ValueError("text value must not be empty")


def _normalise_tuple(values: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not values:
        return ()
    items: list[str] = []
    seen: set[str] = set()
    for value in values:
        candidate = value.strip()
        if not candidate:
            continue
        candidate = candidate.lower() if lower else candidate
        if candidate not in seen:
            seen.add(candidate)
            items.append(candidate)
    return tuple(items)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, float(value)))


def _coerce_task(payload: OperationalTask | Mapping[str, object]) -> OperationalTask:
    if isinstance(payload, OperationalTask):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("task payload must be an OperationalTask or mapping")
    data = dict(payload)
    name = _normalise_name(str(data.get("name") or data.get("id") or ""))
    return OperationalTask(
        name=name,
        description=_normalise_text(
            str(data.get("description") or data.get("summary") or ""),
            fallback=name,
        ),
        effort_hours=float(data.get("effort_hours", data.get("effort", 4.0)) or 4.0),
        impact=float(data.get("impact", data.get("value", 0.5)) or 0.5),
        risk=float(data.get("risk", data.get("uncertainty", 0.2)) or 0.2),
        dependencies=_normalise_tuple(data.get("dependencies")),
        tags=_normalise_tuple(data.get("tags"), lower=True),
        owner=str(data.get("owner") or data.get("lead") or "").strip() or None,
    )


def _coerce_constraint(
    payload: OperationalConstraint | Mapping[str, object]
) -> OperationalConstraint:
    if isinstance(payload, OperationalConstraint):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("constraint payload must be an OperationalConstraint or mapping")
    data = dict(payload)
    name = _normalise_name(str(data.get("name") or data.get("id") or ""))
    return OperationalConstraint(
        name=name,
        description=_normalise_text(
            str(data.get("description") or data.get("summary") or ""),
            fallback=name,
        ),
        metric=str(data.get("metric", data.get("type", "effort"))).strip().lower() or "effort",
        limit=float(data.get("limit", data.get("threshold", 40.0)) or 40.0),
        weight=float(data.get("weight", data.get("importance", 0.5)) or 0.5),
    )


@dataclass(slots=True)
class OperationalTask:
    """A single work item executed by the operations team."""

    name: str
    description: str
    effort_hours: float = 4.0
    impact: float = 0.5
    risk: float = 0.2
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    owner: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.description = _normalise_text(self.description, fallback=self.name)
        self.effort_hours = max(0.0, float(self.effort_hours))
        self.impact = _clamp(self.impact)
        self.risk = _clamp(self.risk)
        self.dependencies = _normalise_tuple(self.dependencies)
        self.tags = _normalise_tuple(self.tags, lower=True)
        owner = (self.owner or "").strip()
        object.__setattr__(self, "owner", owner or None)

    @property
    def priority(self) -> float:
        """Simple heuristic for ordering tasks by impact and effort."""

        effort = self.effort_hours or 1.0
        return round((self.impact * 2.0) - (effort / max(1.0, effort)), 4)


@dataclass(slots=True)
class OperationalConstraint:
    """Guardrail describing a limit the plan should respect."""

    name: str
    description: str
    metric: str
    limit: float
    weight: float = 0.5

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.description = _normalise_text(self.description, fallback=self.name)
        self.metric = self.metric.strip().lower() or "effort"
        self.limit = float(self.limit)
        self.weight = _clamp(self.weight)


@dataclass(slots=True)
class OperationsPlan:
    """Concrete operations playbook returned by the engine."""

    objective: str
    tasks: tuple[OperationalTask, ...]
    sequence: tuple[str, ...]
    focus: tuple[str, ...]
    constraints: tuple[OperationalConstraint, ...]
    metrics: Mapping[str, float]
    risks: tuple[str, ...]
    recommendations: tuple[str, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "objective": self.objective,
            "tasks": [
                {
                    "name": task.name,
                    "description": task.description,
                    "effort_hours": task.effort_hours,
                    "impact": task.impact,
                    "risk": task.risk,
                    "dependencies": list(task.dependencies),
                    "tags": list(task.tags),
                    "owner": task.owner,
                }
                for task in self.tasks
            ],
            "sequence": list(self.sequence),
            "focus": list(self.focus),
            "constraints": [
                {
                    "name": constraint.name,
                    "description": constraint.description,
                    "metric": constraint.metric,
                    "limit": constraint.limit,
                    "weight": constraint.weight,
                }
                for constraint in self.constraints
            ],
            "metrics": dict(self.metrics),
            "risks": list(self.risks),
            "recommendations": list(self.recommendations),
        }


class DynamicOperatorEngine:
    """Analyse operational work to produce an actionable plan."""

    def __init__(
        self,
        tasks: Iterable[OperationalTask | Mapping[str, object]] | None = None,
        *,
        constraints: Iterable[OperationalConstraint | Mapping[str, object]] | None = None,
    ) -> None:
        self._tasks: MutableMapping[str, OperationalTask] = {}
        self._constraints: MutableMapping[str, OperationalConstraint] = {}
        if tasks:
            self.register_tasks(tasks)
        if constraints:
            self.register_constraints(constraints)

    # ------------------------------------------------------------------
    # Registry helpers
    def register_task(self, task: OperationalTask | Mapping[str, object]) -> OperationalTask:
        resolved = _coerce_task(task)
        self._tasks[resolved.name] = resolved
        return resolved

    def register_tasks(
        self, tasks: Iterable[OperationalTask | Mapping[str, object]]
    ) -> tuple[OperationalTask, ...]:
        return tuple(self.register_task(task) for task in tasks)

    def register_constraint(
        self, constraint: OperationalConstraint | Mapping[str, object]
    ) -> OperationalConstraint:
        resolved = _coerce_constraint(constraint)
        self._constraints[resolved.name] = resolved
        return resolved

    def register_constraints(
        self, constraints: Iterable[OperationalConstraint | Mapping[str, object]]
    ) -> tuple[OperationalConstraint, ...]:
        return tuple(self.register_constraint(constraint) for constraint in constraints)

    @property
    def tasks(self) -> tuple[OperationalTask, ...]:
        return tuple(self._tasks.values())

    @property
    def constraints(self) -> tuple[OperationalConstraint, ...]:
        return tuple(self._constraints.values())

    # ------------------------------------------------------------------
    # Planning helpers
    def _sequence(self) -> tuple[str, ...]:
        if not self._tasks:
            return ()

        indegree: MutableMapping[str, int] = {name: 0 for name in self._tasks}
        dependents: MutableMapping[str, set[str]] = {name: set() for name in self._tasks}

        for task in self._tasks.values():
            for dependency in task.dependencies:
                if dependency in indegree:
                    indegree[task.name] += 1
                    dependents[dependency].add(task.name)

        queue: deque[str] = deque(sorted(name for name, degree in indegree.items() if degree == 0))
        ordered: list[str] = []

        while queue:
            current = queue.popleft()
            ordered.append(current)
            for follower in sorted(dependents[current]):
                indegree[follower] -= 1
                if indegree[follower] == 0:
                    queue.append(follower)

        if len(ordered) != len(self._tasks):
            remaining = [
                name for name in self._tasks.keys() if name not in ordered
            ]
            ordered.extend(sorted(remaining))
        return tuple(ordered)

    def _focus_coverage(self, focus: Sequence[str]) -> float:
        if not focus:
            return 0.0
        tags = Counter(tag for task in self._tasks.values() for tag in task.tags)
        total = sum(tags.get(item.lower(), 0) for item in focus)
        return round(total / max(1, len(self._tasks)), 4)

    def _constraint_pressure(self) -> Mapping[str, float]:
        if not self._constraints:
            return {}
        totals: dict[str, float] = {
            "effort": sum(task.effort_hours for task in self._tasks.values()),
            "risk": sum(task.risk for task in self._tasks.values()),
            "impact": sum(task.impact for task in self._tasks.values()),
        }
        pressures: dict[str, float] = {}
        for constraint in self._constraints.values():
            current = totals.get(constraint.metric, 0.0)
            if constraint.limit <= 0:
                pressures[constraint.name] = 1.0
            else:
                pressures[constraint.name] = round(current / constraint.limit, 4)
        return pressures

    def _risks(self, sequence: Sequence[str]) -> tuple[str, ...]:
        issues: list[str] = []
        for task in self._tasks.values():
            if task.risk >= 0.6:
                issues.append(f"High risk: {task.name} ({task.risk:.2f})")
            missing_dependencies = [
                dependency
                for dependency in task.dependencies
                if dependency not in sequence
            ]
            if missing_dependencies:
                joined = ", ".join(sorted(missing_dependencies))
                issues.append(f"Unresolved dependencies for {task.name}: {joined}")
        return tuple(issues)

    def _recommendations(
        self,
        pressures: Mapping[str, float],
        focus: Sequence[str],
        average_effort: float,
    ) -> tuple[str, ...]:
        suggestions: list[str] = []
        if pressures:
            overloaded = [
                name for name, value in pressures.items() if value > 1.0
            ]
            if overloaded:
                joined = ", ".join(overloaded)
                suggestions.append(f"Rebalance workload to reduce pressure on: {joined}")
        if focus and self._focus_coverage(focus) < 0.5:
            suggestions.append("Increase initiatives that map to declared focus areas")
        if average_effort > 8:
            suggestions.append("Break down large tasks to improve flow")
        if not suggestions:
            suggestions.append("Plan is balanced across effort, impact, and risk")
        return tuple(suggestions)

    # ------------------------------------------------------------------
    # Public API
    def orchestrate(
        self,
        objective: str,
        *,
        focus: Sequence[str] | None = None,
    ) -> OperationsPlan:
        focus_tuple = _normalise_tuple(focus or ())
        sequence = self._sequence()
        metrics = {
            "total_effort_hours": round(
                sum(task.effort_hours for task in self._tasks.values()), 2
            ),
            "average_effort_hours": round(
                fmean(task.effort_hours for task in self._tasks.values())
                if self._tasks
                else 0.0,
                2,
            ),
            "average_risk": round(
                fmean(task.risk for task in self._tasks.values()) if self._tasks else 0.0,
                4,
            ),
            "focus_coverage": self._focus_coverage(focus_tuple),
        }
        pressures = self._constraint_pressure()
        metrics.update({f"constraint::{name}": value for name, value in pressures.items()})
        risks = self._risks(sequence)
        recommendations = self._recommendations(
            pressures, focus_tuple, metrics["average_effort_hours"]
        )
        return OperationsPlan(
            objective=_normalise_text(objective, fallback="Operations Objective"),
            tasks=self.tasks,
            sequence=sequence,
            focus=focus_tuple,
            constraints=self.constraints,
            metrics=metrics,
            risks=risks,
            recommendations=recommendations,
        )


class DynamicOperator:
    """Persona wrapper that instantiates an engine per request."""

    def orchestrate(
        self,
        tasks: Iterable[OperationalTask | Mapping[str, object]],
        *,
        objective: str,
        focus: Sequence[str] | None = None,
        constraints: Iterable[OperationalConstraint | Mapping[str, object]] | None = None,
    ) -> OperationsPlan:
        engine = DynamicOperatorEngine(tasks, constraints=constraints)
        return engine.orchestrate(objective, focus=focus)
