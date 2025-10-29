"""Dynamic Seasonality module for analysing periodic behaviours."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import isfinite, sqrt
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SeasonalObservation",
    "SeasonalityProfile",
    "SeasonalitySnapshot",
    "DynamicSeasonality",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_float(value: object, *, name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be a real number") from exc
    if not isfinite(number):
        raise ValueError(f"{name} must be finite")
    return number


def _coerce_weight(value: object) -> float:
    weight = _coerce_float(value, name="weight")
    if weight < 0:
        raise ValueError("weight must be non-negative")
    return weight


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def _ensure_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
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


def _weighted_std(values: Sequence[float], weights: Sequence[float], mean: float) -> float:
    total_weight = sum(weights)
    if total_weight == 0.0:
        return 0.0
    variance = sum(w * (value - mean) ** 2 for value, w in zip(values, weights)) / total_weight
    return sqrt(max(variance, 0.0))


def _median(values: Sequence[float]) -> float:
    ordered = sorted(values)
    length = len(ordered)
    midpoint = length // 2
    if length % 2:
        return ordered[midpoint]
    if length == 0:  # pragma: no cover - defensive guard
        return 0.0
    return (ordered[midpoint - 1] + ordered[midpoint]) / 2


# ---------------------------------------------------------------------------
# period extractors


def _normalise_timestamp(timestamp: datetime) -> datetime:
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def _extract_day_of_week(timestamp: datetime) -> str:
    return _normalise_timestamp(timestamp).strftime("%A").lower()


def _extract_month(timestamp: datetime) -> str:
    return _normalise_timestamp(timestamp).strftime("%B").lower()


def _extract_hour(timestamp: datetime) -> str:
    return _normalise_timestamp(timestamp).strftime("%H")


def _extract_day_of_month(timestamp: datetime) -> str:
    return f"{_normalise_timestamp(timestamp).day:02d}"


def _extract_week_of_year(timestamp: datetime) -> str:
    return f"{_normalise_timestamp(timestamp).isocalendar().week:02d}"


_PERIOD_EXTRACTORS = {
    "day_of_week": _extract_day_of_week,
    "month": _extract_month,
    "hour": _extract_hour,
    "day_of_month": _extract_day_of_month,
    "week_of_year": _extract_week_of_year,
}


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class SeasonalObservation:
    """Single observation tracked for seasonality analysis."""

    value: float
    timestamp: datetime = field(default_factory=_utcnow)
    weight: float = 1.0
    period: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.value = _coerce_float(self.value, name="value")
        self.timestamp = _normalise_timestamp(self.timestamp)
        self.weight = _coerce_weight(self.weight)
        self.period = _normalise_optional_text(self.period)
        self.metadata = _ensure_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "weight": self.weight,
            "period": self.period,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class SeasonalityProfile:
    """Aggregate metrics describing a seasonal bucket."""

    period: str
    count: int
    weight: float
    mean: float
    median: float
    stddev: float
    minimum: float
    maximum: float
    contribution: float
    bias: float
    momentum: float
    latest_value: float
    latest_timestamp: datetime

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "period": self.period,
            "count": self.count,
            "weight": self.weight,
            "mean": self.mean,
            "median": self.median,
            "stddev": self.stddev,
            "minimum": self.minimum,
            "maximum": self.maximum,
            "contribution": self.contribution,
            "bias": self.bias,
            "momentum": self.momentum,
            "latest_value": self.latest_value,
            "latest_timestamp": self.latest_timestamp.isoformat(),
        }


@dataclass(slots=True)
class SeasonalitySnapshot:
    """Snapshot of the current seasonal structure."""

    period: str
    total_observations: int
    baseline: float
    amplitude: float
    dispersion: float
    dominant_periods: tuple[str, ...]
    profiles: tuple[SeasonalityProfile, ...]
    generated_at: datetime

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "period": self.period,
            "total_observations": self.total_observations,
            "baseline": self.baseline,
            "amplitude": self.amplitude,
            "dispersion": self.dispersion,
            "dominant_periods": list(self.dominant_periods),
            "profiles": [profile.as_dict() for profile in self.profiles],
            "generated_at": self.generated_at.isoformat(),
        }


# ---------------------------------------------------------------------------
# main engine


class DynamicSeasonality:
    """Rolling seasonality analyser for contextual signals."""

    def __init__(self, *, period: str = "day_of_week", window: int | None = 512) -> None:
        if period not in _PERIOD_EXTRACTORS:
            raise ValueError(
                f"period must be one of {', '.join(sorted(_PERIOD_EXTRACTORS))}, got {period!r}"
            )
        if window is not None and window <= 0:
            raise ValueError("window must be positive or None")
        self.period = period
        self.window = window
        self._observations: Deque[SeasonalObservation] = deque(maxlen=window or None)

    @property
    def observations(self) -> tuple[SeasonalObservation, ...]:
        return tuple(self._observations)

    def reset(self) -> None:
        self._observations.clear()

    def ingest(
        self,
        observation: SeasonalObservation | Mapping[str, object] | float,
        **overrides: object,
    ) -> None:
        self._observations.append(self._coerce_observation(observation, overrides))

    def ingest_many(
        self,
        observations: Iterable[SeasonalObservation | Mapping[str, object] | float],
    ) -> None:
        for observation in observations:
            self.ingest(observation)

    def _coerce_observation(
        self, observation: SeasonalObservation | Mapping[str, object] | float, overrides: Mapping[str, object]
    ) -> SeasonalObservation:
        if isinstance(observation, SeasonalObservation):
            if overrides:
                raise TypeError("overrides are not supported when passing SeasonalObservation instances")
            return observation
        payload: MutableMapping[str, object]
        if isinstance(observation, Mapping):
            payload = dict(observation)
            payload.update(overrides)
        else:
            payload = dict(overrides)
            payload.setdefault("timestamp", _utcnow())
            payload.setdefault("weight", 1.0)
            payload.setdefault("period", None)
            payload["value"] = observation
        return SeasonalObservation(**payload)

    def _resolve_period(self, observation: SeasonalObservation) -> str | None:
        if observation.period:
            return observation.period
        extractor = _PERIOD_EXTRACTORS[self.period]
        return extractor(observation.timestamp)

    def _group_observations(self) -> tuple[dict[str, list[float]], dict[str, list[float]], dict[str, list[datetime]], float]:
        values: dict[str, list[float]] = defaultdict(list)
        weights: dict[str, list[float]] = defaultdict(list)
        timestamps: dict[str, list[datetime]] = defaultdict(list)
        total_weight = 0.0
        for observation in self._observations:
            key = self._resolve_period(observation)
            if key is None:
                continue
            values[key].append(observation.value)
            weights[key].append(observation.weight)
            timestamps[key].append(observation.timestamp)
            total_weight += observation.weight
        return values, weights, timestamps, total_weight

    def _build_profiles(
        self,
        values: Mapping[str, Sequence[float]],
        weights: Mapping[str, Sequence[float]],
        timestamps: Mapping[str, Sequence[datetime]],
        total_weight: float,
        baseline: float,
    ) -> tuple[SeasonalityProfile, ...]:
        profiles: list[SeasonalityProfile] = []
        for period_key in sorted(values.keys()):
            period_values = list(values[period_key])
            period_weights = list(weights.get(period_key, (1.0,) * len(period_values)))
            period_timestamps = list(timestamps.get(period_key, ()))
            weight_sum = sum(period_weights)
            mean = _weighted_mean(period_values, period_weights)
            stddev = _weighted_std(period_values, period_weights, mean)
            median_value = _median(period_values)
            contribution = (weight_sum / total_weight) if total_weight else 0.0
            if period_timestamps:
                latest_timestamp = period_timestamps[-1]
                latest_value = period_values[-1]
            else:  # pragma: no cover - defensive guard
                latest_timestamp = _utcnow()
                latest_value = period_values[-1]
            profile = SeasonalityProfile(
                period=period_key,
                count=len(period_values),
                weight=weight_sum,
                mean=mean,
                median=median_value,
                stddev=stddev,
                minimum=min(period_values),
                maximum=max(period_values),
                contribution=contribution,
                bias=mean - baseline,
                momentum=latest_value - mean,
                latest_value=latest_value,
                latest_timestamp=latest_timestamp,
            )
            profiles.append(profile)
        return tuple(profiles)

    def profiles(self) -> tuple[SeasonalityProfile, ...]:
        if not self._observations:
            return ()
        values, weights, timestamps, total_weight = self._group_observations()
        if not values:
            return ()
        all_values: list[float] = []
        all_weights: list[float] = []
        for key in values.keys():
            all_values.extend(values[key])
            all_weights.extend(weights.get(key, (1.0,) * len(values[key])))
        baseline = _weighted_mean(all_values, all_weights)
        return self._build_profiles(values, weights, timestamps, total_weight, baseline)

    def snapshot(self) -> SeasonalitySnapshot:
        if not self._observations:
            return SeasonalitySnapshot(
                period=self.period,
                total_observations=0,
                baseline=0.0,
                amplitude=0.0,
                dispersion=0.0,
                dominant_periods=(),
                profiles=(),
                generated_at=_utcnow(),
            )
        values, weights, timestamps, total_weight = self._group_observations()
        if not values:
            return SeasonalitySnapshot(
                period=self.period,
                total_observations=len(self._observations),
                baseline=0.0,
                amplitude=0.0,
                dispersion=0.0,
                dominant_periods=(),
                profiles=(),
                generated_at=self._observations[-1].timestamp,
            )
        all_values: list[float] = []
        all_weights: list[float] = []
        for key in values.keys():
            all_values.extend(values[key])
            all_weights.extend(weights.get(key, (1.0,) * len(values[key])))
        baseline = _weighted_mean(all_values, all_weights)
        profiles = self._build_profiles(values, weights, timestamps, total_weight, baseline)
        mean_values = [profile.mean for profile in profiles]
        amplitude = (max(mean_values) - min(mean_values)) if mean_values else 0.0
        dispersion = _weighted_mean([profile.stddev for profile in profiles], [profile.weight for profile in profiles])
        dominant_periods = tuple(
            profile.period
            for profile in sorted(profiles, key=lambda prof: abs(prof.bias), reverse=True)[:3]
        )
        return SeasonalitySnapshot(
            period=self.period,
            total_observations=len(self._observations),
            baseline=baseline,
            amplitude=amplitude,
            dispersion=dispersion,
            dominant_periods=dominant_periods,
            profiles=profiles,
            generated_at=self._observations[-1].timestamp,
        )

    def seasonality_index(self, period_key: str) -> float:
        period_key = _normalise_optional_text(period_key) or ""
        if not period_key:
            raise ValueError("period_key must be a non-empty string")
        snapshot = self.snapshot()
        if not snapshot.profiles:
            raise KeyError(f"no observations available for period {period_key!r}")
        profile_map = {profile.period: profile for profile in snapshot.profiles}
        if period_key not in profile_map:
            raise KeyError(f"unknown period {period_key!r}")
        profile = profile_map[period_key]
        amplitude = snapshot.amplitude
        if amplitude == 0:
            return 0.0
        index = profile.bias / amplitude
        return max(min(index, 1.0), -1.0)

