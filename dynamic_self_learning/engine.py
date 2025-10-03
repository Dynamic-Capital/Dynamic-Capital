"""Dynamic self-learning planner blending signals into actionable loops."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LearningSignal",
    "LearningContext",
    "LearningPlan",
    "DynamicSelfLearning",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _clean_text(value: str, *, default: str | None = None, lower: bool = False) -> str:
    cleaned = value.strip()
    if not cleaned and default is not None:
        cleaned = default
    if lower:
        cleaned = cleaned.lower()
    return cleaned


@dataclass(slots=True)
class LearningSignal:
    """Signal capturing the outcome of a deliberate practice session."""

    domain: str
    skill: str
    challenge: str
    effort: float = 0.5
    practice_quality: float = 0.5
    outcome_quality: float = 0.5
    retention: float = 0.5
    integration: float = 0.5
    insight: str | None = None
    experiment: str | None = None
    timestamp: datetime = field(default_factory=_utcnow)
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.domain = _clean_text(self.domain, default="general", lower=True)
        self.skill = _clean_text(self.skill, default="core skill")
        self.challenge = _clean_text(self.challenge, default="practice")
        self.effort = _clamp(float(self.effort))
        self.practice_quality = _clamp(float(self.practice_quality))
        self.outcome_quality = _clamp(float(self.outcome_quality))
        self.retention = _clamp(float(self.retention))
        self.integration = _clamp(float(self.integration))
        self.weight = max(float(self.weight), 0.0)
        if self.insight is not None:
            self.insight = _clean_text(self.insight) or None
        if self.experiment is not None:
            self.experiment = _clean_text(self.experiment) or None
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class LearningContext:
    """Current learning environment shaping the next iteration."""

    goal: str
    available_time: float
    energy_level: float
    support_level: float
    focus_window_hours: float = 1.0
    experiments_completed: int = 0
    feedback_notes: Sequence[str] = ()

    def __post_init__(self) -> None:
        self.goal = _clean_text(self.goal)
        if not self.goal:
            raise ValueError("goal must not be empty")
        self.available_time = _clamp(float(self.available_time))
        self.energy_level = _clamp(float(self.energy_level))
        self.support_level = _clamp(float(self.support_level))
        self.focus_window_hours = max(float(self.focus_window_hours), 0.25)
        self.experiments_completed = max(int(self.experiments_completed), 0)
        self.feedback_notes = tuple(_clean_text(note) for note in self.feedback_notes if _clean_text(note))

    @property
    def has_support(self) -> bool:
        return self.support_level >= 0.4


@dataclass(slots=True)
class LearningPlan:
    """Action plan orchestrating the next self-learning loop."""

    momentum: float
    stability: float
    focus_domains: tuple[str, ...]
    growth_zones: tuple[str, ...]
    experiments: tuple[str, ...]
    reinforcements: tuple[str, ...]
    reflection_prompts: tuple[str, ...]
    narrative: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "momentum": self.momentum,
            "stability": self.stability,
            "focus_domains": list(self.focus_domains),
            "growth_zones": list(self.growth_zones),
            "experiments": list(self.experiments),
            "reinforcements": list(self.reinforcements),
            "reflection_prompts": list(self.reflection_prompts),
            "narrative": self.narrative,
        }


class DynamicSelfLearning:
    """Aggregate practice signals to produce an adaptive learning loop."""

    def __init__(self, *, history: int = 90) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[LearningSignal] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def capture(self, signal: LearningSignal | Mapping[str, object]) -> LearningSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[LearningSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    @property
    def signal_count(self) -> int:
        return len(self._signals)

    def latest_signal(self) -> LearningSignal | None:
        if not self._signals:
            return None
        return self._signals[-1]

    def _coerce_signal(self, signal: LearningSignal | Mapping[str, object]) -> LearningSignal:
        if isinstance(signal, LearningSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return LearningSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be LearningSignal or mapping")

    # ------------------------------------------------------------- planning
    def generate_plan(self, context: LearningContext) -> LearningPlan:
        if not self._signals:
            raise RuntimeError("no learning signals captured")

        momentum = self._momentum_score()
        stability = self._stability_score()
        focus_domains = self._focus_domains()
        growth_zones = self._growth_zones(context, momentum)
        experiments = self._experiment_suggestions(context, momentum)
        reinforcements = self._reinforcements(context)
        prompts = self._reflection_prompts(context, momentum, stability)
        narrative = self._narrative(context, momentum, stability, focus_domains)

        return LearningPlan(
            momentum=momentum,
            stability=stability,
            focus_domains=focus_domains,
            growth_zones=growth_zones,
            experiments=experiments,
            reinforcements=reinforcements,
            reflection_prompts=prompts,
            narrative=narrative,
        )

    # ------------------------------------------------------------ internals
    def _weighted_average(self, field_name: str) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight == 0.0:
            return 0.0
        value = sum(getattr(signal, field_name) * signal.weight for signal in self._signals)
        return _clamp(value / total_weight)

    def _momentum_score(self) -> float:
        outcome = self._weighted_average("outcome_quality")
        practice = self._weighted_average("practice_quality")
        retention = self._weighted_average("retention")
        integration = self._weighted_average("integration")
        return _clamp(0.4 * outcome + 0.25 * practice + 0.2 * integration + 0.15 * retention)

    def _stability_score(self) -> float:
        if len(self._signals) < 2:
            return 1.0
        values = [signal.practice_quality for signal in self._signals]
        avg = mean(values)
        variance = sum((value - avg) ** 2 for value in values) / len(values)
        # variance on [0, 1] is bounded by 0.25, normalise accordingly
        normalised = min(variance / 0.25, 1.0)
        return _clamp(1.0 - normalised)

    def _focus_domains(self) -> tuple[str, ...]:
        counts = Counter(signal.domain for signal in self._signals)
        if not counts:
            return ()
        top = counts.most_common(3)
        return tuple(domain for domain, _ in top)

    def _growth_zones(self, context: LearningContext, momentum: float) -> tuple[str, ...]:
        items: list[str] = []
        if momentum < 0.6:
            items.append("Elevate experiment design to convert practice into reliable progress.")
        if context.available_time < 0.35:
            items.append("Protect uninterrupted focus blocks to unlock deeper learning reps.")
        if context.energy_level < 0.45:
            items.append("Rebuild recovery habits to increase energy available for deliberate practice.")
        skill_scores: dict[str, float] = {}
        skill_counts: dict[str, int] = {}
        for signal in self._signals:
            skill_scores.setdefault(signal.skill, 0.0)
            skill_counts.setdefault(signal.skill, 0)
            skill_scores[signal.skill] += signal.outcome_quality
            skill_counts[signal.skill] += 1
        low_skills = [
            skill
            for skill, total in skill_scores.items()
            if total / skill_counts[skill] < 0.5
        ]
        for skill in low_skills[:2]:
            items.append(f"Design a targeted micro-practice to raise '{skill}' performance.")
        seen: dict[str, None] = {}
        return tuple(seen.setdefault(item, None) or item for item in items)

    def _experiment_suggestions(self, context: LearningContext, momentum: float) -> tuple[str, ...]:
        suggestions: list[str] = []
        if context.experiments_completed < max(1, self.signal_count // 3):
            suggestions.append(
                "Run a short experiment documenting before/after metrics for the top challenge."
            )
        if momentum < 0.7:
            suggestions.append(
                "Prototype a 30-minute deliberate practice sprint focused on the leading growth zone."
            )
        if not context.feedback_notes:
            suggestions.append("Seek fast feedback from a mentor or peer on the latest iteration.")
        else:
            suggestions.append(
                f"Integrate recent feedback: '{context.feedback_notes[0]}' into the next experiment design."
            )
        seen: dict[str, None] = {}
        return tuple(seen.setdefault(item, None) or item for item in suggestions)

    def _reinforcements(self, context: LearningContext) -> tuple[str, ...]:
        reinforcements: list[str] = []
        effort = self._weighted_average("effort")
        if effort >= 0.6:
            reinforcements.append("Maintain the warm-up ritual that keeps effort high before sessions.")
        else:
            reinforcements.append("Prime effort with a short intention-setting routine before practice.")
        if context.has_support:
            reinforcements.append("Leverage support partners for quick accountability check-ins.")
        else:
            reinforcements.append("Schedule a support touchpoint to externalise learning commitments.")
        if context.focus_window_hours >= 1.5:
            reinforcements.append("Keep long-form focus windows for complex skill development.")
        else:
            reinforcements.append("Stack micro-sessions to sustain momentum across shorter focus windows.")
        seen: dict[str, None] = {}
        return tuple(seen.setdefault(item, None) or item for item in reinforcements)

    def _reflection_prompts(
        self,
        context: LearningContext,
        momentum: float,
        stability: float,
    ) -> tuple[str, ...]:
        prompts = [
            "Which practice this week produced the clearest learning signal?",
            "How did I translate insight into a changed behaviour or system?",
        ]
        if momentum < 0.55:
            prompts.append("What bottleneck is slowing translation of practice into momentum?")
        if stability < 0.6:
            prompts.append("Which routine would smooth variability between sessions?")
        if context.feedback_notes:
            prompts.append(
                f"What concrete behaviour will respond to the feedback: '{context.feedback_notes[0]}'?"
            )
        return tuple(dict.fromkeys(prompts))

    def _narrative(
        self,
        context: LearningContext,
        momentum: float,
        stability: float,
        focus_domains: Sequence[str],
    ) -> str:
        domains = ", ".join(focus_domains) if focus_domains else "general practice"
        return (
            f"Goal: {context.goal}. Dominant domains: {domains}. "
            f"Momentum at {momentum:.2f} with stability {stability:.2f}. "
            "Lean into deliberate experiments and supportive rituals to amplify retention and integration."
        )
