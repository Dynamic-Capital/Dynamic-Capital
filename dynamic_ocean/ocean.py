"""Dynamic ocean circulation analytics primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from math import sqrt
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "OceanEventSeverity",
    "OceanLayer",
    "OceanCurrent",
    "OceanSensor",
    "OceanEvent",
    "OceanSnapshot",
    "DynamicOcean",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _clamp(value: float | int, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _ensure_triplet(values: Sequence[float] | None, *, default_depth: float = 0.0) -> tuple[float, float, float]:
    if values is None:
        return (0.0, 0.0, default_depth)
    items = list(values)
    if len(items) not in {2, 3}:
        raise ValueError("spatial coordinates must contain two or three components")
    coords: list[float] = []
    for item in items:
        coords.append(float(item))
    if len(coords) == 2:
        coords.append(default_depth)
    return coords[0], coords[1], coords[2]


def _distance(a: Sequence[float], b: Sequence[float]) -> float:
    ax, ay, az = a
    bx, by, bz = b
    return sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2)


def _ensure_layer(value: OceanLayer | Mapping[str, object]) -> OceanLayer:
    if isinstance(value, OceanLayer):
        return value
    if isinstance(value, Mapping):
        return OceanLayer(**value)
    raise TypeError("layers must be OceanLayer instances or mappings")


def _ensure_current(value: OceanCurrent | Mapping[str, object]) -> OceanCurrent:
    if isinstance(value, OceanCurrent):
        return value
    if isinstance(value, Mapping):
        return OceanCurrent(**value)
    raise TypeError("currents must be OceanCurrent instances or mappings")


def _ensure_sensor(value: OceanSensor | Mapping[str, object]) -> OceanSensor:
    if isinstance(value, OceanSensor):
        return value
    if isinstance(value, Mapping):
        return OceanSensor(**value)
    raise TypeError("sensors must be OceanSensor instances or mappings")


# ---------------------------------------------------------------------------
# data models


class OceanEventSeverity(str, Enum):
    """Severity levels for ocean monitoring alerts."""

    INFO = "info"
    ADVISORY = "advisory"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(slots=True)
class OceanLayer:
    """Describes a stratified layer within the water column."""

    name: str
    depth_range: tuple[float, float]
    temperature_c: float
    salinity_psu: float
    oxygen_mg_l: float
    turbidity_ntu: float = 1.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        min_depth, max_depth = self.depth_range
        self.depth_range = (float(min_depth), float(max_depth))
        if self.depth_range[0] < 0 or self.depth_range[1] <= self.depth_range[0]:
            raise ValueError("depth_range must be an increasing pair of non-negative values")
        self.temperature_c = float(self.temperature_c)
        self.salinity_psu = float(self.salinity_psu)
        self.oxygen_mg_l = float(self.oxygen_mg_l)
        self.turbidity_ntu = max(float(self.turbidity_ntu), 0.0)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):  # pragma: no cover - guard
            raise TypeError("metadata must be a mapping if provided")

    def contains_depth(self, depth: float) -> bool:
        return self.depth_range[0] <= depth < self.depth_range[1]


@dataclass(slots=True)
class OceanCurrent:
    """Represents a coherent current influencing the observation zone."""

    name: str
    speed_mps: float
    direction: tuple[float, float, float]
    depth: float = 0.0
    origin: tuple[float, float, float] = field(default_factory=lambda: (0.0, 0.0, 0.0))
    influence_radius_km: float = 150.0
    temperature_delta: float = 0.0
    salinity_delta: float = 0.0
    oxygen_delta: float = 0.0
    turbulence_delta: float = 0.0
    variability: float = 0.1
    stability: float = 0.5

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.speed_mps = max(float(self.speed_mps), 0.0)
        self.direction = _ensure_triplet(self.direction)
        self.depth = max(float(self.depth), 0.0)
        self.origin = _ensure_triplet(self.origin, default_depth=self.depth)
        self.influence_radius_km = max(float(self.influence_radius_km), 0.0)
        self.temperature_delta = float(self.temperature_delta)
        self.salinity_delta = float(self.salinity_delta)
        self.oxygen_delta = float(self.oxygen_delta)
        self.turbulence_delta = float(self.turbulence_delta)
        self.variability = _clamp(float(self.variability), lower=0.0, upper=1.0)
        self.stability = _clamp(float(self.stability), lower=0.0, upper=1.0)


@dataclass(slots=True)
class OceanSensor:
    """Stationary sensor capturing conditions at a fixed point."""

    name: str
    position: tuple[float, float, float]
    sensitivity: float = 1.0
    detection_range: float = 100.0
    noise_floor: float = 0.01
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.position = _ensure_triplet(self.position)
        self.sensitivity = max(float(self.sensitivity), 0.0)
        self.detection_range = max(float(self.detection_range), 0.0)
        self.noise_floor = max(float(self.noise_floor), 0.0)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):  # pragma: no cover
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class OceanEvent:
    """Logged anomaly within the observed ocean region."""

    timestamp: datetime
    description: str
    severity: OceanEventSeverity
    impact: float
    location: tuple[float, float, float] | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.description = _normalise_identifier(self.description)
        if not isinstance(self.severity, OceanEventSeverity):
            self.severity = OceanEventSeverity(str(self.severity).lower())
        self.impact = max(float(self.impact), 0.0)
        if self.location is not None:
            self.location = _ensure_triplet(self.location)
        cleaned_tags: list[str] = []
        seen: set[str] = set()
        for tag in self.tags:
            cleaned = tag.strip().lower()
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                cleaned_tags.append(cleaned)
        self.tags = tuple(cleaned_tags)


@dataclass(slots=True)
class OceanSnapshot:
    """Synthesis of the ocean state at a specific instant."""

    timestamp: datetime
    layer: OceanLayer
    temperature_c: float
    salinity_psu: float
    oxygen_mg_l: float
    turbidity_ntu: float
    current_energy: float
    stability_index: float
    sensor_readings: Mapping[str, float]
    alerts: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        if not isinstance(self.sensor_readings, Mapping):  # pragma: no cover - guard
            raise TypeError("sensor_readings must be a mapping")
        self.temperature_c = float(self.temperature_c)
        self.salinity_psu = float(self.salinity_psu)
        self.oxygen_mg_l = float(self.oxygen_mg_l)
        self.turbidity_ntu = max(float(self.turbidity_ntu), 0.0)
        self.current_energy = max(float(self.current_energy), 0.0)
        self.stability_index = _clamp(float(self.stability_index), lower=0.0, upper=1.0)
        self.alerts = tuple(alert.strip() for alert in self.alerts if alert.strip())


# ---------------------------------------------------------------------------
# engine


class DynamicOcean:
    """Dynamic ocean manager orchestrating layers, currents, and sensors."""

    def __init__(self, *, max_history: int = 120) -> None:
        if max_history <= 0:
            raise ValueError("max_history must be positive")
        self._layers: MutableMapping[str, OceanLayer] = {}
        self._currents: MutableMapping[str, OceanCurrent] = {}
        self._sensors: MutableMapping[str, OceanSensor] = {}
        self._history: Deque[OceanSnapshot] = deque(maxlen=max_history)
        self._events: Deque[OceanEvent] = deque(maxlen=max_history * 2)
        self._default_layer: str | None = None

    @property
    def layers(self) -> Mapping[str, OceanLayer]:
        return dict(self._layers)

    @property
    def currents(self) -> Mapping[str, OceanCurrent]:
        return dict(self._currents)

    @property
    def sensors(self) -> Mapping[str, OceanSensor]:
        return dict(self._sensors)

    @property
    def history(self) -> Sequence[OceanSnapshot]:
        return tuple(self._history)

    @property
    def events(self) -> Sequence[OceanEvent]:
        return tuple(self._events)

    def register_layer(self, layer: OceanLayer | Mapping[str, object], *, default: bool = False) -> OceanLayer:
        resolved = _ensure_layer(layer)
        self._layers[resolved.name] = resolved
        if default or self._default_layer is None:
            self._default_layer = resolved.name
        return resolved

    def select_layer(self, name: str) -> OceanLayer:
        if name not in self._layers:
            raise KeyError(f"unknown layer '{name}'")
        self._default_layer = name
        return self._layers[name]

    def add_current(self, current: OceanCurrent | Mapping[str, object]) -> OceanCurrent:
        resolved = _ensure_current(current)
        self._currents[resolved.name] = resolved
        return resolved

    def remove_current(self, name: str) -> None:
        self._currents.pop(name, None)

    def add_sensor(self, sensor: OceanSensor | Mapping[str, object]) -> OceanSensor:
        resolved = _ensure_sensor(sensor)
        self._sensors[resolved.name] = resolved
        return resolved

    def remove_sensor(self, name: str) -> None:
        self._sensors.pop(name, None)

    def observe(
        self,
        *,
        depth: float,
        location: Sequence[float] | None = None,
        timestamp: datetime | None = None,
        layer: str | None = None,
    ) -> OceanSnapshot:
        if not self._layers:
            raise RuntimeError("no layers registered")
        if not self._sensors:
            raise RuntimeError("no sensors registered")

        depth_value = max(float(depth), 0.0)
        point = _ensure_triplet(location or (0.0, 0.0, depth_value), default_depth=depth_value)
        instant = timestamp or _utcnow()

        target_layer = self._resolve_layer(depth_value, layer)

        temperature = target_layer.temperature_c
        salinity = target_layer.salinity_psu
        oxygen = target_layer.oxygen_mg_l
        turbidity = target_layer.turbidity_ntu
        energy = 0.0
        stability = 1.0

        alerts: list[str] = []

        for current in tuple(self._currents.values()):
            influence = self._current_influence(current, point, depth_value)
            if influence <= 0.0:
                continue
            temperature += current.temperature_delta * influence
            salinity += current.salinity_delta * influence
            oxygen += current.oxygen_delta * influence
            turbidity += abs(current.turbulence_delta) * influence
            energy += (current.speed_mps ** 2) * influence
            stability *= 1.0 - min(current.variability * influence, 0.9)

        stability = max(0.0, min(1.0, stability))

        sensor_readings: dict[str, float] = {}
        for sensor in tuple(self._sensors.values()):
            reading = self._measure_sensor(
                sensor,
                point,
                depth_value,
                base_layer=target_layer,
                temperature=temperature,
                salinity=salinity,
                oxygen=oxygen,
                energy=energy,
            )
            sensor_readings[sensor.name] = reading
            if reading > sensor.noise_floor * 12:
                alerts.append(
                    f"sensor {sensor.name} detected energetic surge at {reading:.2f} arbitrary units"
                )

        if temperature - target_layer.temperature_c > 2.0:
            alerts.append("Surface warming above seasonal baseline.")
        if oxygen < max(3.5, target_layer.oxygen_mg_l * 0.6):
            alerts.append("Dissolved oxygen trending toward hypoxia.")
        if turbidity > target_layer.turbidity_ntu * 1.5:
            alerts.append("Elevated turbidity detected across monitoring grid.")
        if stability < 0.3:
            alerts.append("Circulation stability deteriorating; anticipate shear zones.")

        snapshot = OceanSnapshot(
            timestamp=instant,
            layer=target_layer,
            temperature_c=temperature,
            salinity_psu=salinity,
            oxygen_mg_l=oxygen,
            turbidity_ntu=turbidity,
            current_energy=energy,
            stability_index=stability,
            sensor_readings=sensor_readings,
            alerts=tuple(alerts),
        )

        self._history.append(snapshot)
        for alert in snapshot.alerts:
            severity = self._classify_alert(alert)
            self._events.append(
                OceanEvent(
                    timestamp=instant,
                    description=alert,
                    severity=severity,
                    impact=max(snapshot.current_energy ** 0.5, 0.1),
                    location=point,
                )
            )
        return snapshot

    def _resolve_layer(self, depth: float, requested: str | None) -> OceanLayer:
        if requested:
            requested = requested.strip()
            if requested:
                if requested not in self._layers:
                    raise KeyError(f"unknown layer '{requested}'")
                return self._layers[requested]
        for layer in self._layers.values():
            if layer.contains_depth(depth):
                return layer
        if self._default_layer and self._default_layer in self._layers:
            return self._layers[self._default_layer]
        return next(iter(self._layers.values()))

    def _current_influence(self, current: OceanCurrent, point: tuple[float, float, float], depth: float) -> float:
        if current.influence_radius_km <= 0.0:
            spatial_factor = 1.0
        else:
            distance = _distance(point, current.origin)
            spatial_factor = max(0.0, 1.0 - distance / max(current.influence_radius_km, 1e-6))
        depth_factor = max(0.0, 1.0 - abs(depth - current.depth) / (current.depth + 100.0))
        coherence = 0.5 + 0.5 * current.stability
        influence = spatial_factor * depth_factor * coherence
        return influence

    def _measure_sensor(
        self,
        sensor: OceanSensor,
        point: tuple[float, float, float],
        depth: float,
        *,
        base_layer: OceanLayer,
        temperature: float,
        salinity: float,
        oxygen: float,
        energy: float,
    ) -> float:
        distance = _distance(point, sensor.position)
        if sensor.detection_range <= 0.0:
            span_factor = 0.0
        else:
            span_factor = max(0.0, 1.0 - distance / sensor.detection_range)
        delta_temp = abs(temperature - base_layer.temperature_c)
        delta_salinity = abs(salinity - base_layer.salinity_psu)
        oxygen_stress = max(0.0, base_layer.oxygen_mg_l - oxygen)
        signal = (
            0.6 * delta_temp
            + 0.3 * delta_salinity
            + 0.5 * oxygen_stress
            + 0.2 * sqrt(max(energy, 0.0))
        )
        reading = sensor.noise_floor + span_factor * sensor.sensitivity * signal
        return max(reading, sensor.noise_floor)

    def decay_currents(self, factor: float) -> None:
        if factor <= 0:
            raise ValueError("factor must be positive")
        for name, current in list(self._currents.items()):
            decayed = replace(
                current,
                speed_mps=current.speed_mps * factor,
                temperature_delta=current.temperature_delta * factor,
                salinity_delta=current.salinity_delta * factor,
                oxygen_delta=current.oxygen_delta * factor,
                turbulence_delta=current.turbulence_delta * factor,
            )
            if decayed.speed_mps <= 1e-6:
                self._currents.pop(name)
            else:
                self._currents[name] = decayed

    def record_event(
        self,
        description: str,
        *,
        severity: OceanEventSeverity | str = OceanEventSeverity.INFO,
        impact: float,
        location: Sequence[float] | None = None,
    ) -> OceanEvent:
        event = OceanEvent(
            timestamp=_utcnow(),
            description=description,
            severity=severity,
            impact=impact,
            location=_ensure_triplet(location) if location is not None else None,
        )
        self._events.append(event)
        return event

    def recent_events(self, limit: int = 5) -> tuple[OceanEvent, ...]:
        if limit <= 0:
            return ()
        return tuple(list(self._events)[-limit:])

    def replay(self) -> Iterable[OceanSnapshot]:
        return tuple(self._history)

    def _classify_alert(self, alert: str) -> OceanEventSeverity:
        alert_lower = alert.lower()
        if "hypoxia" in alert_lower:
            return OceanEventSeverity.CRITICAL
        if "turbidity" in alert_lower or "surge" in alert_lower:
            return OceanEventSeverity.WARNING
        if "stability" in alert_lower:
            return OceanEventSeverity.ADVISORY
        return OceanEventSeverity.INFO
