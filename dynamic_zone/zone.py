"""Adaptive zone coordination utilities for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ZoneBoundary",
    "Zone",
    "ZoneEventType",
    "ZoneEvent",
    "ZoneSnapshot",
    "DynamicZoneRegistry",
    "ZoneNotFoundError",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_name(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("zone names must not be empty")
    return text


def _normalise_identifier(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("identifiers must not be empty")
    return text.lower()


def _coerce_float(value: float | int, *, field_name: str) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError(f"{field_name} must be numeric") from exc
    return numeric


def _coerce_int(value: int | float, *, field_name: str) -> int:
    if isinstance(value, bool):  # pragma: no cover - bool is subclass of int
        raise TypeError(f"{field_name} must be an integer")
    try:
        integer = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError(f"{field_name} must be an integer") from exc
    return integer


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        candidate = tag.strip().lower()
        if candidate and candidate not in seen:
            seen.add(candidate)
            cleaned.append(candidate)
    return tuple(cleaned)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_boundary(boundary: ZoneBoundary | Mapping[str, object]) -> ZoneBoundary:
    if isinstance(boundary, ZoneBoundary):
        return boundary
    if isinstance(boundary, Mapping):
        return ZoneBoundary(**boundary)
    raise TypeError("boundary must be a ZoneBoundary or mapping")


def _coerce_position(
    position: Sequence[float] | Mapping[str, float], *, altitude: float | None
) -> tuple[float, float, float]:
    if isinstance(position, Mapping):
        try:
            x_value = position["x"]
            y_value = position["y"]
        except KeyError as exc:
            raise ValueError("position mappings must define 'x' and 'y' keys") from exc
        z_value = position.get("z", altitude if altitude is not None else 0.0)
        return (
            _coerce_float(x_value, field_name="position.x"),
            _coerce_float(y_value, field_name="position.y"),
            _coerce_float(z_value, field_name="position.z"),
        )
    items = list(position)
    if len(items) < 2:
        raise ValueError("position sequences must provide at least two values")
    x_value = _coerce_float(items[0], field_name="position[0]")
    y_value = _coerce_float(items[1], field_name="position[1]")
    if len(items) >= 3:
        z_value = _coerce_float(items[2], field_name="position[2]")
    elif altitude is not None:
        z_value = _coerce_float(altitude, field_name="altitude")
    else:
        z_value = 0.0
    return x_value, y_value, z_value


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class ZoneBoundary:
    """Represents a spatial boundary for a zone in Cartesian coordinates."""

    min_x: float
    max_x: float
    min_y: float
    max_y: float
    min_z: float = 0.0
    max_z: float = 0.0
    coordinate_system: str = "cartesian"

    def __post_init__(self) -> None:
        self.min_x = _coerce_float(self.min_x, field_name="min_x")
        self.max_x = _coerce_float(self.max_x, field_name="max_x")
        self.min_y = _coerce_float(self.min_y, field_name="min_y")
        self.max_y = _coerce_float(self.max_y, field_name="max_y")
        self.min_z = _coerce_float(self.min_z, field_name="min_z")
        self.max_z = _coerce_float(self.max_z, field_name="max_z")
        if self.min_x > self.max_x:
            raise ValueError("min_x must be less than or equal to max_x")
        if self.min_y > self.max_y:
            raise ValueError("min_y must be less than or equal to max_y")
        if self.min_z > self.max_z:
            raise ValueError("min_z must be less than or equal to max_z")
        self.coordinate_system = _normalise_identifier(self.coordinate_system)

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    @property
    def height(self) -> float:
        return self.max_y - self.min_y

    @property
    def depth(self) -> float:
        return self.max_z - self.min_z

    def area(self) -> float:
        return self.width * self.height

    def volume(self) -> float:
        depth = max(self.depth, 0.0)
        if depth == 0.0:
            return self.area()
        return self.area() * depth

    def contains(
        self,
        position: Sequence[float] | Mapping[str, float],
        *,
        altitude: float | None = None,
    ) -> bool:
        x_value, y_value, z_value = _coerce_position(position, altitude=altitude)
        return (
            self.min_x <= x_value <= self.max_x
            and self.min_y <= y_value <= self.max_y
            and self.min_z <= z_value <= self.max_z
        )


@dataclass(slots=True)
class Zone:
    """Represents an adaptive zone with a boundary and live metrics."""

    name: str
    boundary: ZoneBoundary
    capacity: int = 1
    sensitivity: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.boundary = _coerce_boundary(self.boundary)
        self.capacity = max(_coerce_int(self.capacity, field_name="capacity"), 0)
        self.sensitivity = min(max(float(self.sensitivity), 0.0), 1.0)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


class ZoneEventType(str, Enum):
    """Enumeration of supported zone event types."""

    ENTER = "enter"
    EXIT = "exit"
    SAMPLE = "sample"
    ALERT = "alert"

    @classmethod
    def coerce(cls, value: "ZoneEventType | str") -> "ZoneEventType":
        if isinstance(value, cls):
            return value
        return cls(str(value).lower())


@dataclass(slots=True)
class ZoneEvent:
    """Represents a state transition or measurement emitted by a zone."""

    zone: str
    kind: ZoneEventType
    change: int = 0
    value: float | None = None
    note: str | None = None
    metadata: Mapping[str, object] | None = None
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.zone = _normalise_name(self.zone)
        self.kind = ZoneEventType.coerce(self.kind)
        self.change = _coerce_int(self.change, field_name="change")
        if self.value is not None:
            self.value = _coerce_float(self.value, field_name="value")
        self.metadata = _coerce_mapping(self.metadata)
        if self.note is not None:
            self.note = self.note.strip() or None
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class ZoneSnapshot:
    """Snapshot of a zone's utilisation and recent activity."""

    zone: Zone
    generated_at: datetime
    occupancy: int
    utilisation: float
    status: str
    metric: float | None = None
    recent_events: tuple[ZoneEvent, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if self.generated_at.tzinfo is None:
            self.generated_at = self.generated_at.replace(tzinfo=timezone.utc)
        else:
            self.generated_at = self.generated_at.astimezone(timezone.utc)
        self.occupancy = max(_coerce_int(self.occupancy, field_name="occupancy"), 0)
        self.utilisation = max(float(self.utilisation), 0.0)
        if self.metric is not None:
            self.metric = _coerce_float(self.metric, field_name="metric")
        self.status = _normalise_identifier(self.status)
        self.recent_events = tuple(self.recent_events)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "zone": self.zone.name,
            "generated_at": self.generated_at.isoformat(),
            "occupancy": self.occupancy,
            "capacity": self.zone.capacity,
            "utilisation": self.utilisation,
            "status": self.status,
            "metric": self.metric,
            "tags": list(self.zone.tags),
        }


