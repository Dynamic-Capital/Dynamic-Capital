from __future__ import annotations

"""Iteration planning heuristics for the Dynamic development persona.

The Dynamic Capital automation stack exposes a large catalogue of persona
engines that take loosely structured backlog context and translate it into a
repeatable plan.  Historically the development stack relied on the generic
:mod:`dynamic_engineer` planner which optimises for engineering execution but
does not surface role-specific capacity constraints for a blended development
team.  The :mod:`dynamic_dev_engine` module fills that gap by providing a
lightweight planning layer that understands typical software development roles
(front-end, back-end, blockchain, design, DevOps) and distributes work across
them while preserving the heuristics that made the engineering engine useful.

The engine keeps the public surface intentionally small:

* :class:`DevelopmentTask` normalises backlog entries including dependencies,
  effort, and impact signals.
* :class:`DevelopmentCapacity` models a role's iteration capacity with optional
  focus indicators.
* :class:`ScheduledDevelopmentTask` captures the outcome of assigning a task to
  a role on a specific iteration day.
* :class:`DevelopmentBlueprint` is the serialisable result returned to callers.
* :class:`DynamicDevEngine` exposes a single ``plan_iteration`` method that
  consumes the above primitives and produces the blueprint.
* :class:`DynamicDev` mirrors the facade pattern used by other personas so
  higher level agents and bots can embed the planner without pulling the module
  internals directly.

While intentionally simple, the implementation still honours common planning
constraints: dependencies must be satisfied before a task is scheduled, blocked
items are deferred with their rationale surfaced, and capacity is tracked per
role with daily burn estimates.  The result is easy to reason about, type safe,
and quick to import for automation workflows.
"""

from dataclasses import dataclass, field
from math import floor
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "DevelopmentTask",
    "DevelopmentCapacity",
    "ScheduledDevelopmentTask",
    "DevelopmentBlueprint",
    "DynamicDevEngine",
    "DynamicDev",
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
    "waiting": "blocked",
    "done": "done",
    "completed": "done",
    "complete": "done",
}

_ROLE_ALIASES = {
    "frontend": "Front-End Developer",
    "front-end": "Front-End Developer",
    "fe": "Front-End Developer",
    "ui": "UI/UX Designer",
    "ux": "UI/UX Designer",
    "design": "UI/UX Designer",
    "designer": "UI/UX Designer",
    "backend": "Back-End Developer",
    "back-end": "Back-End Developer",
    "be": "Back-End Developer",
    "api": "Back-End Developer",
    "services": "Back-End Developer",
    "blockchain": "Blockchain Developer",
    "solidity": "Blockchain Developer",
    "smart-contract": "Blockchain Developer",
    "smart-contracts": "Blockchain Developer",
    "infra": "DevOps Engineer",
    "infrastructure": "DevOps Engineer",
    "devops": "DevOps Engineer",
    "operations": "DevOps Engineer",
    "sre": "DevOps Engineer",
    "qa": "Quality Assurance",
    "quality": "Quality Assurance",
    "testing": "Quality Assurance",
    "test": "Quality Assurance",
    "general": "General Development",
    "development": "General Development",
    "default": "General Development",
}

_CANONICAL_ROLES = (
    "Front-End Developer",
    "Back-End Developer",
    "Blockchain Developer",
    "UI/UX Designer",
    "DevOps Engineer",
    "Quality Assurance",
    "General Development",
)


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


