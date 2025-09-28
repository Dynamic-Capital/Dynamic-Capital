"""Lightweight engineering planning primitives for the Dynamic Engineer persona.

The goal of this module is to provide a tiny scheduling heuristic that can take a
collection of backlog items, a capacity window, and turn that into an iteration
blueprint.  The previous implementation attempted to simulate a full agile
planner which introduced a large amount of duplicated logic (dependency
handling, normalisation helpers, progress analytics, etc.).  That level of
abstraction made the module difficult to reason about and expensive to import.

This rewrite keeps the public surface area intact (`EngineeringTask`,
`EngineeringBlueprint`, `DynamicEngineerEngine`, and `DynamicEngineer`) while
streamlining the internal bookkeeping.  The engine now focuses on a few
well-defined responsibilities:

* normalise and store tasks with predictable structure,
* score and order the backlog using a small value/effort heuristic,
* schedule work until the requested capacity is consumed, surfacing blockers and
  risks along the way, and
* expose a compact blueprint object that callers can serialise or feed into the
  higher-level agent and bot facades.

The end result is significantly smaller, easier to test, and faster to import
while remaining type-safe.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "EngineeringTask",
    "EngineeringBlueprint",
    "DynamicEngineerEngine",
    "DynamicEngineer",
]

_STATUS_NORMALISATION = {
    "": "pending",
    "pending": "pending",
    "todo": "pending",
    "backlog": "pending",
    "in_progress": "active",
    "in-progress": "active",
    "active": "active",
    "blocked": "blocked",
    "done": "done",
    "completed": "done",
    "complete": "done",
}


def _normalise_identifier(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("task identifier must not be empty")
    return text


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback is not None:
        fallback_text = (fallback or "").strip()
        if fallback_text:
            return fallback_text
    raise ValueError("text value must not be empty")


def _normalise_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for item in values:
        candidate = item.strip()
        if not candidate:
            continue
        candidate = candidate.lower()
        if candidate not in seen:
            seen.add(candidate)
            normalised.append(candidate)
    return tuple(normalised)


def _normalise_dependencies(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in values:
        candidate = item.strip()
        if not candidate:
            continue
        identifier = _normalise_identifier(candidate)
        if identifier not in seen:
            seen.add(identifier)
            normalised.append(identifier)
    return tuple(normalised)


def _normalise_status(value: str | None) -> str:
    key = (value or "").replace(" ", "_").replace("-", "_").lower()
    return _STATUS_NORMALISATION.get(key, "pending")


def _coerce_task(payload: EngineeringTask | Mapping[str, object]) -> EngineeringTask:
    if isinstance(payload, EngineeringTask):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("task payload must be an EngineeringTask or mapping")
    data = dict(payload)
    identifier = _normalise_identifier(
        str(data.get("identifier") or data.get("id") or "")
    )
    return EngineeringTask(
        identifier=identifier,
        description=_normalise_text(
            str(data.get("description") or data.get("name") or ""),
            fallback=identifier,
        ),
        complexity=float(data.get("complexity", data.get("effort", 3.0)) or 3.0),
        impact=float(data.get("impact", data.get("value", 0.5)) or 0.5),
        dependencies=_normalise_dependencies(data.get("dependencies")),
        status=_normalise_status(str(data.get("status"))),
        tags=_normalise_sequence(data.get("tags")),
    )


@dataclass(slots=True)
class EngineeringTask:
    """Lightweight backlog entry the planner can reason about."""

    identifier: str
    description: str
    complexity: float = 3.0
    impact: float = 0.5
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    status: str = "pending"
    tags: tuple[str, ...] = field(default_factory=tuple)
    dependency_set: frozenset[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.description = _normalise_text(self.description, fallback=self.identifier)
        self.complexity = max(0.5, float(self.complexity))
        self.impact = max(0.0, min(1.0, float(self.impact)))
        self.dependencies = _normalise_dependencies(self.dependencies)
        self.status = _normalise_status(self.status)
        self.tags = _normalise_sequence(self.tags)
        object.__setattr__(self, "dependency_set", frozenset(self.dependencies))

    @property
    def is_completed(self) -> bool:
        return self.status == "done"

    @property
    def is_blocked(self) -> bool:
        return self.status == "blocked"

    @property
    def effort_hours(self) -> float:
        return round(max(1.0, self.complexity * 2.0), 2)

    @property
    def priority_score(self) -> float:
        # Normalise the scoring so that higher impact and lower effort float to
        # the top of the backlog.  Clamp to a sensible range to avoid
        # overweighting any outliers that sneak through.
        return round(self.impact / max(1.0, self.complexity), 6)


@dataclass(slots=True)
class EngineeringBlueprint:
    """Iteration summary returned by the planner."""

    iteration: str
    objectives: tuple[str, ...]
    scheduled_tasks: tuple[tuple[str, float], ...]
    deferred_tasks: tuple[str, ...]
    risks: tuple[str, ...]
    notes: Mapping[str, object]

    def as_dict(self) -> dict[str, object]:
        return {
            "iteration": self.iteration,
            "objectives": list(self.objectives),
            "scheduled_tasks": [list(item) for item in self.scheduled_tasks],
            "deferred_tasks": list(self.deferred_tasks),
            "risks": list(self.risks),
            "notes": dict(self.notes),
        }


class DynamicEngineerEngine:
    """Coordinate backlog ordering and iteration scheduling."""

    def __init__(
        self,
        tasks: Iterable[EngineeringTask | Mapping[str, object]] | None = None,
        *,
        capacity_per_day: float = 6.0,
    ) -> None:
        self.capacity_per_day = max(1.0, float(capacity_per_day))
        self._tasks: MutableMapping[str, EngineeringTask] = {}
        if tasks:
            self.register_tasks(tasks)

    # ------------------------------------------------------------------
    # Task registry helpers
    def register_task(self, task: EngineeringTask | Mapping[str, object]) -> EngineeringTask:
        resolved = _coerce_task(task)
        self._tasks[resolved.identifier] = resolved
        return resolved

    def register_tasks(
        self, tasks: Iterable[EngineeringTask | Mapping[str, object]]
    ) -> tuple[EngineeringTask, ...]:
        return tuple(self.register_task(task) for task in tasks)

    def update_status(self, identifier: str, status: str) -> EngineeringTask:
        key = _normalise_identifier(identifier)
        try:
            task = self._tasks[key]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"Unknown task '{identifier}'") from exc
        task.status = _normalise_status(status)
        return task

    # ------------------------------------------------------------------
    # Analytics helpers
    @property
    def tasks(self) -> tuple[EngineeringTask, ...]:
        return tuple(self._tasks.values())

    def capacity_for(self, *, days: int) -> float:
        return round(self.capacity_per_day * max(1, int(days)), 2)

    def prioritise(self, *, include_completed: bool = False) -> tuple[EngineeringTask, ...]:
        backlog = [
            task
            for task in self._tasks.values()
            if include_completed or not task.is_completed
        ]
        backlog.sort(
            key=lambda task: (-task.priority_score, task.effort_hours, task.identifier)
        )
        return tuple(backlog)

    # ------------------------------------------------------------------
    # Planning
    def craft_blueprint(
        self,
        iteration: str,
        *,
        objectives: Sequence[str] | None = None,
        horizon_days: int = 5,
    ) -> EngineeringBlueprint:
        iteration_name = _normalise_text(iteration)
        objective_tuple = tuple(
            dict.fromkeys(
                _normalise_text(str(item))
                for item in (objectives or ())
                if str(item).strip()
            )
        )

        available_capacity = self.capacity_for(days=horizon_days)
        completed = {task.identifier for task in self._tasks.values() if task.is_completed}
        scheduled: list[tuple[str, float]] = []
        deferred: list[str] = []
        risks: list[str] = []

        for task in self.prioritise():
            if task.is_completed:
                continue
            missing_dependencies = task.dependency_set - completed
            if missing_dependencies:
                deferred.append(task.identifier)
                risks.append(
                    f"Task {task.identifier} blocked by {', '.join(sorted(missing_dependencies))}."
                )
                continue
            if task.is_blocked:
                deferred.append(task.identifier)
                risks.append(f"Task {task.identifier} is currently blocked.")
                continue
            effort = task.effort_hours
            if effort > available_capacity:
                deferred.append(task.identifier)
                risks.append(
                    f"Task {task.identifier} exceeds remaining capacity ({available_capacity:.1f}h)."
                )
                continue

            scheduled.append((task.identifier, effort))
            available_capacity = round(available_capacity - effort, 2)
            completed.add(task.identifier)

        if not scheduled and deferred:
            risks.append(
                "No tasks scheduled; review dependencies or expand the iteration horizon."
            )

        utilisation = round(sum(hours for _, hours in scheduled), 2)
        total_capacity = utilisation + max(0.0, available_capacity)
        confidence = 0.0
        if total_capacity:
            confidence = min(1.0, utilisation / total_capacity)

        notes: dict[str, object] = {
            "capacity_remaining_hours": round(max(0.0, available_capacity), 2),
            "capacity_utilised_hours": utilisation,
            "task_count": len(self._tasks),
            "scheduled_count": len(scheduled),
            "confidence": round(confidence, 4),
        }

        return EngineeringBlueprint(
            iteration=iteration_name,
            objectives=objective_tuple,
            scheduled_tasks=tuple(scheduled),
            deferred_tasks=tuple(deferred),
            risks=tuple(dict.fromkeys(risks)),
            notes=notes,
        )


class DynamicEngineer:
    """Persona wrapper that keeps configuration separate from engine state."""

    def __init__(self, *, capacity_per_day: float = 6.0) -> None:
        self.capacity_per_day = max(1.0, float(capacity_per_day))

    def assess_iteration(
        self,
        tasks: Iterable[EngineeringTask | Mapping[str, object]],
        *,
        iteration: str,
        objectives: Sequence[str] | None = None,
        horizon_days: int = 5,
    ) -> EngineeringBlueprint:
        engine = DynamicEngineerEngine(
            tasks,
            capacity_per_day=self.capacity_per_day,
        )
        return engine.craft_blueprint(
            iteration,
            objectives=objectives,
            horizon_days=horizon_days,
        )
