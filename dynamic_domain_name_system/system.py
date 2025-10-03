"""Self-contained dynamic domain name system orchestration.

This module provides an in-memory authority that can ingest DNS records, keep
track of their health, and serve resolution responses that adapt to runtime
signals.  The goal is to model how Dynamic Capital could wire a thin control
plane for DNS failover and latency-aware routing without depending on a full
external provider.  The implementation keeps all state in Python data
structures, making it suitable for unit testing and simulation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Dict, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "DNSRecord",
    "DynamicDomainNameSystem",
    "DynamicDNSError",
    "RecordNotFoundError",
    "Resolution",
    "ZoneNotFoundError",
    "ZoneSnapshot",
]


# ---------------------------------------------------------------------------
# exceptions


class DynamicDNSError(RuntimeError):
    """Base error for dynamic DNS operations."""


class ZoneNotFoundError(DynamicDNSError):
    """Raised when the requested zone is not registered."""


class RecordNotFoundError(DynamicDNSError):
    """Raised when a specific record cannot be located."""


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_zone(zone: str) -> str:
    value = str(zone).strip().lower().rstrip(".")
    if not value:
        raise DynamicDNSError("zone must not be empty")
    return value


def _normalise_hostname(name: str, zone: str) -> tuple[str, str]:
    zone_name = _normalise_zone(zone)
    label = str(name).strip().lower()
    if not label or label == "@":
        return "@", zone_name
    if label.endswith("."):
        fqdn = label.rstrip(".")
        if fqdn.endswith(zone_name):
            suffix = fqdn[: -len(zone_name)].rstrip(".")
            return suffix or "@", fqdn
        return fqdn, fqdn
    fqdn = f"{label}.{zone_name}"
    return label, fqdn


def _normalise_record_type(record_type: str) -> str:
    value = str(record_type).strip().upper()
    if not value:
        raise DynamicDNSError("record type must not be empty")
    return value


def _normalise_value(value: str) -> str:
    normalised = str(value).strip()
    if not normalised:
        raise DynamicDNSError("record value must not be empty")
    return normalised


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = str(tag).strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _ensure_metadata(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise DynamicDNSError("metadata must be a mapping")
    return dict(metadata)


# ---------------------------------------------------------------------------
# data classes


@dataclass(slots=True)
class DNSRecord:
    """Configuration for a DNS resource record entry."""

    name: str
    type: str
    value: str
    ttl: int = 300
    priority: int | None = None
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = str(self.name).strip().lower() or "@"
        self.type = _normalise_record_type(self.type)
        self.value = _normalise_value(self.value)
        self.ttl = int(self.ttl)
        if self.ttl <= 0:
            raise DynamicDNSError("ttl must be positive")
        if self.priority is not None:
            self.priority = int(self.priority)
            if self.priority < 0:
                raise DynamicDNSError("priority must be non-negative")
        self.weight = float(self.weight)
        if self.weight < 0.0:
            raise DynamicDNSError("weight must be non-negative")
        self.tags = _normalise_tags(self.tags)
        self.metadata = _ensure_metadata(self.metadata)


@dataclass(slots=True, frozen=True)
class Resolution:
    """Outcome returned by :meth:`DynamicDomainNameSystem.resolve`."""

    zone: str
    name: str
    fqdn: str
    type: str
    value: str
    ttl: int
    priority: int | None
    weight: float
    healthy: bool
    success_score: float
    latency_ms: float
    tags: tuple[str, ...]
    metadata: Mapping[str, object]


@dataclass(slots=True, frozen=True)
class RecordSnapshot:
    """Inspection data for an individual record state."""

    zone: str
    name: str
    fqdn: str
    type: str
    value: str
    ttl: int
    effective_ttl: int
    priority: int | None
    weight: float
    healthy: bool
    success_score: float
    latency_ms: float
    observations: int
    last_failure_at: datetime | None
    tags: tuple[str, ...]
    metadata: Mapping[str, object]
    updated_at: datetime


@dataclass(slots=True, frozen=True)
class ZoneSnapshot:
    """Read-only snapshot of a zone state."""

    zone: str
    generated_at: datetime
    records: tuple[RecordSnapshot, ...]


# ---------------------------------------------------------------------------
# internal state containers


@dataclass(slots=True)
class _RecordState:
    zone: str
    name: str
    fqdn: str
    record: DNSRecord
    decay: float
    default_latency: float
    success_threshold: float
    failure_threshold: float
    min_ttl: int
    max_ttl: int
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    success_ewma: float = 1.0
    latency_ewma: float = field(init=False)
    healthy: bool = True
    observations: int = 0
    last_failure_at: datetime | None = None

    def __post_init__(self) -> None:
        self.latency_ewma = self.default_latency

    # ------------------------------------------------------------------ helpers
    def replace(self, record: DNSRecord, now: datetime) -> None:
        self.record = record
        self.updated_at = now

    def observe(self, *, success: bool, latency_ms: float | None, now: datetime) -> None:
        self.observations += 1
        score = 1.0 if success else 0.0
        decay = self.decay
        self.success_ewma = ((1.0 - decay) * self.success_ewma) + (decay * score)
        if latency_ms is not None:
            latency = max(float(latency_ms), 1.0)
            self.latency_ewma = ((1.0 - decay) * self.latency_ewma) + (decay * latency)
        self.updated_at = now
        if success:
            if self.success_ewma >= self.success_threshold:
                self.healthy = True
        else:
            self.last_failure_at = now
            if self.success_ewma <= self.failure_threshold:
                self.healthy = False

    def score(self) -> float:
        health = self.success_ewma
        if not self.healthy:
            health *= 0.25
        latency_factor = 1.0 / (1.0 + max(self.latency_ewma, 1.0) / self.default_latency)
        return max(0.0, self.record.weight) * health * latency_factor

    def effective_ttl(self) -> int:
        base = max(self.min_ttl, min(self.max_ttl, self.record.ttl))
        multiplier = 0.5 + (0.5 * self.success_ewma)
        if not self.healthy:
            multiplier = max(0.25, self.success_ewma)
        ttl = int(round(base * multiplier))
        return max(self.min_ttl, min(self.max_ttl, ttl))

    def snapshot(self) -> RecordSnapshot:
        return RecordSnapshot(
            zone=self.zone,
            name=self.name,
            fqdn=self.fqdn,
            type=self.record.type,
            value=self.record.value,
            ttl=self.record.ttl,
            effective_ttl=self.effective_ttl(),
            priority=self.record.priority,
            weight=self.record.weight,
            healthy=self.healthy,
            success_score=self.success_ewma,
            latency_ms=self.latency_ewma,
            observations=self.observations,
            last_failure_at=self.last_failure_at,
            tags=self.record.tags,
            metadata=MappingProxyType(dict(self.record.metadata)),
            updated_at=self.updated_at,
        )


@dataclass(slots=True)
class _ZoneState:
    name: str
    records: Dict[tuple[str, str, str], _RecordState] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# main orchestrator


class DynamicDomainNameSystem:
    """In-memory orchestrator for DNS records and adaptive routing."""

    def __init__(
        self,
        *,
        decay: float = 0.3,
        success_threshold: float = 0.65,
        failure_threshold: float = 0.25,
        default_latency_ms: float = 40.0,
        min_ttl: int = 20,
        max_ttl: int = 7200,
    ) -> None:
        if not 0.0 < decay <= 1.0:
            raise DynamicDNSError("decay must be in the range (0, 1]")
        self._decay = float(decay)
        self._success_threshold = float(success_threshold)
        self._failure_threshold = float(failure_threshold)
        self._default_latency = max(float(default_latency_ms), 1.0)
        self._min_ttl = max(int(min_ttl), 1)
        self._max_ttl = max(int(max_ttl), self._min_ttl)
        self._zones: Dict[str, _ZoneState] = {}

    # ------------------------------------------------------------------ zone mgmt
    def register(self, zone: str) -> None:
        zone_name = _normalise_zone(zone)
        self._zones.setdefault(zone_name, _ZoneState(name=zone_name))

    def _get_zone(self, zone: str) -> _ZoneState:
        zone_name = _normalise_zone(zone)
        try:
            return self._zones[zone_name]
        except KeyError as exc:
            raise ZoneNotFoundError(f"zone '{zone_name}' is not registered") from exc

    def upsert(self, zone: str, record: DNSRecord) -> None:
        zone_name = _normalise_zone(zone)
        zone_state = self._zones.setdefault(zone_name, _ZoneState(name=zone_name))
        name, fqdn = _normalise_hostname(record.name, zone_name)
        now = _utcnow()
        key = (name, record.type, record.value)
        state = zone_state.records.get(key)
        if state is None:
            state = _RecordState(
                zone=zone_name,
                name=name,
                fqdn=fqdn,
                record=record,
                decay=self._decay,
                default_latency=self._default_latency,
                success_threshold=self._success_threshold,
                failure_threshold=self._failure_threshold,
                min_ttl=self._min_ttl,
                max_ttl=self._max_ttl,
            )
            zone_state.records[key] = state
        else:
            state.replace(record, now)

    def remove(
        self,
        zone: str,
        name: str,
        record_type: str,
        *,
        value: str | None = None,
    ) -> None:
        zone_state = self._get_zone(zone)
        normalised_type = _normalise_record_type(record_type)
        normalised_name, _ = _normalise_hostname(name, zone_state.name)
        removed = False
        keys = list(zone_state.records.keys())
        for key in keys:
            record_name, record_type_key, record_value = key
            if record_name != normalised_name or record_type_key != normalised_type:
                continue
            if value is not None and record_value != _normalise_value(value):
                continue
            del zone_state.records[key]
            removed = True
        if not removed:
            raise RecordNotFoundError(
                f"record '{normalised_name} {normalised_type}' not found in zone '{zone_state.name}'"
            )
        if not zone_state.records:
            del self._zones[zone_state.name]

    # ------------------------------------------------------------------ resolution
    def resolve(
        self,
        zone: str,
        name: str,
        record_type: str,
        *,
        limit: int | None = None,
        include_unhealthy: bool = False,
    ) -> list[Resolution]:
        zone_state = self._get_zone(zone)
        normalised_type = _normalise_record_type(record_type)
        normalised_name, fqdn = _normalise_hostname(name, zone_state.name)
        states = [
            state
            for (record_name, record_type_key, _), state in zone_state.records.items()
            if record_name == normalised_name and record_type_key == normalised_type
        ]
        if not states:
            raise RecordNotFoundError(
                f"record '{normalised_name} {normalised_type}' not found in zone '{zone_state.name}'"
            )

        by_priority: Dict[int, list[_RecordState]] = {}
        for state in states:
            priority = state.record.priority if state.record.priority is not None else 0
            by_priority.setdefault(priority, []).append(state)

        selected: list[_RecordState] = []
        fallback: list[_RecordState] = []
        for priority in sorted(by_priority):
            group = by_priority[priority]
            healthy = [state for state in group if state.healthy]
            if healthy:
                selected = healthy
                break
            if not fallback:
                # keep the best available group to ensure the domain stays routable
                fallback = list(group)

        if not selected:
            if include_unhealthy:
                # no healthy records, fall back to every candidate regardless of health
                selected = [state for states in by_priority.values() for state in states]
            else:
                selected = fallback

        if not selected:
            return []

        ordered = sorted(selected, key=lambda state: (-state.score(), state.record.value))
        if limit is not None and limit > 0:
            ordered = ordered[: int(limit)]

        results: list[Resolution] = []
        for state in ordered:
            results.append(
                Resolution(
                    zone=zone_state.name,
                    name=state.name,
                    fqdn=state.fqdn,
                    type=state.record.type,
                    value=state.record.value,
                    ttl=state.effective_ttl(),
                    priority=state.record.priority,
                    weight=state.record.weight,
                    healthy=state.healthy,
                    success_score=state.success_ewma,
                    latency_ms=state.latency_ewma,
                    tags=state.record.tags,
                    metadata=MappingProxyType(dict(state.record.metadata)),
                )
            )
        return results

    # ------------------------------------------------------------------ feedback loop
    def observe(
        self,
        zone: str,
        name: str,
        record_type: str,
        value: str,
        *,
        success: bool,
        latency_ms: float | None = None,
        timestamp: datetime | None = None,
    ) -> None:
        zone_state = self._get_zone(zone)
        normalised_type = _normalise_record_type(record_type)
        normalised_name, _ = _normalise_hostname(name, zone_state.name)
        key = (normalised_name, normalised_type, _normalise_value(value))
        try:
            state = zone_state.records[key]
        except KeyError as exc:
            raise RecordNotFoundError(
                f"record '{normalised_name} {normalised_type}' with value '{value}' not found"
            ) from exc
        state.observe(success=success, latency_ms=latency_ms, now=timestamp or _utcnow())

    # ------------------------------------------------------------------ inspection
    def zones(self) -> Iterator[str]:
        for zone_name in sorted(self._zones):
            yield zone_name

    def snapshot(self, zone: str | None = None) -> ZoneSnapshot | dict[str, ZoneSnapshot]:
        if zone is not None:
            zone_state = self._get_zone(zone)
            return self._snapshot_zone(zone_state)
        return {zone_name: self._snapshot_zone(zone_state) for zone_name, zone_state in self._zones.items()}

    def _snapshot_zone(self, zone_state: _ZoneState) -> ZoneSnapshot:
        generated = _utcnow()
        records = tuple(
            sorted(
                (state.snapshot() for state in zone_state.records.values()),
                key=lambda snap: (snap.name, snap.type, snap.value),
            )
        )
        return ZoneSnapshot(zone=zone_state.name, generated_at=generated, records=records)
