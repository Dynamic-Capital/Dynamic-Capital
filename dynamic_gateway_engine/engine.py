"""Dynamic Gateway Engine for orchestrating multi-region API gateways."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "GatewayEndpoint",
    "GatewayRoute",
    "GatewayHealth",
    "GatewaySnapshot",
    "DynamicGatewayEngine",
]

_STATUS_NORMALISATION = {
    "": "unknown",
    "online": "online",
    "healthy": "online",
    "active": "online",
    "degraded": "degraded",
    "warning": "degraded",
    "offline": "offline",
    "down": "offline",
    "failed": "offline",
    "unknown": "unknown",
}

_STATUS_PRIORITY = {
    "online": 0,
    "degraded": 1,
    "offline": 2,
    "unknown": 3,
}


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, allow_empty: bool = False) -> str:
    cleaned = str(value or "").strip()
    if cleaned:
        return cleaned
    if allow_empty:
        return ""
    raise ValueError("value must not be empty")


def _normalise_identifier(value: str) -> str:
    text = _normalise_text(value)
    return text.lower().replace(" ", "-")


def _normalise_url(value: str) -> str:
    url = _normalise_text(value)
    if " " in url:
        raise ValueError("URL must not contain whitespace")
    return url


def _normalise_region(value: str) -> str:
    region = _normalise_text(value)
    return region.lower().replace(" ", "-")


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = _normalise_text(tag).lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_protocols(protocols: Sequence[str] | None) -> tuple[str, ...]:
    if not protocols:
        return ("https",)
    seen: set[str] = set()
    resolved: list[str] = []
    for protocol in protocols:
        cleaned = _normalise_text(protocol).lower()
        if cleaned not in {"http", "https"}:
            raise ValueError("protocol must be either 'http' or 'https'")
        if cleaned not in seen:
            seen.add(cleaned)
            resolved.append(cleaned)
    return tuple(resolved)


def _normalise_methods(methods: Sequence[str] | None) -> tuple[str, ...]:
    if not methods:
        return ("GET",)
    seen: set[str] = set()
    resolved: list[str] = []
    for method in methods:
        cleaned = _normalise_text(method).upper()
        if cleaned not in seen:
            seen.add(cleaned)
            resolved.append(cleaned)
    return tuple(resolved)


def _coerce_weight(weight: float | int) -> float:
    try:
        numeric = float(weight)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError("weight must be numeric") from exc
    if numeric <= 0.0:
        raise ValueError("weight must be positive")
    return round(numeric, 4)


def _coerce_latency(latency: float | int | None) -> float | None:
    if latency is None:
        return None
    try:
        numeric = float(latency)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError("latency must be numeric if provided") from exc
    if numeric < 0.0:
        raise ValueError("latency must not be negative")
    return round(numeric, 3)


def _coerce_availability(value: float | int) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError("availability must be numeric") from exc
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return round(numeric, 4)


def _normalise_incidents(incidents: Sequence[str] | None) -> tuple[str, ...]:
    if not incidents:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for incident in incidents:
        cleaned = _normalise_text(incident)
        if cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_status(value: str | None) -> str:
    key = str(value or "").replace("-", "_").replace(" ", "_").lower()
    return _STATUS_NORMALISATION.get(key, "unknown")


def _derive_affinity(tags: Sequence[str]) -> tuple[tuple[str, ...], tuple[str, ...]]:
    regions: list[str] = []
    region_seen: set[str] = set()
    protocols: list[str] = []
    protocol_seen: set[str] = set()

    for tag in tags:
        if tag.startswith("region:"):
            region = _normalise_region(tag.split("region:", 1)[1])
            if region not in region_seen:
                region_seen.add(region)
                regions.append(region)
        elif tag.startswith("protocol:"):
            protocol_tag = tag.split("protocol:", 1)[1]
            for protocol in _normalise_protocols((protocol_tag,)):
                if protocol not in protocol_seen:
                    protocol_seen.add(protocol)
                    protocols.append(protocol)

    return tuple(regions), tuple(protocols)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class GatewayEndpoint:
    """Represents a physical or logical gateway edge."""

    identifier: str
    url: str
    region: str
    protocols: tuple[str, ...] = ("https",)
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.url = _normalise_url(self.url)
        self.region = _normalise_region(self.region)
        self.protocols = _normalise_protocols(self.protocols)
        self.weight = _coerce_weight(self.weight)
        self.tags = _normalise_tags(self.tags)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "identifier": self.identifier,
            "url": self.url,
            "region": self.region,
            "protocols": list(self.protocols),
            "weight": self.weight,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class GatewayRoute:
    """Service route proxied through the gateway fabric."""

    name: str
    upstream: str
    methods: tuple[str, ...] = ("GET",)
    auth_required: bool = True
    latency_budget_ms: int = 1500
    tags: tuple[str, ...] = field(default_factory=tuple)
    region_affinity: tuple[str, ...] = field(init=False, repr=False)
    protocol_affinity: tuple[str, ...] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.upstream = _normalise_url(self.upstream)
        self.methods = _normalise_methods(self.methods)
        self.auth_required = bool(self.auth_required)
        self.latency_budget_ms = max(50, int(self.latency_budget_ms))
        self.tags = _normalise_tags(self.tags)
        self.region_affinity, self.protocol_affinity = _derive_affinity(self.tags)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "upstream": self.upstream,
            "methods": list(self.methods),
            "auth_required": self.auth_required,
            "latency_budget_ms": self.latency_budget_ms,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class GatewayHealth:
    """Latest health observation for a gateway endpoint."""

    endpoint_id: str
    status: str = "unknown"
    availability: float = 0.0
    latency_ms: float | None = None
    checked_at: datetime = field(default_factory=_utcnow)
    incidents: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.endpoint_id = _normalise_identifier(self.endpoint_id)
        self.status = _normalise_status(self.status)
        self.availability = _coerce_availability(self.availability)
        self.latency_ms = _coerce_latency(self.latency_ms)
        self.checked_at = (
            self.checked_at.astimezone(timezone.utc)
            if self.checked_at.tzinfo
            else self.checked_at.replace(tzinfo=timezone.utc)
        )
        self.incidents = _normalise_incidents(self.incidents)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "endpoint_id": self.endpoint_id,
            "status": self.status,
            "availability": self.availability,
            "latency_ms": self.latency_ms,
            "checked_at": self.checked_at.isoformat(),
            "incidents": list(self.incidents),
        }


@dataclass(slots=True)
class GatewaySnapshot:
    """Aggregated view of the gateway fabric state."""

    generated_at: datetime
    active_endpoints: tuple[str, ...]
    degraded_endpoints: tuple[str, ...]
    offline_endpoints: tuple[str, ...]
    routes: Mapping[str, tuple[str, ...]]
    notes: Mapping[str, object]

    def as_dict(self) -> Mapping[str, object]:
        return {
            "generated_at": self.generated_at.isoformat(),
            "active_endpoints": list(self.active_endpoints),
            "degraded_endpoints": list(self.degraded_endpoints),
            "offline_endpoints": list(self.offline_endpoints),
            "routes": {name: list(plan) for name, plan in self.routes.items()},
            "notes": dict(self.notes),
        }


# ---------------------------------------------------------------------------
# Engine implementation


class DynamicGatewayEngine:
    """Coordinate gateway endpoints, health, and routing plans."""

    def __init__(
        self,
        *,
        endpoints: Iterable[GatewayEndpoint] | None = None,
        routes: Iterable[GatewayRoute] | None = None,
    ) -> None:
        self._endpoints: MutableMapping[str, GatewayEndpoint] = {}
        self._routes: MutableMapping[str, GatewayRoute] = {}
        self._health: MutableMapping[str, GatewayHealth] = {}
        if endpoints:
            for endpoint in endpoints:
                self.register_endpoint(endpoint)
        if routes:
            for route in routes:
                self.register_route(route)

    # ------------------------------------------------------------------
    # Registration helpers

    def register_endpoint(self, payload: GatewayEndpoint) -> GatewayEndpoint:
        endpoint = payload
        self._endpoints[endpoint.identifier] = endpoint
        return endpoint

    def register_route(self, payload: GatewayRoute) -> GatewayRoute:
        route = payload
        self._routes[route.name] = route
        return route

    def record_health(self, payload: GatewayHealth) -> GatewayHealth:
        health = payload
        if health.endpoint_id not in self._endpoints:
            raise KeyError(f"Unknown endpoint '{health.endpoint_id}'")
        current = self._health.get(health.endpoint_id)
        if current is None or health.checked_at >= current.checked_at:
            self._health[health.endpoint_id] = health
        return health

    # ------------------------------------------------------------------
    # Introspection helpers

    @property
    def endpoints(self) -> tuple[GatewayEndpoint, ...]:
        return tuple(self._endpoints.values())

    @property
    def routes(self) -> tuple[GatewayRoute, ...]:
        return tuple(self._routes.values())

    def health_for(self, endpoint_id: str) -> GatewayHealth | None:
        key = _normalise_identifier(endpoint_id)
        return self._health.get(key)

    # ------------------------------------------------------------------
    # Planning helpers

    def _endpoint_score(self, endpoint: GatewayEndpoint) -> tuple[int, float, float, float, str]:
        health = self._health.get(endpoint.identifier)
        status_priority = _STATUS_PRIORITY[health.status] if health else _STATUS_PRIORITY["unknown"]
        availability = health.availability if health else 0.0
        latency_penalty = (
            health.latency_ms if (health is not None and health.latency_ms is not None) else 0.0
        )
        return (
            status_priority,
            -availability,
            latency_penalty,
            -endpoint.weight,
            endpoint.identifier,
        )

    def _sorted_endpoints(self) -> list[GatewayEndpoint]:
        endpoints = list(self._endpoints.values())
        endpoints.sort(key=self._endpoint_score)
        return endpoints

    def _plan_for_route(
        self,
        route: GatewayRoute,
        ordered_endpoints: Sequence[GatewayEndpoint],
    ) -> tuple[tuple[str, ...], bool]:
        required_regions = set(route.region_affinity)
        required_protocols = set(route.protocol_affinity)
        plan: list[str] = []

        for endpoint in ordered_endpoints:
            health = self._health.get(endpoint.identifier)
            if health and health.status == "offline":
                continue
            if required_regions and endpoint.region not in required_regions:
                continue
            if required_protocols and not required_protocols.intersection(endpoint.protocols):
                continue
            plan.append(endpoint.identifier)

        used_fallback = False
        if not plan:
            used_fallback = True
            # If strict requirements left the plan empty, fall back to the
            # best endpoints regardless of affinity or health status.
            for endpoint in ordered_endpoints:
                if endpoint.identifier not in plan:
                    plan.append(endpoint.identifier)

        return tuple(plan), used_fallback

    def compose_snapshot(self) -> GatewaySnapshot:
        generated_at = _utcnow()
        active: list[str] = []
        degraded: list[str] = []
        offline: list[str] = []
        availabilities: list[float] = []

        ordered_endpoints = self._sorted_endpoints()
        for endpoint in self._endpoints.values():
            health = self._health.get(endpoint.identifier)
            if health is None:
                degraded.append(endpoint.identifier)
                continue
            availabilities.append(health.availability)
            if health.status == "online":
                active.append(endpoint.identifier)
            elif health.status == "degraded":
                degraded.append(endpoint.identifier)
            elif health.status == "offline":
                offline.append(endpoint.identifier)
            else:
                degraded.append(endpoint.identifier)

        active.sort()
        degraded.sort()
        offline.sort()

        if availabilities:
            overall_availability = round(sum(availabilities) / len(availabilities), 4)
        else:
            overall_availability = 0.0

        route_plans: dict[str, tuple[str, ...]] = {}
        fallback_routes: list[str] = []
        offline_only_routes: list[str] = []
        for route in self._routes.values():
            plan, used_fallback = self._plan_for_route(route, ordered_endpoints)
            route_plans[route.name] = plan
            if used_fallback:
                fallback_routes.append(route.name)
                if plan and all(
                    (health is not None and health.status == "offline")
                    for health in (self._health.get(endpoint_id) for endpoint_id in plan)
                ):
                    offline_only_routes.append(route.name)

        notes: MutableMapping[str, object] = {
            "overall_availability": overall_availability,
            "endpoint_count": len(self._endpoints),
            "route_count": len(self._routes),
        }
        if availabilities:
            notes["active_ratio"] = round(len(active) / len(self._endpoints), 4)
        if fallback_routes:
            notes["fallback_routes"] = tuple(sorted(fallback_routes))
        if offline_only_routes:
            notes["offline_only_routes"] = tuple(sorted(offline_only_routes))

        return GatewaySnapshot(
            generated_at=generated_at,
            active_endpoints=tuple(active),
            degraded_endpoints=tuple(degraded),
            offline_endpoints=tuple(offline),
            routes=route_plans,
            notes=notes,
        )

