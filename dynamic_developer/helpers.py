from __future__ import annotations

"""Helper utilities for working with developer backlog payloads."""

from collections.abc import Mapping, Sequence
from typing import Any, Iterable, MutableMapping

from dynamic_dev_engine import DevelopmentCapacity, DevelopmentTask

__all__ = [
    "ensure_task_sequence",
    "ensure_capacity_payload",
    "extract_objectives",
    "summarise_backlog",
]


def ensure_task_sequence(
    tasks: Sequence[DevelopmentTask | Mapping[str, Any]] | Mapping[str, Any] | DevelopmentTask,
) -> tuple[DevelopmentTask | Mapping[str, Any], ...]:
    """Normalise ``tasks`` into a tuple for the planner."""

    if isinstance(tasks, DevelopmentTask):
        return (tasks,)
    if isinstance(tasks, Mapping):
        return (tasks,)
    if isinstance(tasks, Sequence):
        normalised: list[DevelopmentTask | Mapping[str, Any]] = []
        for item in tasks:
            if isinstance(item, (DevelopmentTask, Mapping)):
                normalised.append(item)
            else:
                raise TypeError("task entries must be DevelopmentTask instances or mappings")
        return tuple(normalised)
    raise TypeError("tasks must be a task mapping, dataclass, or sequence of those items")


def ensure_capacity_payload(capacity: object | Iterable[object] | None) -> object | None:
    """Return a structure acceptable by :class:`~dynamic_dev_engine.DynamicDevEngine`."""

    if capacity is None:
        return None
    if isinstance(capacity, (DevelopmentCapacity, Mapping)):
        return capacity
    if isinstance(capacity, Iterable):
        values = []
        for item in capacity:
            if not isinstance(item, (DevelopmentCapacity, Mapping)):
                raise TypeError("capacity entries must be DevelopmentCapacity instances or mappings")
            values.append(item)
        return tuple(values)
    raise TypeError("capacity must be None, a mapping, dataclass, or iterable of those entries")


def extract_objectives(context: Mapping[str, Any] | None) -> tuple[str, ...]:
    """Pull any potential iteration objectives from ``context``."""

    if not context:
        return ()
    candidates: list[str] = []
    for key in ("objectives", "goals", "milestones", "themes"):
        value = context.get(key)
        if value is None:
            continue
        if isinstance(value, str):
            text = value.strip()
            if text:
                candidates.append(text)
            continue
        if isinstance(value, Sequence):
            for item in value:
                text = str(item).strip()
                if text:
                    candidates.append(text)
            continue
        text = str(value).strip()
        if text:
            candidates.append(text)
    seen: set[str] = set()
    unique: list[str] = []
    for entry in candidates:
        if entry not in seen:
            seen.add(entry)
            unique.append(entry)
    return tuple(unique)


def summarise_backlog(tasks: Sequence[Mapping[str, Any] | DevelopmentTask]) -> MutableMapping[str, Any]:
    """Return lightweight analytics for a backlog payload."""

    summary: MutableMapping[str, Any] = {
        "count": 0,
        "by_role": {},
        "by_status": {},
    }
    for item in tasks:
        summary["count"] += 1
        if isinstance(item, DevelopmentTask):
            role = item.role
            status = item.status
            effort = item.effort_hours
        else:
            role_value = item.get("role") or item.get("domain") or "General Development"
            role = str(role_value).strip()
            status = str(item.get("status") or "pending").strip()
            effort = float(item.get("effort_hours") or item.get("effort") or 0.0)
        role_bucket = summary["by_role"].setdefault(role, {"count": 0, "effort_hours": 0.0})
        role_bucket["count"] += 1
        role_bucket["effort_hours"] = round(role_bucket["effort_hours"] + effort, 2)
        status_bucket = summary["by_status"].setdefault(status, 0)
        summary["by_status"][status] = status_bucket + 1
    return summary
