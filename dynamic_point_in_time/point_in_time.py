"""Dynamic point-in-time modelling utilities."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import fmean
from types import MappingProxyType
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "Observation",
    "SnapshotMetric",
    "PointInTimeSnapshot",
    "DynamicPointInTime",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_text(value: str, *, allow_empty: bool = False) -> str:
    text = str(value).strip()
    if not text and not allow_empty:
        raise ValueError("value must not be empty")
    return text


def _normalise_tags(tags: Sequence[str] | str | None) -> tuple[str, ...]:
    if tags is None:
        return ()
    if isinstance(tags, str):
        candidates = [part.strip() for part in tags.split(",")]
    else:
        candidates = tags
    cleaned: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        tag = str(candidate).strip().lower()
        if tag and tag not in seen:
            seen.add(tag)
            cleaned.append(tag)
    return tuple(cleaned)


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


def _normalise_window(
    value: timedelta | float | int | None,
    *,
    default: timedelta | None = None,
) -> timedelta:
    if value is None:
        if default is None:
            raise ValueError("window must be provided when no default is available")
        return default
    if isinstance(value, timedelta):
        window = value
    else:
        window = timedelta(seconds=float(value))
    if window.total_seconds() <= 0:
        raise ValueError("window must be a positive duration")
    return window


def _weighted_mean(pairs: Sequence[tuple[float, float]], *, default: float = 0.0) -> float:
    numerator = 0.0
    denominator = 0.0
    for value, weight in pairs:
        if weight <= 0:
            continue
        numerator += value * weight
        denominator += weight
    if denominator <= 0:
        return default
    return numerator / denominator


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class Observation:
    """Single metric measurement anchored to a point in time."""

    metric: str
    value: float
    timestamp: datetime = field(default_factory=_utcnow)
    weight: float = 1.0
    description: str = ""
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.metric = _normalise_text(self.metric).lower()
        self.value = float(self.value)
        self.weight = max(float(self.weight), 0.0)
        self.timestamp = _ensure_tzaware(self.timestamp) or _utcnow()
        description = self.description or self.metric
        self.description = _normalise_text(description, allow_empty=True)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "metric": self.metric,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "weight": self.weight,
            "description": self.description,
            "tags": list(self.tags),
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class SnapshotMetric:
    """Aggregated insight for a metric within a snapshot window."""

    metric: str
    count: int
    total: float
    average: float
    weighted_average: float
    minimum: float
    maximum: float

    @classmethod
    def from_observations(cls, metric: str, observations: Sequence[Observation]) -> "SnapshotMetric":
        if not observations:
            return cls(metric, 0, 0.0, 0.0, 0.0, 0.0, 0.0)
        values = [obs.value for obs in observations]
        total = float(sum(values))
        count = len(values)
        average = total / count if count else 0.0
        weighted_average = _weighted_mean(
            [(obs.value, obs.weight) for obs in observations],
            default=average,
        )
        return cls(
            metric=metric,
            count=count,
            total=total,
            average=average,
            weighted_average=weighted_average,
            minimum=min(values),
            maximum=max(values),
        )

    def as_dict(self) -> MutableMapping[str, float | int | str]:
        return {
            "metric": self.metric,
            "count": self.count,
            "total": self.total,
            "average": self.average,
            "weighted_average": self.weighted_average,
            "minimum": self.minimum,
            "maximum": self.maximum,
        }


@dataclass(slots=True)
class PointInTimeSnapshot:
    """Windowed view over observations relative to a reference moment."""

    timestamp: datetime
    start: datetime
    window: timedelta
    observations: tuple[Observation, ...]
    metrics: Mapping[str, SnapshotMetric]
    tag_counts: Mapping[str, int]

    def __post_init__(self) -> None:
        self.timestamp = _ensure_tzaware(self.timestamp) or _utcnow()
        self.start = _ensure_tzaware(self.start) or self.timestamp

    @property
    def duration(self) -> timedelta:
        return self.window

    @property
    def count(self) -> int:
        return len(self.observations)

    @property
    def overall_average(self) -> float:
        if not self.observations:
            return 0.0
        return fmean(obs.value for obs in self.observations)

    @property
    def overall_weighted_average(self) -> float:
        if not self.observations:
            return 0.0
        return _weighted_mean(
            [(obs.value, obs.weight) for obs in self.observations],
            default=self.overall_average,
        )

    def metric(self, name: str) -> SnapshotMetric | None:
        key = name.strip().lower()
        return self.metrics.get(key)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "start": self.start.isoformat(),
            "window_seconds": self.window.total_seconds(),
            "observations": [obs.as_dict() for obs in self.observations],
            "metrics": {name: metric.as_dict() for name, metric in self.metrics.items()},
            "tag_counts": dict(self.tag_counts),
            "overall_average": self.overall_average,
            "overall_weighted_average": self.overall_weighted_average,
        }


# ---------------------------------------------------------------------------
# core engine


class DynamicPointInTime:
    """Maintain and interrogate rolling point-in-time observations."""

    def __init__(
        self,
        *,
        horizon: timedelta | float | int | None = timedelta(days=30),
    ) -> None:
        self._observations: list[Observation] = []
        self.horizon = _normalise_window(horizon, default=timedelta(days=30)) if horizon is not None else None

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._observations)

    @property
    def latest(self) -> Observation | None:
        if not self._observations:
            return None
        return self._observations[-1]

    def record(
        self,
        metric: str,
        value: float,
        *,
        timestamp: datetime | None = None,
        weight: float = 1.0,
        description: str | None = None,
        tags: Sequence[str] | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> Observation:
        observation = Observation(
            metric=metric,
            value=value,
            timestamp=_ensure_tzaware(timestamp) or _utcnow(),
            weight=weight,
            description=description or metric,
            tags=tags,
            metadata=metadata,
        )
        self._insert_observation(observation)
        self._prune(reference=observation.timestamp)
        return observation

    def extend(self, observations: Iterable[Observation]) -> None:
        for observation in observations:
            if not isinstance(observation, Observation):
                raise TypeError("extend() expects Observation instances")
            self._insert_observation(observation)
        self._prune()

    def snapshot(
        self,
        *,
        at: datetime | None = None,
        window: timedelta | float | int | None = None,
    ) -> PointInTimeSnapshot:
        reference = _ensure_tzaware(at) or _utcnow()
        default_window = self.horizon or timedelta(hours=1)
        window_delta = _normalise_window(window, default=default_window)
        start = reference - window_delta
        self._prune(reference=reference)

        grouped: dict[str, list[Observation]] = defaultdict(list)
        tags_counter: Counter[str] = Counter()
        windowed: list[Observation] = []
        for observation in self._observations:
            if observation.timestamp < start:
                continue
            if observation.timestamp > reference:
                break
            grouped[observation.metric].append(observation)
            if observation.tags:
                tags_counter.update(observation.tags)
            windowed.append(observation)

        metrics_proxy = MappingProxyType(
            {name: SnapshotMetric.from_observations(name, items) for name, items in grouped.items()}
        )
        tag_counts_proxy = MappingProxyType(dict(tags_counter))
        return PointInTimeSnapshot(
            timestamp=reference,
            start=start,
            window=window_delta,
            observations=tuple(windowed),
            metrics=metrics_proxy,
            tag_counts=tag_counts_proxy,
        )

    def history(self) -> tuple[Observation, ...]:
        return tuple(self._observations)

    # internals -------------------------------------------------------------

    def _insert_observation(self, observation: Observation) -> None:
        if not self._observations or self._observations[-1].timestamp <= observation.timestamp:
            self._observations.append(observation)
            return
        for index, existing in enumerate(self._observations):
            if observation.timestamp < existing.timestamp:
                self._observations.insert(index, observation)
                return
        self._observations.append(observation)

    def _prune(self, *, reference: datetime | None = None) -> None:
        if self.horizon is None:
            return
        cutoff = (reference or _utcnow()) - self.horizon
        removal_index = 0
        for observation in self._observations:
            if observation.timestamp >= cutoff:
                break
            removal_index += 1
        if removal_index:
            del self._observations[:removal_index]
