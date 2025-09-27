"""Capture mesospheric behaviour such as meteoric burn and wave drag."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable

__all__ = [
    "MesosphericObservation",
    "MesosphericState",
    "DynamicMesosphere",
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
class MesosphericObservation:
    """Observation of mesospheric processes."""

    timestamp: datetime
    temperature_c: float
    density_kg_m3: float
    meteor_flux_per_hour: float
    gravity_wave_amplitude_ms: float
    noctilucent_probability: float

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.temperature_c = float(self.temperature_c)
        self.density_kg_m3 = max(float(self.density_kg_m3), 1e-6)
        self.meteor_flux_per_hour = max(float(self.meteor_flux_per_hour), 0.0)
        self.gravity_wave_amplitude_ms = max(float(self.gravity_wave_amplitude_ms), 0.0)
        self.noctilucent_probability = _clamp(float(self.noctilucent_probability), lower=0.0, upper=1.0)


@dataclass(slots=True)
class MesosphericState:
    """Summary metrics for the mesosphere."""

    thermal_variance: float
    meteor_ablation_index: float
    wave_drag_intensity: float
    noctilucent_potential: float
    summary: str


class DynamicMesosphere:
    """Blend mesospheric observations into actionable signals."""

    def __init__(self, *, window: int = 20) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._observations: Deque[MesosphericObservation] = deque(maxlen=int(window))

    def add_observation(
        self,
        observation: MesosphericObservation | None = None,
        /,
        **kwargs: float,
    ) -> MesosphericObservation:
        if observation is None:
            observation = MesosphericObservation(
                timestamp=kwargs.get("timestamp", _utcnow()),
                temperature_c=float(kwargs.get("temperature_c", -80.0)),
                density_kg_m3=float(kwargs.get("density_kg_m3", 1e-4)),
                meteor_flux_per_hour=float(kwargs.get("meteor_flux_per_hour", 15.0)),
                gravity_wave_amplitude_ms=float(kwargs.get("gravity_wave_amplitude_ms", 25.0)),
                noctilucent_probability=float(kwargs.get("noctilucent_probability", 0.3)),
            )
        elif kwargs:
            raise TypeError("cannot provide both observation and keyword values")

        self._observations.append(observation)
        return observation

    def state(self) -> MesosphericState:
        if not self._observations:
            raise RuntimeError("no observations available")

        temps = [obs.temperature_c for obs in self._observations]
        mean_temp = _mean(temps)
        variance = _mean(((value - mean_temp) ** 2 for value in temps), default=0.0)
        thermal_variance = max(variance, 0.0) ** 0.5
        meteor_flux = _mean((obs.meteor_flux_per_hour for obs in self._observations))
        waves = _mean((obs.gravity_wave_amplitude_ms for obs in self._observations))
        density = _mean((obs.density_kg_m3 for obs in self._observations))
        noctilucent = _mean((obs.noctilucent_probability for obs in self._observations))

        meteor_ablation_index = _clamp(meteor_flux / 40.0 + density * 50.0, lower=0.0, upper=1.5)
        wave_drag_intensity = _clamp(waves / 60.0 + thermal_variance / 40.0, lower=0.0, upper=1.5)
        noctilucent_potential = _clamp(noctilucent + max(-mean_temp, 60.0) / 100.0, lower=0.0, upper=1.2)

        if meteor_ablation_index > 1.0:
            summary = "Intense meteor ablation"
        elif noctilucent_potential > 0.9:
            summary = "Noctilucent clouds probable"
        elif wave_drag_intensity > 0.8:
            summary = "Strong gravity wave forcing"
        else:
            summary = "Mesosphere calm"

        return MesosphericState(
            thermal_variance=round(thermal_variance, 2),
            meteor_ablation_index=round(meteor_ablation_index, 3),
            wave_drag_intensity=round(wave_drag_intensity, 3),
            noctilucent_potential=round(noctilucent_potential, 3),
            summary=summary,
        )
