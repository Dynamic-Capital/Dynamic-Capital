from __future__ import annotations

"""Capacity-aware prioritisation model for refinement workflows."""

from dataclasses import dataclass
from types import MappingProxyType
from typing import Iterable, Mapping, MutableSequence, Sequence

__all__ = [
    "DynamicRefinementModel",
    "RefinementAction",
    "RefinementPlan",
    "RefinementRecommendation",
    "RefinementSignal",
    "RefinementStep",
]


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------


def _normalise_text(value: str, *, field_name: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_identifier(value: str, *, field_name: str) -> str:
    return _normalise_text(value, field_name=field_name)


def _normalise_stage(value: str, *, field_name: str) -> str:
    text = _normalise_text(value, field_name=field_name)
    return text.lower().replace(" ", "_").replace("-", "_")


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    result: list[str] = []
    for tag in tags:
        cleaned = (tag or "").strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return tuple(result)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _format_signal_reference(signal: RefinementSignal) -> str:
    return f"{signal.source}: {signal.theme}"


_DEFAULT_STAGE_WEIGHTS: Mapping[str, float] = {
    "discovery": 0.95,
    "activation": 1.05,
    "validation": 1.0,
    "delivery": 1.06,
    "scaling": 1.1,
    "stabilisation": 1.02,
}


# ---------------------------------------------------------------------------
# Data model primitives
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class RefinementSignal:
    """Feedback observation influencing refinement priorities."""

    source: str
    theme: str
    intensity: float = 0.5
    alignment: float = 0.5
    urgency: float = 0.5
    target_stage: str | None = None
    target_tags: tuple[str, ...] = ()
    weight: float = 1.0
    note: str | None = None

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        source = _normalise_identifier(self.source, field_name="source")
        theme = _normalise_text(self.theme, field_name="theme")
        intensity = _clamp(self.intensity)
        alignment = _clamp(self.alignment)
        urgency = _clamp(self.urgency)
        weight = max(float(self.weight), 0.0)
        target_stage = (
            _normalise_stage(self.target_stage, field_name="target_stage")
            if self.target_stage is not None
            else None
        )
        target_tags = _normalise_tags(self.target_tags)
        note = None if self.note is None else _normalise_text(self.note, field_name="note")
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "theme", theme)
        object.__setattr__(self, "intensity", intensity)
        object.__setattr__(self, "alignment", alignment)
        object.__setattr__(self, "urgency", urgency)
        object.__setattr__(self, "weight", weight)
        object.__setattr__(self, "target_stage", target_stage)
        object.__setattr__(self, "target_tags", target_tags)
        object.__setattr__(self, "note", note)


@dataclass(frozen=True, slots=True)
class RefinementStep:
    """Candidate step that could benefit from refinement."""

    identifier: str
    summary: str
    stage: str
    impact: float = 0.5
    effort: float = 0.5
    risk: float = 0.4
    status: str = "pending"
    tags: tuple[str, ...] = ()
    dependencies: tuple[str, ...] = ()

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        identifier = _normalise_identifier(self.identifier, field_name="identifier")
        summary = _normalise_text(self.summary, field_name="summary")
        stage = _normalise_stage(self.stage, field_name="stage")
        impact = _clamp(self.impact)
        effort = _clamp(self.effort)
        risk = _clamp(self.risk)
        status = _normalise_text(self.status, field_name="status").lower()
        tags = _normalise_tags(self.tags)
        dependencies = tuple(
            _normalise_identifier(dep, field_name="dependencies") for dep in self.dependencies
        )
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "summary", summary)
        object.__setattr__(self, "stage", stage)
        object.__setattr__(self, "impact", impact)
        object.__setattr__(self, "effort", effort)
        object.__setattr__(self, "risk", risk)
        object.__setattr__(self, "status", status)
        object.__setattr__(self, "tags", tags)
        object.__setattr__(self, "dependencies", dependencies)

    @property
    def complexity(self) -> float:
        return _clamp(0.65 * self.effort + 0.35 * self.risk)


@dataclass(frozen=True, slots=True)
class RefinementRecommendation:
    """Ranked recommendation generated by the model."""

    identifier: str
    summary: str
    stage: str
    score: float
    confidence: float
    signals: tuple[str, ...]
    focus: str

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        identifier = _normalise_identifier(self.identifier, field_name="identifier")
        summary = _normalise_text(self.summary, field_name="summary")
        stage = _normalise_stage(self.stage, field_name="stage")
        score = _clamp(self.score)
        confidence = _clamp(self.confidence)
        signals = tuple(
            _normalise_text(signal, field_name="signals") for signal in self.signals if signal.strip()
        )
        focus = _normalise_text(self.focus, field_name="focus")
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "summary", summary)
        object.__setattr__(self, "stage", stage)
        object.__setattr__(self, "score", score)
        object.__setattr__(self, "confidence", confidence)
        object.__setattr__(self, "signals", signals)
        object.__setattr__(self, "focus", focus)


