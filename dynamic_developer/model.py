from __future__ import annotations

"""Data models describing the Dynamic developer planning surface."""

from dataclasses import dataclass, field
from typing import Mapping, MutableMapping, Sequence

from dynamic_dev_engine import (
    DevelopmentBlueprint,
    DevelopmentCapacity,
    DevelopmentTask,
    DynamicDevEngine,
    ScheduledDevelopmentTask,
)


__all__ = [
    "DeveloperRoleModel",
    "DeveloperModel",
    "build_developer_model",
]


@dataclass(slots=True)
class DeveloperRoleModel:
    """Aggregate view of a single development role within an iteration."""

    role: str
    capacity: DevelopmentCapacity
    scheduled_tasks: tuple[ScheduledDevelopmentTask, ...] = field(default_factory=tuple)
    deferred_tasks: tuple[DevelopmentTask, ...] = field(default_factory=tuple)

    @property
    def focus(self) -> tuple[str, ...]:
        """Return the focus areas defined for the role."""

        return self.capacity.focus

    @property
    def planned_hours(self) -> float:
        """Total hours planned for the role during the iteration."""

        return round(sum(task.effort_hours for task in self.scheduled_tasks), 2)

    @property
    def remaining_hours(self) -> float:
        """Capacity left once scheduled tasks have been accounted for."""

        remaining = self.capacity.available_hours - self.planned_hours
        return round(remaining if remaining > 0 else 0.0, 2)

    @property
    def utilisation(self) -> float:
        """Utilisation ratio between ``0`` and ``1`` for the role."""

        if self.capacity.available_hours <= 0:
            return 0.0
        ratio = self.planned_hours / self.capacity.available_hours
        return round(min(max(ratio, 0.0), 1.0), 3)

    def to_dict(self) -> MutableMapping[str, object]:
        """Serialise the role model into a JSON-friendly payload."""

        return {
            "role": self.role,
            "focus": list(self.focus),
            "capacity": self.capacity.as_dict(),
            "scheduled_tasks": [task.as_dict() for task in self.scheduled_tasks],
            "deferred_tasks": [task.as_dict() for task in self.deferred_tasks],
            "planned_hours": self.planned_hours,
            "remaining_hours": self.remaining_hours,
            "utilisation": self.utilisation,
        }


@dataclass(slots=True)
class DeveloperModel:
    """High level structure for a complete developer iteration plan."""

    iteration: str
    objectives: tuple[str, ...]
    horizon_days: int
    roles: Mapping[str, DeveloperRoleModel]
    blueprint: DevelopmentBlueprint

    def summary(self) -> str:
        """Return a concise textual summary of the plan."""

        focus_parts: list[str] = []
        for role_model in self.roles.values():
            focus = ", ".join(role_model.focus)
            descriptor = f"{role_model.role} ({role_model.planned_hours}h"
            if focus:
                descriptor = f"{descriptor}; focus: {focus}"
            descriptor = f"{descriptor})"
            focus_parts.append(descriptor)
        focus_clause = "; ".join(focus_parts) if focus_parts else "no active roles"
        objectives_clause = ", ".join(self.objectives) if self.objectives else "no stated objectives"
        return f"{self.iteration} over {self.horizon_days}d – {objectives_clause}; roles: {focus_clause}"

    def to_dict(self) -> MutableMapping[str, object]:
        """Serialise the full model into primitive types."""

        return {
            "iteration": self.iteration,
            "objectives": list(self.objectives),
            "horizon_days": self.horizon_days,
            "roles": {role: model.to_dict() for role, model in self.roles.items()},
            "summary": self.summary(),
            "blueprint": self.blueprint.as_dict(),
        }


def _group_role_models(blueprint: DevelopmentBlueprint) -> Mapping[str, DeveloperRoleModel]:
    """Build :class:`DeveloperRoleModel` entries from a blueprint."""

    scheduled_by_role: dict[str, list[ScheduledDevelopmentTask]] = {}
    for task in blueprint.scheduled_tasks:
        scheduled_by_role.setdefault(task.role, []).append(task)

    deferred_by_role: dict[str, list[DevelopmentTask]] = {}
    for task in blueprint.deferred_tasks:
        deferred_by_role.setdefault(task.role, []).append(task)

    models: dict[str, DeveloperRoleModel] = {}
    for role, capacity in blueprint.capacity.items():
        scheduled = tuple(scheduled_by_role.get(role, []))
        deferred = tuple(deferred_by_role.get(role, []))
        models[role] = DeveloperRoleModel(
            role=role,
            capacity=capacity,
            scheduled_tasks=scheduled,
            deferred_tasks=deferred,
        )
    return models


def build_developer_model(
    tasks: Sequence[DevelopmentTask | Mapping[str, object]],
    *,
    capacity: object | None = None,
    iteration: str | None = None,
    objectives: Sequence[str] | object | None = None,
    horizon_days: int = 5,
    engine: DynamicDevEngine | None = None,
) -> DeveloperModel:
    """Run the development engine and return a structured model."""

    dev_engine = engine or DynamicDevEngine()
    blueprint = dev_engine.plan_iteration(
        tasks,
        capacity=capacity,
        iteration=iteration,
        objectives=objectives,
        horizon_days=horizon_days,
    )
    roles = _group_role_models(blueprint)
    return DeveloperModel(
        iteration=blueprint.iteration,
        objectives=blueprint.objectives,
        horizon_days=blueprint.horizon_days,
        roles=roles,
        blueprint=blueprint,
    )
