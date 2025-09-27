"""Dynamic atmosphere orchestration with adaptive stability modelling."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "AtmosphericComponent",
    "AtmosphericLayerState",
    "AtmosphericObservation",
    "AtmosphericSnapshot",
    "AtmosphericAlertSeverity",
    "AtmosphericAlert",
    "DynamicAtmosphere",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(identifier: str) -> str:
    text = str(identifier).strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _clamp01(value: float | int | None, *, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if numeric != numeric or numeric in {float("inf"), float("-inf")}:
        return default
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric


def _normalise_range(values: Sequence[float], *, minimum_span: float = 0.01) -> tuple[float, float]:
    if len(values) != 2:
        raise ValueError("range must contain exactly two values")
    low, high = float(values[0]), float(values[1])
    if high < low:
        low, high = high, low
    if high - low < minimum_span:
        high = low + minimum_span
    return (low, high)


def _normalise_sources(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in values:
        cleaned = item.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _scale_mixing_ratios(components: MutableMapping[str, "AtmosphericComponent"]) -> None:
    total = sum(component.mixing_ratio for component in components.values())
    if total <= 1.0 or not components:
        return
    scale = 1.0 / total
    for name, component in list(components.items()):
        components[name] = component.with_mixing_ratio(component.mixing_ratio * scale)


def _mean(values: Iterable[float]) -> float:
    data = list(values)
    if not data:
        return 0.0
    return float(fmean(data))


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class AtmosphericComponent:
    """Representation of a constituent within an atmospheric layer."""

    name: str
    mixing_ratio: float
    reactivity: float = 0.0
    sources: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.mixing_ratio = _clamp01(self.mixing_ratio)
        self.reactivity = _clamp01(self.reactivity)
        self.sources = _normalise_sources(self.sources)

    def with_mixing_ratio(self, value: float) -> "AtmosphericComponent":
        return replace(self, mixing_ratio=_clamp01(value, default=self.mixing_ratio))

    def with_reactivity(self, value: float) -> "AtmosphericComponent":
        return replace(self, reactivity=_clamp01(value, default=self.reactivity))


@dataclass(slots=True)
class AtmosphericLayerState:
    """Current state for a discrete atmospheric layer."""

    identifier: str
    altitude_range_km: tuple[float, float]
    thermal_band_c: tuple[float, float]
    temperature_c: float
    humidity: float
    components: tuple[AtmosphericComponent, ...] = field(default_factory=tuple)
    stability_index: float = 0.5
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.altitude_range_km = _normalise_range(self.altitude_range_km)
        self.thermal_band_c = _normalise_range(self.thermal_band_c, minimum_span=0.1)
        self.temperature_c = float(self.temperature_c)
        self.humidity = _clamp01(self.humidity, default=0.5)
        normalised_components: list[AtmosphericComponent] = []
        for component in self.components:
            if isinstance(component, AtmosphericComponent):
                normalised_components.append(component)
            elif isinstance(component, Mapping):
                normalised_components.append(AtmosphericComponent(**component))
            else:
                raise TypeError("components must be AtmosphericComponent instances or mappings")
        self.components = tuple(sorted(normalised_components, key=lambda comp: comp.name.lower()))
        self.stability_index = _clamp01(self.stability_index, default=0.5)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def evaluate_stability(self, *, temperature_c: float | None = None, humidity: float | None = None, components: Sequence[AtmosphericComponent] | None = None) -> float:
        target_temperature = float(self.temperature_c if temperature_c is None else temperature_c)
        target_humidity = _clamp01(self.humidity if humidity is None else humidity, default=self.humidity)
        active_components = tuple(self.components if components is None else components)

        low, high = self.thermal_band_c
        midpoint = (low + high) / 2.0
        half_span = max((high - low) / 2.0, 0.1)
        temperature_score = 1.0 - min(1.0, abs(target_temperature - midpoint) / half_span)

        humidity_score = 1.0 - min(1.0, abs(target_humidity - 0.5) * 2.0)

        reactivity_score = 1.0 - min(1.0, sum(component.mixing_ratio * component.reactivity for component in active_components))

        stability = 0.4 * temperature_score + 0.3 * humidity_score + 0.3 * reactivity_score
        return max(0.0, min(1.0, stability))

    def update_from_observation(self, observation: "AtmosphericObservation") -> "AtmosphericLayerState":
        temperature = float(observation.temperature_c if observation.temperature_c is not None else self.temperature_c)
        humidity = _clamp01(observation.humidity, default=self.humidity)

        components_map: dict[str, AtmosphericComponent] = {component.name: component for component in self.components}
        for name, ratio in observation.mixing_ratios.items():
            component_name = _normalise_identifier(name)
            baseline = components_map[component_name].mixing_ratio if component_name in components_map else 0.0
            updated_ratio = _clamp01(ratio, default=baseline)
            if component_name in components_map:
                components_map[component_name] = components_map[component_name].with_mixing_ratio(updated_ratio)
            else:
                components_map[component_name] = AtmosphericComponent(component_name, updated_ratio)
        _scale_mixing_ratios(components_map)

        sorted_components = tuple(sorted(components_map.values(), key=lambda component: component.name.lower()))
        stability_index = self.evaluate_stability(temperature_c=temperature, humidity=humidity, components=sorted_components)
        return replace(self, temperature_c=temperature, humidity=humidity, components=sorted_components, stability_index=stability_index)


@dataclass(slots=True)
class AtmosphericObservation:
    """Sensor observation for a specific atmospheric layer."""

    layer: str
    timestamp: datetime = field(default_factory=_utcnow)
    temperature_c: float | None = None
    humidity: float | None = None
    mixing_ratios: Mapping[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.layer = _normalise_identifier(self.layer)
        self.timestamp = _ensure_tzaware(self.timestamp)
        if self.temperature_c is not None:
            self.temperature_c = float(self.temperature_c)
        if self.humidity is not None:
            self.humidity = _clamp01(self.humidity)
        self.mixing_ratios = {
            _normalise_identifier(name): _clamp01(value)
            for name, value in dict(self.mixing_ratios).items()
        }


@dataclass(slots=True)
class AtmosphericSnapshot:
    """Snapshot of the entire atmospheric system at a point in time."""

    timestamp: datetime
    layers: tuple[AtmosphericLayerState, ...]


class AtmosphericAlertSeverity(Enum):
    """Severity levels for atmospheric alerts."""

    NORMAL = "normal"
    ADVISORY = "advisory"
    WATCH = "watch"
    WARNING = "warning"


@dataclass(slots=True)
class AtmosphericAlert:
    """Actionable alert generated from atmospheric conditions."""

    severity: AtmosphericAlertSeverity
    layer: str
    message: str
    stability_index: float
    timestamp: datetime = field(default_factory=_utcnow)


# ---------------------------------------------------------------------------
# dynamic atmosphere controller


class DynamicAtmosphere:
    """Coordinator for atmospheric layers and their evolving state."""

    def __init__(self, layers: Iterable[AtmosphericLayerState] | None = None, *, history_limit: int = 256) -> None:
        self._layers: dict[str, AtmosphericLayerState] = {}
        self._history: Deque[AtmosphericObservation] = deque(maxlen=max(1, int(history_limit)))
        if layers is not None:
            for layer in layers:
                self.add_layer(layer)

    @property
    def layers(self) -> tuple[AtmosphericLayerState, ...]:
        return tuple(sorted(self._layers.values(), key=lambda layer: layer.altitude_range_km[0]))

    @property
    def history(self) -> tuple[AtmosphericObservation, ...]:
        return tuple(self._history)

    def add_layer(self, layer: AtmosphericLayerState) -> None:
        identifier = layer.identifier
        if identifier in self._layers:
            raise ValueError(f"layer '{identifier}' already registered")
        self._layers[identifier] = layer

    def update_layer(self, layer: AtmosphericLayerState) -> None:
        if layer.identifier not in self._layers:
            raise KeyError(f"layer '{layer.identifier}' is not registered")
        self._layers[layer.identifier] = layer

    def remove_layer(self, identifier: str) -> None:
        key = _normalise_identifier(identifier)
        self._layers.pop(key)

    def ingest(self, observation: AtmosphericObservation) -> AtmosphericSnapshot:
        identifier = observation.layer
        if identifier not in self._layers:
            raise KeyError(f"layer '{identifier}' is not registered")
        updated_layer = self._layers[identifier].update_from_observation(observation)
        self._layers[identifier] = updated_layer
        self._history.append(observation)
        return AtmosphericSnapshot(timestamp=_utcnow(), layers=self.layers)

    def generate_alerts(self) -> tuple[AtmosphericAlert, ...]:
        alerts: list[AtmosphericAlert] = []
        for layer in self.layers:
            if layer.stability_index >= 0.6:
                continue
            if layer.stability_index < 0.2:
                severity = AtmosphericAlertSeverity.WARNING
                message = "Critical instability detected"
            elif layer.stability_index < 0.4:
                severity = AtmosphericAlertSeverity.WATCH
                message = "Atmospheric volatility increasing"
            else:
                severity = AtmosphericAlertSeverity.ADVISORY
                message = "Layer stability trending down"
            alerts.append(
                AtmosphericAlert(
                    severity=severity,
                    layer=layer.identifier,
                    message=message,
                    stability_index=layer.stability_index,
                )
            )
        if not alerts:
            alerts.append(
                AtmosphericAlert(
                    severity=AtmosphericAlertSeverity.NORMAL,
                    layer="system",
                    message="Atmospheric profile stable",
                    stability_index=_mean(layer.stability_index for layer in self.layers) or 1.0,
                )
            )
        return tuple(alerts)

    def rolling_temperature(self, identifier: str, *, window: int = 5) -> float:
        key = _normalise_identifier(identifier)
        if window <= 0:
            raise ValueError("window must be positive")
        temperatures: list[float] = []
        for observation in reversed(self._history):
            if observation.layer != key:
                continue
            if observation.temperature_c is not None:
                temperatures.append(float(observation.temperature_c))
            if len(temperatures) >= window:
                break
        if temperatures:
            return _mean(temperatures)
        layer = self._layers.get(key)
        if layer is None:
            raise KeyError(f"layer '{identifier}' is not registered")
        return layer.temperature_c

    def snapshot(self) -> AtmosphericSnapshot:
        return AtmosphericSnapshot(timestamp=_utcnow(), layers=self.layers)

