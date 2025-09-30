"""Predictive orchestration primitives for Dynamic Capital.

The predictive engine keeps a rolling window of qualitative and quantitative
signals.  Consumers can ingest features that express directional conviction,
volatility, and strategic impact, then request an insight frame for a target
scenario.  The engine blends the signal momentum with scenario posture and
returns actionable guidance that highlights catalysts, inhibitors, and risk
levels.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "PredictiveFeature",
    "PredictiveScenario",
    "PredictiveInsight",
    "PredictiveConfiguration",
    "PredictiveTrainingSample",
    "DynamicPredictiveEngine",
]


# ---------------------------------------------------------------------------
# public configuration and training primitives


@dataclass(slots=True)
class PredictiveConfiguration:
    """Tunables that shape the predictive model behaviour."""

    optimism_bias_weight: float = 0.35
    volatility_weight: float = 0.7
    risk_appetite_weight: float = 0.25
    inhibitor_weight: float = 0.03
    momentum_scale: float = 2.0
    confidence_weight: float = 0.7
    execution_weight: float = 0.4
    execution_bias: float = 0.6

    def __post_init__(self) -> None:
        self.optimism_bias_weight = _clamp(float(self.optimism_bias_weight), lower=0.0, upper=1.0)
        self.volatility_weight = _clamp(float(self.volatility_weight), lower=0.0, upper=1.5)
        self.risk_appetite_weight = _clamp(float(self.risk_appetite_weight), lower=0.0, upper=1.0)
        self.inhibitor_weight = _clamp(float(self.inhibitor_weight), lower=0.0, upper=0.2)
        self.momentum_scale = _clamp(float(self.momentum_scale), lower=0.5, upper=4.0)
        self.confidence_weight = _clamp(float(self.confidence_weight), lower=0.0, upper=1.0)
        self.execution_weight = _clamp(float(self.execution_weight), lower=0.0, upper=1.0)
        self.execution_bias = _clamp(float(self.execution_bias), lower=0.3, upper=1.0)

    def copy(self) -> "PredictiveConfiguration":
        return PredictiveConfiguration(
            optimism_bias_weight=self.optimism_bias_weight,
            volatility_weight=self.volatility_weight,
            risk_appetite_weight=self.risk_appetite_weight,
            inhibitor_weight=self.inhibitor_weight,
            momentum_scale=self.momentum_scale,
            confidence_weight=self.confidence_weight,
            execution_weight=self.execution_weight,
            execution_bias=self.execution_bias,
        )

    def adjust(self, **deltas: float) -> None:
        """Apply incremental updates to configuration values with clamping."""

        for key, delta in deltas.items():
            if delta == 0:
                continue
            current = getattr(self, key)
            setattr(self, key, current + float(delta))
        self.__post_init__()


@dataclass(slots=True)
class PredictiveTrainingSample:
    """Supervised optimisation sample for the predictive engine."""

    features: Sequence[Mapping[str, object] | "PredictiveFeature"]
    scenario: Mapping[str, object] | "PredictiveScenario"
    target_score: float
    target_risk: float
    target_confidence: float | None = None

    def __post_init__(self) -> None:
        self.features = tuple(self.features)
        if not self.features:
            raise ValueError("training sample requires at least one feature")
        if not isinstance(self.scenario, (PredictiveScenario, Mapping)):
            raise TypeError("scenario must be PredictiveScenario or mapping")
        self.target_score = _clamp(float(self.target_score))
        self.target_risk = _clamp(float(self.target_risk))
        if self.target_confidence is not None:
            self.target_confidence = _clamp(float(self.target_confidence))


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower must be <= upper")
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _to_unit_interval(value: float) -> float:
    """Convert a value in ``[-1, 1]`` to ``[0, 1]`` and clamp extra range."""

    return _clamp((value + 1.0) / 2.0)


def _weighted_mean(values: Sequence[float], weights: Sequence[float]) -> float:
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    return sum(v * w for v, w in zip(values, weights)) / total_weight


def _split_signal_window(signals: Sequence[float]) -> tuple[float, float]:
    if not signals:
        return 0.0, 0.0
    midpoint = len(signals) // 2
    if midpoint == 0:
        average = sum(signals) / len(signals)
        return average, average
    leading = signals[:midpoint]
    trailing = signals[midpoint:]
    head = sum(leading) / len(leading)
    tail = sum(trailing) / len(trailing)
    return head, tail


def _collect_attributes(
    features: Sequence["PredictiveFeature"], attribute: str
) -> tuple[str, ...]:
    collected: list[str] = []
    seen: set[str] = set()
    for feature in features:
        values: Sequence[str] = getattr(feature, attribute)
        for value in values:
            if value not in seen:
                seen.add(value)
                collected.append(value)
    return tuple(collected)


def _coerce_feature(
    feature: "PredictiveFeature" | Mapping[str, object]
) -> "PredictiveFeature":
    if isinstance(feature, PredictiveFeature):
        return feature
    if isinstance(feature, Mapping):
        return PredictiveFeature(**feature)
    raise TypeError("feature must be PredictiveFeature or mapping")


def _coerce_features(
    features: Sequence["PredictiveFeature" | Mapping[str, object]]
) -> tuple["PredictiveFeature", ...]:
    return tuple(_coerce_feature(feature) for feature in features)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class PredictiveFeature:
    """Weighted observation captured by the predictive engine."""

    name: str
    signal: float
    confidence: float = 0.5
    volatility: float = 0.3
    impact: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    catalysts: tuple[str, ...] = field(default_factory=tuple)
    inhibitors: tuple[str, ...] = field(default_factory=tuple)
    notes: str = ""
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.signal = _clamp(float(self.signal), lower=-1.0, upper=1.0)
        self.confidence = _clamp(float(self.confidence))
        self.volatility = _clamp(float(self.volatility))
        self.impact = max(float(self.impact), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.catalysts = _normalise_tuple(self.catalysts)
        self.inhibitors = _normalise_tuple(self.inhibitors)
        self.notes = self.notes.strip()
        self.metadata = _coerce_mapping(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "signal": self.signal,
            "confidence": self.confidence,
            "volatility": self.volatility,
            "impact": self.impact,
            "timestamp": self.timestamp.isoformat(),
            "catalysts": list(self.catalysts),
            "inhibitors": list(self.inhibitors),
            "notes": self.notes,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class PredictiveScenario:
    """Scenario framing for generating predictive insights."""

    horizon: str
    optimism_bias: float = 0.0
    risk_appetite: float = 0.5
    execution_capacity: float = 0.6
    catalysts: tuple[str, ...] = field(default_factory=tuple)
    inhibitors: tuple[str, ...] = field(default_factory=tuple)
    narrative: str | None = None

    def __post_init__(self) -> None:
        self.horizon = _normalise_text(self.horizon)
        self.optimism_bias = _clamp(float(self.optimism_bias), lower=-1.0, upper=1.0)
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.execution_capacity = _clamp(float(self.execution_capacity))
        self.catalysts = _normalise_tuple(self.catalysts)
        self.inhibitors = _normalise_tuple(self.inhibitors)
        self.narrative = _normalise_optional_text(self.narrative)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "horizon": self.horizon,
            "optimism_bias": self.optimism_bias,
            "risk_appetite": self.risk_appetite,
            "execution_capacity": self.execution_capacity,
            "catalysts": list(self.catalysts),
            "inhibitors": list(self.inhibitors),
            "narrative": self.narrative,
        }


@dataclass(slots=True)
class PredictiveInsight:
    """Synthesised insight returned by the predictive engine."""

    score: float
    risk: float
    momentum: float
    confidence: float
    catalysts: tuple[str, ...]
    inhibitors: tuple[str, ...]
    storyline: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "score": self.score,
            "risk": self.risk,
            "momentum": self.momentum,
            "confidence": self.confidence,
            "catalysts": list(self.catalysts),
            "inhibitors": list(self.inhibitors),
            "storyline": self.storyline,
        }


# ---------------------------------------------------------------------------
# internal state containers


@dataclass(slots=True)
class _EngineMetrics:
    weighted_signal: float
    weighted_volatility: float
    weighted_confidence: float
    momentum_delta: float


@dataclass(slots=True)
class _EvaluationResult:
    features: tuple[PredictiveFeature, ...]
    scenario: PredictiveScenario
    metrics: _EngineMetrics
    insight: PredictiveInsight


# ---------------------------------------------------------------------------
# engine


class DynamicPredictiveEngine:
    """Rolling predictive engine that fuses features into scenario insights."""

    def __init__(
        self,
        *,
        window: int = 64,
        config: PredictiveConfiguration | None = None,
    ) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window: Deque[PredictiveFeature] = deque(maxlen=window)
        self._config = (config.copy() if config is not None else PredictiveConfiguration())

    def reset(self) -> None:
        """Clear all tracked features."""

        self._window.clear()

    @property
    def config(self) -> PredictiveConfiguration:
        return self._config.copy()

    def configure(self, config: PredictiveConfiguration) -> None:
        if not isinstance(config, PredictiveConfiguration):  # pragma: no cover - guard
            raise TypeError("config must be PredictiveConfiguration")
        self._config = config.copy()

    @property
    def window(self) -> int:
        return self._window.maxlen or 0

    @property
    def features(self) -> tuple[PredictiveFeature, ...]:
        return tuple(self._window)

    def ingest(self, feature: PredictiveFeature | Mapping[str, object]) -> PredictiveFeature:
        coerced = _coerce_feature(feature)
        self._window.append(coerced)
        return coerced

    def ingest_many(
        self, features: Iterable[PredictiveFeature | Mapping[str, object]]
    ) -> tuple[PredictiveFeature, ...]:
        ingested: list[PredictiveFeature] = []
        for feature in features:
            ingested.append(self.ingest(feature))
        return tuple(ingested)

    def generate(self, scenario: PredictiveScenario | Mapping[str, object]) -> PredictiveInsight:
        result = self._evaluate(self.features, scenario)
        return result.insight

    # ------------------------------------------------------------------
    # optimisation API

    def optimize(
        self,
        samples: Sequence[PredictiveTrainingSample],
        *,
        learning_rate: float = 0.1,
        iterations: int = 1,
    ) -> PredictiveConfiguration:
        if not samples:
            raise ValueError("samples must not be empty")
        if learning_rate <= 0:
            raise ValueError("learning_rate must be positive")
        if iterations <= 0:
            raise ValueError("iterations must be positive")

        config = self._config.copy()
        prepared_samples = tuple(samples)

        for _ in range(iterations):
            aggregate_updates: dict[str, float] = {
                "optimism_bias_weight": 0.0,
                "volatility_weight": 0.0,
                "risk_appetite_weight": 0.0,
                "inhibitor_weight": 0.0,
                "momentum_scale": 0.0,
                "confidence_weight": 0.0,
                "execution_weight": 0.0,
                "execution_bias": 0.0,
            }

            for sample in prepared_samples:
                evaluation = self._evaluate(sample.features, sample.scenario, config=config)
                scenario = evaluation.scenario
                insight = evaluation.insight
                metrics = evaluation.metrics

                score_error = sample.target_score - insight.score
                risk_error = sample.target_risk - insight.risk
                confidence_error = (
                    (sample.target_confidence - insight.confidence)
                    if sample.target_confidence is not None
                    else 0.0
                )

                if scenario.optimism_bias:
                    aggregate_updates["optimism_bias_weight"] += (
                        learning_rate * score_error * float(scenario.optimism_bias)
                    )
                if metrics.weighted_volatility:
                    aggregate_updates["volatility_weight"] += (
                        learning_rate * risk_error * metrics.weighted_volatility
                    )
                appetite_signal = 1.0 - scenario.risk_appetite
                if appetite_signal:
                    aggregate_updates["risk_appetite_weight"] += (
                        learning_rate * risk_error * appetite_signal
                    )
                inhibitor_pressure = len(scenario.inhibitors)
                if inhibitor_pressure:
                    aggregate_updates["inhibitor_weight"] += (
                        learning_rate * risk_error * inhibitor_pressure
                    )
                if metrics.momentum_delta:
                    aggregate_updates["momentum_scale"] -= (
                        learning_rate * score_error * abs(metrics.momentum_delta)
                    )
                if metrics.weighted_confidence:
                    aggregate_updates["confidence_weight"] += (
                        learning_rate * confidence_error * metrics.weighted_confidence
                    )
                if scenario.execution_capacity:
                    aggregate_updates["execution_weight"] += (
                        learning_rate * confidence_error * scenario.execution_capacity
                    )
                aggregate_updates["execution_bias"] += learning_rate * confidence_error

            scale = 1.0 / len(prepared_samples)
            config.adjust(
                optimism_bias_weight=aggregate_updates["optimism_bias_weight"] * scale,
                volatility_weight=aggregate_updates["volatility_weight"] * scale,
                risk_appetite_weight=aggregate_updates["risk_appetite_weight"] * scale,
                inhibitor_weight=aggregate_updates["inhibitor_weight"] * scale,
                momentum_scale=aggregate_updates["momentum_scale"] * scale,
                confidence_weight=aggregate_updates["confidence_weight"] * scale,
                execution_weight=aggregate_updates["execution_weight"] * scale,
                execution_bias=aggregate_updates["execution_bias"] * scale,
            )

        self._config = config
        return self._config.copy()

    # ------------------------------------------------------------------
    # evaluation internals

    def _evaluate(
        self,
        features: Sequence[PredictiveFeature | Mapping[str, object]],
        scenario: PredictiveScenario | Mapping[str, object],
        *,
        config: PredictiveConfiguration | None = None,
    ) -> _EvaluationResult:
        if isinstance(scenario, Mapping):
            scenario = PredictiveScenario(**scenario)
        elif not isinstance(scenario, PredictiveScenario):  # pragma: no cover - guard
            raise TypeError("scenario must be PredictiveScenario or mapping")

        config = config.copy() if config is not None else self._config.copy()
        features_tuple = _coerce_features(features)

        if not features_tuple:
            baseline_story = (
                f"Horizon: {scenario.horizon}. No signals ingested yet; "
                "use discovery sprints to populate the predictive backlog."
            )
            baseline_weight = _clamp(config.execution_weight + 0.2)
            baseline_bias = _clamp(config.execution_bias - 0.4)
            baseline_confidence = _clamp(
                scenario.execution_capacity * baseline_weight + baseline_bias
            )
            insight = PredictiveInsight(
                score=round(
                    _to_unit_interval(
                        _clamp(scenario.optimism_bias, lower=-1.0, upper=1.0)
                    ),
                    3,
                ),
                risk=round(_clamp(1.0 - scenario.risk_appetite), 3),
                momentum=0.5,
                confidence=round(baseline_confidence, 3),
                catalysts=scenario.catalysts,
                inhibitors=scenario.inhibitors,
                storyline=baseline_story,
            )
            metrics = _EngineMetrics(
                weighted_signal=0.0,
                weighted_volatility=0.0,
                weighted_confidence=0.0,
                momentum_delta=0.0,
            )
            return _EvaluationResult(features_tuple, scenario, metrics, insight)

        weights = [
            feature.impact * (0.5 + 0.5 * feature.confidence)
            for feature in features_tuple
        ]
        signals = [feature.signal for feature in features_tuple]
        volatilities = [feature.volatility for feature in features_tuple]
        confidences = [feature.confidence for feature in features_tuple]

        weighted_signal = _weighted_mean(signals, weights)
        weighted_volatility = _weighted_mean(volatilities, weights)
        weighted_confidence = _weighted_mean(confidences, weights)

        optimism_adjustment = scenario.optimism_bias * config.optimism_bias_weight
        score = _to_unit_interval(
            _clamp(weighted_signal + optimism_adjustment, lower=-1.0, upper=1.0)
        )

        inhibitor_pressure = len(scenario.inhibitors) * config.inhibitor_weight
        risk = _clamp(
            weighted_volatility * config.volatility_weight
            + (1.0 - scenario.risk_appetite) * config.risk_appetite_weight
            + inhibitor_pressure,
        )

        head, tail = _split_signal_window(signals)
        momentum_delta = tail - head
        momentum = _to_unit_interval(
            _clamp(momentum_delta / config.momentum_scale, lower=-1.0, upper=1.0)
        )

        execution_factor = scenario.execution_capacity * config.execution_weight + config.execution_bias
        confidence = _clamp(weighted_confidence * config.confidence_weight * execution_factor)

        catalysts = _normalise_tuple(
            (*_collect_attributes(features_tuple, "catalysts"), *scenario.catalysts)
        )
        inhibitors = _normalise_tuple(
            (*_collect_attributes(features_tuple, "inhibitors"), *scenario.inhibitors)
        )

        storyline_parts = [
            f"Horizon: {scenario.horizon}.",
            f"Score at {int(round(score * 100))}% with risk {int(round(risk * 100))}%.",
            f"Momentum trending {('up' if momentum >= 0.55 else 'down' if momentum <= 0.45 else 'steady')}.",
        ]
        if scenario.narrative:
            storyline_parts.append(scenario.narrative)
        if catalysts:
            storyline_parts.append("Catalysts: " + ", ".join(catalysts))
        if inhibitors:
            storyline_parts.append("Inhibitors: " + ", ".join(inhibitors))

        storyline = " ".join(storyline_parts)

        insight = PredictiveInsight(
            score=round(score, 3),
            risk=round(risk, 3),
            momentum=round(momentum, 3),
            confidence=round(confidence, 3),
            catalysts=catalysts,
            inhibitors=inhibitors,
            storyline=storyline,
        )
        metrics = _EngineMetrics(
            weighted_signal=weighted_signal,
            weighted_volatility=weighted_volatility,
            weighted_confidence=weighted_confidence,
            momentum_delta=momentum_delta,
        )
        return _EvaluationResult(features_tuple, scenario, metrics, insight)

