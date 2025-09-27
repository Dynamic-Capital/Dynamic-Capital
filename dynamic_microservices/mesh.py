"""Microservice mesh coordination utilities.

This module models microservice specifications, live deployment
instances, and the orchestration logic required to reason about health
and scaling decisions.  The primitives aim to mirror the light-weight
but opinionated helpers used in other ``dynamic_*`` packages so that the
mesh can be embedded inside trading, data, or research runtimes without
pulling in heavy infrastructure dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import ceil
from statistics import fmean
from typing import MutableMapping, Sequence

__all__ = [
    "DeploymentInstance",
    "DynamicMicroserviceMesh",
    "HealthCheckResult",
    "MicroserviceSpec",
    "ScalingDecision",
    "ServiceEndpoint",
    "ServiceSnapshot",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_identifier(value: str) -> str:
    return _normalise_text(value)


def _canonical_identifier(value: str) -> str:
    return _normalise_identifier(value).lower()


def _normalise_dependencies(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for value in values:
        identifier = _canonical_identifier(value)
        if identifier and identifier not in seen:
            seen.add(identifier)
            normalised.append(identifier)
    return tuple(normalised)


def _normalise_endpoints(values: Sequence["ServiceEndpoint"] | None) -> tuple["ServiceEndpoint", ...]:
    if not values:
        return ()
    normalised: list[ServiceEndpoint] = []
    seen: set[str] = set()
    for endpoint in values:
        key = endpoint.canonical_name
        if key not in seen:
            seen.add(key)
            normalised.append(endpoint)
    return tuple(normalised)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


# ---------------------------------------------------------------------------
# dataclasses describing the mesh


@dataclass(slots=True)
class ServiceEndpoint:
    """Describes a single callable endpoint exposed by a microservice."""

    name: str
    url: str
    method: str = "GET"
    timeout_ms: int = 1_000
    critical: bool = True

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.url = _normalise_text(self.url)
        self.method = _normalise_identifier(self.method).upper()
        if self.timeout_ms <= 0:
            raise ValueError("timeout_ms must be positive")
        self.critical = bool(self.critical)

    @property
    def canonical_name(self) -> str:
        return _canonical_identifier(self.name)


@dataclass(slots=True)
class MicroserviceSpec:
    """Configuration contract that a microservice promises to satisfy."""

    name: str
    version: str
    owner: str
    description: str
    endpoints: Sequence[ServiceEndpoint] = field(default_factory=tuple)
    dependencies: Sequence[str] = field(default_factory=tuple)
    min_replicas: int = 1
    max_replicas: int = 4
    sla_ms: int = 300

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.version = _normalise_identifier(self.version)
        self.owner = _normalise_text(self.owner)
        self.description = _normalise_text(self.description)
        self.endpoints = _normalise_endpoints(self.endpoints)
        self.dependencies = _normalise_dependencies(self.dependencies)
        if self.min_replicas <= 0:
            raise ValueError("min_replicas must be positive")
        if self.max_replicas < self.min_replicas:
            raise ValueError("max_replicas must be greater than or equal to min_replicas")
        if self.sla_ms <= 0:
            raise ValueError("sla_ms must be positive")

    @property
    def canonical_name(self) -> str:
        return _canonical_identifier(self.name)


@dataclass(slots=True)
class DeploymentInstance:
    """Live process executing a microservice spec."""

    service: str
    instance_id: str
    region: str
    status: str = "starting"
    cpu_load: float = 0.0
    memory_load: float = 0.0
    latency_p95_ms: float = 0.0
    error_rate: float = 0.0
    last_heartbeat: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.service = _canonical_identifier(self.service)
        self.instance_id = _normalise_identifier(self.instance_id)
        self.region = _normalise_identifier(self.region)
        self.status = self._normalise_status(self.status)
        self.cpu_load = _clamp(float(self.cpu_load))
        self.memory_load = _clamp(float(self.memory_load))
        self.latency_p95_ms = max(float(self.latency_p95_ms), 0.0)
        self.error_rate = _clamp(float(self.error_rate))
        if self.last_heartbeat.tzinfo is None:
            self.last_heartbeat = self.last_heartbeat.replace(tzinfo=timezone.utc)
        else:
            self.last_heartbeat = self.last_heartbeat.astimezone(timezone.utc)

    @staticmethod
    def _normalise_status(value: str) -> str:
        allowed = {"starting", "ready", "degraded", "unavailable"}
        status = _canonical_identifier(value)
        if status not in allowed:
            raise ValueError(f"status must be one of {sorted(allowed)}")
        return status

    @property
    def canonical_service(self) -> str:
        return self.service


@dataclass(slots=True)
class HealthCheckResult:
    """Outcome of a health probe against a deployment instance."""

    service: str
    instance_id: str
    status: str
    latency_ms: float
    error_rate: float
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.service = _canonical_identifier(self.service)
        self.instance_id = _normalise_identifier(self.instance_id)
        self.status = self._normalise_status(self.status)
        self.latency_ms = max(float(self.latency_ms), 0.0)
        self.error_rate = _clamp(float(self.error_rate))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)

    @staticmethod
    def _normalise_status(value: str) -> str:
        allowed = {"pass", "warn", "fail"}
        status = _canonical_identifier(value)
        if status not in allowed:
            raise ValueError(f"status must be one of {sorted(allowed)}")
        return status

    @property
    def is_healthy(self) -> bool:
        return self.status == "pass" and self.error_rate <= 0.02


@dataclass(slots=True)
class ServiceSnapshot:
    """Aggregated view of the state of a microservice."""

    service: str
    version: str
    status: str
    health_score: float
    instances: tuple[DeploymentInstance, ...]
    healthy_instances: int
    unhealthy_instances: int
    average_latency_ms: float
    average_error_rate: float
    sla_breached: bool
    updated_at: datetime

    @property
    def is_operational(self) -> bool:
        return self.status in {"healthy", "degraded"}


@dataclass(slots=True)
class ScalingDecision:
    """Represents a scaling recommendation for a microservice."""

    service: str
    action: str
    target_replicas: int
    reason: str

    def __post_init__(self) -> None:
        allowed = {"scale_up", "scale_down", "hold"}
        action = _canonical_identifier(self.action)
        if action not in allowed:
            raise ValueError(f"action must be one of {sorted(allowed)}")
        self.service = _canonical_identifier(self.service)
        self.action = action
        self.target_replicas = max(int(self.target_replicas), 0)
        self.reason = _normalise_text(self.reason)


# ---------------------------------------------------------------------------
# mesh orchestration logic


class DynamicMicroserviceMesh:
    """Coordinator for microservice specifications and live topology."""

    def __init__(self) -> None:
        self._specs: MutableMapping[str, MicroserviceSpec] = {}
        self._instances: MutableMapping[str, MutableMapping[str, DeploymentInstance]] = {}
        self._health: MutableMapping[str, MutableMapping[str, HealthCheckResult]] = {}

    # -- registration -----------------------------------------------------

    def register(self, spec: MicroserviceSpec) -> MicroserviceSpec:
        """Register or update a microservice specification."""

        key = spec.canonical_name
        self._specs[key] = spec
        self._instances.setdefault(key, {})
        self._health.setdefault(key, {})
        return spec

    def unregister(self, service: str) -> None:
        """Remove a microservice specification and associated state."""

        key = _canonical_identifier(service)
        self._specs.pop(key, None)
        self._instances.pop(key, None)
        self._health.pop(key, None)

    # -- lookup -----------------------------------------------------------

    def services(self) -> tuple[str, ...]:
        return tuple(sorted(self._specs))

    def get_spec(self, service: str) -> MicroserviceSpec | None:
        return self._specs.get(_canonical_identifier(service))

    # -- instance state ---------------------------------------------------

    def record_instance(self, instance: DeploymentInstance) -> DeploymentInstance:
        """Persist details about a live instance."""

        service_key = instance.canonical_service
        if service_key not in self._specs:
            raise KeyError(f"service '{service_key}' is not registered")
        bucket = self._instances.setdefault(service_key, {})
        bucket[instance.instance_id] = instance
        return instance

    def remove_instance(self, service: str, instance_id: str) -> bool:
        """Remove an instance record for a microservice."""

        service_key = _canonical_identifier(service)
        bucket = self._instances.get(service_key)
        if not bucket:
            return False
        return bucket.pop(_normalise_identifier(instance_id), None) is not None

    # -- health -----------------------------------------------------------

    def update_health(self, result: HealthCheckResult) -> HealthCheckResult:
        """Track the latest health check for an instance."""

        service_key = result.service
        if service_key not in self._specs:
            raise KeyError(f"service '{service_key}' is not registered")
        bucket = self._health.setdefault(service_key, {})
        bucket[result.instance_id] = result
        return result

    # -- reporting --------------------------------------------------------

    def service_snapshot(self, service: str) -> ServiceSnapshot:
        """Build an aggregated snapshot for a microservice."""

        service_key = _canonical_identifier(service)
        spec = self._specs.get(service_key)
        if spec is None:
            raise KeyError(f"service '{service_key}' is not registered")

        instances = tuple(sorted(self._instances.get(service_key, {}).values(), key=lambda item: item.instance_id))
        health = self._health.get(service_key, {})
        healthy_instances = sum(1 for result in health.values() if result.is_healthy)
        unhealthy_instances = max(len(instances) - healthy_instances, 0)

        if health:
            average_latency = fmean(result.latency_ms for result in health.values())
            average_error = fmean(result.error_rate for result in health.values())
            updated_at = max(result.timestamp for result in health.values())
            health_score = fmean(self._score_health(result, spec.sla_ms) for result in health.values())
        else:
            average_latency = 0.0
            average_error = 0.0
            updated_at = _utcnow()
            health_score = 0.0 if instances else 1.0

        status = self._determine_status(instances, healthy_instances)
        sla_breached = bool(health) and average_latency > spec.sla_ms

        return ServiceSnapshot(
            service=spec.canonical_name,
            version=spec.version,
            status=status,
            health_score=_clamp(float(health_score)),
            instances=instances,
            healthy_instances=healthy_instances,
            unhealthy_instances=unhealthy_instances,
            average_latency_ms=average_latency,
            average_error_rate=average_error,
            sla_breached=sla_breached,
            updated_at=updated_at,
        )

    def dependency_chain(self, service: str, *, include_self: bool = True) -> tuple[str, ...]:
        """Return the transitive dependency chain for a service."""

        service_key = _canonical_identifier(service)
        if service_key not in self._specs:
            raise KeyError(f"service '{service_key}' is not registered")

        order: list[str] = []
        visited: set[str] = set()

        def walk(current: str) -> None:
            if current in visited:
                return
            visited.add(current)
            spec = self._specs.get(current)
            if spec is None:
                return
            for dependency in spec.dependencies:
                walk(dependency)
            order.append(current)

        walk(service_key)
        if not include_self and order:
            order.pop()
        return tuple(order)

    # -- scaling ----------------------------------------------------------

    def plan_scaling(self, service: str) -> ScalingDecision:
        """Compute a simple scaling recommendation based on health."""

        snapshot = self.service_snapshot(service)
        spec = self._specs[snapshot.service]
        current_replicas = max(len(snapshot.instances), 0)

        if current_replicas == 0:
            target = spec.min_replicas
            action = "scale_up"
            reason = "no active instances available"
            return ScalingDecision(service=snapshot.service, action=action, target_replicas=target, reason=reason)

        if snapshot.health_score <= 0.25 and current_replicas < spec.max_replicas:
            target = min(spec.max_replicas, current_replicas + max(1, current_replicas // 2))
            reason = "service health is critically low"
            return ScalingDecision(service=snapshot.service, action="scale_up", target_replicas=target, reason=reason)

        if snapshot.average_latency_ms > spec.sla_ms and current_replicas < spec.max_replicas:
            pressure = snapshot.average_latency_ms / spec.sla_ms
            target = min(spec.max_replicas, max(spec.min_replicas, ceil(current_replicas * pressure)))
            reason = "latency exceeds SLA threshold"
            return ScalingDecision(service=snapshot.service, action="scale_up", target_replicas=target, reason=reason)

        if (
            snapshot.status == "healthy"
            and snapshot.average_latency_ms < spec.sla_ms * 0.5
            and current_replicas > spec.min_replicas
        ):
            target = max(spec.min_replicas, current_replicas - 1)
            reason = "latency well within SLA, consider releasing capacity"
            return ScalingDecision(service=snapshot.service, action="scale_down", target_replicas=target, reason=reason)

        reason = "retain current capacity"
        return ScalingDecision(
            service=snapshot.service,
            action="hold",
            target_replicas=current_replicas,
            reason=reason,
        )

    # -- helpers ----------------------------------------------------------

    @staticmethod
    def _score_health(result: HealthCheckResult, sla_ms: int) -> float:
        latency_ratio = result.latency_ms / sla_ms if sla_ms else 0.0
        latency_factor = _clamp(1.0 - max(latency_ratio - 1.0, 0.0))
        error_factor = _clamp(1.0 - result.error_rate)
        status_factor = {"pass": 1.0, "warn": 0.6, "fail": 0.0}[result.status]
        return _clamp((latency_factor * 0.6 + error_factor * 0.4) * status_factor)

    @staticmethod
    def _determine_status(instances: Sequence[DeploymentInstance], healthy_instances: int) -> str:
        if not instances:
            return "absent"
        if healthy_instances == 0:
            return "down"
        if healthy_instances == len(instances):
            return "healthy"
        return "degraded"
