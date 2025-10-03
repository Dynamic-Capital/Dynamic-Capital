"""Dynamic load balancing primitives.

The module provides a small, self-contained load balancing helper that keeps
track of request success ratios, latency trends, and concurrency limits for a
fleet of upstream targets.  The balancer surfaces the highest scoring target on
``acquire`` while automatically downgrading unhealthy nodes and respecting
cooldowns before considering them again.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from types import MappingProxyType
from typing import Dict, Iterable, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicLoadBalancer",
    "LoadAssignment",
    "LoadBalancerError",
    "LoadTarget",
    "LoadTargetNotFoundError",
    "LoadTargetSnapshot",
]


class LoadBalancerError(RuntimeError):
    """Base error for load balancer failures."""


class LoadTargetNotFoundError(LoadBalancerError):
    """Raised when a requested target is not registered."""


def _normalise_identifier(value: str) -> str:
    identifier = str(value).strip()
    if not identifier:
        raise LoadBalancerError("identifier must not be empty")
    return identifier


def _normalise_endpoint(value: str | None) -> str | None:
    if value is None:
        return None
    endpoint = str(value).strip()
    return endpoint or None


def _ensure_mapping(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise LoadBalancerError("metadata must be a mapping")
    return dict(metadata)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class LoadTarget:
    """Static configuration for a load balanced upstream."""

    identifier: str
    endpoint: str | None = None
    weight: float = 1.0
    max_concurrency: int | None = None
    warmup_requests: int = 2
    error_threshold: float = 0.35
    recovery_threshold: float = 0.7
    cooldown_seconds: float = 10.0
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.endpoint = _normalise_endpoint(self.endpoint)
        self.weight = max(float(self.weight), 0.0)

        if self.max_concurrency is not None:
            if int(self.max_concurrency) <= 0:
                raise LoadBalancerError("max_concurrency must be positive when provided")
            self.max_concurrency = int(self.max_concurrency)

        self.warmup_requests = max(int(self.warmup_requests), 0)
        self.error_threshold = _clamp01(self.error_threshold)
        self.recovery_threshold = _clamp01(self.recovery_threshold)
        if self.recovery_threshold < self.error_threshold:
            self.recovery_threshold = self.error_threshold

        self.cooldown_seconds = max(float(self.cooldown_seconds), 0.0)
        self.metadata = _ensure_mapping(self.metadata)


@dataclass(slots=True, frozen=True)
class LoadAssignment:
    """Details about a selected upstream target."""

    identifier: str
    endpoint: str | None
    metadata: Mapping[str, object]
    weight: float


@dataclass(slots=True, frozen=True)
class LoadTargetSnapshot:
    """Read-only view of a target state."""

    identifier: str
    endpoint: str | None
    weight: float
    max_concurrency: int | None
    healthy: bool
    active_requests: int
    observed_requests: int
    success_score: float
    latency_ms: float
    metadata: Mapping[str, object]


@dataclass(slots=True)
class _TargetState:
    config: LoadTarget
    decay: float
    default_latency: float
    healthy: bool = True
    active_requests: int = 0
    observations: int = 0
    success_ewma: float = 1.0
    latency_ewma: float = field(init=False)
    last_failure_at: datetime | None = None

    def __post_init__(self) -> None:
        self.latency_ewma = self.default_latency

    # ------------------------------------------------------------------ helpers
    def _latency_penalty(self) -> float:
        latency = max(self.latency_ewma, 1.0)
        return 1.0 / (1.0 + latency / self.default_latency)

    def _success_factor(self) -> float:
        if self.observations == 0 and self.config.warmup_requests > 0:
            progress = self.observations / max(1, self.config.warmup_requests)
            return 0.5 + (0.5 * min(progress, 1.0))
        return max(self.success_ewma, 0.05)

    def _concurrency_penalty(self) -> float:
        return 1.0 / (1.0 + self.active_requests)

    def score(self) -> float:
        return (
            self.config.weight
            * self._success_factor()
            * self._latency_penalty()
            * self._concurrency_penalty()
        )

    def is_available(self, *, now: datetime | None, allow_unhealthy: bool) -> bool:
        if self.config.max_concurrency is not None and self.active_requests >= self.config.max_concurrency:
            return False

        if self.healthy:
            return True

        if not allow_unhealthy:
            return False

        if self.last_failure_at is None:
            return True

        current_time = now or _utcnow()
        ready_at = self.last_failure_at + timedelta(seconds=self.config.cooldown_seconds)
        return current_time >= ready_at

    def begin(self) -> None:
        self.active_requests += 1

    def release(self) -> None:
        if self.active_requests:
            self.active_requests -= 1

    def record_result(
        self,
        *,
        success: bool,
        latency_ms: float | None,
        now: datetime | None,
    ) -> None:
        self.release()

        result = 1.0 if success else 0.0
        alpha = self.decay

        if self.observations == 0:
            self.success_ewma = result
            if latency_ms is not None:
                self.latency_ewma = max(float(latency_ms), 1.0)
        else:
            self.success_ewma = (1 - alpha) * self.success_ewma + alpha * result
            if latency_ms is not None:
                latency = max(float(latency_ms), 1.0)
                self.latency_ewma = (1 - alpha) * self.latency_ewma + alpha * latency

        self.observations += 1

        if success:
            if self.success_ewma >= self.config.recovery_threshold:
                self.healthy = True
                self.last_failure_at = None
        else:
            failure_time = now or _utcnow()
            self.last_failure_at = failure_time
            if self.observations >= max(1, self.config.warmup_requests):
                if self.success_ewma <= self.config.error_threshold:
                    self.healthy = False

    def update_config(self, **updates: object) -> None:
        config = self.config
        for key, value in updates.items():
            if not hasattr(config, key):
                raise LoadBalancerError(f"Unknown load target attribute '{key}'")
            setattr(config, key, value)  # type: ignore[arg-type]
        config.__post_init__()

    def snapshot(self) -> LoadTargetSnapshot:
        metadata = MappingProxyType(dict(self.config.metadata))
        return LoadTargetSnapshot(
            identifier=self.config.identifier,
            endpoint=self.config.endpoint,
            weight=self.config.weight,
            max_concurrency=self.config.max_concurrency,
            healthy=self.healthy,
            active_requests=self.active_requests,
            observed_requests=self.observations,
            success_score=self.success_ewma,
            latency_ms=self.latency_ewma,
            metadata=metadata,
        )


class DynamicLoadBalancer:
    """Adaptive load balancer that ranks targets by health and performance."""

    def __init__(
        self,
        targets: Iterable[LoadTarget | Mapping[str, object]] | None = None,
        *,
        decay: float = 0.3,
        default_latency_ms: float = 150.0,
    ) -> None:
        if not 0 < float(decay) <= 1:
            raise LoadBalancerError("decay must be between 0 and 1")
        self._decay = float(decay)
        self._default_latency = max(float(default_latency_ms), 1.0)
        self._targets: Dict[str, _TargetState] = {}

        if targets:
            for target in targets:
                self.register_target(target)

    # ----------------------------------------------------------------- lifecycle
    def register_target(self, target: LoadTarget | Mapping[str, object]) -> LoadTargetSnapshot:
        if isinstance(target, Mapping):
            load_target = LoadTarget(**target)  # type: ignore[arg-type]
        elif isinstance(target, LoadTarget):
            load_target = target
        else:  # pragma: no cover - defensive guardrail
            raise LoadBalancerError("target must be a mapping or LoadTarget instance")

        state = _TargetState(
            config=load_target,
            decay=self._decay,
            default_latency=self._default_latency,
        )
        self._targets[load_target.identifier] = state
        return state.snapshot()

    def remove_target(self, identifier: str) -> bool:
        return self._targets.pop(_normalise_identifier(identifier), None) is not None

    def enable_all(self) -> Sequence[LoadTargetSnapshot]:
        """Mark every registered target as healthy and return their snapshots."""

        snapshots: list[LoadTargetSnapshot] = []
        for state in self._targets.values():
            state.healthy = True
            state.last_failure_at = None
            if state.success_ewma < state.config.recovery_threshold:
                state.success_ewma = state.config.recovery_threshold
            snapshots.append(state.snapshot())

        return tuple(snapshots)

    # ------------------------------------------------------------------- selection
    def _select_state(self, *, now: datetime | None, allow_unhealthy: bool) -> _TargetState | None:
        candidates: list[tuple[float, _TargetState]] = []
        for state in self._targets.values():
            if not state.is_available(now=now, allow_unhealthy=allow_unhealthy):
                continue
            score = state.score()
            if score <= 0:
                continue
            candidates.append((score, state))

        if not candidates:
            return None

        candidates.sort(key=lambda item: (-item[0], item[1].config.identifier))
        return candidates[0][1]

    def acquire(self, *, now: datetime | None = None, allow_unhealthy_fallback: bool = True) -> LoadAssignment:
        state = self._select_state(now=now, allow_unhealthy=False)
        if state is None and allow_unhealthy_fallback:
            state = self._select_state(now=now, allow_unhealthy=True)
        if state is None:
            raise LoadBalancerError("No available load targets")

        state.begin()
        snapshot = state.snapshot()
        return LoadAssignment(
            identifier=snapshot.identifier,
            endpoint=snapshot.endpoint,
            metadata=snapshot.metadata,
            weight=snapshot.weight,
        )

    # ---------------------------------------------------------------- telemetry
    def record_result(
        self,
        identifier: str,
        *,
        success: bool,
        latency_ms: float | None = None,
        now: datetime | None = None,
    ) -> LoadTargetSnapshot:
        state = self._get_state(identifier)
        state.record_result(success=success, latency_ms=latency_ms, now=now)
        return state.snapshot()

    def release(self, identifier: str) -> LoadTargetSnapshot:
        state = self._get_state(identifier)
        state.release()
        return state.snapshot()

    def update_target(self, identifier: str, **updates: object) -> LoadTargetSnapshot:
        state = self._get_state(identifier)
        state.update_config(**updates)
        return state.snapshot()

    # ----------------------------------------------------------------- inspection
    def get_snapshot(self, identifier: str) -> LoadTargetSnapshot:
        return self._get_state(identifier).snapshot()

    def list_targets(self) -> Sequence[LoadTargetSnapshot]:
        return tuple(state.snapshot() for state in self._targets.values())

    def __contains__(self, identifier: object) -> bool:  # pragma: no cover - trivial
        if not isinstance(identifier, str):
            return False
        return _normalise_identifier(identifier) in self._targets

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._targets)

    # ------------------------------------------------------------------- internals
    def _get_state(self, identifier: str) -> _TargetState:
        normalised = _normalise_identifier(identifier)
        try:
            return self._targets[normalised]
        except KeyError as exc:  # pragma: no cover - defensive
            raise LoadTargetNotFoundError(f"Unknown load target '{identifier}'") from exc

    # Iterator protocol to ease introspection in notebooks/tests
    def __iter__(self) -> Iterator[LoadTargetSnapshot]:  # pragma: no cover - convenience
        return iter(self.list_targets())
