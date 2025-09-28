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
    "DynamicPredictiveEngine",
]


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
# engine


class DynamicPredictiveEngine:
    """Rolling predictive engine that fuses features into scenario insights."""

    def __init__(self, *, window: int = 64) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window: Deque[PredictiveFeature] = deque(maxlen=window)

    def reset(self) -> None:
        """Clear all tracked features."""

        self._window.clear()

    @property
    def window(self) -> int:
        return self._window.maxlen or 0

    @property
    def features(self) -> tuple[PredictiveFeature, ...]:
        return tuple(self._window)

    def ingest(self, feature: PredictiveFeature | Mapping[str, object]) -> PredictiveFeature:
        if isinstance(feature, Mapping):
            feature = PredictiveFeature(**feature)
        elif not isinstance(feature, PredictiveFeature):  # pragma: no cover - guard
            raise TypeError("feature must be PredictiveFeature or mapping")
        self._window.append(feature)
        return feature

    def ingest_many(
        self, features: Iterable[PredictiveFeature | Mapping[str, object]]
    ) -> tuple[PredictiveFeature, ...]:
        ingested: list[PredictiveFeature] = []
        for feature in features:
            ingested.append(self.ingest(feature))
        return tuple(ingested)

    def generate(self, scenario: PredictiveScenario | Mapping[str, object]) -> PredictiveInsight:
        if isinstance(scenario, Mapping):
            scenario = PredictiveScenario(**scenario)
        elif not isinstance(scenario, PredictiveScenario):  # pragma: no cover - guard
            raise TypeError("scenario must be PredictiveScenario or mapping")

        features = self.features
        if not features:
            baseline_story = (
                f"Horizon: {scenario.horizon}. No signals ingested yet; "
                "use discovery sprints to populate the predictive backlog."
            )
            return PredictiveInsight(
                score=_to_unit_interval(scenario.optimism_bias),
                risk=_clamp(1.0 - scenario.risk_appetite),
                momentum=0.5,
                confidence=_clamp(scenario.execution_capacity * 0.6 + 0.2),
                catalysts=scenario.catalysts,
                inhibitors=scenario.inhibitors,
                storyline=baseline_story,
            )

        weights = [feature.impact * (0.5 + 0.5 * feature.confidence) for feature in features]
        signals = [feature.signal for feature in features]
        volatilities = [feature.volatility for feature in features]
        confidences = [feature.confidence for feature in features]

        weighted_signal = _weighted_mean(signals, weights)
        weighted_volatility = _weighted_mean(volatilities, weights)
        weighted_confidence = _weighted_mean(confidences, weights)

        optimism_adjustment = scenario.optimism_bias * 0.35
        score = _to_unit_interval(_clamp(weighted_signal + optimism_adjustment, lower=-1.0, upper=1.0))

        inhibitor_pressure = len(scenario.inhibitors) * 0.03
        risk = _clamp(
            weighted_volatility * 0.7
            + (1.0 - scenario.risk_appetite) * 0.25
            + inhibitor_pressure,
        )

        head, tail = _split_signal_window(signals)
        momentum_delta = tail - head
        momentum = _to_unit_interval(_clamp(momentum_delta / 2.0, lower=-1.0, upper=1.0))

        execution_factor = scenario.execution_capacity * 0.4 + 0.6
        confidence = _clamp(weighted_confidence * 0.7 * execution_factor)

        catalysts = _normalise_tuple(
            (*_collect_attributes(features, "catalysts"), *scenario.catalysts)
        )
        inhibitors = _normalise_tuple(
            (*_collect_attributes(features, "inhibitors"), *scenario.inhibitors)
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

        return PredictiveInsight(
            score=round(score, 3),
            risk=round(risk, 3),
            momentum=round(momentum, 3),
            confidence=round(confidence, 3),
            catalysts=catalysts,
            inhibitors=inhibitors,
            storyline=storyline,
        )

