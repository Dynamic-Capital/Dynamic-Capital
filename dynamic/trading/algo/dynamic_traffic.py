"""Dynamic traffic control utilities for load shedding and routing decisions."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Mapping, MutableMapping, Sequence

__all__ = [
    "RoutePolicy",
    "TrafficSignal",
    "RouteSnapshot",
    "TrafficDecision",
    "DynamicTrafficControl",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_route(value: str) -> str:
    route = str(value).strip()
    if not route:
        raise ValueError("route is required")
    return route


def _route_key(value: str) -> str:
    return _normalise_route(value).lower()


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    if value is None:
        return _now()
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    raise TypeError("timestamp must be datetime, ISO-8601 string, or None")


def _coerce_float(value: object, *, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: object, *, default: int = 0, minimum: int | None = None) -> int:
    try:
        coerced = int(float(value))
    except (TypeError, ValueError):
        coerced = default
    if minimum is not None:
        coerced = max(coerced, minimum)
    return coerced


def _weighted_percentile(values: Sequence[float], weights: Sequence[float], percentile: float) -> float | None:
    if not values:
        return None
    if not 0 <= percentile <= 1:
        raise ValueError("percentile must be in the range [0, 1]")
    paired = sorted(
        (
            (value, weight if weight > 0 else 0.0)
            for value, weight in zip(values, weights)
        ),
        key=lambda pair: pair[0],
    )
    total_weight = sum(weight for _, weight in paired)
    if total_weight <= 0:
        return paired[-1][0]
    threshold = percentile * total_weight
    cumulative = 0.0
    for value, weight in paired:
        cumulative += weight
        if cumulative >= threshold:
            return value
    return paired[-1][0]


@dataclass(slots=True)
class RoutePolicy:
    """Configuration describing a route's desired operating envelope."""

    route: str
    target_rpm: float = 600.0
    max_concurrency: int = 32
    max_error_rate: float = 0.1
    max_latency_ms: float = 850.0
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.route = _normalise_route(self.route)
        if self.target_rpm <= 0:
            raise ValueError("target_rpm must be positive")
        if self.max_concurrency <= 0:
            raise ValueError("max_concurrency must be positive")
        if self.max_error_rate <= 0:
            raise ValueError("max_error_rate must be positive")
        if self.max_latency_ms <= 0:
            raise ValueError("max_latency_ms must be positive")
        if self.weight <= 0:
            raise ValueError("weight must be positive")

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "route": self.route,
            "target_rpm": self.target_rpm,
            "max_concurrency": self.max_concurrency,
            "max_error_rate": self.max_error_rate,
            "max_latency_ms": self.max_latency_ms,
            "weight": self.weight,
        }


@dataclass(slots=True)
class TrafficSignal:
    """Normalised telemetry measurement for a single sampling interval."""

    route: str
    requests: int = 0
    allowed: int | None = None
    blocked: int | None = None
    errors: int = 0
    latency_ms: float | None = None
    timestamp: datetime = field(default_factory=_now)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.route = _normalise_route(self.route)
        self.requests = _coerce_int(self.requests, default=0, minimum=0)
        allowed = self.allowed if self.allowed is not None else None
        blocked = self.blocked if self.blocked is not None else None
        if allowed is None and blocked is not None:
            allowed = self.requests - _coerce_int(blocked, default=0, minimum=0)
        if blocked is None and allowed is not None:
            blocked = self.requests - _coerce_int(allowed, default=0, minimum=0)
        if allowed is None and blocked is None:
            allowed = self.requests
            blocked = 0
        allowed = _coerce_int(allowed, default=0, minimum=0)
        blocked = _coerce_int(blocked, default=0, minimum=0)
        if allowed + blocked > self.requests and self.requests > 0:
            scale = max(self.requests / (allowed + blocked), 0.0)
            allowed = int(round(allowed * scale))
            blocked = int(round(blocked * scale))
        self.allowed = min(max(allowed, 0), self.requests)
        residual = self.requests - self.allowed
        self.blocked = min(max(blocked, 0), residual)
        self.errors = _coerce_int(self.errors, default=0, minimum=0)
        self.latency_ms = (
            None
            if self.latency_ms is None
            else max(_coerce_float(self.latency_ms), 0.0)
        )
        self.timestamp = _coerce_timestamp(self.timestamp)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping")
        self.metadata = dict(self.metadata) if self.metadata else None


