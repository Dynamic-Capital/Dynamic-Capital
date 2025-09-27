"""Monitor stratospheric stability, ozone strength and radiative balance."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable

__all__ = [
    "StratosphericObservation",
    "StratosphericState",
    "DynamicStratosphere",
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
class StratosphericObservation:
    """Observation of stratospheric vitality."""

    timestamp: datetime
    temperature_c: float
    ozone_dobson: float
    wind_speed_m_s: float
    tropopause_pressure_hpa: float
    sulfate_optical_depth: float

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.temperature_c = float(self.temperature_c)
        self.ozone_dobson = max(float(self.ozone_dobson), 0.0)
        self.wind_speed_m_s = max(float(self.wind_speed_m_s), 0.0)
        self.tropopause_pressure_hpa = max(float(self.tropopause_pressure_hpa), 10.0)
        self.sulfate_optical_depth = max(float(self.sulfate_optical_depth), 0.0)


@dataclass(slots=True)
class StratosphericState:
    """Derived structure of the stratosphere."""

    ozone_integrity: float
    polar_vortex_strength: float
    radiative_balance: float
    stabilization_score: float
    summary: str


class DynamicStratosphere:
    """Fuse stratospheric observations into a coherent signal."""

    def __init__(self, *, window: int = 30) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._observations: Deque[StratosphericObservation] = deque(maxlen=int(window))

    def add_observation(
        self,
        observation: StratosphericObservation | None = None,
        /,
        **kwargs: float,
    ) -> StratosphericObservation:
        if observation is None:
            observation = StratosphericObservation(
                timestamp=kwargs.get("timestamp", _utcnow()),
                temperature_c=float(kwargs.get("temperature_c", -55.0)),
                ozone_dobson=float(kwargs.get("ozone_dobson", 320.0)),
                wind_speed_m_s=float(kwargs.get("wind_speed_m_s", 20.0)),
                tropopause_pressure_hpa=float(kwargs.get("tropopause_pressure_hpa", 250.0)),
                sulfate_optical_depth=float(kwargs.get("sulfate_optical_depth", 0.01)),
            )
        elif kwargs:
            raise TypeError("cannot provide both observation and keyword values")

        self._observations.append(observation)
        return observation

    def state(self) -> StratosphericState:
        if not self._observations:
            raise RuntimeError("no observations available")

        ozone = _mean((obs.ozone_dobson for obs in self._observations))
        vortex = _mean((obs.wind_speed_m_s for obs in self._observations))
        tropopause_pressure = _mean((obs.tropopause_pressure_hpa for obs in self._observations))
        aerosols = _mean((obs.sulfate_optical_depth for obs in self._observations))
        temperature = _mean((obs.temperature_c for obs in self._observations))

        ozone_integrity = _clamp((ozone - 200.0) / 200.0, lower=0.0, upper=1.5)
        polar_vortex_strength = _clamp(vortex / 80.0, lower=0.0, upper=1.2)
        radiative_balance = _clamp(1.0 - aerosols * 15.0 + (temperature + 55.0) / 100.0, lower=0.0, upper=1.2)
        stabilization_score = _clamp((tropopause_pressure - 150.0) / 150.0, lower=0.0, upper=1.2)

        if ozone_integrity < 0.4:
            summary = "Severe ozone depletion"
        elif radiative_balance < 0.6:
            summary = "Perturbed by aerosols"
        elif polar_vortex_strength > 0.9:
            summary = "Strong polar vortex"
        else:
            summary = "Stratosphere stable"

        return StratosphericState(
            ozone_integrity=round(ozone_integrity, 3),
            polar_vortex_strength=round(polar_vortex_strength, 3),
            radiative_balance=round(radiative_balance, 3),
            stabilization_score=round(stabilization_score, 3),
            summary=summary,
        )
