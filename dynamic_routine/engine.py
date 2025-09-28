"""Ritual planning engine for Dynamic Capital's operating routines."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "RoutineActivity",
    "RoutineContext",
    "RoutineBlock",
    "RoutinePlan",
    "DynamicRoutineEngine",
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


def _normalise_lower(value: str, *, default: str = "") -> str:
    cleaned = value.strip().lower()
    return cleaned or default


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
class RoutineActivity:
    """Single task or ritual considered for the routine design."""

    name: str
    category: str
    importance: float = 0.5
    duration_minutes: int = 30
    energy_cost: float = 0.5
    focus_demand: float = 0.5
    renewal_value: float = 0.5
    cadence: str = "daily"
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.category = _normalise_lower(self.category, default="general")
        self.importance = _clamp(float(self.importance))
        self.duration_minutes = max(int(self.duration_minutes), 0)
        self.energy_cost = _clamp(float(self.energy_cost))
        self.focus_demand = _clamp(float(self.focus_demand))
        self.renewal_value = _clamp(float(self.renewal_value))
        self.cadence = _normalise_lower(self.cadence, default="unspecified")
        self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class RoutineContext:
    """Ambient constraints and goals for a routine cycle."""

    mission: str
    cadence: str
    available_minutes: int
    energy: float
    focus: float
    load: float
    recovery_priority: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    guardrails: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.cadence = _normalise_lower(self.cadence, default="unspecified")
        self.available_minutes = max(int(self.available_minutes), 0)
        self.energy = _clamp(float(self.energy))
        self.focus = _clamp(float(self.focus))
        self.load = _clamp(float(self.load))
        self.recovery_priority = _clamp(float(self.recovery_priority))
        self.constraints = tuple(_normalise_text(item) for item in self.constraints if item.strip())
        self.guardrails = tuple(_normalise_text(item) for item in self.guardrails if item.strip())

    @property
    def is_energy_constrained(self) -> bool:
        return self.energy <= 0.4

    @property
    def is_overloaded(self) -> bool:
        return self.load >= 0.7


@dataclass(slots=True)
class RoutineBlock:
    """Structured block inside the resulting routine."""

    name: str
    minutes: int
    intent: str
    intensity: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "minutes": self.minutes,
            "intent": self.intent,
            "intensity": self.intensity,
        }


@dataclass(slots=True)
class RoutinePlan:
    """Full routine output with prioritised blocks and supporting actions."""

    primary_blocks: tuple[RoutineBlock, ...]
    secondary_blocks: tuple[RoutineBlock, ...]
    recovery_actions: tuple[str, ...]
    automation_candidates: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "primary_blocks": [block.as_dict() for block in self.primary_blocks],
            "secondary_blocks": [block.as_dict() for block in self.secondary_blocks],
            "recovery_actions": list(self.recovery_actions),
            "automation_candidates": list(self.automation_candidates),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicRoutineEngine:
    """Aggregate activities and compose a resilient routine."""

    def __init__(self, *, history: int = 90) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._activities: Deque[RoutineActivity] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def add(self, activity: RoutineActivity | Mapping[str, object]) -> RoutineActivity:
        resolved = self._coerce_activity(activity)
        self._activities.append(resolved)
        return resolved

    def extend(self, activities: Iterable[RoutineActivity | Mapping[str, object]]) -> None:
        for activity in activities:
            self.add(activity)

    def reset(self) -> None:
        self._activities.clear()

    def _coerce_activity(self, activity: RoutineActivity | Mapping[str, object]) -> RoutineActivity:
        if isinstance(activity, RoutineActivity):
            return activity
        if isinstance(activity, Mapping):
            payload: MutableMapping[str, object] = dict(activity)
            return RoutineActivity(**payload)  # type: ignore[arg-type]
        raise TypeError("activity must be RoutineActivity or mapping")

    # ----------------------------------------------------------- computation
    def design(self, context: RoutineContext) -> RoutinePlan:
        if not self._activities:
            raise RuntimeError("no routine activities captured")

        scored = [
            (self._score_activity(activity, context), activity)
            for activity in self._activities
            if activity.weight > 0
        ]
        if not scored:
            raise RuntimeError("routine activities have zero weight")

        scored.sort(key=lambda item: (-item[0], item[1].importance, -item[1].duration_minutes))

        primary: list[RoutineBlock] = []
        secondary: list[RoutineBlock] = []
        time_remaining = context.available_minutes
        partial_flag = False

        for score, activity in scored:
            block_minutes = min(activity.duration_minutes, context.available_minutes or activity.duration_minutes)
            intent = self._intent_summary(activity)
            intensity = self._intensity_label(activity, context)
            if time_remaining > 0 and block_minutes > 0:
                allocation = min(block_minutes, time_remaining)
                block = RoutineBlock(
                    name=activity.name,
                    minutes=allocation,
                    intent=intent,
                    intensity=intensity,
                )
                primary.append(block)
                time_remaining -= allocation
                if allocation < block_minutes:
                    secondary.append(
                        RoutineBlock(
                            name=f"{activity.name} (deferred)",
                            minutes=block_minutes - allocation,
                            intent=intent,
                            intensity=intensity,
                        )
                    )
                    partial_flag = True
            else:
                secondary.append(
                    RoutineBlock(
                        name=activity.name,
                        minutes=block_minutes,
                        intent=intent,
                        intensity=intensity,
                    )
                )

        recovery_actions = self._recovery_actions(context)
        automation_candidates = self._automation_candidates(scored)
        narrative = self._narrative(context, primary, recovery_actions, partial_flag)

        return RoutinePlan(
            primary_blocks=tuple(primary),
            secondary_blocks=tuple(secondary),
            recovery_actions=recovery_actions,
            automation_candidates=automation_candidates,
            narrative=narrative,
        )

    def _score_activity(self, activity: RoutineActivity, context: RoutineContext) -> float:
        if activity.duration_minutes <= 0:
            return 0.0
        base = activity.importance * activity.weight
        energy_alignment = 1.0 - abs(activity.energy_cost - context.energy)
        focus_alignment = 1.0 - abs(activity.focus_demand - context.focus)
        renewal = activity.renewal_value * max(context.recovery_priority, 0.2)
        overload_penalty = 0.1 if context.is_overloaded and activity.focus_demand >= 0.7 else 0.0
        energy_penalty = 0.15 if context.is_energy_constrained and activity.energy_cost >= 0.7 else 0.0
        score = base * 0.55 + energy_alignment * 0.2 + focus_alignment * 0.15 + renewal * 0.1
        score -= overload_penalty + energy_penalty
        return _clamp(score)

    def _intent_summary(self, activity: RoutineActivity) -> str:
        cadence = activity.cadence.replace("_", " ")
        return f"Stabilise {activity.category} systems ({cadence})"

    def _intensity_label(self, activity: RoutineActivity, context: RoutineContext) -> str:
        if activity.focus_demand >= 0.75 or activity.energy_cost >= 0.75:
            return "High"
        if activity.focus_demand >= 0.5 or activity.energy_cost >= 0.5:
            return "Moderate"
        if context.is_energy_constrained:
            return "Restorative"
        return "Light"

    def _recovery_actions(self, context: RoutineContext) -> tuple[str, ...]:
        actions: list[str] = []
        if context.recovery_priority >= 0.6:
            actions.append("Block 20 minutes for recovery ritual")
        if context.is_energy_constrained:
            actions.append("Schedule active recovery: hydration, light movement, sunlight")
        if context.is_overloaded:
            actions.append("Audit commitments and renegotiate at least one obligation")
        if not actions:
            actions.append("Log energy trendline and micro-adjust routine tomorrow")
        return tuple(actions)

    def _automation_candidates(self, scored: list[tuple[float, RoutineActivity]]) -> tuple[str, ...]:
        candidates: list[str] = []
        for score, activity in scored:
            if activity.duration_minutes >= 45 and activity.importance <= 0.4:
                candidates.append(f"Automate or delegate: {activity.name}")
            elif activity.importance <= 0.3 and score <= 0.4:
                candidates.append(f"Batch {activity.name} later in the week")
        return tuple(dict.fromkeys(candidates))

    def _narrative(
        self,
        context: RoutineContext,
        primary: Sequence[RoutineBlock],
        recovery_actions: Sequence[str],
        partial_flag: bool,
    ) -> str:
        primary_minutes = sum(block.minutes for block in primary)
        utilisation = 0 if context.available_minutes == 0 else int(round((primary_minutes / max(context.available_minutes, 1)) * 100))
        recovery_note = recovery_actions[0] if recovery_actions else "Document micro-recovery"
        partial_note = " Some items were partially allocated." if partial_flag else ""
        return (
            f"Mission: {context.mission}. Utilisation at {utilisation}% of available capacity. "
            f"Leading block: {primary[0].name if primary else 'None'}. {recovery_note}.{partial_note}"
        )
