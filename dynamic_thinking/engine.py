"""Cognitive scaffolding primitives for Dynamic Capital's thinking rituals.

The engine is intentionally lightweight: it can run inside notebooks, simple
APIs, or CLI utilities without persisting state.  Thinking loops are modelled as
weighted signals that influence clarity, risk posture, and ideation velocity for
an upcoming decision.  Consumers feed qualitative observations, determine the
thinking context, and receive a synthesised frame with recommended mental
models, guardrails against cognitive biases, and immediate next steps.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ThinkingSignal",
    "ThinkingContext",
    "ThinkingFrame",
    "DynamicThinkingEngine",
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


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class ThinkingSignal:
    """Weighted qualitative observation captured during a thinking loop."""

    theme: str
    content: str
    confidence: float = 0.5
    novelty: float = 0.5
    risk: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.theme = _normalise_text(self.theme).lower()
        self.content = _normalise_text(self.content)
        self.confidence = _clamp(float(self.confidence))
        self.novelty = _clamp(float(self.novelty))
        self.risk = _clamp(float(self.risk))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class ThinkingContext:
    """Parameters describing the decision or problem being explored."""

    objective: str
    decision_horizon: str
    risk_tolerance: float
    time_pressure: float
    data_completeness: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    principles: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.objective = _normalise_text(self.objective)
        self.decision_horizon = _normalise_text(self.decision_horizon)
        self.risk_tolerance = _clamp(float(self.risk_tolerance))
        self.time_pressure = _clamp(float(self.time_pressure))
        self.data_completeness = _clamp(float(self.data_completeness))
        self.constraints = _normalise_tuple(self.constraints)
        self.principles = _normalise_tuple(self.principles)

    @property
    def is_fast_cycle(self) -> bool:
        return self.time_pressure >= 0.7

    @property
    def is_data_sparse(self) -> bool:
        return self.data_completeness <= 0.4


@dataclass(slots=True)
class ThinkingFrame:
    """Synthesised output describing the current thinking posture."""

    clarity_index: float
    risk_pressure: float
    idea_velocity: float
    dominant_themes: tuple[str, ...]
    bias_alerts: tuple[str, ...]
    recommended_models: tuple[str, ...]
    synthesis: str
    action_steps: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "clarity_index": self.clarity_index,
            "risk_pressure": self.risk_pressure,
            "idea_velocity": self.idea_velocity,
            "dominant_themes": list(self.dominant_themes),
            "bias_alerts": list(self.bias_alerts),
            "recommended_models": list(self.recommended_models),
            "synthesis": self.synthesis,
            "action_steps": list(self.action_steps),
        }


class DynamicThinkingEngine:
    """Aggregate thinking signals and produce a structured frame."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[ThinkingSignal] = deque(maxlen=history)

    # ---------------------------------------------------------------- intake
    def capture(self, signal: ThinkingSignal | Mapping[str, object]) -> ThinkingSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[ThinkingSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: ThinkingSignal | Mapping[str, object]) -> ThinkingSignal:
        if isinstance(signal, ThinkingSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return ThinkingSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be ThinkingSignal or mapping")

    # ------------------------------------------------------------- computation
    def build_frame(self, context: ThinkingContext) -> ThinkingFrame:
        if not self._signals:
            raise RuntimeError("no thinking signals captured")

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            raise RuntimeError("thinking signals have zero weight")

        clarity = self._weighted_metric(lambda s: s.confidence * (1.0 - s.risk))
        risk_pressure = self._weighted_metric(lambda s: s.risk)
        idea_velocity = self._weighted_metric(lambda s: (s.novelty + s.confidence) / 2.0)

        themes = self._dominant_themes()
        bias_alerts = self._bias_alerts(clarity, risk_pressure, idea_velocity)
        recommended_models = self._recommend_models(context, clarity, risk_pressure, idea_velocity)
        synthesis = self._synthesise(context, clarity, risk_pressure, idea_velocity, themes)
        action_steps = self._action_steps(context, bias_alerts, recommended_models)

        return ThinkingFrame(
            clarity_index=round(clarity, 3),
            risk_pressure=round(risk_pressure, 3),
            idea_velocity=round(idea_velocity, 3),
            dominant_themes=themes,
            bias_alerts=bias_alerts,
            recommended_models=recommended_models,
            synthesis=synthesis,
            action_steps=action_steps,
        )

    def _weighted_metric(self, selector: Callable[[ThinkingSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _dominant_themes(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter(signal.theme for signal in self._signals)
        if not counter:
            return ()
        most_common = counter.most_common(3)
        return tuple(theme for theme, _ in most_common)

    def _bias_alerts(
        self,
        clarity: float,
        risk_pressure: float,
        idea_velocity: float,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if clarity <= 0.4 and risk_pressure >= 0.4:
            alerts.append("Cognitive fog: clarify facts vs. narratives")
        if idea_velocity <= 0.35:
            alerts.append("Stagnation risk: invite contrarian perspectives")
        if risk_pressure >= 0.6 and clarity >= 0.6:
            alerts.append("Overconfidence bias: run a pre-mortem")
        if clarity >= 0.75 and idea_velocity <= 0.4:
            alerts.append("Confirmation bias: actively disconfirm assumptions")
        return tuple(alerts)

    def _recommend_models(
        self,
        context: ThinkingContext,
        clarity: float,
        risk_pressure: float,
        idea_velocity: float,
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        if context.is_fast_cycle:
            recommendations.append("OODA Loop")
        if context.is_data_sparse:
            recommendations.append("First Principles Decomposition")
        if risk_pressure >= 0.6:
            recommendations.append("Pre-Mortem Analysis")
        if clarity <= 0.5:
            recommendations.append("MECE Structuring")
        if idea_velocity <= 0.45:
            recommendations.append("SCQA Narrative Framework")
        if clarity >= 0.7 and risk_pressure <= 0.3:
            recommendations.append("Backcasting Roadmap")
        # Deduplicate while preserving order
        seen: set[str] = set()
        ordered: list[str] = []
        for model in recommendations:
            if model not in seen:
                seen.add(model)
                ordered.append(model)
        return tuple(ordered)

    def _synthesise(
        self,
        context: ThinkingContext,
        clarity: float,
        risk_pressure: float,
        idea_velocity: float,
        themes: tuple[str, ...],
    ) -> str:
        theme_summary = ", ".join(themes) if themes else "no dominant themes"
        return (
            f"Objective: {context.objective}. "
            f"Clarity at {int(round(clarity * 100))}% with risk pressure {int(round(risk_pressure * 100))}%. "
            f"Idea velocity at {int(round(idea_velocity * 100))}%. "
            f"Themes: {theme_summary}."
        )

    def _action_steps(
        self,
        context: ThinkingContext,
        bias_alerts: tuple[str, ...],
        recommended_models: tuple[str, ...],
    ) -> tuple[str, ...]:
        steps: list[str] = []
        if bias_alerts:
            steps.extend(f"Address: {alert}" for alert in bias_alerts)
        if recommended_models:
            steps.append(
                "Run mental models: " + ", ".join(recommended_models)
            )
        if context.constraints:
            steps.append("Re-check constraints: " + ", ".join(context.constraints))
        if context.principles:
            steps.append("Align with principles: " + ", ".join(context.principles))
        if not steps:
            steps.append("Document next experiment and schedule review")
        return tuple(steps)