@dataclass(slots=True)
class RouteSnapshot:
    """Aggregated health metrics for a route within the active window."""

    route: str
    policy: RoutePolicy
    request_count: int
    allowed_count: int
    blocked_count: int
    error_count: int
    request_rate_per_minute: float
    average_latency_ms: float | None
    latency_p95_ms: float | None
    utilisation_ratio: float
    error_ratio: float
    latency_ratio: float
    throttle: float
    status: str
    window_start: datetime | None
    window_end: datetime | None

    @property
    def pressure(self) -> float:
        return max(self.utilisation_ratio, self.error_ratio, self.latency_ratio)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "route": self.route,
            "policy": self.policy.as_dict(),
            "request_count": self.request_count,
            "allowed_count": self.allowed_count,
            "blocked_count": self.blocked_count,
            "error_count": self.error_count,
            "request_rate_per_minute": self.request_rate_per_minute,
            "average_latency_ms": self.average_latency_ms,
            "latency_p95_ms": self.latency_p95_ms,
            "utilisation_ratio": self.utilisation_ratio,
            "error_ratio": self.error_ratio,
            "latency_ratio": self.latency_ratio,
            "pressure": self.pressure,
            "throttle": self.throttle,
            "status": self.status,
            "window_start": self.window_start.isoformat() if self.window_start else None,
            "window_end": self.window_end.isoformat() if self.window_end else None,
        }


@dataclass(slots=True)
class TrafficDecision:
    """Represents an admission control decision for a route."""

    route: str
    allowed: bool
    throttle: float
    reason: str
    pressure: float
    snapshot: RouteSnapshot

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "route": self.route,
            "allowed": self.allowed,
            "throttle": self.throttle,
            "reason": self.reason,
            "pressure": self.pressure,
            "snapshot": self.snapshot.as_dict(),
        }


