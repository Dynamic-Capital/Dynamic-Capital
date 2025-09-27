"""Self-awareness evaluation engine distinguishing awareness from overthinking."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping

__all__ = [
    "SelfAwarenessSignal",
    "AwarenessContext",
    "SelfAwarenessReport",
    "DynamicSelfAwareness",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


@dataclass(slots=True)
class SelfAwarenessSignal:
    """Observation across thought, emotion, or behavior channels."""

    channel: str
    observation: str
    clarity: float = 0.5
    alignment: float = 0.5
    agitation: float = 0.0
    action_bias: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.channel = self.channel.strip().lower() or "general"
        self.observation = self.observation.strip()
        if not self.observation:
            raise ValueError("observation must not be empty")
        self.clarity = _clamp(float(self.clarity))
        self.alignment = _clamp(float(self.alignment))
        self.agitation = _clamp(float(self.agitation))
        self.action_bias = _clamp(float(self.action_bias))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class AwarenessContext:
    """Snapshot of the individual's present-state appraisal."""

    situation: str
    emotion_label: str
    cognitive_noise: float
    bodily_tension: float
    readiness_for_action: float
    value_alignment_target: float
    personal_standards: tuple[str, ...] = ()
    support_level: float = 0.5

    def __post_init__(self) -> None:
        self.situation = self.situation.strip()
        if not self.situation:
            raise ValueError("situation must not be empty")
        self.emotion_label = self.emotion_label.strip() or "neutral"
        self.cognitive_noise = _clamp(float(self.cognitive_noise))
        self.bodily_tension = _clamp(float(self.bodily_tension))
        self.readiness_for_action = _clamp(float(self.readiness_for_action))
        self.value_alignment_target = _clamp(float(self.value_alignment_target))
        self.personal_standards = tuple(standard.strip() for standard in self.personal_standards if standard.strip())
        self.support_level = _clamp(float(self.support_level))

    @property
    def has_support(self) -> bool:
        return self.support_level >= 0.4


@dataclass(slots=True)
class SelfAwarenessReport:
    """Guidance summarising awareness and directing constructive action."""

    clarity_index: float
    emotional_equilibrium: float
    alignment_score: float
    overthinking_risk: float
    dominant_channels: tuple[str, ...]
    productive_actions: tuple[str, ...]
    reflection_prompts: tuple[str, ...]
    grounding_practices: tuple[str, ...]
    narrative: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "clarity_index": self.clarity_index,
            "emotional_equilibrium": self.emotional_equilibrium,
            "alignment_score": self.alignment_score,
            "overthinking_risk": self.overthinking_risk,
            "dominant_channels": list(self.dominant_channels),
            "productive_actions": list(self.productive_actions),
            "reflection_prompts": list(self.reflection_prompts),
            "grounding_practices": list(self.grounding_practices),
            "narrative": self.narrative,
        }


