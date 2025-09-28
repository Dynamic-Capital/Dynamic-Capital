"""Teaching design engine for Dynamic Capital's knowledge loops."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "TeachingMoment",
    "TeachingContext",
    "TeachingLoop",
    "TeachingPlan",
    "DynamicTeachingEngine",
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
class TeachingMoment:
    """Single captured teaching moment or lesson insight."""

    topic: str
    audience: str
    clarity: float = 0.5
    engagement: float = 0.5
    retention: float = 0.5
    confidence: float = 0.5
    impact: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    feedback: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.topic = _normalise_text(self.topic)
        self.audience = _normalise_text(self.audience)
        self.clarity = _clamp(float(self.clarity))
        self.engagement = _clamp(float(self.engagement))
        self.retention = _clamp(float(self.retention))
        self.confidence = _clamp(float(self.confidence))
        self.impact = _clamp(float(self.impact))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.feedback = _normalise_optional(self.feedback)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class TeachingContext:
    """Parameters describing the upcoming teaching session."""

    mission: str
    audience_profile: str
    timebox_minutes: int
    format: str
    interactivity: float
    rigor: float
    follow_up_pressure: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    reinforcement_channels: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.audience_profile = _normalise_text(self.audience_profile)
        self.timebox_minutes = max(int(self.timebox_minutes), 0)
        self.format = _normalise_text(self.format)
        self.interactivity = _clamp(float(self.interactivity))
        self.rigor = _clamp(float(self.rigor))
        self.follow_up_pressure = _clamp(float(self.follow_up_pressure))
        self.constraints = tuple(_normalise_text(item) for item in self.constraints if item.strip())
        self.reinforcement_channels = tuple(
            _normalise_text(item) for item in self.reinforcement_channels if item.strip()
        )

    @property
    def is_time_constrained(self) -> bool:
        return self.timebox_minutes <= 30

    @property
    def needs_reinforcement(self) -> bool:
        return self.follow_up_pressure >= 0.6


@dataclass(slots=True)
class TeachingLoop:
    """Single teaching loop segment in the final plan."""

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
    """Aggregated teaching plan with loops and follow-ups."""

    loops: tuple[TeachingLoop, ...]
    engagement_strategies: tuple[str, ...]
    reinforcement_actions: tuple[str, ...]
    risks: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "loops": [loop.as_dict() for loop in self.loops],
            "engagement_strategies": list(self.engagement_strategies),
            "reinforcement_actions": list(self.reinforcement_actions),
            "risks": list(self.risks),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicTeachingEngine:
    """Aggregate teaching moments and design an upcoming lesson."""

    def __init__(self, *, history: int = 100) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._moments: Deque[TeachingMoment] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def capture(self, moment: TeachingMoment | Mapping[str, object]) -> TeachingMoment:
        resolved = self._coerce_moment(moment)
        self._moments.append(resolved)
        return resolved

    def extend(self, moments: Iterable[TeachingMoment | Mapping[str, object]]) -> None:
        for moment in moments:
            self.capture(moment)

    def reset(self) -> None:
        self._moments.clear()

    def _coerce_moment(self, moment: TeachingMoment | Mapping[str, object]) -> TeachingMoment:
        if isinstance(moment, TeachingMoment):
            return moment
        if isinstance(moment, Mapping):
            payload: MutableMapping[str, object] = dict(moment)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return TeachingMoment(**payload)  # type: ignore[arg-type]
        raise TypeError("moment must be TeachingMoment or mapping")

    # ----------------------------------------------------------- computation
    def build_plan(self, context: TeachingContext) -> TeachingPlan:
        if not self._moments:
            raise RuntimeError("no teaching moments captured")

        weighted_total = sum(moment.weight for moment in self._moments if moment.weight > 0)
        if weighted_total <= 0:
            raise RuntimeError("teaching moments have zero weight")

        loops = self._build_loops(context)
        engagement_strategies = self._engagement_strategies(context)
        reinforcement_actions = self._reinforcement_actions(context)
        risks = self._risks(context)
        narrative = self._narrative(context, loops, risks)

        return TeachingPlan(
            loops=loops,
            engagement_strategies=engagement_strategies,
            reinforcement_actions=reinforcement_actions,
            risks=risks,
            narrative=narrative,
        )

    def _build_loops(self, context: TeachingContext) -> tuple[TeachingLoop, ...]:
        ordered = sorted(
            (moment for moment in self._moments if moment.weight > 0),
            key=lambda moment: (-moment.impact, -moment.engagement, moment.topic),
        )
        time_remaining = context.timebox_minutes or sum(moment.weight for moment in ordered)
        loops: list[TeachingLoop] = []
        for moment in ordered[:5]:
            duration = max(int(round((moment.weight / max(1.0, ordered[0].weight)) * 10)), 5)
            if context.timebox_minutes:
                duration = min(duration, time_remaining)
            objectives = (
                f"Deliver clarity on {moment.topic}",
                "Probe for retention via scenarios",
            )
            reinforcement = self._loop_reinforcement(moment, context)
            loops.append(
                TeachingLoop(
                    title=moment.topic,
                    duration=duration,
                    objectives=objectives,
                    reinforcement=reinforcement,
                )
            )
            time_remaining = max(time_remaining - duration, 0)
            if time_remaining <= 0:
                break
        if not loops:
            loops.append(
                TeachingLoop(
                    title="Foundational principles",
                    duration=context.timebox_minutes or 20,
                    objectives=("Frame mission context", "Surface known blind spots"),
                    reinforcement=("Send summary memo",),
                )
            )
        return tuple(loops)

    def _loop_reinforcement(self, moment: TeachingMoment, context: TeachingContext) -> tuple[str, ...]:
        reinforcement: list[str] = []
        if context.reinforcement_channels:
            reinforcement.append("Channel follow-up: " + ", ".join(context.reinforcement_channels))
        if moment.retention <= 0.5:
            reinforcement.append("Schedule retention check-in within 72h")
        if moment.feedback:
            reinforcement.append(f"Address feedback: {moment.feedback}")
        if not reinforcement:
            reinforcement.append("Capture Q&A transcript and publish highlight reel")
        return tuple(dict.fromkeys(reinforcement))

    def _engagement_strategies(self, context: TeachingContext) -> tuple[str, ...]:
        strategies: list[str] = []
        if context.interactivity >= 0.6:
            strategies.append("Run live problem solving pods")
        else:
            strategies.append("Embed micro-polls every 5 minutes")
        if context.is_time_constrained:
            strategies.append("Pre-ship primer so synchronous time stays high-fidelity")
        if context.rigor >= 0.7:
            strategies.append("Introduce graded challenge to reinforce rigor")
        return tuple(dict.fromkeys(strategies))

    def _reinforcement_actions(self, context: TeachingContext) -> tuple[str, ...]:
        actions: list[str] = []
        if context.needs_reinforcement:
            actions.append("Schedule follow-up lab within one week")
        if context.reinforcement_channels:
            actions.append("Automate drip reminders via " + ", ".join(context.reinforcement_channels))
        actions.append("Publish teaching artefacts within 24h")
        return tuple(dict.fromkeys(actions))

    def _risks(self, context: TeachingContext) -> tuple[str, ...]:
        risks: list[str] = []
        for moment in self._moments:
            if moment.clarity <= 0.45:
                risks.append(f"Clarity gap on {moment.topic}: upgrade visuals")
            if moment.engagement <= 0.4:
                risks.append(f"Low engagement on {moment.topic}: assign facilitator")
        if context.is_time_constrained:
            risks.append("Tight timebox: enforce agenda transitions")
        return tuple(dict.fromkeys(risks))

    def _narrative(
        self,
        context: TeachingContext,
        loops: Sequence[TeachingLoop],
        risks: Sequence[str],
    ) -> str:
        lead_loop = loops[0].title if loops else "Foundations"
        risk_note = risks[0] if risks else "No critical teaching risks"
        reinforcement_note = (
            "Reinforcement plan active" if context.needs_reinforcement else "Reinforcement optional"
        )
        return (
            f"Mission: {context.mission}. Lead loop: {lead_loop}. {risk_note}. {reinforcement_note}."
        )