class DynamicTrafficControl:
    """Maintains rolling traffic telemetry and recommends throttle levels."""

    def __init__(
        self,
        *,
        window_size: int | None = 500,
        window_duration: timedelta | None = timedelta(minutes=10),
    ) -> None:
        if window_size is not None and window_size <= 0:
            raise ValueError("window_size must be positive or None")
        if window_duration is not None and window_duration <= timedelta(0):
            raise ValueError("window_duration must be positive or None")
        self.window_size = window_size
        self.window_duration = window_duration
        self._signals: dict[str, Deque[TrafficSignal]] = {}
        self._policies: dict[str, RoutePolicy] = {}

    def register_policy(
        self,
        route: str,
        *,
        target_rpm: float = 600.0,
        max_concurrency: int = 32,
        max_error_rate: float = 0.1,
        max_latency_ms: float = 850.0,
        weight: float = 1.0,
    ) -> RoutePolicy:
        policy = RoutePolicy(
            route=route,
            target_rpm=target_rpm,
            max_concurrency=max_concurrency,
            max_error_rate=max_error_rate,
            max_latency_ms=max_latency_ms,
            weight=weight,
        )
        key = _route_key(route)
        self._policies[key] = policy
        self._ensure_store(key)
        return policy

    def _ensure_store(self, route_key: str) -> Deque[TrafficSignal]:
        store = self._signals.get(route_key)
        if store is None:
            maxlen = self.window_size if self.window_size is not None else None
            store = deque(maxlen=maxlen)
            self._signals[route_key] = store
        return store

    def record(self, signal: TrafficSignal | Mapping[str, object]) -> TrafficSignal:
        if not isinstance(signal, TrafficSignal):
            signal = TrafficSignal(**dict(signal))
        key = _route_key(signal.route)
        store = self._ensure_store(key)
        store.append(signal)
        return signal

    def ingest(self, payload: Mapping[str, object]) -> bool:
        if not isinstance(payload, Mapping):  # pragma: no cover - defensive
            return False
        route = payload.get("route") or payload.get("path")
        if not route:
            return False
        try:
            signal = TrafficSignal(
                route=route,
                requests=payload.get("requests")
                or payload.get("total")
                or payload.get("hits")
                or payload.get("count")
                or 0,
                allowed=payload.get("allowed"),
                blocked=payload.get("blocked")
                or payload.get("throttled")
                or payload.get("denied"),
                errors=payload.get("errors")
                or payload.get("failures")
                or payload.get("5xx")
                or 0,
                latency_ms=payload.get("latency_ms")
                or payload.get("latency")
                or payload.get("p95_latency_ms"),
                timestamp=payload.get("timestamp") or payload.get("observed_at"),
                metadata=payload.get("metadata"),
            )
        except (TypeError, ValueError):
            return False
        self.record(signal)
        return True

    def _active_signals(self, route_key: str, reference_time: datetime) -> Sequence[TrafficSignal]:
        store = self._signals.get(route_key)
        if not store:
            return ()
        if self.window_duration is None:
            return tuple(store)
        cutoff = reference_time - self.window_duration
        while store and store[0].timestamp < cutoff:
            store.popleft()
        return tuple(signal for signal in store if signal.timestamp >= cutoff)

    def _policy_for(self, route: str) -> RoutePolicy:
        key = _route_key(route)
        policy = self._policies.get(key)
        if policy is not None:
            return policy
        policy = RoutePolicy(route=route)
        self._policies[key] = policy
        self._ensure_store(key)
        return policy

    def snapshot(self, route: str, *, current_time: datetime | None = None) -> RouteSnapshot:
        current_time = current_time or _now()
        policy = self._policy_for(route)
        key = _route_key(route)
        signals = list(self._active_signals(key, current_time))
        if not signals:
            return RouteSnapshot(
                route=policy.route,
                policy=policy,
                request_count=0,
                allowed_count=0,
                blocked_count=0,
                error_count=0,
                request_rate_per_minute=0.0,
                average_latency_ms=None,
                latency_p95_ms=None,
                utilisation_ratio=0.0,
                error_ratio=0.0,
                latency_ratio=0.0,
                throttle=1.0,
                status="stable",
                window_start=None,
                window_end=None,
            )
        signals.sort(key=lambda signal: signal.timestamp)
        request_count = sum(signal.requests for signal in signals)
        allowed_count = sum(signal.allowed or 0 for signal in signals)
        blocked_count = sum(signal.blocked or 0 for signal in signals)
        error_count = sum(signal.errors for signal in signals)
        window_start = signals[0].timestamp
        window_end = min(signals[-1].timestamp, current_time)
        if self.window_duration is not None:
            cutoff = current_time - self.window_duration
            if window_start < cutoff:
                window_start = cutoff
        span_seconds = max((current_time - window_start).total_seconds(), 1.0)
        if self.window_duration is not None:
            span_seconds = min(span_seconds, self.window_duration.total_seconds())
        window_minutes = max(span_seconds / 60.0, 1 / 60.0)
        request_rate_per_minute = allowed_count / window_minutes if window_minutes else float(allowed_count)
        latencies: list[float] = []
        latency_weights: list[float] = []
        for signal in signals:
            if signal.latency_ms is not None:
                latencies.append(signal.latency_ms)
                latency_weights.append(max(signal.allowed or signal.requests or 1, 1))
        total_latency_weight = sum(latency_weights)
        average_latency_ms = (
            sum(value * weight for value, weight in zip(latencies, latency_weights)) / total_latency_weight
            if total_latency_weight > 0
            else None
        )
        latency_p95_ms = _weighted_percentile(latencies, latency_weights, 0.95)
        utilisation_ratio = request_rate_per_minute / policy.target_rpm if policy.target_rpm > 0 else 0.0
        error_rate = (error_count + blocked_count) / request_count if request_count > 0 else 0.0
        error_ratio = error_rate / policy.max_error_rate if policy.max_error_rate > 0 else 0.0
        latency_ratio = (
            (latency_p95_ms or 0.0) / policy.max_latency_ms if policy.max_latency_ms > 0 else 0.0
        )
        pressure = max(utilisation_ratio, error_ratio, latency_ratio)
        throttle = 1.0 if pressure <= 1.0 else round(1.0 / pressure, 4)
        if throttle < 0.0:
            throttle = 0.0
        if throttle > 1.0:
            throttle = 1.0
        if pressure <= 0.9:
            status = "stable"
        elif pressure <= 1.1:
            status = "elevated"
        else:
            status = "critical"
        return RouteSnapshot(
            route=policy.route,
            policy=policy,
            request_count=request_count,
            allowed_count=allowed_count,
            blocked_count=blocked_count,
            error_count=error_count,
            request_rate_per_minute=request_rate_per_minute,
            average_latency_ms=average_latency_ms,
            latency_p95_ms=latency_p95_ms,
            utilisation_ratio=utilisation_ratio,
            error_ratio=error_ratio,
            latency_ratio=latency_ratio,
            throttle=throttle,
            status=status,
            window_start=window_start,
            window_end=window_end,
        )

    def decide(
        self,
        route: str,
        *,
        current_concurrency: float = 0.0,
        requested_cost: float = 1.0,
        current_time: datetime | None = None,
    ) -> TrafficDecision:
        snapshot = self.snapshot(route, current_time=current_time)
        policy = snapshot.policy
        current_concurrency = max(float(current_concurrency), 0.0)
        requested_cost = max(float(requested_cost), 0.0)
        concurrency_ratio = (
            (current_concurrency + requested_cost) / policy.max_concurrency
            if policy.max_concurrency > 0
            else 0.0
        )
        pressure = max(snapshot.pressure, concurrency_ratio)
        throttle = snapshot.throttle
        if concurrency_ratio > 1.0:
            concurrency_throttle = round(1.0 / concurrency_ratio, 4)
            throttle = min(throttle, concurrency_throttle)
        throttle = max(min(throttle, 1.0), 0.0)
        allowed = pressure <= 1.0
        reason = "ok"
        if concurrency_ratio > 1.0:
            reason = "concurrency"
        elif snapshot.error_ratio > 1.0:
            reason = "errors"
        elif snapshot.latency_ratio > 1.0:
            reason = "latency"
        elif snapshot.utilisation_ratio > 1.0:
            reason = "capacity"
        elif snapshot.pressure > 1.0:
            reason = "pressure"
        return TrafficDecision(
            route=snapshot.route,
            allowed=allowed,
            throttle=throttle,
            reason=reason,
            pressure=pressure,
            snapshot=snapshot,
        )

    def overview(self, *, current_time: datetime | None = None) -> Mapping[str, RouteSnapshot]:
        current_time = current_time or _now()
        return {
            policy.route: self.snapshot(policy.route, current_time=current_time)
            for policy in self._policies.values()
        }
