"""Dynamic property intelligence with cache-aware analytics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, Sequence

__all__ = [
    "PropertySnapshot",
    "PropertyProfile",
    "DynamicPropertyEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(timestamp: datetime | None) -> datetime:
    if timestamp is None:
        return _utcnow()
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class PropertySnapshot:
    """Single observation of a property's financial footing."""

    timestamp: datetime
    valuation: float
    rental_income: float
    operating_expenses: float
    occupancy: float
    units: int = 1
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.timestamp = _ensure_utc(self.timestamp)
        self.valuation = float(self.valuation)
        self.rental_income = float(self.rental_income)
        self.operating_expenses = float(self.operating_expenses)
        if self.units <= 0:
            raise ValueError("units must be positive")
        self.occupancy = _clamp(float(self.occupancy))
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def net_operating_income(self) -> float:
        return self.rental_income - self.operating_expenses

    @property
    def noi_margin(self) -> float:
        if self.rental_income == 0:
            return 0.0
        return max(-1.0, min(1.0, self.net_operating_income / self.rental_income))

    @property
    def effective_occupancy(self) -> float:
        return self.occupancy * self.units


@dataclass(slots=True)
class PropertyProfile:
    """Aggregated insight derived from a collection of property snapshots."""

    sample_size: int = 0
    average_valuation: float = 0.0
    average_noi: float = 0.0
    average_noi_margin: float = 0.0
    occupancy_rate: float = 0.0
    valuation_trend: float = 0.0
    stability_score: float = 1.0
    last_updated: datetime | None = None

    @classmethod
    def empty(cls) -> "PropertyProfile":
        return cls()

    def as_dict(self) -> dict[str, object]:
        return {
            "sample_size": self.sample_size,
            "average_valuation": self.average_valuation,
            "average_noi": self.average_noi,
            "average_noi_margin": self.average_noi_margin,
            "occupancy_rate": self.occupancy_rate,
            "valuation_trend": self.valuation_trend,
            "stability_score": self.stability_score,
            "last_updated": self.last_updated,
        }


class DynamicPropertyEngine:
    """Maintains a rolling window of property observations for analytics."""

    def __init__(self, *, window: int = 60) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._snapshots: Deque[PropertySnapshot] = deque(maxlen=window)
        self._dirty = True
        self._cached_profile: PropertyProfile | None = None

    @property
    def window(self) -> int:
        maxlen = self._snapshots.maxlen
        return 0 if maxlen is None else maxlen

    def __len__(self) -> int:  # pragma: no cover - trivial glue
        return len(self._snapshots)

    @property
    def profile(self) -> PropertyProfile:
        if not self._snapshots:
            return PropertyProfile.empty()
        if self._dirty or self._cached_profile is None:
            self._cached_profile = self._compute_profile(tuple(self._snapshots))
            self._dirty = False
        return self._cached_profile

    def observe(self, snapshot: PropertySnapshot) -> PropertyProfile:
        if self._snapshots.maxlen is not None and len(self._snapshots) == self._snapshots.maxlen:
            # ``deque`` will drop the oldest snapshot, so mark cache dirty.
            self._snapshots.popleft()
        self._snapshots.append(snapshot)
        self._dirty = True
        return self.profile

    def observe_many(self, snapshots: Iterable[PropertySnapshot]) -> PropertyProfile:
        for snapshot in snapshots:
            self.observe(snapshot)
        return self.profile

    def clear(self) -> None:
        self._snapshots.clear()
        self._cached_profile = None
        self._dirty = True

    def valuation_series(self) -> tuple[float, ...]:
        return tuple(snapshot.valuation for snapshot in self._snapshots)

    def _compute_profile(self, snapshots: Sequence[PropertySnapshot]) -> PropertyProfile:
        sample_size = len(snapshots)
        valuations = [snapshot.valuation for snapshot in snapshots]
        nois = [snapshot.net_operating_income for snapshot in snapshots]
        noi_margins = [snapshot.noi_margin for snapshot in snapshots]
        units_total = sum(snapshot.units for snapshot in snapshots)
        occupancy = sum(snapshot.effective_occupancy for snapshot in snapshots)

        average_valuation = sum(valuations) / sample_size
        average_noi = sum(nois) / sample_size
        average_noi_margin = sum(noi_margins) / sample_size
        occupancy_rate = occupancy / units_total if units_total else 0.0

        if sample_size > 1:
            base = valuations[0]
            change = valuations[-1] - base
            normaliser = abs(base) if base else 1.0
            valuation_trend = change / normaliser
            mean_val = average_valuation
            variance = sum((value - mean_val) ** 2 for value in valuations) / sample_size
            volatility = variance ** 0.5
            stability_score = 1.0 / (1.0 + volatility / max(abs(mean_val), 1.0))
        else:
            valuation_trend = 0.0
            stability_score = 1.0

        return PropertyProfile(
            sample_size=sample_size,
            average_valuation=average_valuation,
            average_noi=average_noi,
            average_noi_margin=average_noi_margin,
            occupancy_rate=_clamp(occupancy_rate),
            valuation_trend=valuation_trend,
            stability_score=_clamp(stability_score, lower=0.0, upper=1.0),
            last_updated=snapshots[-1].timestamp,
        )
