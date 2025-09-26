"""Route keeper orchestration for aligning cross-algorithm pathways."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence, Tuple

from .multi_llm import LLMConfig, LLMRun


__all__ = ["Route", "RouteKeeperAlgorithm", "RouteKeeperSyncResult"]


def _normalise_tuple(values: Iterable[Any]) -> Tuple[str, ...]:
    """Return a tuple of unique, stripped string values preserving order."""

    seen: set[str] = set()
    items: list[str] = []
    for value in values or ():
        text = str(value).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        items.append(text)
    return tuple(items)


@dataclass(slots=True, frozen=True)
class Route:
    """Represents a deterministic pathway managed by the route keeper."""

    name: str
    entrypoint: str
    exitpoint: str
    description: str = ""
    algorithms: Tuple[str, ...] = ()
    tags: Tuple[str, ...] = ()
    status: str = "planned"
    priority: int = 0
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        name = self.name.strip()
        entrypoint = self.entrypoint.strip()
        exitpoint = self.exitpoint.strip()
        if not name:
            raise ValueError("route name is required")
        if not entrypoint or not exitpoint:
            raise ValueError("route entrypoint and exitpoint are required")
        object.__setattr__(self, "name", name)
        object.__setattr__(self, "entrypoint", entrypoint)
        object.__setattr__(self, "exitpoint", exitpoint)
        object.__setattr__(self, "description", self.description.strip())
        status = self.status.strip() if self.status else "planned"
        object.__setattr__(self, "status", status or "planned")
        object.__setattr__(self, "algorithms", _normalise_tuple(self.algorithms))
        object.__setattr__(self, "tags", _normalise_tuple(self.tags))
        object.__setattr__(self, "metadata", dict(self.metadata or {}))


@dataclass(slots=True)
class RouteKeeperSyncResult:
    """Structured output produced by :class:`RouteKeeperAlgorithm`."""

    timestamp: datetime
    theme: Optional[str]
    routes: Sequence[MutableMapping[str, Any]]
    dependencies: Sequence[MutableMapping[str, Any]]
    conflicts: Sequence[MutableMapping[str, Any]]
    algorithms: Tuple[str, ...]
    llm_runs: Tuple[LLMRun, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a concise description of the synchronisation."""

        parts: list[str] = [f"{len(self.routes)} routes"]
        if self.algorithms:
            parts.append(f"{len(self.algorithms)} algorithms")
        if self.conflicts:
            parts.append(f"{len(self.conflicts)} conflicts")
        if self.theme:
            parts.append(f"theme '{self.theme}'")
        return ", ".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the sync payload."""

        payload: Dict[str, Any] = {
            "timestamp": self.timestamp.isoformat(),
            "theme": self.theme,
            "routes": [dict(route) for route in self.routes],
            "dependencies": [dict(dep) for dep in self.dependencies],
            "conflicts": [dict(conflict) for conflict in self.conflicts],
            "algorithms": list(self.algorithms),
            "summary": self.summary(),
        }
        if self.llm_runs:
            payload["llm_runs"] = [run.to_dict(include_prompt=False) for run in self.llm_runs]
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


class RouteKeeperAlgorithm:
    """Coordinates route definitions and cross-algorithm synchronisation."""

    def __init__(self) -> None:
        self._routes: list[Route] = []
        self._links: Dict[str, set[str]] = {}

    def register_route(self, route: Route) -> None:
        """Register a persistent route managed by the keeper."""

        self._routes.append(route)

    def register_link(self, route: str, downstream: Iterable[str]) -> None:
        """Register downstream hand-offs originating from a route."""

        route_name = route.strip()
        if not route_name:
            raise ValueError("route identifier is required for link registration")
        targets = {target.strip() for target in downstream or () if target and str(target).strip()}
        if not targets:
            return
        links = self._links.setdefault(route_name, set())
        links.update(targets)

    def sync(
        self,
        *,
        as_of: Optional[datetime] = None,
        routes: Optional[Iterable[Route]] = None,
        dependencies: Optional[Mapping[str, Iterable[str]]] = None,
        status_overrides: Optional[Mapping[str, str]] = None,
        algorithm_routes: Optional[Mapping[str, Iterable[str]]] = None,
        llm_configs: Optional[Sequence[LLMConfig]] = None,
        theme: Optional[str] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> RouteKeeperSyncResult:
        """Synchronise routes and expose alignment guidance."""

        timestamp = self._resolve_timestamp(as_of)

        route_map: Dict[str, Route] = {}
        for route in (*self._routes, *(routes or [])):
            route_map[route.name] = route

        if not route_map:
            raise ValueError("At least one route must be provided for synchronisation")

        status_map: Dict[str, str] = {}
        for name, status in (status_overrides or {}).items():
            key = name.strip()
            value = status.strip()
            if key and value:
                status_map[key] = value

        algorithm_assignment_map: Dict[str, Tuple[str, ...]] = {}
        for algo, route_names in (algorithm_routes or {}).items():
            algo_name = str(algo).strip()
            if not algo_name:
                continue
            assignment = _normalise_tuple(route_names)
            if assignment:
                algorithm_assignment_map[algo_name] = assignment

        orphan_assignments: list[Tuple[str, str]] = []
        route_algorithms: Dict[str, set[str]] = {
            name: set(route.algorithms) for name, route in route_map.items()
        }
        for algo_name, names in algorithm_assignment_map.items():
            for route_name in names:
                if route_name in route_algorithms:
                    route_algorithms[route_name].add(algo_name)
                else:
                    orphan_assignments.append((algo_name, route_name))

        route_payloads: list[MutableMapping[str, Any]] = []
        route_payload_map: Dict[str, MutableMapping[str, Any]] = {}
        all_algorithms: set[str] = set()
        for route in sorted(route_map.values(), key=lambda value: (-value.priority, value.name.lower())):
            assigned = sorted(route_algorithms.get(route.name, set()))
            status = status_map.get(route.name, route.status)
            payload: MutableMapping[str, Any] = {
                "name": route.name,
                "entrypoint": route.entrypoint,
                "exitpoint": route.exitpoint,
                "status": status,
                "priority": route.priority,
                "algorithms": assigned,
            }
            if route.description:
                payload["description"] = route.description
            if route.tags:
                payload["tags"] = list(route.tags)
            if route.metadata:
                payload["metadata"] = dict(route.metadata)
            route_payloads.append(payload)
            route_payload_map[route.name] = payload
            all_algorithms.update(assigned)

        dependencies_payload = self._build_dependencies(
            route_payload_map,
            dependencies=dependencies,
        )

        conflicts = self._detect_conflicts(
            route_payloads,
            dependencies_payload,
            orphan_assignments=orphan_assignments,
        )

        metadata: Dict[str, Any] = dict(context or {})
        if theme:
            metadata.setdefault("theme", theme)
        metadata.setdefault("generated_at", timestamp.isoformat())
        prompt_context = {key: value for key, value in metadata.items() if key != "prompt"}
        prompt = self._build_prompt(
            timestamp=timestamp,
            theme=theme,
            routes=route_payloads,
            dependencies=dependencies_payload,
            conflicts=conflicts,
            context=prompt_context,
        )
        metadata["prompt"] = prompt

        llm_runs: list[LLMRun] = []
        if llm_configs:
            for config in llm_configs:
                llm_runs.append(config.run(prompt))

        result = RouteKeeperSyncResult(
            timestamp=timestamp,
            theme=theme,
            routes=route_payloads,
            dependencies=dependencies_payload,
            conflicts=conflicts,
            algorithms=tuple(sorted(all_algorithms)),
            llm_runs=tuple(llm_runs),
            metadata=metadata,
        )
        return result

    @staticmethod
    def _resolve_timestamp(as_of: Optional[datetime]) -> datetime:
        if as_of is None:
            return datetime.now(timezone.utc)
        if as_of.tzinfo is None:
            return as_of.replace(tzinfo=timezone.utc)
        return as_of

    def _build_dependencies(
        self,
        route_payload_map: Mapping[str, Mapping[str, Any]],
        *,
        dependencies: Optional[Mapping[str, Iterable[str]]] = None,
    ) -> list[MutableMapping[str, Any]]:
        combined: Dict[str, set[str]] = {}
        for origin, downstream in self._links.items():
            combined.setdefault(origin, set()).update(downstream)
        for origin, downstream in (dependencies or {}).items():
            origin_name = origin.strip()
            if not origin_name:
                continue
            targets = {target.strip() for target in downstream or () if target and str(target).strip()}
            if targets:
                combined.setdefault(origin_name, set()).update(targets)

        payloads: list[MutableMapping[str, Any]] = []
        for origin in sorted(combined):
            downstream = sorted(combined[origin])
            payload: MutableMapping[str, Any] = {
                "route": origin,
                "handoff_to": downstream,
            }
            origin_payload = route_payload_map.get(origin)
            if origin_payload:
                payload["status"] = origin_payload.get("status")
            linked_algorithms: set[str] = set()
            missing: list[str] = []
            if origin_payload:
                linked_algorithms.update(origin_payload.get("algorithms", []))
            for target in downstream:
                target_payload = route_payload_map.get(target)
                if target_payload:
                    linked_algorithms.update(target_payload.get("algorithms", []))
                else:
                    missing.append(target)
            if linked_algorithms:
                payload["algorithms"] = sorted(linked_algorithms)
            if missing:
                payload["missing"] = missing
            payloads.append(payload)
        return payloads

    @staticmethod
    def _detect_conflicts(
        routes: Sequence[Mapping[str, Any]],
        dependencies: Sequence[Mapping[str, Any]],
        *,
        orphan_assignments: Sequence[Tuple[str, str]],
    ) -> list[MutableMapping[str, Any]]:
        conflicts: list[MutableMapping[str, Any]] = []
        seen_paths: Dict[Tuple[str, str], str] = {}
        for route in routes:
            status = str(route.get("status", "")).lower()
            algorithms = route.get("algorithms") or []
            if status in {"active", "live"} and not algorithms:
                conflicts.append(
                    {
                        "route": route.get("name"),
                        "issue": "active route missing algorithm alignment",
                    }
                )
            key = (route.get("entrypoint"), route.get("exitpoint"))
            if key in seen_paths and seen_paths[key] != route.get("status"):
                conflicts.append(
                    {
                        "route": route.get("name"),
                        "issue": "conflicting status for shared path",
                        "path": {
                            "entrypoint": key[0],
                            "exitpoint": key[1],
                        },
                        "previous_status": seen_paths[key],
                        "current_status": route.get("status"),
                    }
                )
            else:
                seen_paths[key] = route.get("status")

        for dependency in dependencies:
            missing = dependency.get("missing")
            if missing:
                conflicts.append(
                    {
                        "route": dependency.get("route"),
                        "issue": "handoff target missing",
                        "missing_route": ", ".join(missing),
                    }
                )

        for algo_name, route_name in orphan_assignments:
            conflicts.append(
                {
                    "route": route_name,
                    "issue": "algorithm assignment references unknown route",
                    "algorithm": algo_name,
                }
            )

        return conflicts

    @staticmethod
    def _build_prompt(
        *,
        timestamp: datetime,
        theme: Optional[str],
        routes: Sequence[Mapping[str, Any]],
        dependencies: Sequence[Mapping[str, Any]],
        conflicts: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
    ) -> str:
        lines: list[str] = [
            "Dynamic Capital Route Keeper synchronisation",
            f"As of {timestamp:%Y-%m-%d %H:%M %Z}",
        ]
        if theme:
            lines.append(f"Theme: {theme}")
        if context:
            lines.append("")
            lines.append("Context:")
            for key, value in sorted(context.items()):
                if key == "prompt" or value is None:
                    continue
                lines.append(f"- {key}: {RouteKeeperAlgorithm._format_context_value(value)}")
        lines.append("")
        lines.append("Routes:")
        for route in routes:
            algorithms = route.get("algorithms") or []
            lines.append(
                f"- {route.get('name')}: [{route.get('status')}] {route.get('entrypoint')} -> {route.get('exitpoint')} "
                f"(algorithms: {', '.join(algorithms) if algorithms else 'unassigned'})"
            )
            description = route.get("description")
            if description:
                lines.append(f"  {description}")
        if dependencies:
            lines.append("")
            lines.append("Handoffs:")
            for dependency in dependencies:
                targets = dependency.get("handoff_to") or []
                lines.append(
                    f"- {dependency.get('route')} -> {', '.join(targets) if targets else 'none'}"
                )
                missing = dependency.get("missing")
                if missing:
                    lines.append(f"  Missing routes: {', '.join(missing)}")
        if conflicts:
            lines.append("")
            lines.append("Conflicts:")
            for conflict in conflicts:
                issue = conflict.get("issue", "unspecified")
                lines.append(f"- {conflict.get('route')}: {issue}")
                if "missing_route" in conflict:
                    lines.append(f"  Missing route: {conflict['missing_route']}")
                if "path" in conflict:
                    path = conflict["path"]
                    lines.append(
                        "  Path {entry} -> {exit} ({previous} vs {current})".format(
                            entry=path.get("entrypoint"),
                            exit=path.get("exitpoint"),
                            previous=conflict.get("previous_status"),
                            current=conflict.get("current_status"),
                        )
                    )
        lines.append("")
        lines.append(
            "Produce coordination guidance aligning these routes with the referenced algorithms and resolving conflicts."
        )
        return "\n".join(lines)

    @staticmethod
    def _format_context_value(value: Any) -> str:
        if isinstance(value, Mapping):
            pairs = ", ".join(f"{key}={RouteKeeperAlgorithm._format_context_value(val)}" for key, val in value.items())
            return f"{{{pairs}}}"
        if isinstance(value, (Sequence, set)) and not isinstance(value, (str, bytes, bytearray)):
            return ", ".join(RouteKeeperAlgorithm._format_context_value(item) for item in value)
        return str(value)
