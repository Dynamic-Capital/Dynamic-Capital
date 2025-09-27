"""Scenario aware forecasting primitives for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from math import isfinite, sqrt
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ForecastObservation",
    "ForecastSummary",
    "ForecastProjection",
    "DynamicForecast",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_float(value: object, *, name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError(f"{name} must be a real number") from exc
    if not isfinite(number):
        raise ValueError(f"{name} must be finite")
    return number


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower must be <= upper")
    return max(lower, min(upper, value))


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = item.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _weighted_mean(values: Sequence[float], weights: Sequence[float]) -> float:
    total_weight = sum(weights)
    if total_weight == 0.0:
        return 0.0
    return sum(v * w for v, w in zip(values, weights)) / total_weight


def _weighted_linear_regression(
    values: Sequence[float], weights: Sequence[float]
) -> tuple[float, float]:
    total_weight = sum(weights)
    if total_weight == 0.0:
        return 0.0, values[-1] if values else 0.0
    xs = list(range(1, len(values) + 1))
    mean_x = _weighted_mean(xs, weights)
    mean_y = _weighted_mean(values, weights)
    numerator = 0.0
    denominator = 0.0
    for x, y, w in zip(xs, values, weights):
        centred_x = x - mean_x
        numerator += w * centred_x * (y - mean_y)
        denominator += w * centred_x * centred_x
    if denominator == 0.0:
        return 0.0, mean_y
    slope = numerator / denominator
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _weighted_residual_std(
    values: Sequence[float], weights: Sequence[float], slope: float, intercept: float
) -> float:
    if not values:
        return 0.0
    xs = list(range(1, len(values) + 1))
    total_weight = sum(weights)
    if total_weight == 0.0:
        return 0.0
    residual_sum = 0.0
    for x, y, w in zip(xs, values, weights):
        predicted = intercept + slope * x
        residual = y - predicted
        residual_sum += w * residual * residual
    return sqrt(max(residual_sum / total_weight, 0.0))


def _infer_cadence(observations: Sequence["ForecastObservation"]) -> timedelta | None:
    if len(observations) < 2:
        return None
    deltas: list[float] = []
    for first, second in zip(observations, observations[1:]):
        delta = (second.timestamp - first.timestamp).total_seconds()
        if delta > 0:
            deltas.append(delta)
    if not deltas:
        return None
    average = sum(deltas) / len(deltas)
    return timedelta(seconds=average)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class ForecastObservation:
    """Single data point tracked by the forecasting engine."""

    value: float
    timestamp: datetime = field(default_factory=_utcnow)
    confidence: float = 0.6
    label: str | None = None
    drivers: tuple[str, ...] = field(default_factory=tuple)
    notes: str = ""
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.value = _coerce_float(self.value, name="value")
        self.confidence = _clamp(float(self.confidence))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.label = _normalise_optional_text(self.label)
        self.drivers = _normalise_tuple(self.drivers)
        self.notes = self.notes.strip()
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "confidence": self.confidence,
            "label": self.label,
            "drivers": list(self.drivers),
            "notes": self.notes,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class ForecastSummary:
    """Aggregate metrics describing the observed history."""

    count: int
    latest: float | None
    change: float | None
    mean: float | None
    slope: float
    volatility: float
    cadence: timedelta | None
    readiness: float
    timestamp: datetime | None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "count": self.count,
            "latest": self.latest,
            "change": self.change,
            "mean": self.mean,
            "slope": self.slope,
            "volatility": self.volatility,
            "cadence": self.cadence.total_seconds() if self.cadence else None,
            "readiness": self.readiness,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


@dataclass(slots=True)
class ForecastProjection:
    """Projected outcome for an upcoming horizon."""

    step: int
    timestamp: datetime
    baseline: float
    optimistic: float
    pessimistic: float
    confidence: float
    drivers: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "step": self.step,
            "timestamp": self.timestamp.isoformat(),
            "baseline": self.baseline,
            "optimistic": self.optimistic,
            "pessimistic": self.pessimistic,
            "confidence": self.confidence,
            "drivers": list(self.drivers),
        }


# ---------------------------------------------------------------------------
# main engine


class DynamicForecast:
    """Manage observations and generate scenario-aware projections."""

    def __init__(self, *, window: int = 12, maxlen: int | None = None) -> None:
        if window <= 1:
            raise ValueError("window must be greater than 1")
        self.window = int(window)
        self._observations: Deque[ForecastObservation] = deque(maxlen=maxlen)

    def register(self, observation: ForecastObservation | Mapping[str, object]) -> ForecastObservation:
        """Add a single observation to the series."""

        if not isinstance(observation, ForecastObservation):
            observation = ForecastObservation(**dict(observation))
        if self._observations and observation.timestamp <= self._observations[-1].timestamp:
            raise ValueError("observations must have strictly increasing timestamps")
        self._observations.append(observation)
        return observation

    def extend(self, observations: Iterable[ForecastObservation | Mapping[str, object]]) -> None:
        for observation in observations:
            self.register(observation)

    def clear(self) -> None:
        self._observations.clear()

    @property
    def history(self) -> tuple[ForecastObservation, ...]:
        return tuple(self._observations)

    def _windowed(self, window: int | None = None) -> list[ForecastObservation]:
        count = window or self.window
        if count <= 0:  # pragma: no cover - defensive guard
            raise ValueError("window must be positive")
        if count >= len(self._observations):
            return list(self._observations)
        return list(self._observations)[-count:]

    def snapshot(self, *, window: int | None = None) -> ForecastSummary:
        observations = self._windowed(window)
        if not observations:
            return ForecastSummary(
                count=0,
                latest=None,
                change=None,
                mean=None,
                slope=0.0,
                volatility=0.0,
                cadence=None,
                readiness=0.0,
                timestamp=None,
            )
        values = [obs.value for obs in observations]
        weights = [obs.confidence for obs in observations]
        slope, intercept = _weighted_linear_regression(values, weights)
        volatility = _weighted_residual_std(values, weights, slope, intercept)
        mean = _weighted_mean(values, weights)
        latest = observations[-1].value
        change = latest - observations[0].value if len(observations) > 1 else 0.0
        cadence = _infer_cadence(observations)
        readiness = _clamp(
            1.0 - (volatility / (abs(mean) + volatility + 1e-9)),
            lower=0.0,
            upper=1.0,
        )
        return ForecastSummary(
            count=len(observations),
            latest=latest,
            change=change,
            mean=mean,
            slope=slope,
            volatility=volatility,
            cadence=cadence,
            readiness=readiness,
            timestamp=observations[-1].timestamp,
        )

    def project(
        self,
        *,
        periods: int = 3,
        cadence: timedelta | None = None,
        window: int | None = None,
    ) -> tuple[ForecastProjection, ...]:
        if periods <= 0:
            raise ValueError("periods must be positive")
        observations = self._windowed(window)
        if len(observations) < 2:
            raise ValueError("at least two observations are required to project")
        values = [obs.value for obs in observations]
        weights = [obs.confidence for obs in observations]
        slope, intercept = _weighted_linear_regression(values, weights)
        volatility = _weighted_residual_std(values, weights, slope, intercept)
        cadence_delta = cadence or _infer_cadence(observations) or timedelta(days=1)
        latest_timestamp = observations[-1].timestamp
        base_index = len(observations)
        drivers = observations[-1].drivers
        projections: list[ForecastProjection] = []
        horizon_scale = max(len(observations), 1)
        for step in range(1, periods + 1):
            idx = base_index + step
            baseline = intercept + slope * idx
            spread = volatility * (1.0 + (step - 1) / horizon_scale)
            optimistic = baseline + spread
            pessimistic = baseline - spread
            confidence = _clamp(
                1.0 - (spread / (abs(baseline) + volatility + 1e-9)),
                lower=0.0,
                upper=1.0,
            )
            projections.append(
                ForecastProjection(
                    step=step,
                    timestamp=latest_timestamp + cadence_delta * step,
                    baseline=baseline,
                    optimistic=optimistic,
                    pessimistic=pessimistic,
                    confidence=confidence,
                    drivers=drivers,
                )
            )
        return tuple(projections)
