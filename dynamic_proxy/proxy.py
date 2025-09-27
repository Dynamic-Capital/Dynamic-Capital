"""Adaptive proxy selection utilities for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from types import MappingProxyType
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicProxyError",
    "DynamicProxyPool",
    "ProxyEndpoint",
    "ProxyLease",
    "ProxyNotAvailableError",
    "ProxySnapshot",
]


# ---------------------------------------------------------------------------
# errors and helpers


class DynamicProxyError(RuntimeError):
    """Base error for proxy pool failures."""


class ProxyNotAvailableError(DynamicProxyError):
    """Raised when no proxy can be allocated for a request."""


def _normalise_identifier(value: str) -> str:
    identifier = str(value).strip()
    if not identifier:
        raise DynamicProxyError("identifier must not be empty")
    return identifier


def _normalise_url(value: str) -> str:
    url = str(value).strip()
    if not url:
        raise DynamicProxyError("url must not be empty")
    return url


def _ensure_mapping(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise DynamicProxyError("metadata must be a mapping")
    return dict(metadata)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class ProxyEndpoint:
    """Static configuration for a proxy endpoint."""

    identifier: str
    url: str
    weight: float = 1.0
    max_sessions: int | None = None
    warmup_requests: int = 2
    failure_threshold: float = 0.35
    recovery_threshold: float = 0.7
    cooldown_seconds: float = 20.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.url = _normalise_url(self.url)
        self.weight = max(float(self.weight), 0.0)

        if self.max_sessions is not None:
            value = int(self.max_sessions)
            if value <= 0:
                raise DynamicProxyError("max_sessions must be positive when provided")
            self.max_sessions = value

        self.warmup_requests = max(int(self.warmup_requests), 0)
        self.failure_threshold = _clamp01(self.failure_threshold)
        self.recovery_threshold = _clamp01(self.recovery_threshold)
        if self.recovery_threshold < self.failure_threshold:
            self.recovery_threshold = self.failure_threshold
        self.cooldown_seconds = max(float(self.cooldown_seconds), 0.0)
        self.metadata = _ensure_mapping(self.metadata)


@dataclass(slots=True, frozen=True)
class ProxyLease:
    """Represents a time-bound reservation of a proxy."""

    identifier: str
    url: str
    metadata: Mapping[str, object]
    session_id: str
    acquired_at: datetime
    expires_at: datetime | None
    client_id: str | None = None


@dataclass(slots=True, frozen=True)
class ProxySnapshot:
    """Read-only view of a proxy state."""

    identifier: str
    url: str
    weight: float
    max_sessions: int | None
    active_sessions: int
    healthy: bool
    success_score: float
    latency_ms: float
    last_failure_at: datetime | None
    cooldown_until: datetime | None
    metadata: Mapping[str, object]
    bytes_sent: int
    bytes_received: int


@dataclass(slots=True)
class _SessionInfo:
    identifier: str
    acquired_at: datetime
    expires_at: datetime | None
    client_id: str | None


@dataclass(slots=True)
class _StickyInfo:
    identifier: str
    expires_at: datetime | None


@dataclass(slots=True)
class _ProxyState:
    config: ProxyEndpoint
    decay: float
    default_latency: float
    healthy: bool = True
    active_sessions: int = 0
    observations: int = 0
    success_ewma: float = 1.0
    latency_ewma: float = field(init=False)
    last_failure_at: datetime | None = None
    cooldown_until: datetime | None = None
    usage_counter: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0

    def __post_init__(self) -> None:
        self.latency_ewma = self.default_latency

    # ------------------------------------------------------------------ helpers
    def _success_factor(self) -> float:
        if self.observations < self.config.warmup_requests:
            if self.config.warmup_requests == 0:
                return max(self.success_ewma, 0.05)
            progress = self.observations / max(1, self.config.warmup_requests)
            return 0.4 + (0.6 * min(progress, 1.0))
        return max(self.success_ewma, 0.05)

    def _latency_penalty(self) -> float:
        latency = max(self.latency_ewma, 1.0)
        return 1.0 / (1.0 + latency / self.default_latency)

    def _session_penalty(self) -> float:
        return 1.0 / (1.0 + self.active_sessions)

    def score(self, now: datetime) -> float:
        base = max(self.config.weight, 0.0)
        if not self.healthy:
            base *= 0.3
        if self.cooldown_until and now < self.cooldown_until:
            base *= 0.5
        return base * self._success_factor() * self._latency_penalty() * self._session_penalty()

    def is_available(self, now: datetime, *, allow_unhealthy: bool) -> bool:
        if self.config.max_sessions is not None and self.active_sessions >= self.config.max_sessions:
            return False
        if not allow_unhealthy:
            if not self.healthy:
                return False
            if self.cooldown_until and now < self.cooldown_until:
                return False
        return True

    def register_result(self, *, success: bool, latency_ms: float | int | None, now: datetime) -> None:
        self.observations += 1
        outcome = 1.0 if success else 0.0
        if self.observations == 1:
            self.success_ewma = outcome
        else:
            self.success_ewma = self.decay * outcome + (1.0 - self.decay) * self.success_ewma

        if latency_ms is not None:
            latency = max(float(latency_ms), 1.0)
            if self.observations == 1:
                self.latency_ewma = latency
            else:
                self.latency_ewma = self.decay * latency + (1.0 - self.decay) * self.latency_ewma

        if success:
            if self.success_ewma >= self.config.recovery_threshold:
                self.healthy = True
            if self.cooldown_until and now >= self.cooldown_until:
                self.cooldown_until = None
        else:
            self.last_failure_at = now
            if self.config.cooldown_seconds > 0:
                self.cooldown_until = now + timedelta(seconds=self.config.cooldown_seconds)
            if self.success_ewma <= self.config.failure_threshold:
                self.healthy = False

    def acquire_session(self, *, now: datetime, ttl: float | None) -> tuple[str, datetime | None]:
        self.active_sessions += 1
        self.usage_counter += 1
        session_id = f"{self.config.identifier}:{self.usage_counter}"
        expires_at = None
        if ttl is not None and ttl > 0.0:
            expires_at = now + timedelta(seconds=ttl)
        return session_id, expires_at

    def release_session(self) -> None:
        if self.active_sessions > 0:
            self.active_sessions -= 1


# ---------------------------------------------------------------------------
# main proxy pool implementation


class DynamicProxyPool:
    """Manages adaptive selection and health tracking for proxy endpoints."""

    def __init__(
        self,
        proxies: Iterable[ProxyEndpoint | Mapping[str, object]] | None = None,
        *,
        decay: float = 0.45,
        default_latency: float = 450.0,
        session_ttl: float | None = 90.0,
        sticky_ttl: float | None = 180.0,
    ) -> None:
        if decay <= 0.0 or decay > 1.0:
            raise DynamicProxyError("decay must be between 0 and 1")
        self.decay = float(decay)
        self.default_latency = max(float(default_latency), 1.0)
        self.session_ttl = None if session_ttl is None or session_ttl <= 0 else float(session_ttl)
        self.sticky_ttl = None if sticky_ttl is None or sticky_ttl <= 0 else float(sticky_ttl)

        self._states: Dict[str, _ProxyState] = {}
        self._sessions: Dict[str, _SessionInfo] = {}
        self._sticky: Dict[str, _StickyInfo] = {}

        if proxies:
            for config in proxies:
                self.register_proxy(config)

    # ------------------------------------------------------------------ management
    def register_proxy(self, config: ProxyEndpoint | Mapping[str, object]) -> ProxyEndpoint:
        endpoint = config if isinstance(config, ProxyEndpoint) else ProxyEndpoint(**dict(config))
        state = _ProxyState(endpoint, decay=self.decay, default_latency=self.default_latency)
        identifier = endpoint.identifier

        # Remove existing sessions for this identifier.
        if identifier in self._states:
            for session_id, session in list(self._sessions.items()):
                if session.identifier == identifier:
                    self._sessions.pop(session_id, None)
            for client_id, sticky in list(self._sticky.items()):
                if sticky.identifier == identifier:
                    self._sticky.pop(client_id, None)

        self._states[identifier] = state
        return endpoint

    def remove_proxy(self, identifier: str) -> None:
        ident = _normalise_identifier(identifier)
        self._states.pop(ident, None)
        for session_id, session in list(self._sessions.items()):
            if session.identifier == ident:
                self._sessions.pop(session_id, None)
        for client_id, sticky in list(self._sticky.items()):
            if sticky.identifier == ident:
                self._sticky.pop(client_id, None)

    # ------------------------------------------------------------------ acquisition helpers
    def acquire(
        self,
        *,
        now: datetime | None = None,
        client_id: str | None = None,
        allow_unhealthy_fallback: bool = True,
    ) -> ProxyLease:
        now = now or _utcnow()
        self._expire_sessions(now)
        self._purge_sticky(now)

        if client_id:
            sticky = self._sticky.get(client_id)
            if sticky:
                state = self._states.get(sticky.identifier)
                if state and state.is_available(now, allow_unhealthy=True):
                    session_id, expires_at = state.acquire_session(now=now, ttl=self.session_ttl)
                    lease = ProxyLease(
                        identifier=state.config.identifier,
                        url=state.config.url,
                        metadata=MappingProxyType(dict(state.config.metadata)),
                        session_id=session_id,
                        acquired_at=now,
                        expires_at=expires_at,
                        client_id=client_id,
                    )
                    self._sessions[session_id] = _SessionInfo(
                        identifier=state.config.identifier,
                        acquired_at=now,
                        expires_at=expires_at,
                        client_id=client_id,
                    )
                    if self.sticky_ttl is not None:
                        sticky.expires_at = now + timedelta(seconds=self.sticky_ttl)
                    else:
                        sticky.expires_at = None
                    return lease

        candidates = self._eligible_states(now, allow_unhealthy=False)
        if not candidates and allow_unhealthy_fallback:
            candidates = self._eligible_states(now, allow_unhealthy=True)
        if not candidates:
            raise ProxyNotAvailableError("no proxies available")

        selected = max(candidates, key=lambda state: state.score(now))
        session_id, expires_at = selected.acquire_session(now=now, ttl=self.session_ttl)
        lease = ProxyLease(
            identifier=selected.config.identifier,
            url=selected.config.url,
            metadata=MappingProxyType(dict(selected.config.metadata)),
            session_id=session_id,
            acquired_at=now,
            expires_at=expires_at,
            client_id=client_id,
        )
        self._sessions[session_id] = _SessionInfo(
            identifier=selected.config.identifier,
            acquired_at=now,
            expires_at=expires_at,
            client_id=client_id,
        )
        if client_id:
            expiry = now + timedelta(seconds=self.sticky_ttl) if self.sticky_ttl is not None else None
            self._sticky[client_id] = _StickyInfo(identifier=selected.config.identifier, expires_at=expiry)
        return lease

    def _eligible_states(self, now: datetime, *, allow_unhealthy: bool) -> list[_ProxyState]:
        candidates: list[_ProxyState] = []
        for state in self._states.values():
            if state.is_available(now, allow_unhealthy=allow_unhealthy):
                candidates.append(state)
        return candidates

    def _expire_sessions(self, now: datetime) -> None:
        for session_id, session in list(self._sessions.items()):
            if session.expires_at is not None and session.expires_at <= now:
                self._release_session(session_id)

    def _purge_sticky(self, now: datetime) -> None:
        for client_id, sticky in list(self._sticky.items()):
            if sticky.identifier not in self._states:
                self._sticky.pop(client_id, None)
                continue
            if sticky.expires_at is not None and sticky.expires_at <= now:
                self._sticky.pop(client_id, None)

    # ------------------------------------------------------------------ session management
    def release(self, session_id: str, *, now: datetime | None = None) -> bool:
        now = now or _utcnow()
        self._expire_sessions(now)
        return self._release_session(session_id)

    def _release_session(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        if not session:
            return False
        state = self._states.get(session.identifier)
        if state:
            state.release_session()
        return True

    # ------------------------------------------------------------------ telemetry
    def record_result(
        self,
        identifier: str,
        *,
        success: bool,
        latency_ms: float | int | None = None,
        now: datetime | None = None,
        session_id: str | None = None,
        bytes_sent: int | None = None,
        bytes_received: int | None = None,
    ) -> None:
        ident = _normalise_identifier(identifier)
        state = self._states.get(ident)
        if state is None:
            raise DynamicProxyError(f"unknown proxy: {ident}")

        now = now or _utcnow()
        state.register_result(success=success, latency_ms=latency_ms, now=now)
        if bytes_sent is not None:
            state.bytes_sent += max(int(bytes_sent), 0)
        if bytes_received is not None:
            state.bytes_received += max(int(bytes_received), 0)
        if session_id:
            self._release_session(session_id)

    def get_snapshot(self, identifier: str) -> ProxySnapshot:
        ident = _normalise_identifier(identifier)
        state = self._states.get(ident)
        if state is None:
            raise DynamicProxyError(f"unknown proxy: {ident}")
        return ProxySnapshot(
            identifier=state.config.identifier,
            url=state.config.url,
            weight=state.config.weight,
            max_sessions=state.config.max_sessions,
            active_sessions=state.active_sessions,
            healthy=state.healthy,
            success_score=state.success_ewma,
            latency_ms=state.latency_ewma,
            last_failure_at=state.last_failure_at,
            cooldown_until=state.cooldown_until,
            metadata=MappingProxyType(dict(state.config.metadata)),
            bytes_sent=state.bytes_sent,
            bytes_received=state.bytes_received,
        )

    def describe(self) -> Sequence[ProxySnapshot]:
        return [self.get_snapshot(identifier) for identifier in sorted(self._states.keys())]