def _normalise_sequence(values: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for item in values:
        candidate = item.strip()
        if not candidate:
            continue
        candidate = candidate.lower() if lower else candidate
        if candidate not in seen:
            seen.add(candidate)
            normalised.append(candidate)
    return tuple(normalised)


def _normalise_dependencies(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
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


def _resolve_role(domain: str | None, tags: Sequence[str]) -> str:
    candidates = []
    if domain:
        candidates.append(domain)
    candidates.extend(tags)
    for candidate in candidates:
        key = candidate.strip().lower().replace(" ", "-")
        if key in _ROLE_ALIASES:
            return _ROLE_ALIASES[key]
    return "General Development"


def _coerce_task(payload: DevelopmentTask | Mapping[str, object]) -> DevelopmentTask:
    if isinstance(payload, DevelopmentTask):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("task payload must be a DevelopmentTask or mapping")
    data = dict(payload)
    identifier = _normalise_identifier(
        str(data.get("identifier") or data.get("id") or data.get("name") or "")
    )
    tags = _normalise_sequence(data.get("tags"), lower=True)
    domain_value = str(data.get("domain") or data.get("role") or data.get("area") or "")
    role = _resolve_role(domain_value, tags)
    return DevelopmentTask(
        identifier=identifier,
        description=_normalise_text(
            str(data.get("description") or data.get("summary") or ""),
            fallback=identifier,
        ),
        effort_hours=float(data.get("effort_hours", data.get("effort", 6.0)) or 6.0),
        impact=float(data.get("impact", data.get("value", 0.5)) or 0.5),
        domain=str(domain_value or role),
        dependencies=_normalise_dependencies(data.get("dependencies")),
        status=_normalise_status(str(data.get("status"))),
        tags=tags,
        role=role,
    )


def _coerce_capacity(
    payload: DevelopmentCapacity | Mapping[str, object]
) -> DevelopmentCapacity:
    if isinstance(payload, DevelopmentCapacity):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("capacity payload must be a DevelopmentCapacity or mapping")
    data = dict(payload)
    role_value = str(data.get("role") or data.get("name") or data.get("focus") or "")
    hours = float(
        data.get("available_hours")
        or data.get("capacity_hours")
        or data.get("hours")
        or data.get("availability")
        or 0.0
    )
    hours_per_day = float(
        data.get("hours_per_day")
        or data.get("daily_hours")
        or data.get("cadence_hours")
        or 6.0
    )
    return DevelopmentCapacity(
        role=role_value,
        available_hours=hours,
        hours_per_day=hours_per_day,
        focus=_normalise_sequence(data.get("focus"), lower=False),
    )


@dataclass(slots=True)
class DevelopmentTask:
    """Normalised backlog entry for the development engine."""

    identifier: str
    description: str
    effort_hours: float = 6.0
    impact: float = 0.5
    domain: str = "General Development"
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    status: str = "pending"
    tags: tuple[str, ...] = field(default_factory=tuple)
    role: str = "General Development"

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.description = _normalise_text(self.description, fallback=self.identifier)
        self.effort_hours = max(0.5, float(self.effort_hours))
        self.impact = max(0.0, min(1.0, float(self.impact)))
        self.dependencies = _normalise_dependencies(self.dependencies)
        self.status = _normalise_status(self.status)
        self.tags = _normalise_sequence(self.tags)
        role_value = (self.role or "").strip()
        self.role = _ROLE_ALIASES.get(
            role_value.lower().replace(" ", "-"), role_value or "General Development"
        )
        if self.role not in _CANONICAL_ROLES:
            self.role = _resolve_role(self.domain, self.tags)
        self.domain = _normalise_text(self.domain, fallback=self.role)

    @property
    def value_score(self) -> float:
        return round(self.impact / self.effort_hours, 4)

    @property
    def is_completed(self) -> bool:
        return self.status == "done"

    @property
    def is_blocked(self) -> bool:
        return self.status == "blocked"

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "description": self.description,
            "effort_hours": self.effort_hours,
            "impact": self.impact,
            "domain": self.domain,
            "dependencies": list(self.dependencies),
            "status": self.status,
            "tags": list(self.tags),
            "role": self.role,
        }


@dataclass(slots=True)
class DevelopmentCapacity:
    """Iteration capacity for a specific development role."""

    role: str
    available_hours: float
    hours_per_day: float = 6.0
    focus: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        role_value = (self.role or "").strip()
        self.role = _ROLE_ALIASES.get(
            role_value.lower().replace(" ", "-"), role_value or "General Development"
        )
        if self.role not in _CANONICAL_ROLES:
            self.role = "General Development"
        self.available_hours = max(0.0, float(self.available_hours))
        self.hours_per_day = max(1.0, float(self.hours_per_day))
        self.focus = _normalise_sequence(self.focus)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "role": self.role,
            "available_hours": self.available_hours,
            "hours_per_day": self.hours_per_day,
            "focus": list(self.focus),
        }


@dataclass(slots=True)
class ScheduledDevelopmentTask:
    """Assignment of a development task to a role and iteration day."""

    identifier: str
    role: str
    description: str
    effort_hours: float
    day: int
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    status: str = "pending"

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "role": self.role,
            "description": self.description,
            "effort_hours": self.effort_hours,
            "day": self.day,
            "dependencies": list(self.dependencies),
            "tags": list(self.tags),
            "status": self.status,
        }


