"""Dynamic WebSocket session orchestration utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence
from uuid import uuid4
from urllib.parse import urlparse

__all__ = [
    "DynamicWebSocketOrchestrator",
    "WebSocketEndpoint",
    "WebSocketEndpointSnapshot",
    "WebSocketEvent",
    "WebSocketIncident",
    "WebSocketSession",
]


# ---------------------------------------------------------------------------
# helper utilities


_ALLOWED_ENDPOINT_ROLES = {"producer", "consumer", "bidirectional", "monitor"}
_ALLOWED_SESSION_STATUSES = {
    "connecting",
    "connected",
    "degraded",
    "closing",
    "closed",
    "failed",
}
_ALLOWED_EVENT_TYPES = {
    "session_created",
    "connected",
    "message",
    "heartbeat",
    "error",
    "closed",
    "status_change",
}
_ALLOWED_DIRECTIONS = {"inbound", "outbound", "neutral"}
_ALLOWED_SEVERITIES = {"critical", "major", "minor", "info"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_timezone(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_key(value: str) -> str:
    return _normalise_identifier(value).lower()


def _normalise_role(value: str) -> str:
    cleaned = value.strip().lower() or "consumer"
    if cleaned not in _ALLOWED_ENDPOINT_ROLES:
        raise ValueError(
            "role must be one of: " + ", ".join(sorted(_ALLOWED_ENDPOINT_ROLES))
        )
    return cleaned


def _normalise_status(value: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in _ALLOWED_SESSION_STATUSES:
        raise ValueError(
            "status must be one of: " + ", ".join(sorted(_ALLOWED_SESSION_STATUSES))
        )
    return cleaned


def _normalise_event(value: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in _ALLOWED_EVENT_TYPES:
        raise ValueError(
            "event must be one of: " + ", ".join(sorted(_ALLOWED_EVENT_TYPES))
        )
    return cleaned


def _normalise_direction(value: str | None) -> str:
    if value is None:
        return "neutral"
    cleaned = value.strip().lower()
    if cleaned not in _ALLOWED_DIRECTIONS:
        raise ValueError(
            "direction must be one of: " + ", ".join(sorted(_ALLOWED_DIRECTIONS))
        )
    return cleaned


def _normalise_severity(value: str) -> str:
    cleaned = value.strip().lower() or "major"
    if cleaned not in _ALLOWED_SEVERITIES:
        raise ValueError(
            "severity must be one of: " + ", ".join(sorted(_ALLOWED_SEVERITIES))
        )
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _coerce_positive_int(value: int | float | None) -> int:
    numeric = int(value or 0)
    if numeric < 0:
        raise ValueError("value must be non-negative")
    return numeric


def _coerce_positive_float(value: int | float | None) -> float | None:
    if value is None:
        return None
    numeric = float(value)
    if numeric < 0:
        raise ValueError("value must be non-negative")
    return numeric


def _validate_url(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("url must not be empty")
    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("url must include scheme and host")
    if parsed.scheme not in {"ws", "wss", "http", "https"}:
        raise ValueError("unsupported url scheme for websocket endpoint")
    return cleaned


def _generate_session_id() -> str:
    return uuid4().hex


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class WebSocketEndpoint:
    """Definition for a websocket endpoint participating in a mesh."""

    name: str
    url: str
    role: str = "consumer"
    description: str = ""
    requires_auth: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.url = _validate_url(self.url)
        self.role = _normalise_role(self.role)
        self.description = self.description.strip()
        self.requires_auth = bool(self.requires_auth)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def key(self) -> str:
        return _normalise_key(self.name)


@dataclass(slots=True)
class WebSocketSession:
    """Runtime telemetry for an individual websocket connection."""

    session_id: str
    endpoint: str
    client: str
    status: str = "connecting"
    connected_at: datetime | None = None
    last_event_at: datetime | None = None
    message_count: int = 0
    bytes_received: int = 0
    bytes_sent: int = 0
    error_count: int = 0
    heartbeat_lag_ms: float | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.session_id = _normalise_identifier(self.session_id)
        self.endpoint = _normalise_identifier(self.endpoint)
        self.client = _normalise_identifier(self.client)
        self.status = _normalise_status(self.status)
        self.connected_at = _ensure_timezone(self.connected_at)
        self.last_event_at = _ensure_timezone(self.last_event_at)
        self.message_count = _coerce_positive_int(self.message_count)
        self.bytes_received = _coerce_positive_int(self.bytes_received)
        self.bytes_sent = _coerce_positive_int(self.bytes_sent)
        self.error_count = _coerce_positive_int(self.error_count)
        self.heartbeat_lag_ms = _coerce_positive_float(self.heartbeat_lag_ms)
        self.metadata = _coerce_metadata(self.metadata)

    def is_active(self) -> bool:
        return self.status in {"connecting", "connected", "degraded"}


@dataclass(slots=True)
class WebSocketEvent:
    """Trace event describing websocket activity."""

    session_id: str
    endpoint: str
    event: str
    direction: str = "neutral"
    bytes_transferred: int = 0
    latency_ms: float | None = None
    recorded_at: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.session_id = _normalise_identifier(self.session_id)
        self.endpoint = _normalise_identifier(self.endpoint)
        self.event = _normalise_event(self.event)
        self.direction = _normalise_direction(self.direction)
        self.bytes_transferred = _coerce_positive_int(self.bytes_transferred)
        self.latency_ms = _coerce_positive_float(self.latency_ms)
        self.recorded_at = _ensure_timezone(self.recorded_at) or _utcnow()
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class WebSocketIncident:
    """Represents an outage or instability affecting websocket connectivity."""

    identifier: str
    endpoint: str
    severity: str = "major"
    summary: str = ""
    session_id: str | None = None
    occurred_at: datetime = field(default_factory=_utcnow)
    resolved_at: datetime | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.endpoint = _normalise_identifier(self.endpoint)
        if self.session_id is not None:
            self.session_id = _normalise_identifier(self.session_id)
        self.severity = _normalise_severity(self.severity)
        self.summary = self.summary.strip()
        self.occurred_at = _ensure_timezone(self.occurred_at) or _utcnow()
        self.resolved_at = _ensure_timezone(self.resolved_at)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def is_open(self) -> bool:
        return self.resolved_at is None

    def mark_resolved(self, *, when: datetime | None = None) -> None:
        self.resolved_at = _ensure_timezone(when) or _utcnow()


@dataclass(slots=True)
class WebSocketEndpointSnapshot:
    """Aggregated metrics describing endpoint health."""

    endpoint: str
    url: str
    role: str
    total_sessions: int
    active_sessions: int
    status_breakdown: Mapping[str, int]
    total_messages: int
    total_errors: int
    average_latency_ms: float | None
    average_heartbeat_ms: float | None
    last_activity: datetime | None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None


# ---------------------------------------------------------------------------
# orchestrator


class DynamicWebSocketOrchestrator:
    """Coordinates websocket endpoints and session telemetry."""

    def __init__(
        self,
        *,
        max_event_history: int = 500,
        max_incident_history: int = 200,
    ) -> None:
        if max_event_history <= 0:
            raise ValueError("max_event_history must be positive")
        if max_incident_history <= 0:
            raise ValueError("max_incident_history must be positive")
        self._endpoints: dict[str, WebSocketEndpoint] = {}
        self._sessions: dict[str, WebSocketSession] = {}
        self._endpoint_sessions: dict[str, set[str]] = {}
        self._events: Deque[WebSocketEvent] = deque(maxlen=max_event_history)
        self._incidents: Deque[WebSocketIncident] = deque(maxlen=max_incident_history)
        self._latency_samples: dict[str, Deque[float]] = {}

    # -- registration -------------------------------------------------
    def register_endpoint(
        self, endpoint: WebSocketEndpoint | Mapping[str, object]
    ) -> WebSocketEndpoint:
        coerced = self._coerce_endpoint(endpoint)
        self._endpoints[coerced.key] = coerced
        self._endpoint_sessions.setdefault(coerced.key, set())
        return coerced

    def register_endpoints(
        self, endpoints: Iterable[WebSocketEndpoint | Mapping[str, object]]
    ) -> None:
        for endpoint in endpoints:
            self.register_endpoint(endpoint)

    def get_endpoint(self, name: str) -> WebSocketEndpoint:
        key = _normalise_key(name)
        try:
            return self._endpoints[key]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown endpoint: {name}") from exc

    def list_endpoints(self) -> tuple[WebSocketEndpoint, ...]:
        return tuple(self._endpoints.values())

    # -- sessions -----------------------------------------------------
    def start_session(
        self,
        endpoint: str,
        *,
        client: str,
        session_id: str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> WebSocketSession:
        endpoint_ref = self.get_endpoint(endpoint)
        identifier = session_id.strip() if session_id else _generate_session_id()
        if identifier in self._sessions:
            raise ValueError(f"session already exists: {identifier}")
        now = _utcnow()
        session = WebSocketSession(
            session_id=identifier,
            endpoint=endpoint_ref.name,
            client=client,
            status="connecting",
            last_event_at=now,
            metadata=metadata,
        )
        self._sessions[identifier] = session
        self._endpoint_sessions.setdefault(endpoint_ref.key, set()).add(identifier)
        self._record_event(
            WebSocketEvent(
                session_id=identifier,
                endpoint=endpoint_ref.name,
                event="session_created",
                metadata=metadata,
            )
        )
        return session

    def get_session(self, session_id: str) -> WebSocketSession:
        identifier = _normalise_identifier(session_id)
        try:
            return self._sessions[identifier]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown session: {session_id}") from exc

    def list_sessions(self, endpoint: str | None = None) -> tuple[WebSocketSession, ...]:
        if endpoint is None:
            return tuple(self._sessions.values())
        endpoint_key = _normalise_key(endpoint)
        session_ids = self._endpoint_sessions.get(endpoint_key)
        if not session_ids:
            return ()
        return tuple(self._sessions[sid] for sid in session_ids)

    def mark_connected(
        self,
        session_id: str,
        *,
        metadata: Mapping[str, object] | None = None,
        when: datetime | None = None,
    ) -> WebSocketEvent:
        session = self.get_session(session_id)
        timestamp = _ensure_timezone(when) or _utcnow()
        session.status = "connected"
        session.connected_at = session.connected_at or timestamp
        session.last_event_at = timestamp
        event = WebSocketEvent(
            session_id=session.session_id,
            endpoint=session.endpoint,
            event="connected",
            metadata=metadata,
            recorded_at=timestamp,
        )
        self._record_event(event)
        return event

    def record_message(
        self,
        session_id: str,
        *,
        direction: str = "inbound",
        bytes_transferred: int = 0,
        latency_ms: float | None = None,
        metadata: Mapping[str, object] | None = None,
        when: datetime | None = None,
    ) -> WebSocketEvent:
        session = self.get_session(session_id)
        timestamp = _ensure_timezone(when) or _utcnow()
        normalised_direction = _normalise_direction(direction)
        volume = _coerce_positive_int(bytes_transferred)
        latency_value = _coerce_positive_float(latency_ms)
        session.message_count += 1
        if normalised_direction == "inbound":
            session.bytes_received += volume
        elif normalised_direction == "outbound":
            session.bytes_sent += volume
        session.last_event_at = timestamp
        if latency_value is not None:
            samples = self._latency_samples.setdefault(session.session_id, deque(maxlen=50))
            samples.append(latency_value)
        event = WebSocketEvent(
            session_id=session.session_id,
            endpoint=session.endpoint,
            event="message",
            direction=normalised_direction,
            bytes_transferred=volume,
            latency_ms=latency_value,
            metadata=metadata,
            recorded_at=timestamp,
        )
        self._record_event(event)
        if session.status == "connecting":
            session.status = "connected"
        return event

    def record_heartbeat(
        self,
        session_id: str,
        *,
        lag_ms: float | None = None,
        metadata: Mapping[str, object] | None = None,
        when: datetime | None = None,
    ) -> WebSocketEvent:
        session = self.get_session(session_id)
        timestamp = _ensure_timezone(when) or _utcnow()
        session.last_event_at = timestamp
        if lag_ms is not None:
            session.heartbeat_lag_ms = _coerce_positive_float(lag_ms)
        event = WebSocketEvent(
            session_id=session.session_id,
            endpoint=session.endpoint,
            event="heartbeat",
            metadata=metadata,
            recorded_at=timestamp,
        )
        self._record_event(event)
        return event

    def record_error(
        self,
        session_id: str,
        *,
        summary: str,
        severity: str = "major",
        fatal: bool = False,
        metadata: Mapping[str, object] | None = None,
        when: datetime | None = None,
    ) -> WebSocketIncident:
        session = self.get_session(session_id)
        timestamp = _ensure_timezone(when) or _utcnow()
        session.error_count += 1
        session.last_event_at = timestamp
        if fatal:
            session.status = "failed"
        elif session.status == "connected":
            session.status = "degraded"
        incident = WebSocketIncident(
            identifier=f"{session.session_id}-{timestamp.timestamp():.0f}",
            endpoint=session.endpoint,
            severity=severity,
            summary=summary,
            session_id=session.session_id,
            occurred_at=timestamp,
            metadata=metadata,
        )
        self._record_event(
            WebSocketEvent(
                session_id=session.session_id,
                endpoint=session.endpoint,
                event="error",
                metadata={"summary": summary, **(metadata or {})},
                recorded_at=timestamp,
            )
        )
        self._record_incident(incident)
        return incident

    def mark_status(
        self,
        session_id: str,
        *,
        status: str,
        metadata: Mapping[str, object] | None = None,
        when: datetime | None = None,
    ) -> WebSocketEvent:
        session = self.get_session(session_id)
        session.status = _normalise_status(status)
        timestamp = _ensure_timezone(when) or _utcnow()
        session.last_event_at = timestamp
        event = WebSocketEvent(
            session_id=session.session_id,
            endpoint=session.endpoint,
            event="status_change",
            metadata={"status": session.status, **(metadata or {})},
            recorded_at=timestamp,
        )
        self._record_event(event)
        return event

    def close_session(
        self,
        session_id: str,
        *,
        reason: str | None = None,
        metadata: Mapping[str, object] | None = None,
        when: datetime | None = None,
        drop: bool = False,
    ) -> WebSocketEvent:
        session = self.get_session(session_id)
        timestamp = _ensure_timezone(when) or _utcnow()
        session.status = "closed"
        session.last_event_at = timestamp
        event_metadata: dict[str, object] = {}
        if reason:
            event_metadata["reason"] = reason
        if metadata:
            event_metadata.update(dict(metadata))
        event = WebSocketEvent(
            session_id=session.session_id,
            endpoint=session.endpoint,
            event="closed",
            metadata=event_metadata or None,
            recorded_at=timestamp,
        )
        self._record_event(event)
        if drop:
            endpoint_key = _normalise_key(session.endpoint)
            self._endpoint_sessions.get(endpoint_key, set()).discard(session.session_id)
            self._sessions.pop(session.session_id, None)
            self._latency_samples.pop(session.session_id, None)
        return event

    # -- incidents ----------------------------------------------------
    def record_incident(
        self, incident: WebSocketIncident | Mapping[str, object]
    ) -> WebSocketIncident:
        coerced = self._coerce_incident(incident)
        self._record_incident(coerced)
        return coerced

    def resolve_incident(self, identifier: str, *, when: datetime | None = None) -> bool:
        target = _normalise_identifier(identifier)
        for incident in reversed(self._incidents):
            if incident.identifier == target:
                if incident.is_open:
                    incident.mark_resolved(when=when)
                return True
        return False

    def list_open_incidents(self) -> tuple[WebSocketIncident, ...]:
        return tuple(incident for incident in self._incidents if incident.is_open)

    def get_recent_incidents(self, limit: int = 20) -> tuple[WebSocketIncident, ...]:
        if limit <= 0:
            return ()
        incidents = list(self._incidents)
        return tuple(incidents[-limit:])

    # -- events -------------------------------------------------------
    def get_recent_events(self, limit: int = 50) -> tuple[WebSocketEvent, ...]:
        if limit <= 0:
            return ()
        events = list(self._events)
        return tuple(events[-limit:])

    # -- snapshots ----------------------------------------------------
    def snapshot_endpoints(self) -> tuple[WebSocketEndpointSnapshot, ...]:
        snapshots: list[WebSocketEndpointSnapshot] = []
        for key, endpoint in self._endpoints.items():
            session_ids = self._endpoint_sessions.get(key, set())
            sessions = [self._sessions[sid] for sid in session_ids]
            status_breakdown: MutableMapping[str, int] = {}
            total_messages = 0
            total_errors = 0
            last_activity: datetime | None = None
            heartbeat_samples: list[float] = []
            latency_samples: list[float] = []
            for session in sessions:
                status_breakdown[session.status] = (
                    status_breakdown.get(session.status, 0) + 1
                )
                total_messages += session.message_count
                total_errors += session.error_count
                if session.last_event_at is not None and (
                    last_activity is None or session.last_event_at > last_activity
                ):
                    last_activity = session.last_event_at
                if session.heartbeat_lag_ms is not None:
                    heartbeat_samples.append(session.heartbeat_lag_ms)
                latency_samples.extend(self._latency_samples.get(session.session_id, ()))
            snapshots.append(
                WebSocketEndpointSnapshot(
                    endpoint=endpoint.name,
                    url=endpoint.url,
                    role=endpoint.role,
                    total_sessions=len(sessions),
                    active_sessions=sum(1 for session in sessions if session.is_active()),
                    status_breakdown=dict(status_breakdown),
                    total_messages=total_messages,
                    total_errors=total_errors,
                    average_latency_ms=fmean(latency_samples) if latency_samples else None,
                    average_heartbeat_ms=
                        fmean(heartbeat_samples) if heartbeat_samples else None,
                    last_activity=last_activity,
                    tags=endpoint.tags,
                    metadata=endpoint.metadata,
                )
            )
        return tuple(snapshots)

    # -- internal helpers ---------------------------------------------
    def _record_event(self, event: WebSocketEvent) -> None:
        self._events.append(event)

    def _record_incident(self, incident: WebSocketIncident) -> None:
        self._incidents.append(incident)

    @staticmethod
    def _coerce_endpoint(
        endpoint: WebSocketEndpoint | Mapping[str, object]
    ) -> WebSocketEndpoint:
        if isinstance(endpoint, WebSocketEndpoint):
            return endpoint
        if isinstance(endpoint, Mapping):
            return WebSocketEndpoint(**endpoint)
        raise TypeError("endpoint must be WebSocketEndpoint or mapping")

    @staticmethod
    def _coerce_incident(
        incident: WebSocketIncident | Mapping[str, object]
    ) -> WebSocketIncident:
        if isinstance(incident, WebSocketIncident):
            return incident
        if isinstance(incident, Mapping):
            return WebSocketIncident(**incident)
        raise TypeError("incident must be WebSocketIncident or mapping")

