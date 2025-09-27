"""Compute tropospheric state from high frequency field observations."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable

__all__ = [
    "TroposphericObservation",
    "TroposphericState",
    "DynamicTroposphere",
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
class TroposphericObservation:
    """Snapshot of near-surface conditions feeding the troposphere."""

    timestamp: datetime
    temperature_c: float
    dew_point_c: float
    humidity: float
    pressure_hpa: float
    wind_speed_m_s: float
    vertical_velocity_m_s: float

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.humidity = _clamp(float(self.humidity), lower=0.0, upper=1.0)
        self.temperature_c = float(self.temperature_c)
        self.dew_point_c = float(self.dew_point_c)
        self.pressure_hpa = float(self.pressure_hpa)
        self.wind_speed_m_s = max(float(self.wind_speed_m_s), 0.0)
        self.vertical_velocity_m_s = float(self.vertical_velocity_m_s)


@dataclass(slots=True)
class TroposphericState:
    """Aggregated tropospheric posture."""

    lapse_rate_c_per_km: float
    precipitation_potential: float
    storm_risk: float
    cloud_base_km: float
    summary: str


class DynamicTroposphere:
    """Blend tropospheric observations into an actionable state."""

    def __init__(self, *, window: int = 24) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = int(window)
        self._observations: Deque[TroposphericObservation] = deque(maxlen=self._window)

    def add_observation(self, observation: TroposphericObservation | None = None, /, **kwargs: float) -> TroposphericObservation:
        """Register a new observation.

        The caller can either pass an explicit ``TroposphericObservation`` or the
        numeric components as keyword arguments. Missing keyword arguments default
        to reasonable values for calm, dry conditions.
        """

        if observation is None:
            observation = TroposphericObservation(
                timestamp=kwargs.get("timestamp", _utcnow()),
                temperature_c=float(kwargs.get("temperature_c", 18.0)),
                dew_point_c=float(kwargs.get("dew_point_c", 10.0)),
                humidity=float(kwargs.get("humidity", 0.55)),
                pressure_hpa=float(kwargs.get("pressure_hpa", 1013.0)),
                wind_speed_m_s=float(kwargs.get("wind_speed_m_s", 3.0)),
                vertical_velocity_m_s=float(kwargs.get("vertical_velocity_m_s", 0.05)),
            )
        elif kwargs:
            raise TypeError("cannot provide both observation and keyword values")

        self._observations.append(observation)
        return observation

    def state(self) -> TroposphericState:
        """Compute the blended tropospheric state."""

        if not self._observations:
            raise RuntimeError("no observations available")

        latest = self._observations[-1]
        temp_gradient = _mean(
            (
                obs.temperature_c - obs.dew_point_c
                for obs in self._observations
            ),
            default=latest.temperature_c - latest.dew_point_c,
        )
        lapse_rate = _mean(
            (
                (obs.temperature_c - latest.temperature_c) * 0.18
                for obs in self._observations
            ),
            default=6.0,
        )
        lift = _mean((obs.vertical_velocity_m_s for obs in self._observations), default=latest.vertical_velocity_m_s)
        humidity = _mean((obs.humidity for obs in self._observations), default=latest.humidity)

        precipitation_potential = _clamp((1.0 - temp_gradient / 15.0) * humidity + lift * 2.0, lower=0.0, upper=1.0)
        storm_risk = _clamp((lift * 3.0) + (humidity - 0.6) * 1.5 + (8.0 - lapse_rate) / 10.0, lower=0.0, upper=1.0)
        cloud_base_km = max((latest.temperature_c - latest.dew_point_c) * 0.125, 0.1)

        if storm_risk > 0.7:
            summary = "Deep convection likely"
        elif precipitation_potential > 0.5:
            summary = "Showery regime forming"
        elif lapse_rate < 5.0:
            summary = "Stable with stratiform clouds"
        else:
            summary = "Quiet boundary layer"

        return TroposphericState(
            lapse_rate_c_per_km=round(lapse_rate, 2),
            precipitation_potential=round(precipitation_potential, 3),
            storm_risk=round(storm_risk, 3),
            cloud_base_km=round(cloud_base_km, 2),
            summary=summary,
        )