class DynamicSelfAwareness:
    """Aggregate signals to cultivate dynamic self-awareness."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[SelfAwarenessSignal] = deque(maxlen=history)

    # --------------------------------------------------------------- intake
    def capture(self, signal: SelfAwarenessSignal | Mapping[str, object]) -> SelfAwarenessSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[SelfAwarenessSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: SelfAwarenessSignal | Mapping[str, object]) -> SelfAwarenessSignal:
        if isinstance(signal, SelfAwarenessSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return SelfAwarenessSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be SelfAwarenessSignal or mapping")

    # --------------------------------------------------------------- report
    def generate_report(self, context: AwarenessContext) -> SelfAwarenessReport:
        if not self._signals:
            raise RuntimeError("no self-awareness signals captured")

        clarity_index = self._weighted_average("clarity")
        equilibrium = _clamp(1.0 - self._weighted_average("agitation"))
        alignment = self._weighted_average("alignment")
        action_bias = self._weighted_average("action_bias")
        overthinking_risk = self._overthinking_risk(context, clarity_index, action_bias)
        dominant_channels = self._dominant_channels()

        actions = self._productive_actions(context, alignment, action_bias)
        prompts = self._reflection_prompts(context, clarity_index, overthinking_risk)
        grounding = self._grounding_practices(context, equilibrium)
        narrative = self._narrative(context, clarity_index, alignment, overthinking_risk, dominant_channels)

        return SelfAwarenessReport(
            clarity_index=clarity_index,
            emotional_equilibrium=equilibrium,
            alignment_score=alignment,
            overthinking_risk=overthinking_risk,
            dominant_channels=dominant_channels,
            productive_actions=tuple(actions),
            reflection_prompts=tuple(prompts),
            grounding_practices=tuple(grounding),
            narrative=narrative,
        )

    # --------------------------------------------------------------- helpers
    def _weighted_average(self, field_name: str) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight == 0.0:
            return 0.0
        value = sum(getattr(signal, field_name) * signal.weight for signal in self._signals)
        return _clamp(value / total_weight)

    def _dominant_channels(self) -> tuple[str, ...]:
        counts = Counter(signal.channel for signal in self._signals)
        if not counts:
            return ()
        top_two = counts.most_common(2)
        return tuple(channel for channel, _ in top_two)

    def _overthinking_risk(
        self,
        context: AwarenessContext,
        clarity_index: float,
        action_bias: float,
    ) -> float:
        signal_agitation = self._weighted_average("agitation")
        rumination = 0.45 * (1.0 - clarity_index) + 0.35 * context.cognitive_noise + 0.2 * signal_agitation
        inertia = 0.5 * (1.0 - action_bias) + 0.5 * (1.0 - context.readiness_for_action)
        return _clamp(0.6 * rumination + 0.4 * inertia)

    def _productive_actions(
        self,
        context: AwarenessContext,
        alignment: float,
        action_bias: float,
    ) -> list[str]:
        actions: list[str] = []
        alignment_gap = context.value_alignment_target - alignment
        if alignment_gap > 0.1 and context.personal_standards:
            anchor = context.personal_standards[0]
            actions.append(
                f"Translate awareness into action by honoring the standard '{anchor}' in the next decision."
            )
        elif alignment_gap > 0.1:
            actions.append("Name one value you want to express in your next step and commit to it explicitly.")

        if action_bias < 0.6:
            actions.append("Design one concrete experiment that converts insight into a behavior within 24 hours.")

        if context.has_support:
            actions.append("Share the felt insight with a trusted partner to reinforce accountable action.")
        else:
            actions.append("Document the insight in your journal to solidify clarity before acting.")

        return actions or ["Acknowledge progress and choose one micro-action that aligns with your values."]

    def _reflection_prompts(
        self,
        context: AwarenessContext,
        clarity_index: float,
        overthinking_risk: float,
    ) -> list[str]:
        prompts = [
            "What emotion am I naming, and what need is it pointing toward?",
            "How does this awareness differ from merely replaying the problem?",
        ]
        if clarity_index < 0.55:
            prompts.append("Which signal could I investigate further to describe the situation more precisely?")
        if overthinking_risk > 0.5:
            prompts.append("What small action would demonstrate trust in my awareness rather than looping on analysis?")
        if context.personal_standards:
            prompts.append(
                f"Where does my current response align with '{context.personal_standards[0]}' and where does it drift?"
            )
        return prompts

    def _grounding_practices(
        self,
        context: AwarenessContext,
        equilibrium: float,
    ) -> list[str]:
        practices: list[str] = []
        if equilibrium < 0.5 or context.bodily_tension > 0.6:
            practices.append("Use a 3-breath scan to settle body tension before deciding.")
        if context.support_level < 0.4:
            practices.append("Schedule a check-in with a mentor to externalise rumination.")
        if not practices:
            practices.append("Maintain current grounding rituals; they are supporting emotional balance.")
        return practices

    def _narrative(
        self,
        context: AwarenessContext,
        clarity_index: float,
        alignment: float,
        overthinking_risk: float,
        dominant_channels: tuple[str, ...],
    ) -> str:
        channel_summary = ", ".join(dominant_channels) if dominant_channels else "no dominant channel"
        awareness_vs_overthinking = (
            "Self-awareness is present because you can name the feeling and purpose behind it; "
            "the task now is to translate that clarity into aligned movement."
            if overthinking_risk < 0.5
            else "Notice how looping analysis is rising—anchor to values to exit the overthinking spiral."
        )
        alignment_delta = context.value_alignment_target - alignment
        alignment_statement = (
            "Your signals show strong alignment with your standards." if alignment_delta <= 0.05 else "There is space to realign with your standards through intentional action."
        )
        return (
            f"Situation: {context.situation}. Emotion: {context.emotion_label}. "
            f"Dominant channels: {channel_summary}. Clarity index {clarity_index:.2f}, "
            f"alignment {alignment:.2f}. {alignment_statement} {awareness_vs_overthinking}"
        )
