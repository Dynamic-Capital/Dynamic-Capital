"""Evidence synthesis engine powering Dynamic Analytical Thinking."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "AnalyticalSignal",
    "AnalyticalContext",
    "AnalyticalInsight",
    "DynamicAnalyticalThinking",
]


# ---------------------------------------------------------------------------
# Helpers

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


# ---------------------------------------------------------------------------
# Data structures


@dataclass(slots=True)
class AnalyticalSignal:
    """Structured analytic clue captured during an investigation loop."""

    category: str
    statement: str
    evidence_strength: float = 0.5
    data_quality: float = 0.5
    confidence: float = 0.5
    bias_risk: float = 0.0
    anomaly_score: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.category = _normalise_lower(self.category)
        self.statement = _normalise_text(self.statement)
        self.evidence_strength = _clamp(float(self.evidence_strength))
        self.data_quality = _clamp(float(self.data_quality))
        self.confidence = _clamp(float(self.confidence))
        self.bias_risk = _clamp(float(self.bias_risk))
        self.anomaly_score = _clamp(float(self.anomaly_score))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.sources = _normalise_tuple(self.sources)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class AnalyticalContext:
    """Describes the environment in which analysis is being conducted."""

    objective: str
    decision_scope: str
    timeframe: str
    uncertainty: float
    regulatory_pressure: float
    data_volume: float
    dependency_risk: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    guardrails: tuple[str, ...] = field(default_factory=tuple)
    tolerance_for_error: float = 0.5

    def __post_init__(self) -> None:
        self.objective = _normalise_text(self.objective)
        self.decision_scope = _normalise_text(self.decision_scope)
        self.timeframe = _normalise_text(self.timeframe)
        self.uncertainty = _clamp(float(self.uncertainty))
        self.regulatory_pressure = _clamp(float(self.regulatory_pressure))
        self.data_volume = _clamp(float(self.data_volume))
        self.dependency_risk = _clamp(float(self.dependency_risk))
        self.constraints = _normalise_tuple(self.constraints)
        self.guardrails = _normalise_tuple(self.guardrails)
        self.tolerance_for_error = _clamp(float(self.tolerance_for_error))

    @property
    def is_high_uncertainty(self) -> bool:
        return self.uncertainty >= 0.65

    @property
    def is_high_pressure(self) -> bool:
        return self.regulatory_pressure >= 0.6 or self.tolerance_for_error <= 0.35

    @property
    def is_data_sparse(self) -> bool:
        return self.data_volume <= 0.35


@dataclass(slots=True)
class AnalyticalInsight:
    """Synthesised guidance produced from captured signals."""

    evidence_strength: float
    coherence_score: float
    risk_alert: float
    decision_clarity: float
    anomaly_intensity: float
    dominant_tags: tuple[str, ...]
    flagged_sources: tuple[str, ...]
    recommended_actions: tuple[str, ...]
    analytical_story: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "evidence_strength": self.evidence_strength,
            "coherence_score": self.coherence_score,
            "risk_alert": self.risk_alert,
            "decision_clarity": self.decision_clarity,
            "anomaly_intensity": self.anomaly_intensity,
            "dominant_tags": list(self.dominant_tags),
            "flagged_sources": list(self.flagged_sources),
            "recommended_actions": list(self.recommended_actions),
            "analytical_story": self.analytical_story,
        }


# ---------------------------------------------------------------------------
# Engine


class DynamicAnalyticalThinking:
    """Aggregate analytical signals and generate a decision-oriented insight."""

    def __init__(self, *, history: int = 100) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[AnalyticalSignal] = deque(maxlen=history)

    # Intake -----------------------------------------------------------------
    def capture(self, signal: AnalyticalSignal | Mapping[str, object]) -> AnalyticalSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[AnalyticalSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: AnalyticalSignal | Mapping[str, object]) -> AnalyticalSignal:
        if isinstance(signal, AnalyticalSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return AnalyticalSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be AnalyticalSignal or mapping")

    # Synthesis ---------------------------------------------------------------
    def synthesise(self, context: AnalyticalContext) -> AnalyticalInsight:
        if not self._signals:
            raise RuntimeError("no analytical signals captured")

        weights = [signal.weight for signal in self._signals]
        total_weight = sum(weights)
        if total_weight <= 0:
            raise RuntimeError("all analytical signals have zero weight")

        def weighted_average(metric: Callable[[AnalyticalSignal], float]) -> float:
            return sum(signal.weight * metric(signal) for signal in self._signals) / total_weight

        evidence_strength = _clamp(
            weighted_average(
                lambda signal: 0.6 * signal.evidence_strength + 0.4 * signal.data_quality
            )
        )
        coherence_score = _clamp(
            weighted_average(
                lambda signal: 0.5 * signal.confidence
                + 0.3 * signal.data_quality
                + 0.2 * (1.0 - signal.bias_risk)
            )
        )
        risk_alert = _clamp(
            weighted_average(
                lambda signal: 0.55 * signal.bias_risk
                + 0.25 * (1.0 - signal.data_quality)
                + 0.2 * signal.anomaly_score
            )
        )
        anomaly_intensity = _clamp(weighted_average(lambda signal: signal.anomaly_score))

        base_clarity = _clamp(
            weighted_average(
                lambda signal: 0.5 * signal.confidence + 0.3 * signal.evidence_strength + 0.2 * signal.data_quality
            )
        )
        clarity_modifier = 1.0
        if context.is_high_uncertainty:
            clarity_modifier -= 0.2
        if context.is_data_sparse:
            clarity_modifier -= 0.15
        if context.is_high_pressure:
            clarity_modifier -= 0.1
        clarity_modifier += 0.1 * (context.tolerance_for_error - 0.5)
        clarity_modifier = max(0.6, min(1.2, clarity_modifier))
        decision_clarity = _clamp(base_clarity * clarity_modifier)

        dominant_tags = self._dominant_tags()
        flagged_sources = self._flagged_sources()
        recommended_actions = self._actions(context, evidence_strength, risk_alert, decision_clarity)
        story = self._story(
            context,
            evidence_strength,
            coherence_score,
            risk_alert,
            decision_clarity,
            anomaly_intensity,
            dominant_tags,
        )

        return AnalyticalInsight(
            evidence_strength=evidence_strength,
            coherence_score=coherence_score,
            risk_alert=risk_alert,
            decision_clarity=decision_clarity,
            anomaly_intensity=anomaly_intensity,
            dominant_tags=dominant_tags,
            flagged_sources=flagged_sources,
            recommended_actions=recommended_actions,
            analytical_story=story,
        )

    # ------------------------------------------------------------------ utils
    def _dominant_tags(self, top_k: int = 5) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            for tag in signal.tags:
                counter[tag] += signal.weight
        return tuple(tag for tag, _count in counter.most_common(top_k))

    def _flagged_sources(self, *, threshold: float = 0.65) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            if signal.bias_risk >= threshold and signal.sources:
                for source in signal.sources:
                    counter[source] += signal.weight
        if not counter:
            return ()
        return tuple(source for source, _count in counter.most_common())

    def _actions(
        self,
        context: AnalyticalContext,
        evidence_strength: float,
        risk_alert: float,
        decision_clarity: float,
    ) -> tuple[str, ...]:
        actions: list[str] = []
        if evidence_strength < 0.55:
            actions.append("validate assumptions with targeted experiments")
        if context.is_high_uncertainty and decision_clarity < 0.6:
            actions.append("expand data collection to reduce uncertainty")
        if risk_alert >= 0.6:
            actions.append("conduct bias and risk audit on critical signals")
        if decision_clarity >= 0.7:
            actions.append("prepare decision brief emphasising high-confidence insights")
        if context.is_high_pressure and evidence_strength < 0.7:
            actions.append("document regulatory guardrails before committing to action")
        if context.is_data_sparse:
            actions.append("triangulate with qualitative intelligence sources")
        deduped: list[str] = []
        seen: set[str] = set()
        for action in actions:
            if action not in seen:
                seen.add(action)
                deduped.append(action)
        return tuple(deduped)

    def _story(
        self,
        context: AnalyticalContext,
        evidence_strength: float,
        coherence_score: float,
        risk_alert: float,
        decision_clarity: float,
        anomaly_intensity: float,
        dominant_tags: tuple[str, ...],
    ) -> str:
        headline = (
            f"Analysis for {context.objective} within {context.decision_scope} horizon shows "
            f"{evidence_strength:.0%} evidence strength with {decision_clarity:.0%} clarity."
        )
        pressure_note = "High regulatory pressure." if context.is_high_pressure else ""
        uncertainty_note = "Elevated uncertainty." if context.is_high_uncertainty else ""
        tag_fragment = (
            f" Dominant themes: {', '.join(dominant_tags)}." if dominant_tags else ""
        )
        anomaly_fragment = (
            f" Anomaly intensity at {anomaly_intensity:.0%}." if anomaly_intensity >= 0.35 else ""
        )
        risk_fragment = (
            f" Risk alert at {risk_alert:.0%}; ensure countermeasures." if risk_alert >= 0.5 else ""
        )
        coherence_fragment = f" Coherence score holds at {coherence_score:.0%}."
        notes = " ".join(filter(None, [pressure_note, uncertainty_note, tag_fragment, anomaly_fragment, risk_fragment]))
        if notes:
            notes = " " + notes.strip()
        return headline + coherence_fragment + notes
