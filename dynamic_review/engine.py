"""Review synthesis engine for Dynamic Capital's execution loops."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ReviewInput",
    "ReviewContext",
    "ReviewSection",
    "ReviewReport",
    "DynamicReviewEngine",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class ReviewInput:
    """Single observation considered in a review session."""

    area: str
    headline: str
    impact: float = 0.5
    confidence: float = 0.5
    urgency: float = 0.5
    sentiment: float = 0.5
    trend: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    owner: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.area = _normalise_text(self.area)
        self.headline = _normalise_text(self.headline)
        self.impact = _clamp(float(self.impact))
        self.confidence = _clamp(float(self.confidence))
        self.urgency = _clamp(float(self.urgency))
        self.sentiment = _clamp(float(self.sentiment))
        self.trend = _clamp(float(self.trend))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.owner = _normalise_optional(self.owner)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class ReviewContext:
    """Parameters guiding the review cadence and expectations."""

    mission: str
    cadence: str
    audience: str
    timebox_minutes: int
    risk_appetite: float
    alignment_pressure: float
    morale: float
    focus_areas: tuple[str, ...] = field(default_factory=tuple)
    prior_commitments: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.cadence = _normalise_text(self.cadence)
        self.audience = _normalise_text(self.audience)
        self.timebox_minutes = max(int(self.timebox_minutes), 0)
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.alignment_pressure = _clamp(float(self.alignment_pressure))
        self.morale = _clamp(float(self.morale))
        self.focus_areas = tuple(_normalise_text(item) for item in self.focus_areas if item.strip())
        self.prior_commitments = tuple(_normalise_text(item) for item in self.prior_commitments if item.strip())

    @property
    def is_high_pressure(self) -> bool:
        return self.alignment_pressure >= 0.7

    @property
    def is_low_morale(self) -> bool:
        return self.morale <= 0.4


@dataclass(slots=True)
class ReviewSection:
    """Segment in the review agenda."""

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
    """Structured output of the review engine."""

    health_score: float
    momentum: float
    headline: str
    sections: tuple[ReviewSection, ...]
    risks: tuple[str, ...]
    decisions: tuple[str, ...]
    follow_ups: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "health_score": self.health_score,
            "momentum": self.momentum,
            "headline": self.headline,
            "sections": [section.as_dict() for section in self.sections],
            "risks": list(self.risks),
            "decisions": list(self.decisions),
            "follow_ups": list(self.follow_ups),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicReviewEngine:
    """Aggregate review inputs and synthesise an agenda with decisions."""

    def __init__(self, *, history: int = 120) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._inputs: Deque[ReviewInput] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def capture(self, item: ReviewInput | Mapping[str, object]) -> ReviewInput:
        resolved = self._coerce_input(item)
        self._inputs.append(resolved)
        return resolved

    def extend(self, items: Iterable[ReviewInput | Mapping[str, object]]) -> None:
        for item in items:
            self.capture(item)

    def reset(self) -> None:
        self._inputs.clear()

    def _coerce_input(self, item: ReviewInput | Mapping[str, object]) -> ReviewInput:
        if isinstance(item, ReviewInput):
            return item
        if isinstance(item, Mapping):
            payload: MutableMapping[str, object] = dict(item)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return ReviewInput(**payload)  # type: ignore[arg-type]
        raise TypeError("item must be ReviewInput or mapping")

    # ----------------------------------------------------------- computation
    def compile_report(self, context: ReviewContext) -> ReviewReport:
        if not self._inputs:
            raise RuntimeError("no review inputs captured")

        weighted_total = sum(item.weight for item in self._inputs if item.weight > 0)
        if weighted_total <= 0:
            raise RuntimeError("review inputs have zero weight")

        health_score = self._weighted_metric(lambda item: (item.sentiment + item.confidence) / 2)
        momentum = self._weighted_metric(lambda item: (item.trend + item.impact) / 2)

        sections = self._build_sections()
        risks = self._collect_risks(context)
        decisions = self._collect_decisions(context)
        follow_ups = self._collect_follow_ups(context)
        headline = self._headline(context, health_score, momentum)
        narrative = self._narrative(context, health_score, momentum, sections, risks)

        return ReviewReport(
            health_score=round(health_score, 3),
            momentum=round(momentum, 3),
            headline=headline,
            sections=sections,
            risks=risks,
            decisions=decisions,
            follow_ups=follow_ups,
            narrative=narrative,
        )

    def _weighted_metric(self, selector: Callable[[ReviewInput], float]) -> float:
        total_weight = sum(item.weight for item in self._inputs if item.weight > 0)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(item) * item.weight for item in self._inputs if item.weight > 0)
        return _clamp(aggregate / total_weight)

    def _build_sections(self) -> tuple[ReviewSection, ...]:
        grouped: dict[str, list[ReviewInput]] = {}
        for item in self._inputs:
            grouped.setdefault(item.area, []).append(item)

        sections: list[ReviewSection] = []
        for area, items in grouped.items():
            priority = self._section_priority(items)
            talking_points = tuple(self._section_points(items))
            sections.append(
                ReviewSection(
                    title=area,
                    talking_points=talking_points,
                    priority=priority,
                )
            )

        sections.sort(key=lambda section: ("High" != section.priority, section.title))
        return tuple(sections)

    def _section_priority(self, items: Sequence[ReviewInput]) -> str:
        avg_urgency = sum(item.urgency for item in items) / len(items)
        avg_impact = sum(item.impact for item in items) / len(items)
        if avg_urgency >= 0.65 or avg_impact >= 0.7:
            return "High"
        if avg_urgency >= 0.45:
            return "Medium"
        return "Low"

    def _section_points(self, items: Sequence[ReviewInput]) -> Sequence[str]:
        ordered = sorted(items, key=lambda item: (-item.impact, -item.urgency, item.headline))
        points = [item.headline for item in ordered[:3]]
        if len(items) > 3:
            points.append(f"+ {len(items) - 3} additional updates")
        return points

    def _collect_risks(self, context: ReviewContext) -> tuple[str, ...]:
        risks: list[str] = []
        for item in self._inputs:
            if item.impact >= 0.7 and item.urgency >= 0.6:
                owner = f" (owner: {item.owner})" if item.owner else ""
                risks.append(f"{item.area}: {item.headline}{owner}")
        if context.is_low_morale:
            risks.append("Morale below target: plan recognition loop")
        if context.is_high_pressure:
            risks.append("Alignment pressure high: pre-wire decisions before session")
        return tuple(dict.fromkeys(risks))

    def _collect_decisions(self, context: ReviewContext) -> tuple[str, ...]:
        decisions: list[str] = []
        hotspots = Counter(item.area for item in self._inputs if item.impact >= 0.6)
        for area, count in hotspots.most_common(3):
            decisions.append(f"Decide go/no-go for {area} initiatives ({count} blockers)")
        if context.prior_commitments:
            decisions.append("Re-affirm prior commitments: " + ", ".join(context.prior_commitments))
        if not decisions:
            decisions.append("Confirm status quo and close the session early")
        return tuple(decisions)

    def _collect_follow_ups(self, context: ReviewContext) -> tuple[str, ...]:
        follow_ups: list[str] = []
        for item in self._inputs:
            if item.trend <= 0.4 and item.sentiment <= 0.5:
                follow_ups.append(f"Stabilise {item.area}: assign support and define 48h actions")
        if context.focus_areas:
            follow_ups.append("Send async memo covering: " + ", ".join(context.focus_areas))
        if not follow_ups:
            follow_ups.append("Log review notes and publish decisions within 30 minutes")
        return tuple(dict.fromkeys(follow_ups))

    def _headline(self, context: ReviewContext, health: float, momentum: float) -> str:
        direction = "accelerating" if momentum >= 0.6 else "stabilising" if momentum >= 0.45 else "at risk"
        return (
            f"{context.cadence.title()} review: {direction} trajectory with health {int(round(health * 100))}%"
        )

    def _narrative(
        self,
        context: ReviewContext,
        health: float,
        momentum: float,
        sections: Sequence[ReviewSection],
        risks: Sequence[str],
    ) -> str:
        top_section = sections[0].title if sections else "General"
        risk_note = risks[0] if risks else "No critical risks flagged"
        morale_note = "Morale steady" if not context.is_low_morale else "Morale requires intervention"
        return (
            f"Mission: {context.mission}. Momentum {int(round(momentum * 100))}% with top focus on {top_section}. "
            f"{risk_note}. {morale_note}."
        )
