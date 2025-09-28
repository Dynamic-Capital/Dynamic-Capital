"""Feedback loop analytics for Dynamic Capital execution cadences."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LoopSignal",
    "LoopState",
    "LoopRecommendation",
    "LoopParameters",
    "DynamicLoopEngine",
]


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, float(value)))


def _normalise_tuple(items: Iterable[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True, slots=True)
class LoopParameters:
    """Thresholds and defaults used when deriving loop health."""

    stability_floor: float = 0.4
    momentum_floor: float = 0.5
    fatigue_ceiling: float = 0.6
    default_momentum: float = 0.3
    default_fatigue: float = 0.2

    def __post_init__(self) -> None:
        object.__setattr__(self, "stability_floor", _clamp(self.stability_floor))
        object.__setattr__(self, "momentum_floor", _clamp(self.momentum_floor))
        object.__setattr__(self, "fatigue_ceiling", _clamp(self.fatigue_ceiling))
        object.__setattr__(self, "default_momentum", _clamp(self.default_momentum))
        object.__setattr__(self, "default_fatigue", _clamp(self.default_fatigue))


@dataclass(slots=True)
class _LoopMetrics:
    """Intermediate aggregation details used to build the public state."""

    stability: float
    momentum: float
    fatigue: float
    insights: tuple[str, ...]


@dataclass(slots=True)
class LoopSignal:
    """Observation captured while monitoring a system or execution loop."""

    metric: str
    value: float
    weight: float = 1.0
    trend: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.metric = _normalise_text(self.metric).lower()
        self.value = float(self.value)
        self.weight = max(float(self.weight), 0.0)
        self.trend = _clamp(float(self.trend))
        self.tags = _normalise_tuple(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class LoopState:
    """Current health summary of a monitored feedback loop."""

    stability: float
    momentum: float
    fatigue: float
    insights: tuple[str, ...]
    updated_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "stability": self.stability,
            "momentum": self.momentum,
            "fatigue": self.fatigue,
            "insights": list(self.insights),
            "updated_at": self.updated_at.isoformat(),
        }


@dataclass(slots=True)
class LoopRecommendation:
    """Actionable suggestion generated from loop diagnostics."""

    focus: str
    narrative: str
    priority: float
    tags: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "focus": self.focus,
            "narrative": self.narrative,
            "priority": self.priority,
            "tags": list(self.tags),
        }


class DynamicLoopEngine:
    """Aggregate loop signals and highlight interventions."""

    def __init__(self, *, parameters: LoopParameters | None = None) -> None:
        self._parameters = parameters or LoopParameters()
        self._states: list[LoopState] = []
        self._recommendations: list[LoopRecommendation] = []

    @property
    def parameters(self) -> LoopParameters:
        """Return the configuration driving evaluation thresholds."""

        return self._parameters

    def _aggregate_signals(self, signals: Sequence[LoopSignal]) -> _LoopMetrics:
        if not signals:
            raise ValueError("loop signals are required to compute state")

        weighted_sum = sum(signal.value * signal.weight for signal in signals)
        total_weight = sum(signal.weight for signal in signals) or 1.0
        average_variance = weighted_sum / total_weight
        stability = _clamp(1.0 - min(abs(average_variance), 1.0))

        positive_trends = [signal.trend for signal in signals if signal.value >= 0]
        negative_trends = [signal.trend for signal in signals if signal.value < 0]

        if positive_trends:
            momentum = _clamp(fmean(positive_trends))
        else:
            momentum = self._parameters.default_momentum

        if negative_trends:
            fatigue = _clamp(fmean(negative_trends))
        else:
            fatigue = self._parameters.default_fatigue

        metric_groups: dict[str, list[float]] = {}
        for signal in signals:
            metric_groups.setdefault(signal.metric, []).append(signal.value)

        insights = tuple(
            f"Signal '{metric}' variance {abs(fmean(values)):.2f}"
            for metric, values in sorted(metric_groups.items())
        )

        return _LoopMetrics(
            stability=stability,
            momentum=momentum,
            fatigue=fatigue,
            insights=insights,
        )

    def _compute_state(self, signals: Sequence[LoopSignal]) -> LoopState:
        metrics = self._aggregate_signals(signals)
        return LoopState(
            stability=metrics.stability,
            momentum=metrics.momentum,
            fatigue=metrics.fatigue,
            insights=metrics.insights,
        )

    def _derive_recommendations(self, state: LoopState) -> list[LoopRecommendation]:
        recommendations: list[LoopRecommendation] = []
        if state.stability < self._parameters.stability_floor:
            recommendations.append(
                LoopRecommendation(
                    focus="stabilise",
                    narrative="Stability degraded; trigger incident review cadence.",
                    priority=0.9,
                    tags=("stability", "incident"),
                )
            )
        if state.momentum < self._parameters.momentum_floor:
            recommendations.append(
                LoopRecommendation(
                    focus="momentum",
                    narrative="Momentum trending low; introduce fast feedback experiments.",
                    priority=0.7,
                    tags=("experimentation", "loop"),
                )
            )
        if state.fatigue > self._parameters.fatigue_ceiling:
            recommendations.append(
                LoopRecommendation(
                    focus="recovery",
                    narrative="Fatigue rising; schedule recovery window or rotate ownership.",
                    priority=0.8,
                    tags=("resilience", "capacity"),
                )
            )
        if not recommendations:
            recommendations.append(
                LoopRecommendation(
                    focus="sustain",
                    narrative="Loop healthy; maintain cadence and monitor leading signals.",
                    priority=0.4,
                    tags=("maintenance",),
                )
            )
        return recommendations

    def evaluate(self, signals: Sequence[LoopSignal]) -> LoopState:
        state = self._compute_state(signals)
        self._states.append(state)
        recommendations = self._derive_recommendations(state)
        self._recommendations.extend(recommendations)
        return state

    def latest_recommendations(self) -> tuple[LoopRecommendation, ...]:
        return tuple(self._recommendations)

    def history(self) -> tuple[LoopState, ...]:
        return tuple(self._states)
