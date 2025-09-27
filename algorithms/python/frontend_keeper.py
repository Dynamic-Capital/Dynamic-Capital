"""Frontend keeper orchestration for Dynamic Capital surfaces."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence, Tuple

from .multi_llm import LLMConfig, LLMRun

__all__ = [
    "FrontendSurface",
    "DynamicFrontendKeeperAlgorithm",
    "FrontendKeeperSyncResult",
]


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
class FrontendSurface:
    """Represents a frontend surface managed by the keeper."""

    name: str
    route: str
    description: str = ""
    owner: str = ""
    status: str = "planned"
    priority: int = 0
    components: Tuple[str, ...] = ()
    tags: Tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        name = self.name.strip()
        route = self.route.strip()
        if not name:
            raise ValueError("frontend surface name is required")
        if not route:
            raise ValueError("frontend surface route is required")
        object.__setattr__(self, "name", name)
        object.__setattr__(self, "route", route)
        object.__setattr__(self, "description", self.description.strip())
        object.__setattr__(self, "owner", self.owner.strip())
        object.__setattr__(self, "status", (self.status or "planned").strip() or "planned")
        object.__setattr__(self, "components", _normalise_tuple(self.components))
        object.__setattr__(self, "tags", _normalise_tuple(self.tags))
        object.__setattr__(self, "metadata", dict(self.metadata or {}))


@dataclass(slots=True)
class FrontendKeeperSyncResult:
    """Structured output produced by :class:`DynamicFrontendKeeperAlgorithm`."""

    timestamp: datetime
    theme: Optional[str]
    surfaces: Sequence[MutableMapping[str, Any]]
    dependencies: Sequence[MutableMapping[str, Any]]
    experiments: Sequence[MutableMapping[str, Any]]
    risks: Sequence[MutableMapping[str, Any]]
    llm_runs: Tuple[LLMRun, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a concise description of the synchronisation."""

        parts: list[str] = [f"{len(self.surfaces)} surfaces"]
        if self.dependencies:
            parts.append(f"{len(self.dependencies)} dependency links")
        if self.experiments:
            parts.append(f"{len(self.experiments)} experiments")
        if self.risks:
            parts.append(f"{len(self.risks)} risks")
        if self.theme:
            parts.append(f"theme '{self.theme}'")
        return ", ".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the sync payload."""

        payload: Dict[str, Any] = {
            "timestamp": self.timestamp.isoformat(),
            "theme": self.theme,
            "surfaces": [dict(surface) for surface in self.surfaces],
            "dependencies": [dict(dep) for dep in self.dependencies],
            "experiments": [dict(experiment) for experiment in self.experiments],
            "risks": [dict(risk) for risk in self.risks],
            "summary": self.summary(),
        }
        if self.llm_runs:
            payload["llm_runs"] = [run.to_dict(include_prompt=False) for run in self.llm_runs]
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


class DynamicFrontendKeeperAlgorithm:
    """Coordinates frontend surfaces, dependencies, and LLM health checks."""

    def __init__(self) -> None:
        self._surfaces: list[FrontendSurface] = []
        self._dependencies: Dict[str, set[str]] = {}
        self._experiments: Dict[str, set[str]] = {}

    def register_surface(self, surface: FrontendSurface) -> None:
        """Register a persistent surface managed by the keeper."""

        self._surfaces.append(surface)

    def register_dependency(self, surface: str, dependencies: Iterable[str]) -> None:
        """Register dependency relationships for a surface."""

        surface_name = surface.strip()
        if not surface_name:
            raise ValueError("surface identifier is required for dependency registration")
        targets = {target.strip() for target in dependencies or () if target and str(target).strip()}
        if not targets:
            return
        links = self._dependencies.setdefault(surface_name, set())
        links.update(targets)

    def register_experiment(self, name: str, surfaces: Iterable[str]) -> None:
        """Register a feature experiment associated with one or more surfaces."""

        experiment = name.strip()
        if not experiment:
            raise ValueError("experiment name is required for registration")
        assignments = {surface.strip() for surface in surfaces or () if surface and str(surface).strip()}
        if not assignments:
            return
        current = self._experiments.setdefault(experiment, set())
        current.update(assignments)

    def sync(
        self,
        *,
        as_of: Optional[datetime] = None,
        surfaces: Optional[Iterable[FrontendSurface]] = None,
        dependencies: Optional[Mapping[str, Iterable[str]]] = None,
        experiments: Optional[Mapping[str, Iterable[str]]] = None,
        status_overrides: Optional[Mapping[str, str]] = None,
        llm_configs: Optional[Sequence[LLMConfig]] = None,
        theme: Optional[str] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> FrontendKeeperSyncResult:
        """Synchronise frontend assets and expose alignment guidance."""

        timestamp = (as_of or datetime.now(timezone.utc)).astimezone(timezone.utc)

        surface_map: Dict[str, FrontendSurface] = {}
        for surface in (*self._surfaces, *(surfaces or [])):
            surface_map[surface.name] = surface
        if not surface_map:
            raise ValueError("At least one frontend surface must be provided for synchronisation")

        dependency_map: Dict[str, set[str]] = {
            name: set(targets) for name, targets in self._dependencies.items()
        }
        for name, targets in (dependencies or {}).items():
            key = name.strip()
            if not key:
                continue
            dependency_map.setdefault(key, set()).update(
                target.strip() for target in targets or () if target and str(target).strip()
            )

        experiment_map: Dict[str, set[str]] = {
            name: set(surfaces) for name, surfaces in self._experiments.items()
        }
        for name, assigned_surfaces in (experiments or {}).items():
            experiment = name.strip()
            if not experiment:
                continue
            experiment_map.setdefault(experiment, set()).update(
                surface.strip()
                for surface in assigned_surfaces or ()
                if surface and str(surface).strip()
            )

        experiment_assignments: Dict[str, set[str]] = {}
        for experiment, assigned_surfaces in experiment_map.items():
            for surface_name in assigned_surfaces:
                if not surface_name:
                    continue
                experiment_assignments.setdefault(surface_name, set()).add(experiment)

        status_map: Dict[str, str] = {}
        for name, status in (status_overrides or {}).items():
            surface_name = name.strip()
            status_value = status.strip()
            if surface_name and status_value:
                status_map[surface_name] = status_value

        surfaces_payload: list[MutableMapping[str, Any]] = []
        all_components: set[str] = set()
        for surface in sorted(
            surface_map.values(), key=lambda value: (-value.priority, value.name.lower())
        ):
            status = status_map.get(surface.name, surface.status)
            payload: MutableMapping[str, Any] = {
                "name": surface.name,
                "route": surface.route,
                "status": status,
                "priority": surface.priority,
            }
            if surface.description:
                payload["description"] = surface.description
            if surface.owner:
                payload["owner"] = surface.owner
            if surface.components:
                components = list(surface.components)
                payload["components"] = components
                all_components.update(components)
            if surface.tags:
                payload["tags"] = list(surface.tags)
            if surface.metadata:
                payload["metadata"] = dict(surface.metadata)
            assignments = sorted(experiment_assignments.get(surface.name, set()))
            if assignments:
                payload["experiments"] = assignments
            surfaces_payload.append(payload)

        dependencies_payload: list[MutableMapping[str, Any]] = []
        missing_dependencies: list[Tuple[str, str]] = []
        for surface_name, targets in sorted(dependency_map.items()):
            if not targets:
                continue
            valid_targets = sorted(target for target in targets if target in surface_map)
            missing = sorted(target for target in targets if target not in surface_map)
            dependencies_payload.append(
                {"surface": surface_name, "depends_on": valid_targets, "missing": missing}
            )
            for dependency in missing:
                missing_dependencies.append((surface_name, dependency))

        experiments_payload: list[MutableMapping[str, Any]] = [
            {"name": name, "surfaces": sorted(surfaces)}
            for name, surfaces in sorted(experiment_map.items())
            if surfaces
        ]

        status_alerts = [
            (payload["name"], payload["status"])
            for payload in surfaces_payload
            if payload["status"].lower() in {"offline", "degraded"}
        ]
        priority_alerts = [
            payload["name"]
            for payload in surfaces_payload
            if payload["priority"] >= 7 and payload["status"].lower() not in {"live", "active"}
        ]

        risks_payload: list[MutableMapping[str, Any]] = []
        for surface_name, dependency in missing_dependencies:
            risks_payload.append(
                {
                    "surface": surface_name,
                    "issue": "missing_dependency",
                    "details": f"Depends on '{dependency}' which is not registered",
                }
            )
        for surface_name, status in status_alerts:
            risks_payload.append(
                {
                    "surface": surface_name,
                    "issue": "status_alert",
                    "details": f"Surface reported status '{status}'",
                }
            )
        for surface_name in priority_alerts:
            risks_payload.append(
                {
                    "surface": surface_name,
                    "issue": "priority_without_activation",
                    "details": "High priority surface is not active",
                }
            )

        metadata: Dict[str, Any] = dict(context or {})
        prompt = self._build_prompt(
            timestamp=timestamp,
            theme=theme,
            surfaces=surfaces_payload,
            dependencies=dependencies_payload,
            experiments=experiments_payload,
            risks=risks_payload,
            components=sorted(all_components),
        )
        metadata["prompt"] = prompt
        if risks_payload:
            metadata["risks"] = [dict(risk) for risk in risks_payload]

        llm_runs: list[LLMRun] = []
        if llm_configs:
            for config in llm_configs:
                llm_runs.append(config.run(prompt))

        result = FrontendKeeperSyncResult(
            timestamp=timestamp,
            theme=theme,
            surfaces=surfaces_payload,
            dependencies=dependencies_payload,
            experiments=experiments_payload,
            risks=risks_payload,
            llm_runs=tuple(llm_runs),
            metadata=metadata,
        )
        return result

    def _build_prompt(
        self,
        *,
        timestamp: datetime,
        theme: Optional[str],
        surfaces: Sequence[Mapping[str, Any]],
        dependencies: Sequence[Mapping[str, Any]],
        experiments: Sequence[Mapping[str, Any]],
        risks: Sequence[Mapping[str, Any]],
        components: Sequence[str],
    ) -> str:
        """Construct a narrative prompt describing the sync state."""

        lines = [
            "You are the Dynamic Capital frontend keeper orchestrating UI health.",
            f"Timestamp: {timestamp.isoformat()}",
        ]
        if theme:
            lines.append(f"Theme: {theme}")
        if components:
            lines.append(f"Components observed: {', '.join(components)}")
        lines.append("Registered surfaces:")
        for surface in surfaces:
            entry = f"- {surface['name']} ({surface['route']}) — status={surface['status']} priority={surface['priority']}"
            if surface.get("experiments"):
                entry += f" experiments={', '.join(surface['experiments'])}"
            if surface.get("owner"):
                entry += f" owner={surface['owner']}"
            lines.append(entry)
        if dependencies:
            lines.append("Dependency overview:")
            for dependency in dependencies:
                parts: list[str] = []
                if dependency["depends_on"]:
                    parts.append(
                        "depends on " + ", ".join(dependency["depends_on"])
                    )
                if dependency["missing"]:
                    parts.append(
                        "missing " + ", ".join(dependency["missing"])
                    )
                descriptor = "; ".join(parts) if parts else "no dependencies"
                lines.append(f"- {dependency['surface']}: {descriptor}")
        if experiments:
            lines.append("Active experiments:")
            for experiment in experiments:
                lines.append(
                    f"- {experiment['name']}: {', '.join(experiment['surfaces'])}"
                )
        if risks:
            lines.append("Risks detected:")
            for risk in risks:
                lines.append(
                    f"- {risk['surface']}: {risk['issue']} — {risk['details']}"
                )
        else:
            lines.append("Risks detected: none")
        lines.append(
            "Provide frontend alignment guidance, risk mitigations, and next steps for design-system cohesion."
        )
        return "\n".join(lines)
