"""Engine for evaluating memoryless properties within stochastic processes."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MemorylessObservation",
    "MemorylessContext",
    "MemorylessPropertyReport",
    "DynamicMemorylessPropertyEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _ensure_positive(value: float, *, name: str) -> float:
    numeric = float(value)
    if numeric <= 0.0:
        raise ValueError(f"{name} must be positive")
    return numeric


def _normalise_process(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("process identifier must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class MemorylessObservation:
    """Single waiting time observation within a candidate memoryless process."""

    process: str
    waiting_time: float
    occurred: bool = True
    weight: float = 1.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.process = _normalise_process(self.process)
        self.waiting_time = _ensure_positive(self.waiting_time, name="waiting_time")
        self.occurred = bool(self.occurred)
        self.weight = max(float(self.weight), 0.0)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class MemorylessContext:
    """Contextual factors guiding property evaluation."""

    process: str
    baseline_rate: float
    tolerance: float = 0.15
    weighting_decay: float = 0.0
    conditioning_thresholds: tuple[float, ...] = field(default_factory=tuple)
    narrative_hint: str | None = None

    def __post_init__(self) -> None:
        self.process = _normalise_process(self.process)
        self.baseline_rate = _ensure_positive(self.baseline_rate, name="baseline_rate")
        self.tolerance = _clamp(float(self.tolerance), lower=0.0, upper=1.0)
        self.weighting_decay = _clamp(float(self.weighting_decay), lower=0.0, upper=0.95)
        thresholds = []
        for threshold in self.conditioning_thresholds:
            cleaned = float(threshold)
            if cleaned <= 0.0:
                raise ValueError("conditioning thresholds must be positive")
            thresholds.append(cleaned)
        self.conditioning_thresholds = tuple(sorted(thresholds))
        self.narrative_hint = _normalise_optional_text(self.narrative_hint)

    @property
    def has_conditioning(self) -> bool:
        return bool(self.conditioning_thresholds)


@dataclass(slots=True)
class MemorylessPropertyReport:
    """Computed metrics summarising the memoryless property posture."""

    memoryless_score: float
    hazard_rate: float
    mean_waiting_time: float
    rate_deviation: float
    hazard_dispersion: float
    conditional_expectations: tuple[tuple[float, float], ...]
    alerts: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "memoryless_score": self.memoryless_score,
            "hazard_rate": self.hazard_rate,
            "mean_waiting_time": self.mean_waiting_time,
            "rate_deviation": self.rate_deviation,
            "hazard_dispersion": self.hazard_dispersion,
            "conditional_expectations": [list(pair) for pair in self.conditional_expectations],
            "alerts": list(self.alerts),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# evaluation engine


class DynamicMemorylessPropertyEngine:
    """Aggregate observations and evaluate the strength of the memoryless property."""

    def __init__(self, *, history: int = 256) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._observations: Deque[MemorylessObservation] = deque(maxlen=int(history))

    # ------------------------------------------------------------------ intake
    def capture(
        self, observation: MemorylessObservation | Mapping[str, object]
    ) -> MemorylessObservation:
        resolved = self._coerce_observation(observation)
        self._observations.append(resolved)
        return resolved

    def extend(self, observations: Iterable[MemorylessObservation | Mapping[str, object]]) -> None:
        for observation in observations:
            self.capture(observation)

    def reset(self) -> None:
        self._observations.clear()

    # ------------------------------------------------------------- evaluation
    def evaluate(self, context: MemorylessContext) -> MemorylessPropertyReport:
        relevant = tuple(obs for obs in self._observations if obs.process == context.process)
        if not relevant:
            raise ValueError("no observations available for the requested process")

        weighted = tuple(self._iter_weighted_observations(relevant, context))
        total_weight = sum(weight for _, _, weight in weighted)
        if total_weight <= 0.0:
            raise ValueError("observations have no effective weight")

        mean_waiting_time = sum(waiting * weight for waiting, _, weight in weighted) / total_weight
        variance = self._weighted_variance(weighted, mean_waiting_time, total_weight)
        hazard_rate = 1.0 / mean_waiting_time if mean_waiting_time > 0.0 else 0.0
        rate_deviation = abs(hazard_rate - context.baseline_rate) / max(context.baseline_rate, 1e-12)
        hazard_dispersion = variance / (mean_waiting_time**2 + 1e-12)

        conditional_expectations = self._compute_conditionals(weighted, context, mean_waiting_time)
        conditional_score = self._score_conditionals(conditional_expectations, mean_waiting_time)

        base_score = max(0.0, 1.0 - rate_deviation)
        stability_score = 1.0 / (1.0 + hazard_dispersion)
        composite_score = 0.5 * base_score + 0.3 * stability_score + 0.2 * conditional_score
        memoryless_score = _clamp(composite_score, lower=0.0, upper=1.0)

        alerts = self._generate_alerts(
            rate_deviation=rate_deviation,
            hazard_dispersion=hazard_dispersion,
            conditional_expectations=conditional_expectations,
            mean_waiting_time=mean_waiting_time,
            total_weight=total_weight,
            context=context,
        )

        narrative = self._compose_narrative(
            score=memoryless_score,
            hazard_rate=hazard_rate,
            mean_waiting_time=mean_waiting_time,
            alerts=alerts,
            context=context,
        )

        return MemorylessPropertyReport(
            memoryless_score=memoryless_score,
            hazard_rate=hazard_rate,
            mean_waiting_time=mean_waiting_time,
            rate_deviation=rate_deviation,
            hazard_dispersion=hazard_dispersion,
            conditional_expectations=conditional_expectations,
            alerts=alerts,
            narrative=narrative,
        )

    # -------------------------------------------------------------- internals
    def _coerce_observation(
        self, observation: MemorylessObservation | Mapping[str, object]
    ) -> MemorylessObservation:
        if isinstance(observation, MemorylessObservation):
            return observation
        if not isinstance(observation, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("observation must be a mapping or MemorylessObservation")
        return MemorylessObservation(**observation)

    def _iter_weighted_observations(
        self,
        observations: Sequence[MemorylessObservation],
        context: MemorylessContext,
    ) -> Iterable[tuple[float, bool, float]]:
        if not context.weighting_decay:
            for observation in observations:
                yield observation.waiting_time, observation.occurred, observation.weight
            return

        decay = context.weighting_decay
        power = len(observations)
        for observation in observations:
            power -= 1
            decay_weight = (1.0 - decay) ** power
            yield (
                observation.waiting_time,
                observation.occurred,
                observation.weight * decay_weight,
            )

    def _weighted_variance(
        self,
        weighted: Sequence[tuple[float, bool, float]],
        mean: float,
        total_weight: float,
    ) -> float:
        if total_weight <= 0.0:
            return 0.0
        squared = sum(((waiting - mean) ** 2) * weight for waiting, _, weight in weighted)
        return squared / total_weight

    def _compute_conditionals(
        self,
        weighted: Sequence[tuple[float, bool, float]],
        context: MemorylessContext,
        mean_waiting_time: float,
    ) -> tuple[tuple[float, float], ...]:
        if not context.has_conditioning:
            return ()

        results: list[tuple[float, float]] = []
        for threshold in context.conditioning_thresholds:
            numerator = 0.0
            denominator = 0.0
            for waiting_time, occurred, weight in weighted:
                if waiting_time > threshold and occurred:
                    numerator += (waiting_time - threshold) * weight
                    denominator += weight
            if denominator <= 0.0:
                expectation = mean_waiting_time
            else:
                expectation = numerator / denominator
            results.append((threshold, expectation))
        return tuple(results)

    def _score_conditionals(
        self,
        conditional_expectations: Sequence[tuple[float, float]],
        mean_waiting_time: float,
    ) -> float:
        if not conditional_expectations:
            return 1.0
        if mean_waiting_time <= 0.0:
            return 0.0
        penalties = []
        for _, expectation in conditional_expectations:
            deviation = abs(expectation - mean_waiting_time)
            penalties.append(deviation / max(mean_waiting_time, 1e-12))
        average_penalty = sum(penalties) / len(penalties)
        return max(0.0, 1.0 - average_penalty)

    def _generate_alerts(
        self,
        *,
        rate_deviation: float,
        hazard_dispersion: float,
        conditional_expectations: Sequence[tuple[float, float]],
        mean_waiting_time: float,
        total_weight: float,
        context: MemorylessContext,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if total_weight < 3.0:
            alerts.append("insufficient observations for confident assessment")
        if rate_deviation > context.tolerance:
            alerts.append("hazard rate deviates beyond tolerance")
        if hazard_dispersion > 1.0:
            alerts.append("waiting time dispersion is high relative to the mean")
        for threshold, expectation in conditional_expectations:
            deviation = abs(expectation - mean_waiting_time)
            if deviation > mean_waiting_time * (context.tolerance + 0.1):
                alerts.append(
                    f"conditional expectation above {threshold:.2f} deviates from baseline"
                )
        return tuple(alerts)

    def _compose_narrative(
        self,
        *,
        score: float,
        hazard_rate: float,
        mean_waiting_time: float,
        alerts: Sequence[str],
        context: MemorylessContext,
    ) -> str:
        parts = [
            f"Process '{context.process}' exhibits a memoryless score of {score:.2f}.",
            f"Observed hazard rate {hazard_rate:.4f} contrasts with baseline {context.baseline_rate:.4f}.",
            f"Mean waiting time estimated at {mean_waiting_time:.4f} units.",
        ]
        if context.narrative_hint:
            parts.append(context.narrative_hint)
        if alerts:
            parts.append("Alerts: " + "; ".join(alerts) + ".")
        else:
            parts.append("No operational alerts triggered.")
        return " ".join(parts)
