"""Memoryless property analytics derived from exponential smoothing."""

from __future__ import annotations

from dataclasses import dataclass

from dynamic_property import PropertyProfile, PropertySnapshot

__all__ = ["DynamicMemorylessPropertyEngine"]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _blend(previous: float, current: float, weight: float) -> float:
    return (1.0 - weight) * previous + weight * current


def _trend_delta(snapshot: PropertySnapshot, baseline: PropertyProfile) -> float:
    anchor = baseline.average_valuation or snapshot.valuation or 1.0
    delta = snapshot.valuation - baseline.average_valuation
    return delta / abs(anchor)


def _stability_from_delta(delta: float) -> float:
    return 1.0 / (1.0 + abs(delta))


@dataclass(slots=True)
class DynamicMemorylessPropertyEngine:
    """State-light property analytics that prioritise the latest signal."""

    smoothing: float = 0.35
    _profile: PropertyProfile | None = None

    def __post_init__(self) -> None:
        if not 0.0 < self.smoothing <= 1.0:
            raise ValueError("smoothing must be in the interval (0, 1]")

    @property
    def profile(self) -> PropertyProfile:
        return self._profile or PropertyProfile.empty()

    def reset(self) -> None:
        self._profile = None

    def observe(self, snapshot: PropertySnapshot) -> PropertyProfile:
        if self._profile is None or self._profile.sample_size == 0:
            self._profile = PropertyProfile(
                sample_size=1,
                average_valuation=snapshot.valuation,
                average_noi=snapshot.net_operating_income,
                average_noi_margin=snapshot.noi_margin,
                occupancy_rate=snapshot.occupancy,
                valuation_trend=0.0,
                stability_score=1.0,
                last_updated=snapshot.timestamp,
            )
            return self._profile

        weight = self.smoothing
        previous = self._profile
        delta = _trend_delta(snapshot, previous)
        stability = _blend(previous.stability_score, _stability_from_delta(delta), weight)

        self._profile = PropertyProfile(
            sample_size=previous.sample_size + 1,
            average_valuation=_blend(previous.average_valuation, snapshot.valuation, weight),
            average_noi=_blend(previous.average_noi, snapshot.net_operating_income, weight),
            average_noi_margin=_clamp(
                _blend(previous.average_noi_margin, snapshot.noi_margin, weight),
                lower=-1.0,
                upper=1.0,
            ),
            occupancy_rate=_clamp(
                _blend(previous.occupancy_rate, snapshot.occupancy, weight)
            ),
            valuation_trend=_blend(previous.valuation_trend, delta, weight),
            stability_score=_clamp(stability, lower=0.0, upper=1.0),
            last_updated=snapshot.timestamp,
        )
        return self._profile
