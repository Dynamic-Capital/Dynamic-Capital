"""Dynamic iceberg engine for structural assessment and forecasting."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from math import sqrt
from typing import Deque, Mapping, MutableSequence, Sequence

__all__ = [
    "DynamicIcebergEngine",
    "IcebergEnvironment",
    "IcebergObservation",
    "IcebergPhase",
    "IcebergSegment",
    "IcebergSnapshot",
]


# ---------------------------------------------------------------------------
# helpers


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _ensure_triplet(values: Sequence[float] | None) -> tuple[float, float, float]:
    if values is None:
        return (0.0, 0.0, 0.0)
    items = list(values)
    if len(items) != 3:
        raise ValueError("vectors must contain exactly three components")
    return float(items[0]), float(items[1]), float(items[2])


def _vector_magnitude(vector: Sequence[float]) -> float:
    x, y, z = vector
    return sqrt(x * x + y * y + z * z)


def _normalise_label(value: str) -> str:
    label = str(value).strip()
    if not label:
        raise ValueError("labels must not be empty")
    return label


def _ensure_segment(value: IcebergSegment | Mapping[str, object]) -> IcebergSegment:
    if isinstance(value, IcebergSegment):
        return value
    if isinstance(value, Mapping):
        return IcebergSegment(**value)
    raise TypeError("segments must be IcebergSegment instances or mappings")


def _ensure_observation(value: IcebergObservation | Mapping[str, object]) -> IcebergObservation:
    if isinstance(value, IcebergObservation):
        return value
    if isinstance(value, Mapping):
        return IcebergObservation(**value)
    raise TypeError("observations must be IcebergObservation instances or mappings")


def _ensure_environment(value: IcebergEnvironment | Mapping[str, object]) -> IcebergEnvironment:
    if isinstance(value, IcebergEnvironment):
        return value
    if isinstance(value, Mapping):
        return IcebergEnvironment(**value)
    raise TypeError("environment must be IcebergEnvironment instances or mappings")


# ---------------------------------------------------------------------------
# domain primitives


class IcebergPhase(str, Enum):
    """Lifecycle phase classification for iceberg evolution."""

    CALVING = "calving"
    DRIFTING = "drifting"
    MELTING = "melting"
    GROUNDED = "grounded"
    DISINTEGRATING = "disintegrating"


@dataclass(slots=True)
class IcebergSegment:
    """Represents a structural subdivision of the iceberg."""

    identifier: str
    volume_m3: float
    density_kg_m3: float
    temperature_c: float
    salinity_psu: float
    fractures: int = 0
    stress_mpa: float = 0.0
    integrity_score: float = 1.0

    def __post_init__(self) -> None:  # noqa: D401 - dataclass validation
        self.identifier = _normalise_label(self.identifier)
        self.volume_m3 = max(float(self.volume_m3), 0.0)
        self.density_kg_m3 = max(float(self.density_kg_m3), 0.0)
        self.temperature_c = float(self.temperature_c)
        self.salinity_psu = max(float(self.salinity_psu), 0.0)
        self.fractures = max(int(self.fractures), 0)
        self.stress_mpa = max(float(self.stress_mpa), 0.0)
        self.integrity_score = _clamp(self.integrity_score)


@dataclass(slots=True)
class IcebergEnvironment:
    """Environmental forcing factors affecting the iceberg."""

    water_temperature_c: float
    air_temperature_c: float
    current_speed_mps: float
    current_direction: tuple[float, float, float] = (1.0, 0.0, 0.0)
    wind_speed_mps: float = 0.0
    wave_height_m: float = 0.0
    solar_radiation_w_m2: float = 0.0
    turbulence_index: float = 0.1

    def __post_init__(self) -> None:  # noqa: D401
        self.water_temperature_c = float(self.water_temperature_c)
        self.air_temperature_c = float(self.air_temperature_c)
        self.current_speed_mps = max(float(self.current_speed_mps), 0.0)
        self.current_direction = _ensure_triplet(self.current_direction)
        self.wind_speed_mps = max(float(self.wind_speed_mps), 0.0)
        self.wave_height_m = max(float(self.wave_height_m), 0.0)
        self.solar_radiation_w_m2 = max(float(self.solar_radiation_w_m2), 0.0)
        self.turbulence_index = _clamp(self.turbulence_index)


@dataclass(slots=True)
class IcebergObservation:
    """Structural and kinematic description of the iceberg at a timestamp."""

    timestamp: datetime
    position: tuple[float, float]
    draft_depth_m: float
    drift_vector: tuple[float, float, float]
    segments: Sequence[IcebergSegment] = field(default_factory=tuple)
    phase: IcebergPhase = IcebergPhase.DRIFTING
    notes: str | None = None

    def __post_init__(self) -> None:  # noqa: D401
        if not isinstance(self.timestamp, datetime):
            raise TypeError("timestamp must be a datetime instance")
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        self.position = (float(self.position[0]), float(self.position[1]))
        self.draft_depth_m = max(float(self.draft_depth_m), 0.0)
        self.drift_vector = _ensure_triplet(self.drift_vector)
        validated_segments: list[IcebergSegment] = []
        for segment in self.segments:
            validated_segments.append(_ensure_segment(segment))
        if not validated_segments:
            raise ValueError("observations must include at least one segment")
        self.segments = tuple(validated_segments)
        self.phase = IcebergPhase(self.phase)
        if self.notes is not None:
            self.notes = self.notes.strip() or None

    @property
    def drift_speed(self) -> float:
        return _vector_magnitude(self.drift_vector)

    @property
    def total_volume(self) -> float:
        return sum(segment.volume_m3 for segment in self.segments)

    @property
    def mean_density(self) -> float:
        total_volume = self.total_volume
        if total_volume <= 0:
            return 0.0
        weighted_density = sum(segment.density_kg_m3 * segment.volume_m3 for segment in self.segments)
        return weighted_density / total_volume

    @property
    def integrity_index(self) -> float:
        total_volume = self.total_volume
        if total_volume <= 0:
            return 0.0
        weighted_integrity = sum(segment.integrity_score * segment.volume_m3 for segment in self.segments)
        return weighted_integrity / total_volume

    @property
    def fracture_rate(self) -> float:
        if not self.segments:
            return 0.0
        return sum(segment.fractures for segment in self.segments) / len(self.segments)


@dataclass(slots=True)
class IcebergSnapshot:
    """Aggregated integrity metrics produced by the engine."""

    timestamp: datetime
    total_volume_m3: float
    mean_density_kg_m3: float
    integrity_index: float
    melt_rate_percent_per_day: float
    drift_speed_mps: float
    risk_score: float
    phase: IcebergPhase
    notes: str | None = None

    def __post_init__(self) -> None:  # noqa: D401
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        self.total_volume_m3 = max(float(self.total_volume_m3), 0.0)
        self.mean_density_kg_m3 = max(float(self.mean_density_kg_m3), 0.0)
        self.integrity_index = _clamp(self.integrity_index)
        self.melt_rate_percent_per_day = max(float(self.melt_rate_percent_per_day), 0.0)
        self.drift_speed_mps = max(float(self.drift_speed_mps), 0.0)
        self.risk_score = _clamp(self.risk_score)
        self.phase = IcebergPhase(self.phase)
        if self.notes is not None:
            self.notes = self.notes.strip() or None


# ---------------------------------------------------------------------------
# engine


class DynamicIcebergEngine:
    """Tracks iceberg observations and produces stability assessments."""

    def __init__(self, *, history_limit: int = 96) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._observations: Deque[IcebergObservation] = deque(maxlen=history_limit)

    def ingest(self, observation: IcebergObservation | Mapping[str, object]) -> IcebergSnapshot:
        """Add an observation to the engine and return the resulting snapshot."""

        obs = _ensure_observation(observation)
        self._observations.append(obs)
        return self.assess_integrity()

    def assess_integrity(self) -> IcebergSnapshot:
        """Compute the latest integrity snapshot from the observation history."""

        if not self._observations:
            raise RuntimeError("no observations have been ingested")
        latest = self._observations[-1]
        melt_rate = self._estimate_melt_rate()
        risk_score = self._score_risk(latest, melt_rate)
        return IcebergSnapshot(
            timestamp=latest.timestamp,
            total_volume_m3=latest.total_volume,
            mean_density_kg_m3=latest.mean_density,
            integrity_index=latest.integrity_index,
            melt_rate_percent_per_day=melt_rate,
            drift_speed_mps=latest.drift_speed,
            risk_score=risk_score,
            phase=latest.phase,
            notes=latest.notes,
        )

    def forecast(
        self,
        environment: IcebergEnvironment | Mapping[str, object],
        *,
        horizon_hours: int = 48,
        step_hours: int = 6,
    ) -> list[IcebergSnapshot]:
        """Forecast integrity evolution under the supplied environmental forcing."""

        if horizon_hours <= 0:
            raise ValueError("horizon_hours must be positive")
        if step_hours <= 0:
            raise ValueError("step_hours must be positive")
        base_snapshot = self.assess_integrity()
        forcing = _ensure_environment(environment)
        projections: list[IcebergSnapshot] = []
        integrity = base_snapshot.integrity_index
        volume = base_snapshot.total_volume_m3
        timestamp = base_snapshot.timestamp
        for _ in range(step_hours, horizon_hours + 1, step_hours):
            timestamp = timestamp + timedelta(hours=step_hours)
            heat_factor = max(forcing.water_temperature_c - (-5.0), 0.0) / 30.0
            air_factor = max(forcing.air_temperature_c - (-15.0), 0.0) / 40.0
            wave_factor = forcing.wave_height_m / 5.0
            turbulence_factor = forcing.turbulence_index * 0.5
            environmental_decay = heat_factor + air_factor + wave_factor + turbulence_factor
            integrity = _clamp(integrity - environmental_decay * 0.02)
            melt_rate = base_snapshot.melt_rate_percent_per_day + environmental_decay * 5.0
            volume = max(volume * (1 - (melt_rate / 100.0) * (step_hours / 24.0)), 0.0)
            drift_speed = base_snapshot.drift_speed_mps + forcing.current_speed_mps * 0.1 + forcing.wind_speed_mps * 0.05
            risk = self._score_risk_from_values(
                integrity=integrity,
                melt_rate=melt_rate,
                fracture_rate=self._latest_fracture_rate(),
                phase=base_snapshot.phase,
                environmental_decay=environmental_decay,
            )
            projections.append(
                IcebergSnapshot(
                    timestamp=timestamp,
                    total_volume_m3=volume,
                    mean_density_kg_m3=base_snapshot.mean_density_kg_m3,
                    integrity_index=integrity,
                    melt_rate_percent_per_day=melt_rate,
                    drift_speed_mps=drift_speed,
                    risk_score=risk,
                    phase=base_snapshot.phase,
                    notes="forecast",
                )
            )
        return projections

    @property
    def observations(self) -> tuple[IcebergObservation, ...]:
        """Read-only view of the observation history."""

        return tuple(self._observations)

    def _estimate_melt_rate(self) -> float:
        if len(self._observations) < 2:
            return 0.0
        latest = self._observations[-1]
        previous = self._observations[-2]
        delta_seconds = (latest.timestamp - previous.timestamp).total_seconds()
        if delta_seconds <= 0:
            return 0.0
        previous_volume = previous.total_volume
        if previous_volume <= 0:
            return 0.0
        volume_change = max(previous_volume - latest.total_volume, 0.0)
        melt_ratio = volume_change / previous_volume
        return max(melt_ratio * 100.0 * (24 * 3600 / delta_seconds), 0.0)

    def _score_risk(self, observation: IcebergObservation, melt_rate: float) -> float:
        environmental_decay = self._environmental_decay_from_history()
        return self._score_risk_from_values(
            integrity=observation.integrity_index,
            melt_rate=melt_rate,
            fracture_rate=observation.fracture_rate,
            phase=observation.phase,
            environmental_decay=environmental_decay,
        )

    def _score_risk_from_values(
        self,
        *,
        integrity: float,
        melt_rate: float,
        fracture_rate: float,
        phase: IcebergPhase,
        environmental_decay: float,
    ) -> float:
        base_risk = 1.0 - _clamp(integrity)
        melt_component = min(melt_rate / 100.0, 2.0) * 0.5
        fracture_component = min(fracture_rate / 10.0, 1.0) * 0.2
        phase_component = 0.0
        if phase in {IcebergPhase.CALVING, IcebergPhase.DISINTEGRATING}:
            phase_component = 0.25
        elif phase is IcebergPhase.MELTING:
            phase_component = 0.15
        elif phase is IcebergPhase.GROUNDED:
            phase_component = -0.05
        environmental_component = min(environmental_decay, 3.0) * 0.1
        risk = base_risk + melt_component + fracture_component + phase_component + environmental_component
        return _clamp(risk)

    def _latest_fracture_rate(self) -> float:
        if not self._observations:
            return 0.0
        return self._observations[-1].fracture_rate

    def _environmental_decay_from_history(self) -> float:
        if len(self._observations) < 2:
            return 0.0
        recent: MutableSequence[float] = []
        for observation in list(self._observations)[-5:]:
            recent.append(observation.drift_speed)
        if len(recent) < 2:
            return 0.0
        variability = max(max(recent) - min(recent), 0.0)
        return variability