@dataclass(frozen=True, slots=True)
class RefinementAction:
    """Concrete action distilled from recommendations."""

    identifier: str
    summary: str
    stage: str
    action: str
    confidence: float
    signals: tuple[str, ...]
    expected_outcome: str

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        identifier = _normalise_identifier(self.identifier, field_name="identifier")
        summary = _normalise_text(self.summary, field_name="summary")
        stage = _normalise_stage(self.stage, field_name="stage")
        action = _normalise_text(self.action, field_name="action")
        confidence = _clamp(self.confidence)
        signals = tuple(
            _normalise_text(signal, field_name="signals") for signal in self.signals if signal.strip()
        )
        expected_outcome = _normalise_text(
            self.expected_outcome, field_name="expected_outcome"
        )
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "summary", summary)
        object.__setattr__(self, "stage", stage)
        object.__setattr__(self, "action", action)
        object.__setattr__(self, "confidence", confidence)
        object.__setattr__(self, "signals", signals)
        object.__setattr__(self, "expected_outcome", expected_outcome)


@dataclass(frozen=True, slots=True)
class RefinementPlan:
    """Aggregated capacity-aware plan."""

    focus_areas: tuple[str, ...]
    actions: tuple[RefinementAction, ...]
    deferred: tuple[str, ...]
    metrics: Mapping[str, float]
    narrative: str

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        focus_areas = tuple(
            _normalise_stage(area, field_name="focus_areas") for area in self.focus_areas
        )
        actions = tuple(self.actions)
        deferred = tuple(
            _normalise_identifier(identifier, field_name="deferred") for identifier in self.deferred
        )
        metrics = MappingProxyType({key: float(value) for key, value in self.metrics.items()})
        narrative = _normalise_text(self.narrative, field_name="narrative")
        object.__setattr__(self, "focus_areas", focus_areas)
        object.__setattr__(self, "actions", actions)
        object.__setattr__(self, "deferred", deferred)
        object.__setattr__(self, "metrics", metrics)
        object.__setattr__(self, "narrative", narrative)


@dataclass(slots=True)
class _ScoredStep:
    step: RefinementStep
    score: float
    confidence: float
    matched_signals: tuple[RefinementSignal, ...]