@dataclass(slots=True)
class DevelopmentBlueprint:
    """Serialisable blueprint returned by :class:`DynamicDevEngine`."""

    iteration: str
    objectives: tuple[str, ...]
    horizon_days: int
    scheduled_tasks: tuple[ScheduledDevelopmentTask, ...]
    deferred_tasks: tuple[DevelopmentTask, ...]
    blockers: tuple[str, ...]
    capacity: Mapping[str, DevelopmentCapacity]
    notes: MutableMapping[str, object] = field(default_factory=dict)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "iteration": self.iteration,
            "objectives": list(self.objectives),
            "horizon_days": self.horizon_days,
            "scheduled_tasks": [task.as_dict() for task in self.scheduled_tasks],
            "deferred_tasks": [task.as_dict() for task in self.deferred_tasks],
            "blockers": list(self.blockers),
            "capacity": {role: cap.as_dict() for role, cap in self.capacity.items()},
            "notes": dict(self.notes),
        }


def _ensure_sequence(value: object) -> Sequence[object]:
    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        return (value,)
    if isinstance(value, Sequence):  # type: ignore[return-value]
        return value
    return (value,)


def _normalise_objectives(value: object | None) -> tuple[str, ...]:
    objectives: list[str] = []
    for item in _ensure_sequence(value):
        text = str(item).strip()
        if text and text not in objectives:
            objectives.append(text)
    return tuple(objectives)


