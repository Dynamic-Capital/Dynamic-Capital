"""Predictive modelling utilities for iceberg stability assessment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from .engine import (
    IcebergEnvironment,
    IcebergObservation,
    IcebergPhase,
    IcebergSnapshot,
)

__all__ = [
    "IcebergModelParameters",
    "IcebergModelTrainingSample",
    "IcebergModelBreakdown",
    "IcebergModelResult",
    "DynamicIcebergModel",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


@dataclass(slots=True)
class IcebergModelParameters:
    """Configurable coefficients that control melt and risk projections."""

    basal_melt_coefficient: float = 0.35
    surface_melt_coefficient: float = 0.28
    wave_erosion_coefficient: float = 0.22
    fracture_sensitivity: float = 0.4
    drift_coupling: float = 0.3
    smoothing_factor: float = 0.4

    def __post_init__(self) -> None:  # noqa: D401 - dataclass validation
        self.basal_melt_coefficient = _clamp(self.basal_melt_coefficient, upper=2.0)
        self.surface_melt_coefficient = _clamp(self.surface_melt_coefficient, upper=2.0)
        self.wave_erosion_coefficient = _clamp(self.wave_erosion_coefficient, upper=2.0)
        self.fracture_sensitivity = _clamp(self.fracture_sensitivity, upper=2.0)
        self.drift_coupling = _clamp(self.drift_coupling, upper=2.0)
        self.smoothing_factor = _clamp(self.smoothing_factor, upper=1.0)

    def blend(self, other: "IcebergModelParameters", weight: float) -> "IcebergModelParameters":
        """Return new parameters interpolated with ``other`` using ``weight``."""

        alpha = _clamp(weight)
        beta = 1.0 - alpha
        return IcebergModelParameters(
            basal_melt_coefficient=self.basal_melt_coefficient * beta
            + other.basal_melt_coefficient * alpha,
            surface_melt_coefficient=self.surface_melt_coefficient * beta
            + other.surface_melt_coefficient * alpha,
            wave_erosion_coefficient=self.wave_erosion_coefficient * beta
            + other.wave_erosion_coefficient * alpha,
            fracture_sensitivity=self.fracture_sensitivity * beta
            + other.fracture_sensitivity * alpha,
            drift_coupling=self.drift_coupling * beta
            + other.drift_coupling * alpha,
            smoothing_factor=self.smoothing_factor * beta
            + other.smoothing_factor * alpha,
        )


@dataclass(slots=True, frozen=True)
class IcebergModelTrainingSample:
    """Ground-truth data used to calibrate the iceberg model."""

    observation: IcebergObservation
    environment: IcebergEnvironment
    measured_snapshot: IcebergSnapshot


@dataclass(slots=True, frozen=True)
class IcebergModelBreakdown:
    """Intermediate melt and risk components returned by the model."""

    basal_component: float
    surface_component: float
    wave_component: float
    turbulence_component: float
    fracture_component: float

    def as_mapping(self) -> Mapping[str, float]:
        return {
            "basal": self.basal_component,
            "surface": self.surface_component,
            "wave": self.wave_component,
            "turbulence": self.turbulence_component,
            "fracture": self.fracture_component,
        }


@dataclass(slots=True, frozen=True)
class IcebergModelResult:
    """Predicted snapshot with additional attribution metadata."""

    snapshot: IcebergSnapshot
    melt_breakdown: IcebergModelBreakdown
    risk_breakdown: Mapping[str, float]


class DynamicIcebergModel:
    """Computational model that scores iceberg melt and risk trajectories."""

    def __init__(
        self,
        parameters: IcebergModelParameters | Mapping[str, float] | None = None,
    ) -> None:
        if parameters is None:
            self._parameters = IcebergModelParameters()
        elif isinstance(parameters, IcebergModelParameters):
            self._parameters = parameters
        else:
            self._parameters = IcebergModelParameters(**parameters)
        self._history: list[IcebergModelResult] = []

    @property
    def parameters(self) -> IcebergModelParameters:
        return self._parameters

    @property
    def history(self) -> tuple[IcebergModelResult, ...]:
        return tuple(self._history)

    def predict(
        self,
        observation: IcebergObservation,
        environment: IcebergEnvironment,
    ) -> IcebergModelResult:
        """Return a new :class:`IcebergModelResult` for the supplied inputs."""

        breakdown = self._compute_breakdown(observation, environment)
        melt_rate = self._melt_rate_from_breakdown(breakdown)
        risk_score, risk_breakdown = self._risk_from_breakdown(
            observation, environment, breakdown, melt_rate
        )
        snapshot = IcebergSnapshot(
            timestamp=observation.timestamp,
            total_volume_m3=observation.total_volume,
            mean_density_kg_m3=observation.mean_density,
            integrity_index=observation.integrity_index,
            melt_rate_percent_per_day=melt_rate,
            drift_speed_mps=self._predict_drift(observation, environment),
            risk_score=risk_score,
            phase=observation.phase,
            notes=observation.notes,
        )
        result = IcebergModelResult(
            snapshot=snapshot,
            melt_breakdown=breakdown,
            risk_breakdown=risk_breakdown,
        )
        self._append_history(result)
        return result

    def calibrate(
        self,
        samples: Sequence[IcebergModelTrainingSample],
        *,
        learning_rate: float = 0.1,
        regularisation: float = 0.02,
    ) -> IcebergModelParameters:
        """Adjust parameters to minimise melt-rate error over ``samples``."""

        if not samples:
            return self._parameters

        gradients: MutableMapping[str, float] = {
            "basal": 0.0,
            "surface": 0.0,
            "wave": 0.0,
            "fracture": 0.0,
        }
        weight_sum = 0.0

        for sample in samples:
            breakdown = self._compute_breakdown(
                sample.observation, sample.environment
            )
            predicted = self._melt_rate_from_breakdown(breakdown)
            target = sample.measured_snapshot.melt_rate_percent_per_day
            error = target - predicted
            weight = max(sample.measured_snapshot.integrity_index, 0.1)
            weight_sum += weight
            gradients["basal"] += error * breakdown.basal_component * weight
            gradients["surface"] += error * breakdown.surface_component * weight
            gradients["wave"] += (
                error
                * (breakdown.wave_component + breakdown.turbulence_component)
                * weight
            )
            gradients["fracture"] += error * breakdown.fracture_component * weight

        if weight_sum <= 0:
            return self._parameters

        scale = learning_rate / weight_sum
        params = self._parameters
        self._parameters = IcebergModelParameters(
            basal_melt_coefficient=params.basal_melt_coefficient
            + scale * gradients["basal"]
            - regularisation * params.basal_melt_coefficient,
            surface_melt_coefficient=params.surface_melt_coefficient
            + scale * gradients["surface"]
            - regularisation * params.surface_melt_coefficient,
            wave_erosion_coefficient=params.wave_erosion_coefficient
            + scale * gradients["wave"]
            - regularisation * params.wave_erosion_coefficient,
            fracture_sensitivity=params.fracture_sensitivity
            + scale * gradients["fracture"]
            - regularisation * params.fracture_sensitivity,
            drift_coupling=params.drift_coupling,
            smoothing_factor=params.smoothing_factor,
        )
        return self._parameters

    def merge_history(self, results: Iterable[IcebergModelResult]) -> None:
        """Extend the internal history with previously computed ``results``."""

        for result in results:
            if not isinstance(result, IcebergModelResult):
                raise TypeError("history entries must be IcebergModelResult instances")
            self._append_history(result)

    # ------------------------------------------------------------------
    # internal helpers

    def _append_history(self, result: IcebergModelResult) -> None:
        smoothing = self._parameters.smoothing_factor
        if smoothing <= 0:
            self._history.append(result)
            return
        if not self._history:
            self._history.append(result)
            return
        previous = self._history[-1]
        blended_snapshot = IcebergSnapshot(
            timestamp=result.snapshot.timestamp,
            total_volume_m3=result.snapshot.total_volume_m3,
            mean_density_kg_m3=(
                previous.snapshot.mean_density_kg_m3 * smoothing
                + result.snapshot.mean_density_kg_m3 * (1 - smoothing)
            ),
            integrity_index=(
                previous.snapshot.integrity_index * smoothing
                + result.snapshot.integrity_index * (1 - smoothing)
            ),
            melt_rate_percent_per_day=(
                previous.snapshot.melt_rate_percent_per_day * smoothing
                + result.snapshot.melt_rate_percent_per_day * (1 - smoothing)
            ),
            drift_speed_mps=(
                previous.snapshot.drift_speed_mps * smoothing
                + result.snapshot.drift_speed_mps * (1 - smoothing)
            ),
            risk_score=(
                previous.snapshot.risk_score * smoothing
                + result.snapshot.risk_score * (1 - smoothing)
            ),
            phase=result.snapshot.phase,
            notes=result.snapshot.notes,
        )
        blended_result = IcebergModelResult(
            snapshot=blended_snapshot,
            melt_breakdown=result.melt_breakdown,
            risk_breakdown=result.risk_breakdown,
        )
        self._history.append(blended_result)

    def _compute_breakdown(
        self,
        observation: IcebergObservation,
        environment: IcebergEnvironment,
    ) -> IcebergModelBreakdown:
        basal_component = max(environment.water_temperature_c - (-4.0), 0.0)
        surface_component = max(environment.air_temperature_c - (-15.0), 0.0)
        wave_component = environment.wave_height_m * (1 + environment.wind_speed_mps / 20.0)
        turbulence_component = environment.turbulence_index * environment.current_speed_mps
        fracture_component = observation.fracture_rate * (1 + observation.draft_depth_m / 100.0)
        return IcebergModelBreakdown(
            basal_component=basal_component,
            surface_component=surface_component,
            wave_component=wave_component,
            turbulence_component=turbulence_component,
            fracture_component=fracture_component,
        )

    def _melt_rate_from_breakdown(self, breakdown: IcebergModelBreakdown) -> float:
        params = self._parameters
        melt_rate = (
            breakdown.basal_component * params.basal_melt_coefficient
            + breakdown.surface_component * params.surface_melt_coefficient
            + (breakdown.wave_component + breakdown.turbulence_component)
            * params.wave_erosion_coefficient
            + breakdown.fracture_component * params.fracture_sensitivity
        )
        return max(melt_rate, 0.0)

    def _predict_drift(
        self,
        observation: IcebergObservation,
        environment: IcebergEnvironment,
    ) -> float:
        params = self._parameters
        baseline = observation.drift_speed
        coupling = params.drift_coupling * (
            environment.current_speed_mps + environment.wind_speed_mps * 0.5
        )
        return max(baseline + coupling, 0.0)

    def _risk_from_breakdown(
        self,
        observation: IcebergObservation,
        environment: IcebergEnvironment,
        breakdown: IcebergModelBreakdown,
        melt_rate: float,
    ) -> tuple[float, Mapping[str, float]]:
        integrity_term = max(1.0 - observation.integrity_index, 0.0)
        melt_term = min(melt_rate / 80.0, 1.5)
        fracture_term = min(breakdown.fracture_component / 10.0, 1.0)
        exposure_term = _clamp(
            environment.current_speed_mps / 5.0
            + environment.wave_height_m / 6.0
            + environment.turbulence_index * 0.3,
            upper=3.0,
        )
        phase_term = 0.0
        if observation.phase in {IcebergPhase.CALVING, IcebergPhase.DISINTEGRATING}:
            phase_term = 0.35
        elif observation.phase is IcebergPhase.MELTING:
            phase_term = 0.2
        elif observation.phase is IcebergPhase.GROUNDED:
            phase_term = -0.1

        risk_score = _clamp(
            integrity_term + 0.6 * melt_term + 0.25 * fracture_term + 0.2 * exposure_term + phase_term
        )
        breakdown_mapping: MutableMapping[str, float] = {
            "integrity": integrity_term,
            "melt": 0.6 * melt_term,
            "fracture": 0.25 * fracture_term,
            "exposure": 0.2 * exposure_term,
            "phase": phase_term,
        }
        return risk_score, breakdown_mapping

