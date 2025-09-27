"""Assess exospheric escape and interface with interplanetary space."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable

__all__ = [
    "ExosphericObservation",
    "ExosphericState",
    "DynamicExosphere",
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
class ExosphericObservation:
    """Characterisation of exospheric boundary conditions."""

    timestamp: datetime
    temperature_k: float
    hydrogen_density_m3: float
    satellite_drag_coeff: float
    escape_fraction: float
    solar_wind_speed_km_s: float

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.temperature_k = max(float(self.temperature_k), 100.0)
        self.hydrogen_density_m3 = max(float(self.hydrogen_density_m3), 0.0)
        self.satellite_drag_coeff = max(float(self.satellite_drag_coeff), 0.0)
        self.escape_fraction = _clamp(float(self.escape_fraction), lower=0.0, upper=1.0)
        self.solar_wind_speed_km_s = max(float(self.solar_wind_speed_km_s), 0.0)


@dataclass(slots=True)
class ExosphericState:
    """Aggregated exosphere metrics."""

    escape_energy: float
    outflow_flux: float
    satellite_risk: float
    boundary_instability: float
    summary: str


class DynamicExosphere:
    """Compute exospheric dynamics from sparse observations."""

    def __init__(self, *, window: int = 12) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._observations: Deque[ExosphericObservation] = deque(maxlen=int(window))

    def add_observation(
        self,
        observation: ExosphericObservation | None = None,
        /,
        **kwargs: float,
    ) -> ExosphericObservation:
        if observation is None:
            observation = ExosphericObservation(
                timestamp=kwargs.get("timestamp", _utcnow()),
                temperature_k=float(kwargs.get("temperature_k", 1200.0)),
                hydrogen_density_m3=float(kwargs.get("hydrogen_density_m3", 5e7)),
                satellite_drag_coeff=float(kwargs.get("satellite_drag_coeff", 0.5)),
                escape_fraction=float(kwargs.get("escape_fraction", 0.05)),
                solar_wind_speed_km_s=float(kwargs.get("solar_wind_speed_km_s", 350.0)),
            )
        elif kwargs:
            raise TypeError("cannot provide both observation and keyword values")

        self._observations.append(observation)
        return observation

    def state(self) -> ExosphericState:
        if not self._observations:
            raise RuntimeError("no observations available")

        temperature = _mean((obs.temperature_k for obs in self._observations))
        hydrogen_density = _mean((obs.hydrogen_density_m3 for obs in self._observations))
        drag = _mean((obs.satellite_drag_coeff for obs in self._observations))
        escape_fraction = _mean((obs.escape_fraction for obs in self._observations))
        solar_wind = _mean((obs.solar_wind_speed_km_s for obs in self._observations))

        escape_energy = _clamp((temperature - 700.0) / 1000.0 + solar_wind / 800.0, lower=0.0, upper=1.5)
        outflow_flux = _clamp(hydrogen_density / 1e8 * escape_fraction * 4.0, lower=0.0, upper=1.5)
        satellite_risk = _clamp(drag / 2.0 + hydrogen_density / 1e8, lower=0.0, upper=1.5)
        boundary_instability = _clamp((solar_wind - 300.0) / 400.0 + escape_fraction * 2.0, lower=0.0, upper=1.5)

        if outflow_flux > 1.0:
            summary = "Hydrogen escape surge"
        elif satellite_risk > 0.8:
            summary = "Satellite drag sensitivity"
        elif boundary_instability > 0.7:
            summary = "Magnetopause buffeting"
        else:
            summary = "Exosphere steady"

        return ExosphericState(
            escape_energy=round(escape_energy, 3),
            outflow_flux=round(outflow_flux, 3),
            satellite_risk=round(satellite_risk, 3),
            boundary_instability=round(boundary_instability, 3),
            summary=summary,
        )
