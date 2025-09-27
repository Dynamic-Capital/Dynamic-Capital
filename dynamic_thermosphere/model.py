"""Quantify thermospheric heating, drag and auroral excitation."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable

__all__ = [
    "ThermosphericObservation",
    "ThermosphericState",
    "DynamicThermosphere",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _mean(values: Iterable[float], *, default: float = 0.0) -> float:
    collected = list(values)
    if not collected:
        return default
    return fmean(collected)


@dataclass(slots=True)
class ThermosphericObservation:
    """High-altitude thermospheric diagnostics."""

    timestamp: datetime
    temperature_k: float
    solar_flux_sfu: float
    geomagnetic_index: float
    neutral_density_kg_m3: float
    auroral_power_gw: float

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.temperature_k = max(float(self.temperature_k), 100.0)
        self.solar_flux_sfu = max(float(self.solar_flux_sfu), 0.0)
        self.geomagnetic_index = max(float(self.geomagnetic_index), 0.0)
        self.neutral_density_kg_m3 = max(float(self.neutral_density_kg_m3), 0.0)
        self.auroral_power_gw = max(float(self.auroral_power_gw), 0.0)


@dataclass(slots=True)
class ThermosphericState:
    """Characterisation of thermospheric forcing."""

    heat_content: float
    satellite_drag_factor: float
    geomagnetic_activity: float
    auroral_activity: float
    summary: str


class DynamicThermosphere:
    """Fuse thermospheric inputs into planning signals."""

    def __init__(self, *, window: int = 15) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._observations: Deque[ThermosphericObservation] = deque(maxlen=int(window))

    def add_observation(
        self,
        observation: ThermosphericObservation | None = None,
        /,
        **kwargs: float,
    ) -> ThermosphericObservation:
        if observation is None:
            observation = ThermosphericObservation(
                timestamp=kwargs.get("timestamp", _utcnow()),
                temperature_k=float(kwargs.get("temperature_k", 900.0)),
                solar_flux_sfu=float(kwargs.get("solar_flux_sfu", 110.0)),
                geomagnetic_index=float(kwargs.get("geomagnetic_index", 3.0)),
                neutral_density_kg_m3=float(kwargs.get("neutral_density_kg_m3", 1e-12)),
                auroral_power_gw=float(kwargs.get("auroral_power_gw", 20.0)),
            )
        elif kwargs:
            raise TypeError("cannot provide both observation and keyword values")

        self._observations.append(observation)
        return observation

    def state(self) -> ThermosphericState:
        if not self._observations:
            raise RuntimeError("no observations available")

        temperature = _mean((obs.temperature_k for obs in self._observations))
        solar_flux = _mean((obs.solar_flux_sfu for obs in self._observations))
        geomag = _mean((obs.geomagnetic_index for obs in self._observations))
        density = _mean((obs.neutral_density_kg_m3 for obs in self._observations))
        aurora = _mean((obs.auroral_power_gw for obs in self._observations))

        heat_content = _clamp((temperature - 500.0) / 800.0 + solar_flux / 300.0, lower=0.0, upper=1.5)
        satellite_drag_factor = _clamp(density * 5e13 + temperature / 3000.0, lower=0.0, upper=1.5)
        geomagnetic_activity = _clamp(geomag / 9.0 + solar_flux / 400.0, lower=0.0, upper=1.5)
        auroral_activity = _clamp(aurora / 50.0 + geomag / 12.0, lower=0.0, upper=1.5)

        if geomagnetic_activity > 1.0:
            summary = "Geomagnetic storm in progress"
        elif satellite_drag_factor > 0.8:
            summary = "Elevated thermospheric drag"
        elif auroral_activity > 0.7:
            summary = "Auroral oval energized"
        else:
            summary = "Thermosphere quiet"

        return ThermosphericState(
            heat_content=round(heat_content, 3),
            satellite_drag_factor=round(satellite_drag_factor, 3),
            geomagnetic_activity=round(geomagnetic_activity, 3),
            auroral_activity=round(auroral_activity, 3),
            summary=summary,
        )
