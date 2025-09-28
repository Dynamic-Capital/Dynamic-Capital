"""Concise skill development planning primitives."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, MutableMapping

__all__ = [
    "SkillSignal",
    "SkillContext",
    "SkillFocus",
    "SkillPlan",
    "DynamicSkillsEngine",
]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


@dataclass(slots=True)
class SkillSignal:
    """Observed evidence for a specific skill."""

    skill: str
    observation: str
    proficiency: float = 0.5
    demand: float = 0.5
    momentum: float = 0.5
    confidence: float = 0.5
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.skill = _normalise_text(self.skill)
        self.observation = _normalise_text(self.observation)
        self.proficiency = _clamp(self.proficiency)
        self.demand = _clamp(self.demand)
        self.momentum = _clamp(self.momentum)
        self.confidence = _clamp(self.confidence)
        self.weight = max(float(self.weight), 0.0)


@dataclass(slots=True)
class SkillContext:
    """Context window for prioritising development work."""

    mission: str
    horizon_weeks: int
    bandwidth: float
    strategic_weight: float = 0.5

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.horizon_weeks = max(int(self.horizon_weeks), 0)
        self.bandwidth = _clamp(self.bandwidth)
        self.strategic_weight = _clamp(self.strategic_weight)


@dataclass(slots=True)
class SkillFocus:
    skill: str
    priority: str
    actions: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "skill": self.skill,
            "priority": self.priority,
            "actions": list(self.actions),
        }


@dataclass(slots=True)
class SkillPlan:
    accelerate: tuple[SkillFocus, ...]
    sustain: tuple[SkillFocus, ...]
    watch: tuple[SkillFocus, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "accelerate": [focus.as_dict() for focus in self.accelerate],
            "sustain": [focus.as_dict() for focus in self.sustain],
            "watch": [focus.as_dict() for focus in self.watch],
            "narrative": self.narrative,
        }


class DynamicSkillsEngine:
    """Rank skill signals and generate a pragmatic improvement plan."""

    def __init__(self) -> None:
        self._signals: List[SkillSignal] = []

    def add(self, signal: SkillSignal) -> None:
        if not isinstance(signal, SkillSignal):  # pragma: no cover - guard
            raise TypeError("signal must be a SkillSignal instance")
        self._signals.append(signal)

    def extend(self, signals: Iterable[SkillSignal]) -> None:
        for signal in signals:
            self.add(signal)

    def clear(self) -> None:
        self._signals.clear()

    def plan(self, context: SkillContext) -> SkillPlan:
        if not self._signals:
            raise RuntimeError("no skill signals available")

        ranked = sorted(self._signals, key=self._score, reverse=True)

        accelerate: list[SkillFocus] = []
        sustain: list[SkillFocus] = []
        watch: list[SkillFocus] = []

        for signal in ranked:
            category, actions = self._categorise(signal, context)
            focus = SkillFocus(skill=signal.skill, priority=category, actions=actions)
            if category == "Accelerate":
                accelerate.append(focus)
            elif category == "Sustain":
                sustain.append(focus)
            else:
                watch.append(focus)

        narrative = (
            f"Mission {context.mission}. {len(accelerate)} acceleration targets over "
            f"{context.horizon_weeks}-week horizon with bandwidth {context.bandwidth:.2f}."
        )

        return SkillPlan(
            accelerate=tuple(accelerate),
            sustain=tuple(sustain),
            watch=tuple(watch),
            narrative=narrative,
        )

    # ------------------------------------------------------------------ utils
    def _score(self, signal: SkillSignal) -> float:
        demand_gap = max(signal.demand - signal.proficiency, 0.0)
        return signal.weight * (demand_gap * 0.6 + (1.0 - signal.confidence) * 0.4)

    def _categorise(self, signal: SkillSignal, context: SkillContext) -> tuple[str, tuple[str, ...]]:
        demand_gap = max(signal.demand - signal.proficiency, 0.0)
        stretch = demand_gap * context.strategic_weight
        if stretch >= 0.4 and context.bandwidth >= 0.3:
            category = "Accelerate"
            actions = (
                f"Schedule deliberate practice for {signal.skill}",
                "Pair with mentor for weekly feedback",
            )
        elif stretch >= 0.2:
            category = "Sustain"
            actions = (
                f"Ship small project using {signal.skill}",
                "Review learning backlog bi-weekly",
            )
        else:
            category = "Watch"
            actions = (
                f"Monitor market signals for {signal.skill}",
                "Log lightweight reps monthly",
            )
        if signal.momentum < 0.4:
            actions += ("Boost momentum with quick-win task",)
        return category, actions

