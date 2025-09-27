"""Evidence-weighted reasoning engine for Dynamic Critical Thinking."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CriticalEvaluation",
    "CriticalSignal",
    "DynamicCriticalThinking",
    "EvaluationContext",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    normalised = value.strip()
    if not normalised:
        raise ValueError("text must not be empty")
    return normalised


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


@dataclass(slots=True)
class CriticalSignal:
    """Evidence fragment captured during a critical thinking loop."""

    claim: str
    stance: str
    confidence: float = 0.5
    reliability: float = 0.5
    impact: float = 0.5
    counter_evidence: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.claim = _normalise_text(self.claim)
        self.stance = _normalise_lower(self.stance)
        self.confidence = _clamp(float(self.confidence))
        self.reliability = _clamp(float(self.reliability))
        self.impact = _clamp(float(self.impact))
        self.counter_evidence = _clamp(float(self.counter_evidence))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.sources = _normalise_tuple(self.sources)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class EvaluationContext:
    """Decision context used to interpret evidence quality and urgency."""

    objective: str
    decision_scope: str
    stakes: float
    time_pressure: float
    evidence_quality: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    assumptions: tuple[str, ...] = field(default_factory=tuple)
    risk_appetite: float = 0.5

    def __post_init__(self) -> None:
        self.objective = _normalise_text(self.objective)
        self.decision_scope = _normalise_text(self.decision_scope)
        self.stakes = _clamp(float(self.stakes))
        self.time_pressure = _clamp(float(self.time_pressure))
        self.evidence_quality = _clamp(float(self.evidence_quality))
        self.constraints = _normalise_tuple(self.constraints)
        self.assumptions = _normalise_tuple(self.assumptions)
        self.risk_appetite = _clamp(float(self.risk_appetite))

    @property
    def is_high_pressure(self) -> bool:
        return self.time_pressure >= 0.7

    @property
    def is_low_evidence(self) -> bool:
        return self.evidence_quality <= 0.4

    @property
    def is_high_stakes(self) -> bool:
        return self.stakes >= 0.6


@dataclass(slots=True)
class CriticalEvaluation:
    """Structured output summarising critical thinking posture."""

    conviction_index: float
    counter_pressure: float
    diligence_level: float
    impact_score: float
    dominant_tags: tuple[str, ...]
    red_flags: tuple[str, ...]
    recommended_frameworks: tuple[str, ...]
    summary: str
    next_actions: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "conviction_index": self.conviction_index,
            "counter_pressure": self.counter_pressure,
            "diligence_level": self.diligence_level,
            "impact_score": self.impact_score,
            "dominant_tags": list(self.dominant_tags),
            "red_flags": list(self.red_flags),
            "recommended_frameworks": list(self.recommended_frameworks),
            "summary": self.summary,
            "next_actions": list(self.next_actions),
        }


class DynamicCriticalThinking:
    """Aggregate evidence signals and craft a critical thinking evaluation."""

    def __init__(self, *, history: int = 80) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[CriticalSignal] = deque(maxlen=history)

    # --------------------------------------------------------------- ingestion
    def capture(self, signal: CriticalSignal | Mapping[str, object]) -> CriticalSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[CriticalSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: CriticalSignal | Mapping[str, object]) -> CriticalSignal:
        if isinstance(signal, CriticalSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return CriticalSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be CriticalSignal or mapping")

    # ------------------------------------------------------------- evaluation
    def build_evaluation(self, context: EvaluationContext) -> CriticalEvaluation:
        if not self._signals:
            raise RuntimeError("no critical thinking signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("critical thinking signals have zero weight")

        conviction = self._weighted_metric(lambda s: s.confidence * s.reliability)
        counter_pressure = self._weighted_metric(
            lambda s: max(s.counter_evidence, 1.0 - s.confidence)
        )
        diligence = self._weighted_metric(
            lambda s: s.reliability * (1.0 - s.counter_evidence / 1.2)
        )
        impact = self._weighted_metric(lambda s: s.impact)

        tags = self._dominant_tags()
        red_flags = self._red_flags(context, conviction, counter_pressure, diligence)
        frameworks = self._recommended_frameworks(
            context, conviction, counter_pressure, diligence, impact
        )
        summary = self._summary(
            context, conviction, counter_pressure, diligence, impact, tags
        )
        next_actions = self._next_actions(context, red_flags, frameworks)

        return CriticalEvaluation(
            conviction_index=round(conviction, 3),
            counter_pressure=round(counter_pressure, 3),
            diligence_level=round(diligence, 3),
            impact_score=round(impact, 3),
            dominant_tags=tags,
            red_flags=red_flags,
            recommended_frameworks=frameworks,
            summary=summary,
            next_actions=next_actions,
        )

    def _weighted_metric(self, selector: Callable[[CriticalSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _dominant_tags(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            counter.update(signal.tags)
        if not counter:
            return ()
        return tuple(tag for tag, _ in counter.most_common(4))

    def _red_flags(
        self,
        context: EvaluationContext,
        conviction: float,
        counter_pressure: float,
        diligence: float,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if conviction >= 0.6 and counter_pressure >= 0.55:
            alerts.append("Cognitive dissonance: reconcile conflicting evidence")
        if diligence <= 0.45:
            alerts.append("Due diligence gap: expand source triangulation")
        if context.is_low_evidence and conviction >= 0.5:
            alerts.append("Evidence sparse: slow decision velocity")
        if context.is_high_stakes and counter_pressure >= 0.5:
            alerts.append("High stakes with counter pressure: run devil's advocate review")
        if context.is_high_pressure and diligence <= 0.5:
            alerts.append("High time pressure: assign rapid validation tasks")
        return tuple(alerts)

    def _recommended_frameworks(
        self,
        context: EvaluationContext,
        conviction: float,
        counter_pressure: float,
        diligence: float,
        impact: float,
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        if context.is_high_pressure:
            recommendations.append("Rapid Evidence Audit")
        if context.is_low_evidence:
            recommendations.append("First Principles Reconstruction")
        if counter_pressure >= 0.5:
            recommendations.append("Devil's Advocate Session")
        if diligence <= 0.5:
            recommendations.append("Red Team Review")
        if impact >= 0.6 and conviction >= 0.6:
            recommendations.append("Pre-Mortem Mapping")
        if not recommendations:
            recommendations.append("Structured Debate Canvas")
        # Deduplicate while preserving order
        seen: set[str] = set()
        ordered: list[str] = []
        for model in recommendations:
            if model not in seen:
                seen.add(model)
                ordered.append(model)
        return tuple(ordered)

    def _summary(
        self,
        context: EvaluationContext,
        conviction: float,
        counter_pressure: float,
        diligence: float,
        impact: float,
        tags: tuple[str, ...],
    ) -> str:
        tag_summary = ", ".join(tags) if tags else "no recurring tags"
        return (
            f"Objective: {context.objective}. "
            f"Conviction at {int(round(conviction * 100))}% with counter pressure {int(round(counter_pressure * 100))}%. "
            f"Diligence at {int(round(diligence * 100))}% and impact {int(round(impact * 100))}%. "
            f"Tags: {tag_summary}."
        )

    def _next_actions(
        self,
        context: EvaluationContext,
        red_flags: tuple[str, ...],
        frameworks: tuple[str, ...],
    ) -> tuple[str, ...]:
        steps: list[str] = []
        if red_flags:
            steps.extend(f"Mitigate: {alert}" for alert in red_flags)
        if frameworks:
            steps.append("Activate frameworks: " + ", ".join(frameworks))
        if context.assumptions:
            steps.append("Stress test assumptions: " + ", ".join(context.assumptions))
        if context.constraints:
            steps.append("Review constraints: " + ", ".join(context.constraints))
        if not steps:
            steps.append("Log evidence summary and schedule peer review")
        return tuple(steps)