class DynamicRefinementModel:
    """Model that ranks refinement opportunities and assembles plans."""

    def __init__(
        self,
        *,
        stage_weights: Mapping[str, float] | None = None,
        default_capacity: float = 1.0,
    ) -> None:
        weights = stage_weights or _DEFAULT_STAGE_WEIGHTS
        self._stage_weights = {
            _normalise_stage(stage, field_name="stage_weights"): max(float(weight), 0.1)
            for stage, weight in weights.items()
        }
        self._default_capacity = max(float(default_capacity), 0.0)
        self._steps: dict[str, RefinementStep] = {}
        self._signals: MutableSequence[RefinementSignal] = []

    # ------------------------------------------------------------------
    # Mutators
    # ------------------------------------------------------------------

    def clear(self) -> None:
        self._steps.clear()
        self._signals.clear()

    def upsert_steps(
        self, steps: Iterable[RefinementStep | Mapping[str, object]]
    ) -> None:
        for raw in steps:
            if isinstance(raw, RefinementStep):
                step = raw
            elif isinstance(raw, Mapping):
                step = RefinementStep(**raw)
            else:  # pragma: no cover - defensive branch
                raise TypeError("steps must be RefinementStep or mapping instances")
            self._steps[step.identifier] = step

    def remove_step(self, identifier: str) -> None:
        key = _normalise_identifier(identifier, field_name="identifier")
        self._steps.pop(key, None)

    def record_signal(self, signal: RefinementSignal | Mapping[str, object]) -> None:
        if isinstance(signal, RefinementSignal):
            payload = signal
        elif isinstance(signal, Mapping):
            payload = RefinementSignal(**signal)
        else:  # pragma: no cover - defensive branch
            raise TypeError("signal must be RefinementSignal or mapping")
        self._signals.append(payload)

    def extend_signals(
        self, signals: Iterable[RefinementSignal | Mapping[str, object]]
    ) -> None:
        for signal in signals:
            self.record_signal(signal)

    def clear_signals(self) -> None:
        self._signals.clear()

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    @property
    def steps(self) -> tuple[RefinementStep, ...]:
        return tuple(self._steps.values())

    @property
    def signals(self) -> tuple[RefinementSignal, ...]:
        return tuple(self._signals)

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def prioritise(self, *, limit: int | None = None) -> tuple[RefinementRecommendation, ...]:
        scored = self._score_steps()
        scored.sort(key=lambda item: item.score, reverse=True)
        if limit is not None:
            scored = scored[: max(int(limit), 0)]
        recommendations: list[RefinementRecommendation] = []
        for item in scored:
            focus = f"{item.step.stage} • {item.step.summary}"
            recommendation = RefinementRecommendation(
                identifier=item.step.identifier,
                summary=item.step.summary,
                stage=item.step.stage,
                score=item.score,
                confidence=item.confidence,
                signals=tuple(_format_signal_reference(signal) for signal in item.matched_signals),
                focus=focus,
            )
            recommendations.append(recommendation)
        return tuple(recommendations)

    def plan(self, *, capacity: float | None = None) -> RefinementPlan:
        scored = self._score_steps()
        scored.sort(key=lambda item: item.score, reverse=True)
        available_capacity = self._default_capacity if capacity is None else max(float(capacity), 0.0)

        utilised = 0.0
        actions: list[RefinementAction] = []
        focus_areas: list[str] = []
        deferred: list[str] = []
        total_score = 0.0
        matched_signal_count = 0

        for item in scored:
            required = item.step.effort
            if required <= (available_capacity - utilised):
                action = self._build_action(item)
                actions.append(action)
                total_score += item.score
                matched_signal_count += len(item.matched_signals)
                if action.stage not in focus_areas:
                    focus_areas.append(action.stage)
                utilised += required
            else:
                deferred.append(item.step.identifier)

        metrics: dict[str, float] = {
            "utilised_capacity": round(utilised, 4),
            "remaining_capacity": round(max(available_capacity - utilised, 0.0), 4),
            "average_priority": round(total_score / len(actions), 4) if actions else 0.0,
            "signal_coverage": round(
                matched_signal_count / max(len(self._signals), 1), 4
            ) if actions else 0.0,
        }

        narrative = self._build_narrative(actions, deferred, utilised, available_capacity)

        return RefinementPlan(
            focus_areas=tuple(focus_areas),
            actions=tuple(actions),
            deferred=tuple(deferred),
            metrics=metrics,
            narrative=narrative,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _score_steps(self) -> list[_ScoredStep]:
        scored: list[_ScoredStep] = []
        for step in self._steps.values():
            matched: list[RefinementSignal] = []
            adjustment = 0.0
            weighted_alignment = 0.0
            influence_total = 0.0
            stage_weight = self._stage_weights.get(step.stage, 1.0)
            base_score = (
                0.5 * step.impact + 0.3 * (1.0 - step.effort) + 0.2 * (1.0 - step.risk)
            )
            for signal in self._signals:
                if not self._matches(step, signal):
                    continue
                influence = signal.weight * (
                    0.55 * signal.intensity + 0.45 * signal.urgency
                )
                if influence <= 0.0:
                    continue
                adjustment += influence * (signal.alignment - 0.5)
                matched.append(signal)
                weighted_alignment += signal.alignment * influence
                influence_total += influence
            score = _clamp(base_score * stage_weight + adjustment)
            avg_alignment = (
                weighted_alignment / influence_total if influence_total else 0.5
            )
            confidence = _clamp(
                0.4 * step.impact
                + 0.25 * (1.0 - step.risk)
                + 0.2 * (1.0 - step.effort)
                + 0.15 * avg_alignment
            )
            scored.append(
                _ScoredStep(
                    step=step,
                    score=score,
                    confidence=confidence,
                    matched_signals=tuple(matched),
                )
            )
        return scored

    def _matches(self, step: RefinementStep, signal: RefinementSignal) -> bool:
        if signal.target_stage and signal.target_stage != step.stage:
            return False
        if signal.target_tags:
            if not set(signal.target_tags).intersection(step.tags):
                return False
        return True

    def _build_action(self, item: _ScoredStep) -> RefinementAction:
        verb = "Accelerate" if item.score >= 0.85 else "Advance"
        expected = self._expected_outcome(item.step)
        rationale = (
            f"{verb} {item.step.summary}"
        )
        return RefinementAction(
            identifier=item.step.identifier,
            summary=item.step.summary,
            stage=item.step.stage,
            action=rationale,
            confidence=item.confidence,
            signals=tuple(_format_signal_reference(signal) for signal in item.matched_signals),
            expected_outcome=expected,
        )

    def _expected_outcome(self, step: RefinementStep) -> str:
        if step.tags:
            return f"Strengthen {step.tags[0]} indicators through iteration."
        return "Deliver measurable uplift across the primary KPI."

    def _build_narrative(
        self,
        actions: Sequence[RefinementAction],
        deferred: Sequence[str],
        utilised: float,
        capacity: float,
    ) -> str:
        if not actions:
            return "No refinement actions selected; gather richer signals or expand capacity."
        headline = actions[0]
        deferred_text = ", ".join(deferred) if deferred else "none"
        return (
            f"Lead with {headline.identifier} in {headline.stage} utilising {utilised:.2f} capacity "
            f"from {capacity:.2f} available. Deferred: {deferred_text}."
        )