# ---------------------------------------------------------------------------
# registry


class ZoneNotFoundError(KeyError):
    """Raised when attempting to operate on an unknown zone."""


@dataclass(slots=True)
class _ZoneRuntime:
    zone: Zone
    occupancy: int = 0
    metric: float | None = None
    last_event: ZoneEvent | None = None
    last_updated: datetime | None = None
    history: Deque[ZoneEvent] = field(default_factory=deque)


class DynamicZoneRegistry:
    """Runtime registry for tracking adaptive zones and their utilisation."""

    def __init__(
        self,
        *,
        history: int = 128,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be a positive integer")
        self._history_limit = int(history)
        self._zones: dict[str, Zone] = {}
        self._states: dict[str, _ZoneRuntime] = {}
        self._now = now or _utcnow

    # zone lifecycle -----------------------------------------------------

    def register_zone(self, zone: Zone | Mapping[str, object]) -> Zone:
        instance = self._coerce_zone(zone)
        self._zones[instance.name] = instance
        runtime = self._states.get(instance.name)
        if runtime is None:
            runtime = _ZoneRuntime(zone=instance)
            runtime.history = deque(maxlen=self._history_limit)
            self._states[instance.name] = runtime
        else:
            runtime.zone = instance
            if runtime.history.maxlen != self._history_limit:
                runtime.history = deque(runtime.history, maxlen=self._history_limit)
        return instance

    def register_zones(self, zones: Iterable[Zone | Mapping[str, object]]) -> list[Zone]:
        registered: list[Zone] = []
        for zone in zones:
            registered.append(self.register_zone(zone))
        return registered

    def remove_zone(self, zone_name: str) -> None:
        name = _normalise_name(zone_name)
        self._zones.pop(name, None)
        self._states.pop(name, None)

    def list_zones(self) -> tuple[Zone, ...]:
        return tuple(self._zones.values())

    # event handling -----------------------------------------------------

    def record_event(
        self,
        zone: str,
        *,
        kind: ZoneEventType | str,
        change: int = 0,
        value: float | int | None = None,
        note: str | None = None,
        metadata: Mapping[str, object] | None = None,
        timestamp: datetime | None = None,
    ) -> ZoneEvent:
        runtime = self._get_runtime(zone)
        event_kind = ZoneEventType.coerce(kind)
        actual_change = _coerce_int(change, field_name="change")
        if event_kind is ZoneEventType.ENTER and actual_change == 0:
            actual_change = 1
        elif event_kind is ZoneEventType.EXIT and actual_change == 0:
            actual_change = -1
        elif event_kind not in (ZoneEventType.ENTER, ZoneEventType.EXIT):
            actual_change = actual_change
        if event_kind is ZoneEventType.EXIT:
            # exits reduce occupancy but should not make it negative
            new_occupancy = max(runtime.occupancy + actual_change, 0)
        else:
            new_occupancy = max(runtime.occupancy + actual_change, 0)
        runtime.occupancy = new_occupancy
        metric_value: float | None
        if value is None:
            metric_value = runtime.metric
        else:
            metric_value = _coerce_float(value, field_name="value")
            runtime.metric = metric_value
        event = ZoneEvent(
            zone=runtime.zone.name,
            kind=event_kind,
            change=actual_change,
            value=metric_value,
            note=note,
            metadata=metadata,
            timestamp=timestamp or self._now(),
        )
        runtime.last_event = event
        runtime.last_updated = event.timestamp
        runtime.history.append(event)
        return event

    # interrogation ------------------------------------------------------

    def contains(
        self,
        zone: str,
        position: Sequence[float] | Mapping[str, float],
        *,
        altitude: float | None = None,
    ) -> bool:
        runtime = self._get_runtime(zone)
        return runtime.zone.boundary.contains(position, altitude=altitude)

    def utilisation(self, zone: str) -> float:
        runtime = self._get_runtime(zone)
        capacity = runtime.zone.capacity
        if capacity <= 0:
            return float(runtime.occupancy)
        return runtime.occupancy / float(capacity)

    def snapshot(self, zone: str | None = None) -> ZoneSnapshot | dict[str, ZoneSnapshot]:
        if zone is None:
            return {name: self._build_snapshot(state) for name, state in self._states.items()}
        runtime = self._get_runtime(zone)
        return self._build_snapshot(runtime)

    # internals ----------------------------------------------------------

    def _coerce_zone(self, zone: Zone | Mapping[str, object]) -> Zone:
        if isinstance(zone, Zone):
            return zone
        if isinstance(zone, Mapping):
            return Zone(**zone)
        raise TypeError("zones must be Zone instances or mappings")

    def _get_runtime(self, zone: str) -> _ZoneRuntime:
        name = _normalise_name(zone)
        runtime = self._states.get(name)
        if runtime is None:
            if name in self._zones:
                # lazily rebuild runtime if it was evicted
                runtime = _ZoneRuntime(zone=self._zones[name])
                runtime.history = deque(maxlen=self._history_limit)
                self._states[name] = runtime
            else:
                raise ZoneNotFoundError(f"zone '{zone}' is not registered")
        return runtime

    def _build_snapshot(self, runtime: _ZoneRuntime) -> ZoneSnapshot:
        capacity = runtime.zone.capacity
        utilisation = self.utilisation(runtime.zone.name)
        if runtime.occupancy == 0:
            status = "idle"
        elif capacity > 0 and runtime.occupancy > capacity:
            status = "overloaded"
        else:
            status = "active"
        recent_events = tuple(runtime.history)
        return ZoneSnapshot(
            zone=runtime.zone,
            generated_at=self._now(),
            occupancy=runtime.occupancy,
            utilisation=utilisation,
            status=status,
            metric=runtime.metric,
            recent_events=recent_events,
        )
