"""Compact review synthesis helpers for Dynamic Capital rituals."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import fmean
from typing import Dict, Iterable, List, MutableMapping, Sequence

__all__ = [
    "ReviewInput",
    "ReviewContext",
    "ReviewSection",
    "ReviewReport",
    "DynamicReviewEngine",
]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


@dataclass(slots=True)
class ReviewInput:
    """Observation captured for a review."""

    area: str
    headline: str
    impact: float = 0.5
    urgency: float = 0.5
    confidence: float = 0.5
    sentiment: float = 0.5
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.area = _normalise_text(self.area)
        self.headline = _normalise_text(self.headline)
        self.impact = _clamp(self.impact)
        self.urgency = _clamp(self.urgency)
        self.confidence = _clamp(self.confidence)
        self.sentiment = _clamp(self.sentiment)
        self.weight = max(float(self.weight), 0.0)


@dataclass(slots=True)
class ReviewContext:
    """Guiding parameters for assembling the review."""

    mission: str
    cadence: str
    attention_minutes: int
    risk_tolerance: float = 0.5

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.cadence = _normalise_text(self.cadence)
        self.attention_minutes = max(int(self.attention_minutes), 0)
        self.risk_tolerance = _clamp(self.risk_tolerance)


@dataclass(slots=True)
class ReviewSection:
    title: str
    talking_points: tuple[str, ...]
    priority: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "title": self.title,
            "talking_points": list(self.talking_points),
            "priority": self.priority,
        }


@dataclass(slots=True)
class ReviewReport:
    health_score: float
    agenda: tuple[ReviewSection, ...]
    risks: tuple[str, ...]
    decisions: tuple[str, ...]
    follow_ups: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "health_score": self.health_score,
            "agenda": [section.as_dict() for section in self.agenda],
            "risks": list(self.risks),
            "decisions": list(self.decisions),
            "follow_ups": list(self.follow_ups),
            "narrative": self.narrative,
        }


class DynamicReviewEngine:
    """Group observations into a compact review deck."""

    def __init__(self) -> None:
        self._inputs: List[ReviewInput] = []

    def add(self, observation: ReviewInput) -> None:
        if not isinstance(observation, ReviewInput):  # pragma: no cover - guard
            raise TypeError("observation must be a ReviewInput instance")
        self._inputs.append(observation)

    def extend(self, observations: Iterable[ReviewInput]) -> None:
        for observation in observations:
            self.add(observation)

    def clear(self) -> None:
        self._inputs.clear()

    def compile(self, context: ReviewContext) -> ReviewReport:
        if not self._inputs:
            raise RuntimeError("no review inputs available")

        ranked = sorted(self._inputs, key=lambda item: self._score(item), reverse=True)

        grouped: Dict[str, List[ReviewInput]] = {}
        for item in ranked:
            grouped.setdefault(item.area, []).append(item)

        agenda = [self._section(area, items) for area, items in grouped.items()]
        agenda.sort(key=lambda section: self._priority_rank(section.priority))

        risks = tuple(
            f"{item.area}: {item.headline}"
            for item in ranked
            if item.sentiment <= 0.4 and item.urgency >= 0.6
        )
        decisions = tuple(
            f"Confirm path for {item.area}: {item.headline}"
            for item in ranked
            if item.confidence >= 0.7 and item.impact >= 0.6
        )
        follow_ups = tuple(
            f"Assign owner for {item.area}: {item.headline}"
            for item in ranked
            if item.confidence < 0.5
        )

        health_score = round(
            fmean(item.sentiment for item in ranked if item.weight > 0) * 100
        ) / 100

        narrative = (
            f"Mission {context.mission} ({context.cadence}). "
            f"Reviewing {len(self._inputs)} signals across {len(grouped)} areas "
            f"with {context.attention_minutes} minutes of attention."
        )

        return ReviewReport(
            health_score=health_score,
            agenda=tuple(agenda),
            risks=risks,
            decisions=decisions,
            follow_ups=follow_ups,
            narrative=narrative,
        )

    # ------------------------------------------------------------------ utils
    def _score(self, item: ReviewInput) -> float:
        return item.weight * (item.impact * 0.6 + item.urgency * 0.4)

    def _section(self, area: str, items: Sequence[ReviewInput]) -> ReviewSection:
        talking_points = tuple(entry.headline for entry in items[:3])
        avg_impact = fmean(entry.impact for entry in items)
        avg_sentiment = fmean(entry.sentiment for entry in items)
        if avg_sentiment < 0.45:
            priority = "Critical"
        elif avg_impact >= 0.6:
            priority = "Focus"
        else:
            priority = "Monitor"
        return ReviewSection(title=area, talking_points=talking_points, priority=priority)

    def _priority_rank(self, priority: str) -> int:
        order = {"Critical": 0, "Focus": 1, "Monitor": 2}
        return order.get(priority, 99)

