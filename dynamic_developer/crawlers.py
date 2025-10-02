from __future__ import annotations

"""Text crawlers that extract developer tasks and capacity from notes."""

from collections.abc import Iterable
import re
from typing import Any, MutableMapping

_STATUS_MAP = {"x": "done", " ": "pending", "": "pending", "b": "blocked", "B": "blocked"}

__all__ = ["crawl_tasks_from_markdown", "crawl_capacity_from_lines"]


def _parse_metadata(blob: str | None) -> MutableMapping[str, Any]:
    metadata: MutableMapping[str, Any] = {}
    if not blob:
        return metadata
    for part in blob.split(","):
        key, _, value = part.partition(":")
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if value:
            metadata[key] = value
    return metadata


_TASK_PATTERN = re.compile(
    r"^- \[(?P<status>[ xXbB])\]\s*(?P<identifier>[^:]+):\s*(?P<description>[^\[{]+)?(?:\[(?P<tags>[^\]]+)\])?(?:\{(?P<meta>[^}]+)\})?",
    re.IGNORECASE,
)


def crawl_tasks_from_markdown(text: str) -> tuple[MutableMapping[str, Any], ...]:
    """Extract backlog entries from a markdown task list."""

    tasks: list[MutableMapping[str, Any]] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or not line.startswith("-"):
            continue
        match = _TASK_PATTERN.match(line)
        if not match:
            continue
        status_key = match.group("status") or ""
        status = _STATUS_MAP.get(status_key.strip(), "pending")
        identifier = match.group("identifier").strip()
        description = (match.group("description") or "").strip() or identifier
        tags_blob = match.group("tags")
        tags = tuple(tag.strip() for tag in tags_blob.split(",") if tag.strip()) if tags_blob else ()
        metadata = _parse_metadata(match.group("meta"))
        effort = float(metadata.pop("effort", metadata.pop("hours", 6.0)) or 6.0)
        impact = float(metadata.pop("impact", metadata.pop("value", 0.5)) or 0.5)
        role = metadata.pop("role", metadata.pop("domain", "General Development"))
        dependencies_blob = metadata.pop("depends", "")
        dependencies = tuple(
            dep.strip() for dep in dependencies_blob.split("|") if dep.strip()
        )
        task: MutableMapping[str, Any] = {
            "identifier": identifier,
            "description": description,
            "status": status,
            "tags": list(tags),
            "domain": metadata.pop("area", role),
            "role": role,
            "effort_hours": effort,
            "impact": impact,
        }
        if dependencies:
            task["dependencies"] = list(dependencies)
        if metadata:
            task["metadata"] = dict(metadata)
        tasks.append(task)
    return tuple(tasks)


_CAPACITY_PATTERN = re.compile(
    r"^(?P<role>[^:]+):\s*(?P<hours>\d+(?:\.\d+)?)h?(?:\s*/\s*(?P<daily>\d+(?:\.\d+)?)d?)?(?:\s*\((?P<focus>[^)]+)\))?",
    re.IGNORECASE,
)


def crawl_capacity_from_lines(lines: Iterable[str]) -> tuple[MutableMapping[str, Any], ...]:
    """Parse simple ``role: hours`` lines into capacity payloads."""

    payloads: list[MutableMapping[str, Any]] = []
    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        match = _CAPACITY_PATTERN.match(line)
        if not match:
            continue
        role = match.group("role").strip()
        hours = float(match.group("hours"))
        daily = match.group("daily")
        hours_per_day = float(daily) if daily else 6.0
        focus_blob = match.group("focus")
        focus = [item.strip() for item in focus_blob.split(",") if item.strip()] if focus_blob else []
        payloads.append(
            {
                "role": role,
                "available_hours": hours,
                "hours_per_day": hours_per_day,
                "focus": focus,
            }
        )
    return tuple(payloads)
