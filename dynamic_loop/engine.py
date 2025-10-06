"""Feedback loop analytics for Dynamic Capital execution cadences."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LoopSignal",
    "LoopState",
    "LoopRecommendation",
    "LoopEquation",
    "LoopEquationDelta",
    "LoopEquationTimelineEntry",
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
    stability_weight: float = 0.45
    momentum_weight: float = 0.35
    fatigue_weight: float = 0.2

    def __post_init__(self) -> None:
        object.__setattr__(self, "stability_floor", _clamp(self.stability_floor))
        object.__setattr__(self, "momentum_floor", _clamp(self.momentum_floor))
        object.__setattr__(self, "fatigue_ceiling", _clamp(self.fatigue_ceiling))
        object.__setattr__(self, "default_momentum", _clamp(self.default_momentum))
        object.__setattr__(self, "default_fatigue", _clamp(self.default_fatigue))

        weights = (
            max(float(self.stability_weight), 0.0),
            max(float(self.momentum_weight), 0.0),
            max(float(self.fatigue_weight), 0.0),
        )
        total = sum(weights)
        if total <= 0:
            raise ValueError("loop score weights must sum to a positive value")

        normalised = tuple(weight / total for weight in weights)
        object.__setattr__(self, "stability_weight", normalised[0])
        object.__setattr__(self, "momentum_weight", normalised[1])
        object.__setattr__(self, "fatigue_weight", normalised[2])


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


@dataclass(slots=True)
class LoopEquationTimelineEntry:
    """Structured commentary for each stage in a loop equation."""

    stage: str
    score: float
    stability: float
    momentum: float
    fatigue: float
    terms: tuple[str, ...]
    commentary: str
    captured_at: datetime

    def __post_init__(self) -> None:
        self.stage = _normalise_text(self.stage).lower()
        self.score = float(self.score)
        self.stability = float(self.stability)
        self.momentum = float(self.momentum)
        self.fatigue = float(self.fatigue)
        self.terms = tuple(term.strip() for term in self.terms if term.strip())
        self.commentary = _normalise_text(self.commentary)
        if not isinstance(self.captured_at, datetime):
            raise TypeError("captured_at must be a datetime instance")

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "stage": self.stage,
            "score": self.score,
            "stability": self.stability,
            "momentum": self.momentum,
            "fatigue": self.fatigue,
            "terms": list(self.terms),
            "commentary": self.commentary,
            "captured_at": self.captured_at.isoformat(),
        }


@dataclass(slots=True)
class LoopEquationDelta:
    """Delta insights between two consecutive loop stages."""

    direction: str
    magnitude: float
    narrative: str
    confidence: float

    def __post_init__(self) -> None:
        direction = _normalise_text(self.direction).lower()
        if direction not in {"positive", "negative", "neutral"}:
            raise ValueError("direction must be positive, negative, or neutral")
        self.direction = direction
        self.magnitude = round(float(self.magnitude), 4)
        self.narrative = _normalise_text(self.narrative)
        self.confidence = round(_clamp(float(self.confidence)), 4)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "direction": self.direction,
            "magnitude": self.magnitude,
            "narrative": self.narrative,
            "confidence": self.confidence,
        }


@dataclass(slots=True)
class LoopEquation:
    """Summarise a back-to-back review ➜ optimise loop."""

    review_state: LoopState
    optimise_state: LoopState
    review_score: float
    optimise_score: float
    score_delta: float
    review_terms: tuple[str, ...]
    optimise_terms: tuple[str, ...]
    steps: tuple[str, ...] = field(default_factory=tuple)
    cadence: str = "review-optimize"
    timeline: tuple[LoopEquationTimelineEntry, ...] = field(default_factory=tuple)
    delta: LoopEquationDelta | None = None
    computed_at: datetime = field(default_factory=_utcnow)
    parameters_snapshot: Mapping[str, float] = field(default_factory=dict)
    version: str = "2024.1"

    def __post_init__(self) -> None:
        if self.delta is None:
            raise ValueError("delta details are required for loop equations")
        self.parameters_snapshot = dict(self.parameters_snapshot)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "review": self.review_state.as_dict(),
            "optimise": self.optimise_state.as_dict(),
            "review_score": self.review_score,
            "optimise_score": self.optimise_score,
            "score_delta": self.score_delta,
            "review_terms": list(self.review_terms),
            "optimise_terms": list(self.optimise_terms),
            "steps": list(self.steps),
            "cadence": self.cadence,
            "timeline": [entry.as_dict() for entry in self.timeline],
            "delta": self.delta.as_dict() if self.delta else None,
            "computed_at": self.computed_at.isoformat(),
            "version": self.version,
            "parameters": dict(self.parameters_snapshot),
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

        total_weight = sum(signal.weight for signal in signals) or 1.0
        weighted_variance = (
            sum(abs(signal.value) * signal.weight for signal in signals) / total_weight
        )
        stability = _clamp(1.0 - min(weighted_variance, 1.0))

        positive_signals = [signal for signal in signals if signal.value >= 0]
        if positive_signals:
            strength_denominator = sum(signal.weight for signal in positive_signals) or 1.0
            momentum = _clamp(
                sum(signal.trend * signal.weight for signal in positive_signals)
                / strength_denominator
            )
        else:
            momentum = self._parameters.default_momentum

        negative_signals = [signal for signal in signals if signal.value < 0]
        if negative_signals:
            fatigue_numerator = 0.0
            fatigue_denominator = 0.0
            for signal in negative_signals:
                severity_weight = signal.weight * (1.0 + min(abs(signal.value), 1.0))
                fatigue_numerator += (1.0 - signal.trend) * severity_weight
                fatigue_denominator += severity_weight
            fatigue = _clamp(fatigue_numerator / (fatigue_denominator or 1.0))
        else:
            fatigue = self._parameters.default_fatigue

        metric_groups: dict[str, list[LoopSignal]] = {}
        for signal in signals:
            metric_groups.setdefault(signal.metric, []).append(signal)

        insights: list[str] = []
        for metric, items in sorted(metric_groups.items()):
            magnitude = fmean(abs(item.value) for item in items)
            average_trend = fmean(item.trend for item in items)
            negatives = sum(1 for item in items if item.value < 0)
            line = f"Signal '{metric}' |Δ| {magnitude:.2f}, trend {average_trend:.2f}"
            if negatives:
                line += f", negatives {negatives}/{len(items)}"
            insights.append(line)

        return _LoopMetrics(
            stability=stability,
            momentum=momentum,
            fatigue=fatigue,
            insights=tuple(insights),
        )

    def _compute_state(self, signals: Sequence[LoopSignal]) -> LoopState:
        metrics = self._aggregate_signals(signals)
        return LoopState(
            stability=metrics.stability,
            momentum=metrics.momentum,
            fatigue=metrics.fatigue,
            insights=metrics.insights,
        )

    def _score_state(self, state: LoopState) -> tuple[float, tuple[str, ...]]:
        stability_weight = self._parameters.stability_weight
        momentum_weight = self._parameters.momentum_weight
        fatigue_weight = self._parameters.fatigue_weight

        stability_term = stability_weight * state.stability
        momentum_term = momentum_weight * state.momentum
        resilience_term = fatigue_weight * (1.0 - state.fatigue)

        score = round(stability_term + momentum_term + resilience_term, 4)
        terms = (
            f"{stability_weight:.2f}×stability({state.stability:.2f})",
            f"{momentum_weight:.2f}×momentum({state.momentum:.2f})",
            f"{fatigue_weight:.2f}×resilience({1.0 - state.fatigue:.2f})",
        )
        return score, terms

    def _derive_recommendations(self, state: LoopState) -> list[LoopRecommendation]:
        recommendations: list[LoopRecommendation] = []
        healthy = True
        if state.stability < self._parameters.stability_floor:
            recommendations.append(
                LoopRecommendation(
                    focus="stabilise",
                    narrative="Stability degraded; trigger incident review cadence.",
                    priority=0.9,
                    tags=("stability", "incident"),
                )
            )
            healthy = False
        if state.momentum < self._parameters.momentum_floor:
            recommendations.append(
                LoopRecommendation(
                    focus="momentum",
                    narrative="Momentum trending low; introduce fast feedback experiments.",
                    priority=0.7,
                    tags=("experimentation", "loop"),
                )
            )
            healthy = False
        if state.fatigue > self._parameters.fatigue_ceiling:
            recommendations.append(
                LoopRecommendation(
                    focus="recovery",
                    narrative="Fatigue rising; schedule recovery window or rotate ownership.",
                    priority=0.8,
                    tags=("resilience", "capacity"),
                )
            )
            healthy = False
        if healthy:
            if (
                state.stability >= 0.85
                and state.momentum >= 0.8
                and state.fatigue <= 0.25
            ):
                recommendations.append(
                    LoopRecommendation(
                        focus="amplify",
                        narrative="Loop thriving; amplify experiments and share playbook with adjacent teams.",
                        priority=0.6,
                        tags=("expansion", "sharing"),
                    )
                )
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

    def review_optimize_back_to_back(
        self,
        review_signals: Sequence[LoopSignal],
        optimize_signals: Sequence[LoopSignal],
    ) -> LoopEquation:
        """Run a review ➜ optimise loop and compute its composite score."""

        review_state = self.evaluate(review_signals)
        optimise_state = self.evaluate(optimize_signals)

        review_score, review_terms = self._score_state(review_state)
        optimise_score, optimise_terms = self._score_state(optimise_state)

        score_delta = round(optimise_score - review_score, 4)
        timeline = (
            self._build_timeline_entry(
                stage="review",
                state=review_state,
                score=review_score,
                terms=review_terms,
            ),
            self._build_timeline_entry(
                stage="optimise",
                state=optimise_state,
                score=optimise_score,
                terms=optimise_terms,
            ),
        )
        delta = self._build_delta(score_delta)
        steps = tuple(entry.commentary for entry in timeline) + (delta.narrative,)

        return LoopEquation(
            review_state=review_state,
            optimise_state=optimise_state,
            review_score=review_score,
            optimise_score=optimise_score,
            score_delta=score_delta,
            review_terms=review_terms,
            optimise_terms=optimise_terms,
            steps=steps,
            timeline=timeline,
            delta=delta,
            parameters_snapshot=asdict(self._parameters),
        )

    def latest_recommendations(self) -> tuple[LoopRecommendation, ...]:
        return tuple(self._recommendations)

    def history(self) -> tuple[LoopState, ...]:
        return tuple(self._states)

    def _build_timeline_entry(
        self,
        *,
        stage: str,
        state: LoopState,
        score: float,
        terms: Sequence[str],
    ) -> LoopEquationTimelineEntry:
        stage_title = stage.replace("-", " ").title()
        commentary = (
            f"{stage_title} stage: stability={state.stability:.2f}, momentum={state.momentum:.2f}, "
            f"fatigue={state.fatigue:.2f} -> score={score:.4f} ({' + '.join(terms)})"
        )
        return LoopEquationTimelineEntry(
            stage=stage,
            score=score,
            stability=state.stability,
            momentum=state.momentum,
            fatigue=state.fatigue,
            terms=tuple(terms),
            commentary=commentary,
            captured_at=state.updated_at,
        )

    def _build_delta(self, score_delta: float) -> LoopEquationDelta:
        magnitude = round(abs(score_delta), 4)
        if magnitude <= 1e-4:
            direction = "neutral"
            descriptor = "held steady"
        elif score_delta > 0:
            direction = "positive"
            descriptor = "improved"
        else:
            direction = "negative"
            descriptor = "regressed"

        if magnitude >= 0.075:
            significance = "meaningful shift"
        elif magnitude >= 0.03:
            significance = "notable change"
        else:
            significance = "subtle change"

        base_confidence = 0.5 if magnitude == 0 else 0.55 + min(magnitude * 6.0, 0.35)
        confidence = round(_clamp(base_confidence), 4)

        narrative = (
            f"Delta: optimise minus review = {score_delta:+.4f} ({descriptor}, {significance})."
        )
        return LoopEquationDelta(
            direction=direction,
            magnitude=magnitude,
            narrative=narrative,
            confidence=confidence,
        )
