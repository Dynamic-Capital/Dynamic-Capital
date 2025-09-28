"""Helpers for quickly assembling a Dynamic Capital teaching loop."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, MutableMapping, Sequence

__all__ = [
    "TeachingMoment",
    "TeachingContext",
    "TeachingLoop",
    "TeachingPlan",
    "DynamicTeachingEngine",
]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


@dataclass(slots=True)
class TeachingMoment:
    """Captured learning moment used to inform future sessions."""

    topic: str
    audience: str
    clarity: float = 0.5
    engagement: float = 0.5
    retention: float = 0.5
    confidence: float = 0.5
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.topic = _normalise_text(self.topic)
        self.audience = _normalise_text(self.audience)
        self.clarity = _clamp(self.clarity)
        self.engagement = _clamp(self.engagement)
        self.retention = _clamp(self.retention)
        self.confidence = _clamp(self.confidence)
        self.weight = max(float(self.weight), 0.0)


@dataclass(slots=True)
class TeachingContext:
    """Parameters describing the upcoming teaching need."""

    mission: str
    audience_profile: str
    duration_minutes: int
    format: str
    reinforcement_bias: float = 0.5

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.audience_profile = _normalise_text(self.audience_profile)
        self.duration_minutes = max(int(self.duration_minutes), 0)
        self.format = _normalise_text(self.format)
        self.reinforcement_bias = _clamp(self.reinforcement_bias)


@dataclass(slots=True)
class TeachingLoop:
    title: str
    duration: int
    objectives: tuple[str, ...]
    reinforcement: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "title": self.title,
            "duration": self.duration,
            "objectives": list(self.objectives),
            "reinforcement": list(self.reinforcement),
        }


@dataclass(slots=True)
class TeachingPlan:
    loops: tuple[TeachingLoop, ...]
    reinforcement: tuple[str, ...]
    next_steps: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "loops": [loop.as_dict() for loop in self.loops],
            "reinforcement": list(self.reinforcement),
            "next_steps": list(self.next_steps),
            "narrative": self.narrative,
        }


class DynamicTeachingEngine:
    """Translate captured teaching moments into a structured agenda."""

    def __init__(self) -> None:
        self._moments: List[TeachingMoment] = []

    def add(self, moment: TeachingMoment) -> None:
        if not isinstance(moment, TeachingMoment):  # pragma: no cover - guard
            raise TypeError("moment must be a TeachingMoment instance")
        self._moments.append(moment)

    def extend(self, moments: Iterable[TeachingMoment]) -> None:
        for moment in moments:
            self.add(moment)

    def clear(self) -> None:
        self._moments.clear()

    def design(self, context: TeachingContext) -> TeachingPlan:
        if not self._moments:
            raise RuntimeError("no teaching moments recorded")

        ranked = sorted(self._moments, key=self._score, reverse=True)

        loops = self._assemble_loops(context, ranked)
        reinforcement = self._reinforcement_actions(context, ranked)
        next_steps = self._next_steps(ranked)
        narrative = (
            f"Mission {context.mission} for {context.audience_profile}. "
            f"{len(loops)} loop(s) across {context.duration_minutes} minutes in {context.format} format."
        )

        return TeachingPlan(
            loops=tuple(loops),
            reinforcement=tuple(reinforcement),
            next_steps=tuple(next_steps),
            narrative=narrative,
        )

    # ------------------------------------------------------------------ utils
    def _score(self, moment: TeachingMoment) -> float:
        return moment.weight * (moment.clarity * 0.4 + moment.engagement * 0.3 + moment.retention * 0.3)

    def _assemble_loops(
        self, context: TeachingContext, moments: Sequence[TeachingMoment]
    ) -> List[TeachingLoop]:
        total_minutes = max(context.duration_minutes, 1)
        segment = max(total_minutes // 3, 5)
        topics = [moment.topic for moment in moments[:3]]
        loops: list[TeachingLoop] = []
        stages = ("Prime", "Practice", "Reinforce")
        for index, title in enumerate(stages):
            topic = topics[index] if index < len(topics) else topics[-1]
            objectives = (
                f"Clarify key concept: {topic}",
                "Capture audience reflections",
            )
            reinforcement = (
                "Share concise summary afterward",
                "Log open questions in knowledge base",
            )
            loops.append(
                TeachingLoop(
                    title=f"{title}: {topic}",
                    duration=segment,
                    objectives=objectives,
                    reinforcement=reinforcement,
                )
            )
        return loops

    def _reinforcement_actions(
        self, context: TeachingContext, moments: Sequence[TeachingMoment]
    ) -> List[str]:
        actions = ["Send recap with key visuals"]
        if context.reinforcement_bias >= 0.6:
            actions.append("Schedule follow-up clinic in 1 week")
        if any(moment.confidence < 0.5 for moment in moments[:3]):
            actions.append("Pair attendees for peer teaching reps")
        return actions

    def _next_steps(self, moments: Sequence[TeachingMoment]) -> List[str]:
        hottest_topic = moments[0].topic
        return [
            f"Gather qualitative feedback on {hottest_topic}",
            "Update canonical playbook with new insights",
        ]

