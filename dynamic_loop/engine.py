"""Feedback loop analytics for Dynamic Capital execution cadences."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LoopSignal",
    "LoopState",
    "LoopRecommendation",
    "LoopParameters",
    "LoopSyncResult",
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


def _normalise_domain(domain: str) -> str:
    return _normalise_text(domain).lower()


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


@dataclass(frozen=True, slots=True)
class LoopSyncResult:
    """Container bundling domain-aligned states and recommendations."""

    domain: str
    state: LoopState
    recommendations: tuple[LoopRecommendation, ...]


class DynamicLoopEngine:
    """Aggregate loop signals and highlight interventions."""

    def __init__(
        self,
        *,
        parameters: LoopParameters | None = None,
        history_limit: int | None = None,
        recommendation_limit: int | None = None,
    ) -> None:
        if history_limit is not None and history_limit <= 0:
            raise ValueError("history_limit must be positive when provided")
        if recommendation_limit is not None and recommendation_limit <= 0:
            raise ValueError("recommendation_limit must be positive when provided")

        self._parameters = parameters or LoopParameters()
        self._history_limit = history_limit
        self._recommendation_limit = recommendation_limit
        self._states: deque[LoopState] = deque(maxlen=history_limit)
        self._recommendations: deque[LoopRecommendation] = deque(
            maxlen=recommendation_limit
        )
        self._domain_states: dict[str, deque[LoopState]] = {}
        self._domain_recommendations: dict[str, deque[LoopRecommendation]] = {}

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
        recommendations = self._derive_recommendations(state)
        self._append_history(state)
        self._append_recommendations(recommendations)
        return state

    def _append_history(self, state: LoopState, *, domain: str | None = None) -> None:
        self._states.append(state)
        if domain is None:
            return

        queue = self._domain_states.get(domain)
        if queue is None or queue.maxlen != self._history_limit:
            queue = deque(queue or (), maxlen=self._history_limit)
            self._domain_states[domain] = queue
        queue.append(state)

    def _append_recommendations(
        self,
        recommendations: Sequence[LoopRecommendation],
        *,
        domain: str | None = None,
    ) -> None:
        self._recommendations.extend(recommendations)
        if domain is None:
            return

        queue = self._domain_recommendations.get(domain)
        if queue is None or queue.maxlen != self._recommendation_limit:
            queue = deque(queue or (), maxlen=self._recommendation_limit)
            self._domain_recommendations[domain] = queue
        queue.extend(recommendations)

    def latest_recommendations(
        self, domain: str | None = None
    ) -> tuple[LoopRecommendation, ...]:
        if domain is None:
            return tuple(self._recommendations)
        key = _normalise_domain(domain)
        return tuple(self._domain_recommendations.get(key, ()))

    def history(self, domain: str | None = None) -> tuple[LoopState, ...]:
        if domain is None:
            return tuple(self._states)
        key = _normalise_domain(domain)
        return tuple(self._domain_states.get(key, ()))

    def evaluate_back_to_back(
        self, signal_batches: Iterable[Sequence[LoopSignal]]
    ) -> tuple[LoopState, ...]:
        """Evaluate multiple signal batches sequentially.

        This helper optimises back-to-back execution by avoiding intermediate
        tuple creation for each call site and ensures that history/recommendation
        limits are respected while processing the collection.
        """

        states: list[LoopState] = []
        for batch in signal_batches:
            if not isinstance(batch, Sequence):
                raise TypeError("each batch must be a sequence of LoopSignal")
            states.append(self.evaluate(batch))
        return tuple(states)

    def sync_domains(
        self, domain_signals: Mapping[str, Sequence[LoopSignal]]
    ) -> tuple[LoopSyncResult, ...]:
        """Evaluate signals for multiple domains in a single pass.

        Parameters
        ----------
        domain_signals:
            Mapping of domain name → ordered sequence of :class:`LoopSignal`.

        Returns
        -------
        tuple[LoopSyncResult, ...]
            One entry per provided domain preserving the mapping order.
        """

        if not domain_signals:
            raise ValueError("domain_signals must not be empty")

        staged_results: list[
            tuple[str, LoopState, tuple[LoopRecommendation, ...]]
        ] = []
        for domain, signals in domain_signals.items():
            if not isinstance(signals, Sequence):
                raise TypeError(
                    f"signals for domain '{domain}' must be a sequence of LoopSignal"
                )
            if not signals:
                raise ValueError(
                    f"signals for domain '{domain}' must not be empty"
                )

            normalised_domain = _normalise_domain(domain)
            state = self._compute_state(signals)
            recommendations = tuple(self._derive_recommendations(state))
            staged_results.append((normalised_domain, state, recommendations))

        results: list[LoopSyncResult] = []
        for domain, state, recommendations in staged_results:
            self._append_history(state, domain=domain)
            self._append_recommendations(recommendations, domain=domain)
            results.append(
                LoopSyncResult(
                    domain=domain,
                    state=state,
                    recommendations=recommendations,
                )
            )
        return tuple(results)
