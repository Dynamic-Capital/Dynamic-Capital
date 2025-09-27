"""Backend keeper orchestration for Dynamic Capital services."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence, Tuple

from .multi_llm import LLMConfig, LLMRun

__all__ = [
    "BackendService",
    "DynamicBackendKeeperAlgorithm",
    "BackendKeeperSyncResult",
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
class BackendService:
    """Represents a backend service overseen by the keeper."""

    name: str
    owner: str
    status: str = "operational"
    runtime: str = ""
    tier: str = ""
    priority: int = 0
    endpoints: Tuple[str, ...] = ()
    tags: Tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        name = self.name.strip()
        owner = self.owner.strip()
        if not name:
            raise ValueError("backend service name is required")
        if not owner:
            raise ValueError("backend service owner is required")
        object.__setattr__(self, "name", name)
        object.__setattr__(self, "owner", owner)
        object.__setattr__(self, "status", (self.status or "operational").strip() or "operational")
        object.__setattr__(self, "runtime", self.runtime.strip())
        object.__setattr__(self, "tier", self.tier.strip())
        object.__setattr__(self, "endpoints", _normalise_tuple(self.endpoints))
        object.__setattr__(self, "tags", _normalise_tuple(self.tags))
        object.__setattr__(self, "metadata", dict(self.metadata or {}))


@dataclass(slots=True)
class BackendKeeperSyncResult:
    """Structured output produced by :class:`DynamicBackendKeeperAlgorithm`."""

    timestamp: datetime
    theme: Optional[str]
    services: Sequence[MutableMapping[str, Any]]
    dependencies: Sequence[MutableMapping[str, Any]]
    incidents: Sequence[MutableMapping[str, Any]]
    deployments: Sequence[MutableMapping[str, Any]]
    risks: Sequence[MutableMapping[str, Any]]
    llm_runs: Tuple[LLMRun, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a concise description of the synchronisation."""

        parts: list[str] = [f"{len(self.services)} services"]
        if self.dependencies:
            parts.append(f"{len(self.dependencies)} dependency links")
        if self.incidents:
            parts.append(f"{len(self.incidents)} incidents")
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
            "services": [dict(service) for service in self.services],
            "dependencies": [dict(dep) for dep in self.dependencies],
            "incidents": [dict(incident) for incident in self.incidents],
            "deployments": [dict(deployment) for deployment in self.deployments],
            "risks": [dict(risk) for risk in self.risks],
            "summary": self.summary(),
        }
        if self.llm_runs:
            payload["llm_runs"] = [run.to_dict(include_prompt=False) for run in self.llm_runs]
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