class DynamicDevEngine:
    """Heuristic iteration planner for multi-role development teams."""

    def __init__(self) -> None:
        self._history: list[DevelopmentBlueprint] = []

    @staticmethod
    def _prepare_tasks(
        tasks: Sequence[DevelopmentTask | Mapping[str, object]]
    ) -> tuple[DevelopmentTask, ...]:
        return tuple(_coerce_task(task) for task in tasks)

    @staticmethod
    def _prepare_capacity(
        capacity: object | None, backlog: Sequence[DevelopmentTask]
    ) -> tuple[DevelopmentCapacity, ...]:
        items: list[DevelopmentCapacity] = []
        if capacity is None:
            roles = {task.role for task in backlog if not task.is_completed}
            for role in sorted(roles):
                # Assume a conservative three day (18h) window when no context is provided.
                items.append(DevelopmentCapacity(role=role, available_hours=18.0, hours_per_day=6.0))
        else:
            if isinstance(capacity, Mapping):
                for key, value in capacity.items():
                    if isinstance(value, (int, float)):
                        items.append(
                            DevelopmentCapacity(
                                role=str(key),
                                available_hours=float(value),
                            )
                        )
                    else:
                        payload = dict(value)
                        payload.setdefault("role", key)
                        items.append(_coerce_capacity(payload))
            else:
                for entry in _ensure_sequence(capacity):
                    items.append(_coerce_capacity(entry))
        # Ensure every encountered role has an entry so the blueprint metadata remains stable.
        known_roles = {item.role for item in items}
        for role in {task.role for task in backlog if not task.is_completed}:
            if role not in known_roles:
                items.append(DevelopmentCapacity(role=role, available_hours=18.0))
        return DynamicDevEngine._aggregate_capacity(tuple(items))

    @staticmethod
    def _aggregate_capacity(
        items: Sequence[DevelopmentCapacity],
    ) -> tuple[DevelopmentCapacity, ...]:
        if not items:
            return ()

        aggregated: dict[str, DevelopmentCapacity] = {}
        order: list[str] = []

        for entry in items:
            role = entry.role
            if role not in aggregated:
                aggregated[role] = DevelopmentCapacity(
                    role=role,
                    available_hours=entry.available_hours,
                    hours_per_day=entry.hours_per_day,
                    focus=entry.focus,
                )
                order.append(role)
                continue

            existing = aggregated[role]
            aggregated[role] = DevelopmentCapacity(
                role=role,
                available_hours=existing.available_hours + entry.available_hours,
                hours_per_day=existing.hours_per_day + entry.hours_per_day,
                focus=tuple(
                    dict.fromkeys((*existing.focus, *entry.focus))
                ),
            )

        return tuple(aggregated[role] for role in order)

    @staticmethod
    def _order_tasks(backlog: Sequence[DevelopmentTask]) -> tuple[DevelopmentTask, ...]:
        working = [task for task in backlog if not task.is_completed]
        return tuple(
            sorted(
                working,
                key=lambda task: (
                    task.is_blocked,
                    -task.value_score,
                    task.effort_hours,
                    task.identifier,
                ),
            )
        )

    def plan_iteration(
        self,
        tasks: Sequence[DevelopmentTask | Mapping[str, object]],
        *,
        capacity: object | None = None,
        iteration: str | None = None,
        objectives: Sequence[str] | object | None = None,
        horizon_days: int = 5,
    ) -> DevelopmentBlueprint:
        backlog = self._prepare_tasks(tasks)
        if not backlog:
            blueprint = DevelopmentBlueprint(
                iteration=_normalise_text(iteration, fallback="Iteration"),
                objectives=_normalise_objectives(objectives),
                horizon_days=max(1, int(horizon_days)),
                scheduled_tasks=(),
                deferred_tasks=(),
                blockers=(),
                capacity={},
                notes={"message": "no tasks supplied"},
            )
            self._history.append(blueprint)
            return blueprint

        iteration_name = _normalise_text(iteration, fallback="Iteration")
        objectives_tuple = _normalise_objectives(objectives)
        horizon = max(1, int(horizon_days))

        capacity_items = self._prepare_capacity(capacity, backlog)
        capacity_map = {item.role: item for item in capacity_items}
        remaining_hours: dict[str, float] = {item.role: item.available_hours for item in capacity_items}
        hours_used: dict[str, float] = {item.role: 0.0 for item in capacity_items}

        completed_ids = {task.identifier for task in backlog if task.is_completed}
        scheduled: list[ScheduledDevelopmentTask] = []
        deferred: list[DevelopmentTask] = []
        blockers: list[str] = []

        for task in self._order_tasks(backlog):
            if task.is_completed:
                continue
            unmet = [dep for dep in task.dependencies if dep not in completed_ids]
            if unmet:
                deferred.append(task)
                blockers.append(
                    f"{task.identifier} waiting on {', '.join(unmet)}"
                )
                continue
            if task.is_blocked:
                deferred.append(task)
                blockers.append(f"{task.identifier} marked as blocked")
                continue

            role = task.role if task.role in remaining_hours else "General Development"
            role_hours = remaining_hours.get(role, 0.0)
            if task.effort_hours > role_hours:
                deferred.append(task)
                blockers.append(
                    f"{task.identifier} exceeds remaining capacity for {role}"
                )
                continue

            hours_before = hours_used.get(role, 0.0)
            capacity_descriptor = capacity_map[role]
            day_index = 1
            if capacity_descriptor.hours_per_day > 0:
                day_index = int(floor(hours_before / capacity_descriptor.hours_per_day)) + 1
                day_index = min(day_index, horizon)

            scheduled.append(
                ScheduledDevelopmentTask(
                    identifier=task.identifier,
                    role=role,
                    description=task.description,
                    effort_hours=task.effort_hours,
                    day=day_index,
                    dependencies=task.dependencies,
                    tags=task.tags,
                    status=task.status,
                )
            )
            completed_ids.add(task.identifier)
            remaining_hours[role] = max(0.0, role_hours - task.effort_hours)
            hours_used[role] = hours_before + task.effort_hours

        utilised_hours = sum(hours_used.values())
        total_capacity = sum(item.available_hours for item in capacity_items)
        remaining_total = max(0.0, total_capacity - utilised_hours)
        coverage = utilised_hours / total_capacity if total_capacity else 0.0

        notes: MutableMapping[str, object] = {
            "capacity_total_hours": round(total_capacity, 2),
            "capacity_utilised_hours": round(utilised_hours, 2),
            "capacity_remaining_hours": round(remaining_total, 2),
            "coverage": round(coverage, 4),
            "roles": {
                role: {
                    "available_hours": round(item.available_hours, 2),
                    "hours_used": round(hours_used.get(role, 0.0), 2),
                    "focus": list(item.focus),
                }
                for role, item in capacity_map.items()
            },
        }
        if blockers:
            notes["blockers"] = blockers
        if deferred:
            notes["deferred_count"] = len(deferred)

        blueprint = DevelopmentBlueprint(
            iteration=iteration_name,
            objectives=objectives_tuple,
            horizon_days=horizon,
            scheduled_tasks=tuple(scheduled),
            deferred_tasks=tuple(deferred),
            blockers=tuple(dict.fromkeys(blockers)),
            capacity=capacity_map,
            notes=notes,
        )
        self._history.append(blueprint)
        return blueprint


class DynamicDev:
    """Facade mirroring the pattern used across other Dynamic personas."""

    def __init__(self, engine: DynamicDevEngine | None = None) -> None:
        self.engine = engine or DynamicDevEngine()

    def assess_iteration(
        self,
        tasks: Sequence[DevelopmentTask | Mapping[str, object]],
        *,
        capacity: object | None = None,
        iteration: str | None = None,
        objectives: Sequence[str] | object | None = None,
        horizon_days: int = 5,
    ) -> DevelopmentBlueprint:
        return self.engine.plan_iteration(
            tasks,
            capacity=capacity,
            iteration=iteration,
            objectives=objectives,
            horizon_days=horizon_days,
        )
