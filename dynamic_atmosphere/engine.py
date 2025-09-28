"""High-level orchestration utilities for :mod:`dynamic_atmosphere`."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Iterable, Mapping, Sequence

from .atmosphere import (
    AtmosphericAlert,
    AtmosphericLayerState,
    AtmosphericObservation,
    AtmosphericSnapshot,
    DynamicAtmosphere,
)

__all__ = ["AtmosphericSystemOverview", "DynamicAtmosphericEngine"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_layer(value: AtmosphericLayerState | Mapping[str, object]) -> AtmosphericLayerState:
    if isinstance(value, AtmosphericLayerState):
        return value
    if isinstance(value, Mapping):
        return AtmosphericLayerState(**value)
    raise TypeError("layer must be an AtmosphericLayerState or a mapping")


def _coerce_observation(
    value: AtmosphericObservation | Mapping[str, object]
) -> AtmosphericObservation:
    if isinstance(value, AtmosphericObservation):
        return value
    if isinstance(value, Mapping):
        return AtmosphericObservation(**value)
    raise TypeError("observation must be an AtmosphericObservation or a mapping")


def _mean(values: Iterable[float], *, default: float = 0.0) -> float:
    data = list(values)
    if not data:
        return default
    return float(fmean(data))


@dataclass(frozen=True, slots=True)
class AtmosphericSystemOverview:
    """Aggregate insight into the current atmospheric profile."""

    timestamp: datetime
    average_temperature_c: float
    average_humidity: float
    mean_stability_index: float
    minimum_stability_index: float
    alerts: tuple[AtmosphericAlert, ...]
    layers: tuple[AtmosphericLayerState, ...]


class DynamicAtmosphericEngine:
    """Co-ordinate atmospheric layers and synthesize actionable insights."""

    def __init__(
        self,
        layers: Sequence[AtmosphericLayerState | Mapping[str, object]] | None = None,
        *,
        history_limit: int = 256,
    ) -> None:
        resolved_layers = tuple(_coerce_layer(layer) for layer in layers or ())
        self._atmosphere = DynamicAtmosphere(resolved_layers, history_limit=history_limit)

    # ------------------------------------------------------------------ basics
    @property
    def atmosphere(self) -> DynamicAtmosphere:
        return self._atmosphere

    @property
    def layers(self) -> tuple[AtmosphericLayerState, ...]:
        return self._atmosphere.layers

    @property
    def history(self) -> tuple[AtmosphericObservation, ...]:
        return self._atmosphere.history

    # --------------------------------------------------------------- operations
    def register_layer(self, layer: AtmosphericLayerState | Mapping[str, object]) -> AtmosphericLayerState:
        resolved = _coerce_layer(layer)
        self._atmosphere.add_layer(resolved)
        return resolved

    def upsert_layer(self, layer: AtmosphericLayerState | Mapping[str, object]) -> AtmosphericLayerState:
        resolved = _coerce_layer(layer)
        identifiers = {state.identifier for state in self._atmosphere.layers}
        if resolved.identifier in identifiers:
            self._atmosphere.update_layer(resolved)
        else:
            self._atmosphere.add_layer(resolved)
        return resolved

    def remove_layer(self, identifier: str) -> None:
        self._atmosphere.remove_layer(identifier)

    def ingest_observation(
        self, observation: AtmosphericObservation | Mapping[str, object]
    ) -> AtmosphericSnapshot:
        return self._atmosphere.ingest(_coerce_observation(observation))

    def ingest_many(
        self, observations: Iterable[AtmosphericObservation | Mapping[str, object]]
    ) -> AtmosphericSnapshot:
        snapshot: AtmosphericSnapshot | None = None
        for observation in observations:
            snapshot = self.ingest_observation(observation)
        if snapshot is None:
            layers = self._atmosphere.layers
            snapshot = AtmosphericSnapshot(timestamp=_utcnow(), layers=layers)
        return snapshot

    # ------------------------------------------------------------- computations
    def rolling_temperature(self, identifier: str, *, window: int = 5) -> float:
        return self._atmosphere.rolling_temperature(identifier, window=window)

    def system_overview(self) -> AtmosphericSystemOverview:
        layers = self._atmosphere.layers
        alerts = self._atmosphere.generate_alerts()
        return AtmosphericSystemOverview(
            timestamp=_utcnow(),
            average_temperature_c=_mean(layer.temperature_c for layer in layers),
            average_humidity=_mean(layer.humidity for layer in layers),
            mean_stability_index=_mean((layer.stability_index for layer in layers), default=1.0),
            minimum_stability_index=min((layer.stability_index for layer in layers), default=1.0),
            alerts=alerts,
            layers=layers,
        )

    def export_state(self) -> dict[str, object]:
        overview = self.system_overview()
        return {
            "timestamp": overview.timestamp.isoformat(),
            "average_temperature_c": overview.average_temperature_c,
            "average_humidity": overview.average_humidity,
            "mean_stability_index": overview.mean_stability_index,
            "minimum_stability_index": overview.minimum_stability_index,
            "alerts": [
                {
                    "severity": alert.severity.value,
                    "layer": alert.layer,
                    "message": alert.message,
                    "stability_index": alert.stability_index,
                    "timestamp": alert.timestamp.isoformat(),
                }
                for alert in overview.alerts
            ],
            "layers": [
                {
                    "identifier": layer.identifier,
                    "altitude_range_km": layer.altitude_range_km,
                    "thermal_band_c": layer.thermal_band_c,
                    "temperature_c": layer.temperature_c,
                    "humidity": layer.humidity,
                    "stability_index": layer.stability_index,
                    "components": [
                        {
                            "name": component.name,
                            "mixing_ratio": component.mixing_ratio,
                            "reactivity": component.reactivity,
                            "sources": component.sources,
                        }
                        for component in layer.components
                    ],
                }
                for layer in overview.layers
            ],
        }