class DynamicBackendKeeperAlgorithm:
    """Coordinates backend services, incidents, and LLM readiness reviews."""

    def __init__(self) -> None:
        self._services: list[BackendService] = []
        self._dependencies: Dict[str, set[str]] = {}
        self._deployments: Dict[str, Mapping[str, Any]] = {}

    def register_service(self, service: BackendService) -> None:
        """Register a persistent backend service managed by the keeper."""

        self._services.append(service)

    def register_dependency(self, service: str, dependencies: Iterable[str]) -> None:
        """Register upstream dependencies for a backend service."""

        service_name = service.strip()
        if not service_name:
            raise ValueError("service identifier is required for dependency registration")
        targets = {target.strip() for target in dependencies or () if target and str(target).strip()}
        if not targets:
            return
        links = self._dependencies.setdefault(service_name, set())
        links.update(targets)

    def register_deployment(self, service: str, details: Mapping[str, Any]) -> None:
        """Register the current deployment metadata for a service."""

        service_name = service.strip()
        if not service_name:
            raise ValueError("service identifier is required for deployment registration")
        self._deployments[service_name] = dict(details or {})

    def sync(
        self,
        *,
        as_of: Optional[datetime] = None,
        services: Optional[Iterable[BackendService]] = None,
        dependencies: Optional[Mapping[str, Iterable[str]]] = None,
        incidents: Optional[Iterable[Mapping[str, Any]]] = None,
        deployments: Optional[Mapping[str, Mapping[str, Any]]] = None,
        status_overrides: Optional[Mapping[str, str]] = None,
        llm_configs: Optional[Sequence[LLMConfig]] = None,
        theme: Optional[str] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> BackendKeeperSyncResult:
        """Synchronise backend services and share resilience guidance."""

        timestamp = (as_of or datetime.now(timezone.utc)).astimezone(timezone.utc)

        service_map: Dict[str, BackendService] = {}
        for service in (*self._services, *(services or [])):
            service_map[service.name] = service
        if not service_map:
            raise ValueError("At least one backend service must be provided for synchronisation")

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

        deployment_map: Dict[str, Mapping[str, Any]] = {
            name: dict(details) for name, details in self._deployments.items()
        }
        for name, details in (deployments or {}).items():
            service_name = name.strip()
            if not service_name:
                continue
            deployment_map[service_name] = dict(details or {})

        status_map: Dict[str, str] = {}
        for name, status in (status_overrides or {}).items():
            service_name = name.strip()
            status_value = status.strip()
            if service_name and status_value:
                status_map[service_name] = status_value

        services_payload: list[MutableMapping[str, Any]] = []
        all_runtimes: set[str] = set()
        for service in sorted(
            service_map.values(), key=lambda value: (-value.priority, value.name.lower())
        ):
            status = status_map.get(service.name, service.status)
            payload: MutableMapping[str, Any] = {
                "name": service.name,
                "owner": service.owner,
                "status": status,
                "priority": service.priority,
            }
            if service.runtime:
                payload["runtime"] = service.runtime
                all_runtimes.add(service.runtime)
            if service.tier:
                payload["tier"] = service.tier
            if service.endpoints:
                payload["endpoints"] = list(service.endpoints)
            if service.tags:
                payload["tags"] = list(service.tags)
            if service.metadata:
                payload["metadata"] = dict(service.metadata)
            if service.name in deployment_map:
                payload["deployment"] = dict(deployment_map[service.name])
            services_payload.append(payload)

        dependencies_payload: list[MutableMapping[str, Any]] = []
        missing_dependencies: list[Tuple[str, str]] = []
        for service_name, targets in sorted(dependency_map.items()):
            if not targets:
                continue
            valid_targets = sorted(target for target in targets if target in service_map)
            missing = sorted(target for target in targets if target not in service_map)
            dependencies_payload.append(
                {"service": service_name, "depends_on": valid_targets, "missing": missing}
            )
            for dependency in missing:
                missing_dependencies.append((service_name, dependency))

        incidents_payload: list[MutableMapping[str, Any]] = [
            {"title": incident.get("title", ""), "severity": incident.get("severity", "info"), **dict(incident)}
            for incident in incidents or []
        ]

        deployments_payload: list[MutableMapping[str, Any]] = [
            {"service": name, **dict(details)} for name, details in sorted(deployment_map.items())
        ]

        status_alerts = [
            (payload["name"], payload["status"])
            for payload in services_payload
            if payload["status"].lower() in {"degraded", "outage", "offline"}
        ]
        incident_alerts = [
            incident
            for incident in incidents_payload
            if str(incident.get("severity", "")).lower() in {"high", "critical"}
        ]

        risks_payload: list[MutableMapping[str, Any]] = []
        for service_name, dependency in missing_dependencies:
            risks_payload.append(
                {
                    "service": service_name,
                    "issue": "missing_dependency",
                    "details": f"Depends on '{dependency}' which is not registered",
                }
            )
        for service_name, status in status_alerts:
            risks_payload.append(
                {
                    "service": service_name,
                    "issue": "status_alert",
                    "details": f"Service reported status '{status}'",
                }
            )
        for incident in incident_alerts:
            risks_payload.append(
                {
                    "service": incident.get("service", "unknown"),
                    "issue": "critical_incident",
                    "details": incident.get("title") or "Critical incident reported",
                }
            )

        metadata: Dict[str, Any] = dict(context or {})
        prompt = self._build_prompt(
            timestamp=timestamp,
            theme=theme,
            services=services_payload,
            dependencies=dependencies_payload,
            incidents=incidents_payload,
            deployments=deployments_payload,
            risks=risks_payload,
            runtimes=sorted(all_runtimes),
        )
        metadata["prompt"] = prompt
        if incidents_payload:
            metadata["incidents"] = [dict(incident) for incident in incidents_payload]
        if risks_payload:
            metadata["risks"] = [dict(risk) for risk in risks_payload]

        llm_runs: list[LLMRun] = []
        if llm_configs:
            for config in llm_configs:
                llm_runs.append(config.run(prompt))

        result = BackendKeeperSyncResult(
            timestamp=timestamp,
            theme=theme,
            services=services_payload,
            dependencies=dependencies_payload,
            incidents=incidents_payload,
            deployments=deployments_payload,
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
        services: Sequence[Mapping[str, Any]],
        dependencies: Sequence[Mapping[str, Any]],
        incidents: Sequence[Mapping[str, Any]],
        deployments: Sequence[Mapping[str, Any]],
        risks: Sequence[Mapping[str, Any]],
        runtimes: Sequence[str],
    ) -> str:
        """Construct a narrative prompt describing backend readiness."""

        lines = [
            "You are the Dynamic Capital backend keeper responsible for runtime resilience.",
            f"Timestamp: {timestamp.isoformat()}",
        ]
        if theme:
            lines.append(f"Theme: {theme}")
        if runtimes:
            lines.append(f"Runtimes observed: {', '.join(runtimes)}")
        lines.append("Registered services:")
        for service in services:
            entry = (
                f"- {service['name']} (owner={service['owner']}) — status={service['status']} priority={service['priority']}"
            )
            if service.get("runtime"):
                entry += f" runtime={service['runtime']}"
            if service.get("tier"):
                entry += f" tier={service['tier']}"
            if deployment := service.get("deployment"):
                version = deployment.get("version") or deployment.get("tag")
                if version:
                    entry += f" deployed={version}"
            lines.append(entry)
        if dependencies:
            lines.append("Dependency overview:")
            for dependency in dependencies:
                parts: list[str] = []
                if dependency["depends_on"]:
                    parts.append("depends on " + ", ".join(dependency["depends_on"]))
                if dependency["missing"]:
                    parts.append("missing " + ", ".join(dependency["missing"]))
                descriptor = "; ".join(parts) if parts else "no dependencies"
                lines.append(f"- {dependency['service']}: {descriptor}")
        if incidents:
            lines.append("Incidents:")
            for incident in incidents:
                lines.append(
                    f"- {incident.get('service', 'unknown')}: {incident.get('title', 'Unnamed incident')} (severity={incident.get('severity', 'info')})"
                )
        if deployments:
            lines.append("Deployments:")
            for deployment in deployments:
                lines.append(
                    f"- {deployment['service']}: {', '.join(f'{k}={v}' for k, v in deployment.items() if k != 'service')}"
                )
        if risks:
            lines.append("Risks detected:")
            for risk in risks:
                lines.append(
                    f"- {risk['service']}: {risk['issue']} — {risk['details']}"
                )
        else:
            lines.append("Risks detected: none")
        lines.append(
            "Provide backend alignment guidance, mitigation steps, and operational follow-ups for the engineering team."
        )
        return "\n".join(lines)
