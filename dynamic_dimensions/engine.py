"""Dynamic dimensional analysis utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean, pstdev
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping

__all__ = [
    "DimensionAxis",
    "DimensionProfile",
    "DimensionSnapshot",
    "DynamicDimensionEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_text(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


def _clamp_unit(value: float) -> float:
    numeric = float(value)
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric


@dataclass(slots=True)
class DimensionAxis:
    """Definition for a strategic dimension."""

    key: str
    label: str
    weight: float = 1.0
    description: str | None = None
    category: str | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_text(self.key).lower()
        self.label = _normalise_text(self.label)
        self.weight = float(self.weight)
        if self.weight <= 0:
            raise ValueError("weight must be positive")
        if self.description is not None:
            self.description = _normalise_text(self.description)
        self.category = _normalise_optional_text(self.category)


@dataclass(frozen=True, slots=True)
class DimensionSnapshot:
    """Single observation across dimensions."""

    values: Mapping[str, float]
    timestamp: datetime = field(default_factory=_utcnow)
    note: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        normalised: dict[str, float] = {}
        for key, value in self.values.items():
            cleaned_key = _normalise_text(key).lower()
            normalised[cleaned_key] = _clamp_unit(value)
        object.__setattr__(self, "values", MappingProxyType(normalised))
        object.__setattr__(self, "timestamp", _ensure_tzaware(self.timestamp) or _utcnow())
        object.__setattr__(self, "note", _normalise_optional_text(self.note))
        object.__setattr__(self, "metadata", _normalise_metadata(self.metadata))

    def get(self, key: str, default: float | None = None) -> float | None:
        return self.values.get(key, default)


@dataclass(frozen=True, slots=True)
class DimensionProfile:
    """Aggregated dimension analytics."""

    composite: float
    axis_scores: Mapping[str, float]
    momentum: float
    volatility: float
    sample_size: int
    category_scores: Mapping[str, float] = field(default_factory=dict)
    axis_momentum: Mapping[str, float] = field(default_factory=dict)
    axis_volatility: Mapping[str, float] = field(default_factory=dict)
    category_momentum: Mapping[str, float] = field(default_factory=dict)
    category_volatility: Mapping[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.sample_size <= 0:
            raise ValueError("sample_size must be positive")
        object.__setattr__(self, "composite", _clamp_unit(self.composite))
        object.__setattr__(self, "momentum", float(self.momentum))
        object.__setattr__(self, "volatility", max(float(self.volatility), 0.0))
        scores = {key: _clamp_unit(value) for key, value in self.axis_scores.items()}
        object.__setattr__(self, "axis_scores", MappingProxyType(scores))
        categories = {key: _clamp_unit(value) for key, value in self.category_scores.items()}
        object.__setattr__(self, "category_scores", MappingProxyType(categories))
        axis_momentum = {key: float(value) for key, value in self.axis_momentum.items()}
        object.__setattr__(self, "axis_momentum", MappingProxyType(axis_momentum))
        axis_volatility = {key: max(float(value), 0.0) for key, value in self.axis_volatility.items()}
        object.__setattr__(self, "axis_volatility", MappingProxyType(axis_volatility))
        category_momentum = {key: float(value) for key, value in self.category_momentum.items()}
        object.__setattr__(self, "category_momentum", MappingProxyType(category_momentum))
        category_volatility = {
            key: max(float(value), 0.0) for key, value in self.category_volatility.items()
        }
        object.__setattr__(self, "category_volatility", MappingProxyType(category_volatility))

    def top_axes(self, limit: int = 3) -> list[tuple[str, float]]:
        if limit <= 0:
            return []
        ordered = sorted(self.axis_scores.items(), key=lambda item: item[1], reverse=True)
        return ordered[:limit]

    def top_categories(self, limit: int = 3) -> list[tuple[str, float]]:
        if limit <= 0:
            return []
        ordered = sorted(self.category_scores.items(), key=lambda item: item[1], reverse=True)
        return ordered[:limit]

    def bottom_axes(self, limit: int = 3) -> list[tuple[str, float]]:
        if limit <= 0:
            return []
        ordered = sorted(self.axis_scores.items(), key=lambda item: item[1])
        return ordered[:limit]

    def bottom_categories(self, limit: int = 3) -> list[tuple[str, float]]:
        if limit <= 0:
            return []
        ordered = sorted(self.category_scores.items(), key=lambda item: item[1])
        return ordered[:limit]

    def get_axis_score(self, key: str, default: float | None = None) -> float | None:
        return self.axis_scores.get(key, default)

    def get_category_score(self, key: str, default: float | None = None) -> float | None:
        return self.category_scores.get(key, default)


class DynamicDimensionEngine:
    """Maintains a rolling dimensional intelligence profile."""

    def __init__(self, axes: Iterable[DimensionAxis], *, window: int = 12) -> None:
        axis_list = list(axes)
        if not axis_list:
            raise ValueError("at least one axis must be provided")
        self._axes: tuple[DimensionAxis, ...] = tuple(axis_list)
        self._axis_lookup: dict[str, DimensionAxis] = {}
        for axis in self._axes:
            if axis.key in self._axis_lookup:
                raise ValueError(f"duplicate axis key: {axis.key}")
            self._axis_lookup[axis.key] = axis
        self._weights = self._compute_weights()
        self._history: Deque[DimensionSnapshot] = deque(maxlen=max(int(window), 2))

    @property
    def axes(self) -> tuple[DimensionAxis, ...]:
        return self._axes

    @property
    def weights(self) -> Mapping[str, float]:
        return self._weights

    def _compute_weights(self) -> Mapping[str, float]:
        total = sum(axis.weight for axis in self._axes)
        if total <= 0:
            raise ValueError("total weight must be positive")
        weights = {axis.key: axis.weight / total for axis in self._axes}
        return MappingProxyType(weights)

    def ingest(
        self,
        values: DimensionSnapshot | Mapping[str, float],
        *,
        timestamp: datetime | None = None,
        note: str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> DimensionProfile:
        snapshot = self._coerce_snapshot(values, timestamp=timestamp, note=note, metadata=metadata)
        self._history.append(snapshot)
        return self.profile()

    def _coerce_snapshot(
        self,
        values: DimensionSnapshot | Mapping[str, float],
        *,
        timestamp: datetime | None,
        note: str | None,
        metadata: Mapping[str, object] | None,
    ) -> DimensionSnapshot:
        if isinstance(values, DimensionSnapshot):
            snapshot = values
        else:
            snapshot = DimensionSnapshot(values=values, timestamp=timestamp or _utcnow(), note=note, metadata=metadata)
        unknown = set(snapshot.values).difference(self._axis_lookup)
        if unknown:
            raise KeyError(f"unknown dimension keys: {sorted(unknown)}")
        return snapshot

    def profile(self) -> DimensionProfile:
        if not self._history:
            raise ValueError("no observations ingested yet")
        axis_scores: MutableMapping[str, float] = {}
        axis_momentum: MutableMapping[str, float] = {}
        axis_volatility: MutableMapping[str, float] = {}
        for key in self._axis_lookup:
            measurements = [snapshot.values[key] for snapshot in self._history if key in snapshot.values]
            if measurements:
                axis_scores[key] = fmean(measurements)
                axis_momentum[key] = measurements[-1] - measurements[-2] if len(measurements) >= 2 else 0.0
                axis_volatility[key] = pstdev(measurements) if len(measurements) >= 2 else 0.0
            else:
                axis_scores[key] = 0.0
                axis_momentum[key] = 0.0
                axis_volatility[key] = 0.0
        composite = sum(axis_scores[key] * self._weights[key] for key in axis_scores)
        latest_score = self._composite_for_snapshot(self._history[-1])
        if len(self._history) >= 2:
            previous_score = self._composite_for_snapshot(self._history[-2])
            momentum = latest_score - previous_score
        else:
            momentum = 0.0
        composites = [self._composite_for_snapshot(snapshot) for snapshot in self._history]
        volatility = pstdev(composites) if len(composites) >= 2 else 0.0
        category_scores = self._compute_category_scores(axis_scores)
        latest_categories = self._compute_category_scores(self._snapshot_axis_values(self._history[-1]))
        if len(self._history) >= 2:
            previous_categories = self._compute_category_scores(self._snapshot_axis_values(self._history[-2]))
        else:
            previous_categories = {}
        all_categories = set(category_scores) | set(latest_categories) | set(previous_categories)
        category_momentum = {
            category: latest_categories.get(category, 0.0) - previous_categories.get(category, 0.0)
            for category in all_categories
        }
        category_series: dict[str, list[float]] = {category: [] for category in all_categories}
        for snapshot in self._history:
            per_snapshot = self._compute_category_scores(self._snapshot_axis_values(snapshot))
            for category in all_categories:
                category_series[category].append(per_snapshot.get(category, 0.0))
        category_volatility = {
            category: pstdev(series) if len(series) >= 2 else 0.0
            for category, series in category_series.items()
        }
        return DimensionProfile(
            composite=composite,
            axis_scores=axis_scores,
            momentum=momentum,
            volatility=volatility,
            sample_size=len(self._history),
            category_scores=category_scores,
            axis_momentum=axis_momentum,
            axis_volatility=axis_volatility,
            category_momentum=category_momentum,
            category_volatility=category_volatility,
        )

    def _composite_for_snapshot(self, snapshot: DimensionSnapshot) -> float:
        return sum(snapshot.values.get(key, 0.0) * self._weights[key] for key in self._axis_lookup)

    def reset(self) -> None:
        self._history.clear()

    def _compute_category_scores(self, axis_scores: Mapping[str, float]) -> Mapping[str, float]:
        category_totals: dict[str, float] = {}
        category_weights: dict[str, float] = {}
        for axis in self._axes:
            if axis.category is None:
                continue
            score = axis_scores.get(axis.key)
            if score is None:
                continue
            weight = self._weights[axis.key]
            category = axis.category
            category_totals[category] = category_totals.get(category, 0.0) + score * weight
            category_weights[category] = category_weights.get(category, 0.0) + weight
        return {
            category: total / category_weights[category]
            for category, total in category_totals.items()
            if category_weights[category] > 0.0
        }

    def _snapshot_axis_values(self, snapshot: DimensionSnapshot) -> Mapping[str, float]:
        return {axis.key: snapshot.values.get(axis.key, 0.0) for axis in self._axes}
