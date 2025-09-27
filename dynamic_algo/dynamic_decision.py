"""Decision orchestration utilities for Dynamic Capital's leadership pods.

The decision algorithm consumes qualitative signals, contextual parameters,
and competing execution options.  It produces a structured recommendation that
balances urgency, impact, risk appetite, and operational capacity while
surfacing the guardrails needed to move forward responsibly.  The module is
lightweight enough for notebooks or CLI tools and mirrors the framing used in
weekly leadership reviews.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DecisionSignal",
    "DecisionContext",
    "DecisionOption",
    "DecisionSignalSummary",
    "DecisionRecommendation",
    "DynamicDecisionAlgo",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    normalised = str(value).strip()
    if not normalised:
        raise ValueError("text value must not be empty")
    return normalised


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalised = str(value).strip()
    return normalised or None


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = str(item).strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_float(value: object, *, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_positive(value: object, *, default: float = 1.0) -> float:
    coerced = _coerce_float(value, default=default)
    if coerced <= 0:
        raise ValueError("weight must be positive")
    return coerced


def _coerce_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _now()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class DecisionSignal:
    """Qualitative indicator captured during discovery and diligence."""

    theme: str
    confidence: float
    urgency: float
    strategic_fit: float
    risk: float
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_now)
    note: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.theme = _normalise_text(self.theme).lower()
        self.confidence = _clamp(_coerce_float(self.confidence, default=0.5))
        self.urgency = _clamp(_coerce_float(self.urgency, default=0.5))
        self.strategic_fit = _clamp(_coerce_float(self.strategic_fit, default=0.5))
        self.risk = _clamp(_coerce_float(self.risk, default=0.0))
        self.weight = _coerce_positive(self.weight)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.note = _normalise_optional_text(self.note)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def momentum(self) -> float:
        """Weighted momentum contribution used in the summary rollup."""

        raw = 0.5 * self.confidence + 0.3 * self.urgency + 0.2 * self.strategic_fit
        return _clamp(raw)


@dataclass(slots=True)
class DecisionContext:
    """Parameters describing the decision window and organisational posture."""

    objective: str
    risk_tolerance: float
    capacity: float
    principle_alignment: float
    time_pressure: float
    data_confidence: float
    guardrails: tuple[str, ...] = field(default_factory=tuple)
    focus_areas: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.objective = _normalise_text(self.objective)
        self.risk_tolerance = _clamp(_coerce_float(self.risk_tolerance, default=0.5))
        self.capacity = _clamp(_coerce_float(self.capacity, default=0.5))
        self.principle_alignment = _clamp(_coerce_float(self.principle_alignment, default=0.5))
        self.time_pressure = _clamp(_coerce_float(self.time_pressure, default=0.0))
        self.data_confidence = _clamp(_coerce_float(self.data_confidence, default=0.5))
        self.guardrails = _normalise_tuple(self.guardrails)
        self.focus_areas = _normalise_tuple(self.focus_areas)

    @property
    def is_time_sensitive(self) -> bool:
        return self.time_pressure >= 0.6


@dataclass(slots=True)
class DecisionOption:
    """Candidate course of action competing for execution capacity."""

    option_id: str
    description: str
    expected_impact: float
    execution_complexity: float
    risk: float
    cost_of_delay: float
    reversibility: float
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.option_id = _normalise_text(self.option_id)
        self.description = _normalise_text(self.description)
        self.expected_impact = _clamp(_coerce_float(self.expected_impact, default=0.5))
        self.execution_complexity = _clamp(_coerce_float(self.execution_complexity, default=0.5))
        self.risk = _clamp(_coerce_float(self.risk, default=0.0))
        self.cost_of_delay = _clamp(_coerce_float(self.cost_of_delay, default=0.0))
        self.reversibility = _clamp(_coerce_float(self.reversibility, default=0.5))
        self.dependencies = _normalise_tuple(self.dependencies)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class DecisionSignalSummary:
    """Aggregated telemetry derived from the current signal stack."""

    total_signals: int
    total_weight: float
    confidence_index: float
    urgency_index: float
    strategic_fit_index: float
    risk_index: float
    momentum_index: float
    latest_timestamp: datetime | None
    dominant_themes: tuple[str, ...]
    notes: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total_signals": self.total_signals,
            "total_weight": self.total_weight,
            "confidence_index": self.confidence_index,
            "urgency_index": self.urgency_index,
            "strategic_fit_index": self.strategic_fit_index,
            "risk_index": self.risk_index,
            "momentum_index": self.momentum_index,
            "latest_timestamp": self.latest_timestamp.isoformat() if self.latest_timestamp else None,
            "dominant_themes": list(self.dominant_themes),
            "notes": list(self.notes),
        }


@dataclass(slots=True)
class DecisionRecommendation:
    """Structured recommendation for a decision option."""

    option_id: str
    composite_score: float
    priority: str
    reasons: tuple[str, ...]
    guardrails: tuple[str, ...]
    metrics: Mapping[str, float]
    summary: DecisionSignalSummary

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "option_id": self.option_id,
            "composite_score": self.composite_score,
            "priority": self.priority,
            "reasons": list(self.reasons),
            "guardrails": list(self.guardrails),
            "metrics": dict(self.metrics),
            "summary": self.summary.as_dict(),
        }


class DynamicDecisionAlgo:
    """Evaluate decision options against qualitative signals and context."""

    def __init__(self, signals: Sequence[DecisionSignal] | None = None) -> None:
        self._signals: list[DecisionSignal] = list(signals or [])

    # ----------------------------------------------------------------- signals
    def record_signal(
        self,
        theme: str,
        *,
        confidence: float,
        urgency: float,
        strategic_fit: float,
        risk: float,
        weight: float = 1.0,
        timestamp: datetime | None = None,
        note: str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> DecisionSignal:
        signal = DecisionSignal(
            theme=theme,
            confidence=confidence,
            urgency=urgency,
            strategic_fit=strategic_fit,
            risk=risk,
            weight=weight,
            timestamp=timestamp or _now(),
            note=note,
            metadata=metadata,
        )
        self._signals.append(signal)
        return signal

    def extend_signals(self, signals: Iterable[DecisionSignal]) -> None:
        for signal in signals:
            if not isinstance(signal, DecisionSignal):  # pragma: no cover - defensive guardrail
                raise TypeError("signals must be DecisionSignal instances")
            self._signals.append(signal)

    def clear_signals(self) -> None:
        self._signals.clear()

    # ----------------------------------------------------------- summarisation
    def summarise_signals(self) -> DecisionSignalSummary:
        if not self._signals:
            return DecisionSignalSummary(
                total_signals=0,
                total_weight=0.0,
                confidence_index=0.0,
                urgency_index=0.0,
                strategic_fit_index=0.0,
                risk_index=0.0,
                momentum_index=0.0,
                latest_timestamp=None,
                dominant_themes=(),
                notes=(),
            )

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            total_weight = 1.0

        confidence = sum(signal.confidence * signal.weight for signal in self._signals) / total_weight
        urgency = sum(signal.urgency * signal.weight for signal in self._signals) / total_weight
        strategic_fit = sum(signal.strategic_fit * signal.weight for signal in self._signals) / total_weight
        risk = sum(signal.risk * signal.weight for signal in self._signals) / total_weight
        momentum = sum(signal.momentum * signal.weight for signal in self._signals) / total_weight

        latest_timestamp = max((signal.timestamp for signal in self._signals), default=None)

        theme_counter: Counter[str] = Counter()
        note_entries: list[tuple[datetime, str]] = []
        for signal in self._signals:
            theme_counter[signal.theme] += signal.weight
            if signal.note:
                note_entries.append((signal.timestamp, signal.note))

        dominant_themes = tuple(theme for theme, _ in theme_counter.most_common(3))
        note_entries.sort(key=lambda item: item[0], reverse=True)
        notes = [note for _, note in note_entries[:3]]

        return DecisionSignalSummary(
            total_signals=len(self._signals),
            total_weight=total_weight,
            confidence_index=_clamp(confidence),
            urgency_index=_clamp(urgency),
            strategic_fit_index=_clamp(strategic_fit),
            risk_index=_clamp(risk),
            momentum_index=_clamp(momentum),
            latest_timestamp=latest_timestamp,
            dominant_themes=dominant_themes,
            notes=tuple(notes),
        )

    # ----------------------------------------------------------- evaluations
    def evaluate_options(
        self, options: Sequence[DecisionOption], *, context: DecisionContext
    ) -> tuple[DecisionRecommendation, ...]:
        summary = self.summarise_signals()

        recommendations: list[DecisionRecommendation] = []
        for option in options:
            composite_score, reasons, guardrails, metrics = self._score_option(option, context, summary)
            recommendations.append(
                DecisionRecommendation(
                    option_id=option.option_id,
                    composite_score=composite_score,
                    priority=self._derive_priority(composite_score, option, context, summary),
                    reasons=tuple(reasons),
                    guardrails=tuple(guardrails),
                    metrics=metrics,
                    summary=summary,
                )
            )

        recommendations.sort(key=lambda rec: rec.composite_score, reverse=True)
        return tuple(recommendations)

    # --------------------------------------------------------------- internals
    def _score_option(
        self,
        option: DecisionOption,
        context: DecisionContext,
        summary: DecisionSignalSummary,
    ) -> tuple[float, list[str], list[str], Mapping[str, float]]:
        base_score = (
            option.expected_impact * 0.35
            + summary.momentum_index * 0.2
            + context.principle_alignment * 0.15
            + context.capacity * 0.1
            + option.cost_of_delay * 0.1
            + (1.0 - option.execution_complexity) * 0.05
            + option.reversibility * 0.05
        )

        risk_gap = option.risk - context.risk_tolerance
        if risk_gap > 0:
            base_score -= risk_gap * 0.2
        else:
            base_score += min(abs(risk_gap), 1.0) * 0.05

        if summary.momentum_index < 0.4:
            base_score -= (0.4 - summary.momentum_index) * 0.1

        if summary.confidence_index < 0.45:
            base_score -= (0.45 - summary.confidence_index) * 0.1

        base_score -= summary.risk_index * 0.05
        composite_score = _clamp(base_score)

        reasons = self._build_reasons(option, context, summary, risk_gap, composite_score)
        guardrails = self._build_guardrails(option, context, summary, risk_gap)

        metrics = {
            "expected_impact": option.expected_impact,
            "momentum_index": summary.momentum_index,
            "principle_alignment": context.principle_alignment,
            "capacity": context.capacity,
            "cost_of_delay": option.cost_of_delay,
            "execution_complexity": option.execution_complexity,
            "reversibility": option.reversibility,
            "option_risk": option.risk,
            "risk_tolerance": context.risk_tolerance,
            "signal_risk_index": summary.risk_index,
        }

        return composite_score, reasons, guardrails, metrics

    def _build_reasons(
        self,
        option: DecisionOption,
        context: DecisionContext,
        summary: DecisionSignalSummary,
        risk_gap: float,
        composite_score: float,
    ) -> list[str]:
        reasons: list[str] = []
        if option.expected_impact >= 0.7:
            reasons.append(f"High expected impact ({option.expected_impact:.0%}).")
        else:
            reasons.append(f"Impact potential at {option.expected_impact:.0%}.")

        reasons.append(f"Momentum index at {summary.momentum_index:.0%} from current signals.")

        if context.principle_alignment >= 0.7:
            reasons.append(f"Strong principle alignment ({context.principle_alignment:.0%}).")
        else:
            reasons.append(f"Principle alignment at {context.principle_alignment:.0%}.")

        if risk_gap > 0:
            reasons.append(f"Risk exceeds tolerance by {risk_gap:.0%}.")
        else:
            reasons.append(f"Risk sits {abs(risk_gap):.0%} below tolerance.")

        if summary.urgency_index >= 0.5:
            reasons.append(f"Urgency pressure measured at {summary.urgency_index:.0%}.")
        elif option.cost_of_delay >= 0.6:
            reasons.append("Cost of delay is material.")

        reasons.append(f"Composite score normalised at {composite_score:.0%}.")
        return reasons

    def _build_guardrails(
        self,
        option: DecisionOption,
        context: DecisionContext,
        summary: DecisionSignalSummary,
        risk_gap: float,
    ) -> list[str]:
        guardrails = list(context.guardrails)

        if summary.confidence_index < 0.5 and context.data_confidence < 0.6:
            message = "Bolster data confidence with targeted research before commitment."
            if message not in guardrails:
                guardrails.append(message)

        if risk_gap > 0:
            message = "Run risk scenario review to close the tolerance gap."
            if message not in guardrails:
                guardrails.append(message)

        if option.execution_complexity >= 0.65:
            message = "Break work into phased milestones with accountable owners."
            if message not in guardrails:
                guardrails.append(message)

        if option.reversibility <= 0.3:
            message = "Define explicit exit criteria and contingency triggers."
            if message not in guardrails:
                guardrails.append(message)

        return guardrails

    def _derive_priority(
        self,
        composite_score: float,
        option: DecisionOption,
        context: DecisionContext,
        summary: DecisionSignalSummary,
    ) -> str:
        if summary.confidence_index < 0.45 and context.data_confidence < 0.6:
            return "monitor"
        if composite_score >= 0.7 and (summary.urgency_index >= 0.6 or option.cost_of_delay >= 0.6 or context.is_time_sensitive):
            return "immediate"
        if composite_score >= 0.5:
            return "schedule"
        return "monitor"
