"""API keeper orchestration for Dynamic Capital services."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence, Tuple

from .multi_llm import LLMConfig, LLMRun

__all__ = [
    "ApiEndpoint",
    "ApiKeeperSyncResult",
    "DynamicAPIKeeperAlgorithm",
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
class ApiEndpoint:
    """Represents an API endpoint coordinated by the keeper."""

    name: str
    method: str
    path: str
    owner: str
    version: str = ""
    status: str = "operational"
    tier: str = ""
    priority: int = 0
    documentation_url: str = ""
    description: str = ""
    consumers: Tuple[str, ...] = ()
    tags: Tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        name = self.name.strip()
        method = self.method.strip().upper()
        path = self.path.strip()
        owner = self.owner.strip()
        if not name:
            raise ValueError("API endpoint name is required")
        if not method:
            raise ValueError("API endpoint method is required")
        if not path:
            raise ValueError("API endpoint path is required")
        if not owner:
            raise ValueError("API endpoint owner is required")
        object.__setattr__(self, "name", name)
        object.__setattr__(self, "method", method)
        object.__setattr__(self, "path", path)
        object.__setattr__(self, "owner", owner)
        object.__setattr__(self, "status", (self.status or "operational").strip() or "operational")
        object.__setattr__(self, "version", self.version.strip())
        object.__setattr__(self, "tier", self.tier.strip())
        object.__setattr__(self, "documentation_url", self.documentation_url.strip())
        object.__setattr__(self, "description", self.description.strip())
        object.__setattr__(self, "consumers", _normalise_tuple(self.consumers))
        object.__setattr__(self, "tags", _normalise_tuple(self.tags))
        object.__setattr__(self, "metadata", dict(self.metadata or {}))


@dataclass(slots=True)
class ApiKeeperSyncResult:
    """Structured output produced by :class:`DynamicAPIKeeperAlgorithm`."""

    timestamp: datetime
    theme: Optional[str]
    endpoints: Sequence[MutableMapping[str, Any]]
    schemas: Sequence[MutableMapping[str, Any]]
    monitors: Sequence[MutableMapping[str, Any]]
    alerts: Sequence[MutableMapping[str, Any]]
    risks: Sequence[MutableMapping[str, Any]]
    llm_runs: Tuple[LLMRun, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a concise description of the synchronisation."""

        parts: list[str] = [f"{len(self.endpoints)} endpoints"]
        if self.schemas:
            parts.append(f"{len(self.schemas)} schemas")
        if self.monitors:
            parts.append(f"{len(self.monitors)} monitors")
        if self.alerts:
            parts.append(f"{len(self.alerts)} alerts")
        if self.theme:
            parts.append(f"theme '{self.theme}'")
        return ", ".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the sync payload."""

        payload: Dict[str, Any] = {
            "timestamp": self.timestamp.isoformat(),
            "theme": self.theme,
            "endpoints": [dict(endpoint) for endpoint in self.endpoints],
            "schemas": [dict(schema) for schema in self.schemas],
            "monitors": [dict(monitor) for monitor in self.monitors],
            "alerts": [dict(alert) for alert in self.alerts],
            "risks": [dict(risk) for risk in self.risks],
            "summary": self.summary(),
        }
        if self.llm_runs:
            payload["llm_runs"] = [run.to_dict(include_prompt=False) for run in self.llm_runs]
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


class DynamicAPIKeeperAlgorithm:
    """Coordinates API endpoints, schemas, monitors, and LLM guidance."""

    def __init__(self) -> None:
        self._endpoints: list[ApiEndpoint] = []
        self._schemas: Dict[str, Mapping[str, Any]] = {}
        self._monitors: Dict[str, Mapping[str, Any]] = {}

    def register_endpoint(self, endpoint: ApiEndpoint) -> None:
        """Register a persistent API endpoint managed by the keeper."""

        self._endpoints.append(endpoint)

    def enable_dynamic_api_trading(
        self,
        *,
        schema: Optional[Mapping[str, Any]] = None,
        monitor: Optional[Mapping[str, Any]] = None,
        endpoint_overrides: Optional[Mapping[str, Any]] = None,
    ) -> ApiEndpoint:
        """Register the Dynamic Capital trading API and supporting metadata."""

        payload: Dict[str, Any] = {
            "name": "trading-api",
            "method": "POST",
            "path": "/v1/trades",
            "owner": "Execution",
            "version": "2024-05-01",
            "status": "operational",
            "tier": "critical",
            "priority": 10,
            "documentation_url": "https://docs.dynamic.capital/apis/trading",
            "description": "Primary trade execution endpoint",
            "consumers": ("mobile", "partners"),
            "tags": ("core", "ton"),
        }
        if endpoint_overrides:
            payload.update(endpoint_overrides)
        endpoint = ApiEndpoint(**payload)

        self._endpoints = [
            existing for existing in self._endpoints if existing.name != endpoint.name
        ]
        self._endpoints.append(endpoint)

        resolved_schema: Mapping[str, Any] = schema or {
            "version": endpoint.version or "2024-05-01",
            "checksum": "trading-api-20240501",
        }
        self.register_schema(endpoint.name, resolved_schema)

        resolved_monitor: Mapping[str, Any] = monitor or {
            "error_rate": 0.004,
            "error_budget": 0.01,
            "p95_latency_ms": 120,
            "latency_slo_ms": 200,
            "uptime": 99.95,
            "uptime_slo": 99.9,
        }
        self.register_monitor(endpoint.name, resolved_monitor)

        return endpoint

    def register_schema(self, endpoint: str, schema: Mapping[str, Any]) -> None:
        """Register the schema metadata for an endpoint."""

        name = endpoint.strip()
        if not name:
            raise ValueError("Endpoint identifier is required for schema registration")
        self._schemas[name] = dict(schema or {})

    def register_monitor(self, endpoint: str, metrics: Mapping[str, Any]) -> None:
        """Register monitoring metrics for an endpoint."""

        name = endpoint.strip()
        if not name:
            raise ValueError("Endpoint identifier is required for monitor registration")
        self._monitors[name] = dict(metrics or {})

    def sync(
        self,
        *,
        as_of: Optional[datetime] = None,
        endpoints: Optional[Iterable[ApiEndpoint]] = None,
        schemas: Optional[Mapping[str, Mapping[str, Any]]] = None,
        monitors: Optional[Mapping[str, Mapping[str, Any]]] = None,
        alerts: Optional[Iterable[Mapping[str, Any]]] = None,
        status_overrides: Optional[Mapping[str, str]] = None,
        llm_configs: Optional[Sequence[LLMConfig]] = None,
        theme: Optional[str] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> ApiKeeperSyncResult:
        """Synchronise API endpoints and share operational guidance."""

        timestamp = (as_of or datetime.now(timezone.utc)).astimezone(timezone.utc)

        endpoint_map: Dict[str, ApiEndpoint] = {}
        for endpoint in (*self._endpoints, *(endpoints or [])):
            endpoint_map[endpoint.name] = endpoint
        if not endpoint_map:
            raise ValueError("At least one API endpoint must be provided for synchronisation")

        schema_map: Dict[str, Mapping[str, Any]] = {
            name: dict(details) for name, details in self._schemas.items()
        }
        for name, details in (schemas or {}).items():
            key = name.strip()
            if not key:
                continue
            schema_map[key] = dict(details or {})

        monitor_map: Dict[str, Mapping[str, Any]] = {
            name: dict(details) for name, details in self._monitors.items()
        }
        for name, details in (monitors or {}).items():
            key = name.strip()
            if not key:
                continue
            monitor_map[key] = dict(details or {})

        status_map: Dict[str, str] = {}
        for name, status in (status_overrides or {}).items():
            key = name.strip()
            value = status.strip()
            if key and value:
                status_map[key] = value

        endpoints_payload: list[MutableMapping[str, Any]] = []
        for endpoint in sorted(
            endpoint_map.values(),
            key=lambda value: (-value.priority, value.name.lower()),
        ):
            status = status_map.get(endpoint.name, endpoint.status)
            payload: MutableMapping[str, Any] = {
                "name": endpoint.name,
                "method": endpoint.method,
                "path": endpoint.path,
                "owner": endpoint.owner,
                "status": status,
                "priority": endpoint.priority,
            }
            if endpoint.version:
                payload["version"] = endpoint.version
            if endpoint.tier:
                payload["tier"] = endpoint.tier
            if endpoint.documentation_url:
                payload["documentation"] = endpoint.documentation_url
            if endpoint.description:
                payload["description"] = endpoint.description
            if endpoint.consumers:
                payload["consumers"] = list(endpoint.consumers)
            if endpoint.tags:
                payload["tags"] = list(endpoint.tags)
            if endpoint.metadata:
                payload["metadata"] = dict(endpoint.metadata)
            if endpoint.name in schema_map:
                payload["schema"] = dict(schema_map[endpoint.name])
            if endpoint.name in monitor_map:
                payload["monitor"] = dict(monitor_map[endpoint.name])
            endpoints_payload.append(payload)

        schemas_payload: list[MutableMapping[str, Any]] = [
            {"endpoint": name, **dict(details)} for name, details in sorted(schema_map.items())
        ]

        monitors_payload: list[MutableMapping[str, Any]] = [
            {"endpoint": name, **dict(details)} for name, details in sorted(monitor_map.items())
        ]

        alerts_payload: list[MutableMapping[str, Any]] = [
            {"title": alert.get("title", ""), "severity": alert.get("severity", "info"), **dict(alert)}
            for alert in alerts or []
        ]

        risks_payload: list[MutableMapping[str, Any]] = []

        def _append_risk(endpoint_name: str, issue: str, details: str) -> None:
            risks_payload.append({"endpoint": endpoint_name, "issue": issue, "details": details})

        for payload in endpoints_payload:
            name = payload["name"]
            if "schema" not in payload:
                _append_risk(name, "missing_schema", "Schema metadata not registered")
            status_value = payload["status"].lower()
            if status_value in {"degraded", "outage", "offline"}:
                _append_risk(name, "status_alert", f"Endpoint reported status '{payload['status']}'")
            monitor = payload.get("monitor", {})
            if monitor:
                error_rate = _safe_float(monitor.get("error_rate"))
                error_budget = _safe_float(monitor.get("error_budget"), default=0.01)
                if error_rate is not None and error_budget is not None and error_rate > error_budget:
                    _append_risk(name, "error_budget_exceeded", f"Error rate {error_rate:.4f} exceeds budget {error_budget:.4f}")
                latency = _safe_float(monitor.get("p95_latency_ms"))
                latency_slo = _safe_float(monitor.get("latency_slo_ms"))
                if latency is not None and latency_slo is not None and latency > latency_slo:
                    _append_risk(name, "latency_slo_breach", f"p95 latency {latency:.0f}ms exceeds SLO {latency_slo:.0f}ms")
                uptime = _safe_float(monitor.get("uptime"))
                uptime_slo = _safe_float(monitor.get("uptime_slo"))
                if (
                    uptime is not None
                    and uptime_slo is not None
                    and uptime_slo > 0
                    and uptime < uptime_slo
                ):
                    _append_risk(name, "uptime_slo_breach", f"Uptime {uptime:.2f}% below target {uptime_slo:.2f}%")

        for alert in alerts_payload:
            severity = str(alert.get("severity", "")).lower()
            if severity in {"high", "critical"}:
                _append_risk(
                    alert.get("endpoint", "unknown"),
                    "critical_alert",
                    alert.get("title") or "High severity alert raised",
                )

        metadata: Dict[str, Any] = dict(context or {})
        prompt = self._build_prompt(
            timestamp=timestamp,
            theme=theme,
            endpoints=endpoints_payload,
            schemas=schemas_payload,
            monitors=monitors_payload,
            alerts=alerts_payload,
            risks=risks_payload,
        )
        metadata["prompt"] = prompt
        if alerts_payload:
            metadata["alerts"] = [dict(alert) for alert in alerts_payload]
        if risks_payload:
            metadata["risks"] = [dict(risk) for risk in risks_payload]

        llm_runs: list[LLMRun] = []
        if llm_configs:
            for config in llm_configs:
                llm_runs.append(config.run(prompt))

        return ApiKeeperSyncResult(
            timestamp=timestamp,
            theme=theme,
            endpoints=endpoints_payload,
            schemas=schemas_payload,
            monitors=monitors_payload,
            alerts=alerts_payload,
            risks=risks_payload,
            llm_runs=tuple(llm_runs),
            metadata=metadata,
        )

    def _build_prompt(
        self,
        *,
        timestamp: datetime,
        theme: Optional[str],
        endpoints: Sequence[Mapping[str, Any]],
        schemas: Sequence[Mapping[str, Any]],
        monitors: Sequence[Mapping[str, Any]],
        alerts: Sequence[Mapping[str, Any]],
        risks: Sequence[Mapping[str, Any]],
    ) -> str:
        """Construct a narrative prompt describing API readiness."""

        lines = [
            "You are the Dynamic Capital API keeper orchestrating partner and internal APIs.",
            f"Timestamp: {timestamp.isoformat()}",
        ]
        if theme:
            lines.append(f"Theme: {theme}")
        lines.append("Registered endpoints:")
        for endpoint in endpoints:
            descriptor = (
                f"- {endpoint['method']} {endpoint['path']} ({endpoint['name']}) — "
                f"owner={endpoint['owner']} status={endpoint['status']} priority={endpoint['priority']}"
            )
            if endpoint.get("version"):
                descriptor += f" version={endpoint['version']}"
            if endpoint.get("tier"):
                descriptor += f" tier={endpoint['tier']}"
            if endpoint.get("documentation"):
                descriptor += " docs=" + endpoint["documentation"]
            lines.append(descriptor)
        if schemas:
            lines.append("Schemas registered:")
            for schema in schemas:
                schema_desc = ", ".join(
                    f"{key}={value}" for key, value in schema.items() if key != "endpoint"
                )
                lines.append(f"- {schema['endpoint']}: {schema_desc or 'no metadata'}")
        if monitors:
            lines.append("Monitoring snapshots:")
            for monitor in monitors:
                monitor_desc = ", ".join(
                    f"{key}={value}" for key, value in monitor.items() if key != "endpoint"
                )
                lines.append(f"- {monitor['endpoint']}: {monitor_desc or 'no metrics'}")
        if alerts:
            lines.append("Active alerts:")
            for alert in alerts:
                lines.append(
                    f"- {alert.get('endpoint', 'unknown')}: {alert.get('title', 'Unnamed alert')} "
                    f"(severity={alert.get('severity', 'info')})"
                )
        if risks:
            lines.append("Risks detected:")
            for risk in risks:
                lines.append(
                    f"- {risk.get('endpoint', 'unknown')}: {risk.get('issue')} — {risk.get('details')}"
                )
        else:
            lines.append("Risks detected: none")
        lines.append(
            "Provide API alignment guidance, schema readiness checks, and mitigation steps for the engineering team."
        )
        return "\n".join(lines)


def _safe_float(value: Any, *, default: Optional[float] = None) -> Optional[float]:
    """Return the value as a float when possible."""

    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

