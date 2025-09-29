"""Quantum resonance engine for orchestrating coherence across subsystems."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableSequence, Sequence

__all__ = [
    "QuantumPulse",
    "QuantumEnvironment",
    "QuantumResonanceFrame",
    "DynamicQuantumEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: MutableSequence[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(slots=True)
class QuantumPulse:
    """Measurement pulse describing the state of a quantum subsystem."""

    system: str
    coherence: float
    entanglement: float
    temperature: float
    flux: float = 0.0
    phase_variance: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    annotations: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.system = _normalise_text(self.system)
        self.coherence = _clamp(float(self.coherence))
        self.entanglement = _clamp(float(self.entanglement))
        self.temperature = float(self.temperature)
        if self.temperature < 0:
            raise ValueError("temperature must be non-negative")
        self.flux = _clamp(float(self.flux), lower=-1.0, upper=1.0)
        self.phase_variance = _clamp(float(self.phase_variance))
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.annotations = _normalise_tuple(self.annotations)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def stability_index(self) -> float:
        """Composite signal representing how resilient the pulse appears."""

        coherence_component = 0.5 * self.coherence
        entanglement_component = 0.3 * self.entanglement
        phase_component = 0.2 * (1.0 - self.phase_variance)
        flux_penalty = 1.0 - (0.25 * abs(self.flux))
        base = coherence_component + entanglement_component + phase_component
        return _clamp(base * flux_penalty)

    @property
    def requires_cooling(self) -> bool:
        return self.temperature >= 50.0


@dataclass(slots=True)
class QuantumEnvironment:
    """Environmental posture applied when fusing quantum pulses."""

    vacuum_pressure: float
    background_noise: float
    gravity_gradient: float
    measurement_rate: float
    thermal_load: float = 0.5

    def __post_init__(self) -> None:
        self.vacuum_pressure = _clamp(float(self.vacuum_pressure))
        self.background_noise = _clamp(float(self.background_noise))
        self.gravity_gradient = _clamp(float(self.gravity_gradient))
        self.measurement_rate = _clamp(float(self.measurement_rate))
        self.thermal_load = _clamp(float(self.thermal_load))

    @property
    def is_fragile_vacuum(self) -> bool:
        return self.vacuum_pressure < 0.5

    @property
    def is_measurement_aggressive(self) -> bool:
        return self.measurement_rate > 0.65

    @property
    def requires_cooling(self) -> bool:
        return self.thermal_load >= 0.6

    @property
    def is_noisy(self) -> bool:
        return self.background_noise > 0.6


@dataclass(slots=True)
class QuantumResonanceFrame:
    """Aggregated resonance view derived from recent pulses."""

    mean_coherence: float
    mean_entanglement: float
    mean_flux: float
    mean_phase_variance: float
    stability_outlook: float
    anomalies: tuple[str, ...]
    recommended_actions: tuple[str, ...]


class DynamicQuantumEngine:
    """Synthesises quantum pulses into actionable resonance guidance."""

    def __init__(self, *, window: int = 180, equilibrium_target: float = 0.72) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._equilibrium_target = _clamp(float(equilibrium_target))
        self._pulses: Deque[QuantumPulse] = deque()
        self._totals: Dict[str, float] = {
            "coherence": 0.0,
            "entanglement": 0.0,
            "flux": 0.0,
            "phase_variance": 0.0,
        }

    @property
    def window(self) -> int:
        return self._window

    @property
    def pulses(self) -> tuple[QuantumPulse, ...]:
        return tuple(self._pulses)

    def register_pulse(self, pulse: QuantumPulse | Mapping[str, object]) -> QuantumPulse:
        if isinstance(pulse, Mapping):
            pulse = QuantumPulse(**pulse)
        elif not isinstance(pulse, QuantumPulse):  # pragma: no cover - defensive guard
            raise TypeError("pulse must be a QuantumPulse or mapping")
        if len(self._pulses) == self._window:
            removed = self._pulses.popleft()
            self._update_totals(removed, sign=-1.0)
        self._pulses.append(pulse)
        self._update_totals(pulse, sign=1.0)
        return pulse

    def clear(self) -> None:
        self._pulses.clear()
        self._reset_totals()

    def synthesize_frame(self, environment: QuantumEnvironment | None = None) -> QuantumResonanceFrame:
        if not self._pulses:
            raise ValueError("no pulses registered")
        count = len(self._pulses)
        mean_coherence = self._totals["coherence"] / count
        mean_entanglement = self._totals["entanglement"] / count
        mean_flux = self._totals["flux"] / count
        mean_phase_variance = self._totals["phase_variance"] / count

        stability_outlook = _clamp(
            0.5 * mean_coherence
            + 0.3 * mean_entanglement
            + 0.2 * (1.0 - mean_phase_variance)
            - 0.1 * abs(mean_flux)
        )

        anomalies: MutableSequence[str] = []
        if mean_coherence < 0.45:
            anomalies.append("coherence-drift")
        if mean_entanglement < 0.4:
            anomalies.append("entanglement-fragmentation")
        if abs(mean_flux) > 0.75:
            anomalies.append("flux-instability")
        if mean_phase_variance > 0.65:
            anomalies.append("phase-volatility")

        recommendations: MutableSequence[str] = []
        if not anomalies:
            recommendations.append("maintain equilibrium protocols")
        if "coherence-drift" in anomalies:
            recommendations.append("amplify coherence stabilisers")
        if "entanglement-fragmentation" in anomalies:
            recommendations.append("expand entanglement lattice")
        if "flux-instability" in anomalies:
            recommendations.append("counter rotating flux vectors")
        if "phase-volatility" in anomalies:
            recommendations.append("rephase interferometers")

        if environment is not None:
            if environment.is_noisy:
                recommendations.append("deploy adaptive shielding")
            if environment.is_measurement_aggressive and mean_coherence < self._equilibrium_target:
                recommendations.append("slow measurement cadence")
            if environment.is_fragile_vacuum:
                recommendations.append("increase vacuum integrity")
            if environment.gravity_gradient > 0.55:
                recommendations.append("recalibrate gravitational dampers")
            if environment.requires_cooling and stability_outlook < self._equilibrium_target:
                recommendations.append("engage cryogenic buffer")

        unique_recommendations = tuple(dict.fromkeys(recommendations))

        return QuantumResonanceFrame(
            mean_coherence=mean_coherence,
            mean_entanglement=mean_entanglement,
            mean_flux=mean_flux,
            mean_phase_variance=mean_phase_variance,
            stability_outlook=stability_outlook,
            anomalies=tuple(anomalies),
            recommended_actions=unique_recommendations,
        )

    def estimate_decoherence(self, time_steps: int, environment: QuantumEnvironment) -> float:
        if time_steps <= 0:
            raise ValueError("time_steps must be positive")
        if not self._pulses:
            raise ValueError("no pulses registered")
        latest = self._pulses[-1]
        baseline = 1.0 - latest.coherence
        env_pressure = (
            0.35 * environment.background_noise
            + 0.25 * environment.measurement_rate
            + 0.2 * environment.gravity_gradient
            + 0.2 * (1.0 - environment.vacuum_pressure)
        )
        scale = max(1.5, self._window / 15.0)
        projected = baseline + env_pressure * (time_steps / (scale * 10.0))
        return _clamp(projected)

    def iter_recent(self, limit: int | None = None) -> Iterable[QuantumPulse]:
        if limit is None or limit >= len(self._pulses):
            yield from self._pulses
        else:
            count = max(0, limit)
            for index in range(1, count + 1):
                yield self._pulses[-index]

    def _reset_totals(self) -> None:
        for key in self._totals:
            self._totals[key] = 0.0

    def _update_totals(self, pulse: QuantumPulse, *, sign: float) -> None:
        self._totals["coherence"] += sign * pulse.coherence
        self._totals["entanglement"] += sign * pulse.entanglement
        self._totals["flux"] += sign * pulse.flux
        self._totals["phase_variance"] += sign * pulse.phase_variance
