"""Lightweight routine planning helpers used across Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, MutableMapping, Sequence

__all__ = [
    "RoutineActivity",
    "RoutineContext",
    "RoutineBlock",
    "RoutinePlan",
    "DynamicRoutineEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` to the inclusive ``[lower, upper]`` range."""

    return max(lower, min(upper, value))


def _normalise_text(value: str, *, fallback: str | None = None) -> str:
    """Normalise textual fields and optionally fall back to ``fallback``."""

    cleaned = value.strip()
    if cleaned:
        return cleaned
    if fallback is not None:
        return fallback
    raise ValueError("text value must not be empty")


# ---------------------------------------------------------------------------
# data structures


@dataclass(slots=True)
class RoutineActivity:
    """Single activity considered for a daily or weekly routine."""

    name: str
    category: str = "general"
    importance: float = 0.5
    duration_minutes: int = 25
    energy: float = 0.5
    focus: float = 0.5
    recovery: float = 0.0
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.category = _normalise_text(self.category, fallback="general")
        self.importance = _clamp(float(self.importance))
        self.duration_minutes = max(int(self.duration_minutes), 0)
        self.energy = _clamp(float(self.energy))
        self.focus = _clamp(float(self.focus))
        self.recovery = _clamp(float(self.recovery))
        self.weight = max(float(self.weight), 0.0)


@dataclass(slots=True)
class RoutineContext:
    """Context describing the available capacity for the routine."""

    mission: str
    cadence: str
    available_minutes: int
    energy: float
    focus: float
    recovery_bias: float = 0.5

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.cadence = _normalise_text(self.cadence, fallback="unspecified")
        self.available_minutes = max(int(self.available_minutes), 0)
        self.energy = _clamp(float(self.energy))
        self.focus = _clamp(float(self.focus))
        self.recovery_bias = _clamp(float(self.recovery_bias))


@dataclass(slots=True)
class RoutineBlock:
    """Concrete block of time in the final routine plan."""

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
    """Full output returned by :class:`DynamicRoutineEngine`."""

    primary: tuple[RoutineBlock, ...]
    overflow: tuple[RoutineBlock, ...]
    recovery_actions: tuple[str, ...]
    automation_candidates: tuple[str, ...]
    summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "primary": [block.as_dict() for block in self.primary],
            "overflow": [block.as_dict() for block in self.overflow],
            "recovery_actions": list(self.recovery_actions),
            "automation_candidates": list(self.automation_candidates),
            "summary": self.summary,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicRoutineEngine:
    """Plan routines by allocating weighted activities into a time window."""

    def __init__(self) -> None:
        self._activities: List[RoutineActivity] = []

    # -------------------------------------------------------------- intake API
    def add(self, activity: RoutineActivity) -> None:
        """Register a new activity for the next planning cycle."""

        if not isinstance(activity, RoutineActivity):  # pragma: no cover - guard
            raise TypeError("activity must be a RoutineActivity instance")
        self._activities.append(activity)

    def extend(self, activities: Iterable[RoutineActivity]) -> None:
        for activity in activities:
            self.add(activity)

    def clear(self) -> None:
        self._activities.clear()

    # ----------------------------------------------------------- core planner
    def design(self, context: RoutineContext) -> RoutinePlan:
        if not self._activities:
            raise RuntimeError("no activities registered")

        ranked = sorted(self._activities, key=lambda item: self._score(item, context), reverse=True)

        primary: list[RoutineBlock] = []
        overflow: list[RoutineBlock] = []
        remaining = context.available_minutes

        for activity in ranked:
            if activity.duration_minutes == 0 or activity.weight == 0:
                continue

            minutes = activity.duration_minutes
            block = RoutineBlock(
                name=activity.name,
                minutes=min(minutes, max(remaining, 0)),
                intent=self._intent(activity),
                intensity=self._intensity(activity, context),
            )

            if remaining > 0:
                allocated = min(minutes, remaining)
                block.minutes = allocated
                primary.append(block)
                remaining -= allocated
                if minutes > allocated:
                    overflow.append(
                        RoutineBlock(
                            name=f"{activity.name} (defer)",
                            minutes=minutes - allocated,
                            intent=block.intent,
                            intensity=block.intensity,
                        )
                    )
            else:
                overflow.append(block)

        recovery_actions = self._recovery_actions(context, ranked)
        automation_candidates = self._automation_candidates(ranked)
        summary = self._summary(context, primary, recovery_actions)

        return RoutinePlan(
            primary=tuple(primary),
            overflow=tuple(overflow),
            recovery_actions=recovery_actions,
            automation_candidates=automation_candidates,
            summary=summary,
        )

    # ------------------------------------------------------------- heuristics
    def _score(self, activity: RoutineActivity, context: RoutineContext) -> float:
        priority = activity.weight * activity.importance
        energy_alignment = 1.0 - abs(activity.energy - context.energy)
        focus_alignment = 1.0 - abs(activity.focus - context.focus)
        recovery_alignment = activity.recovery * context.recovery_bias
        return priority * 0.6 + energy_alignment * 0.2 + focus_alignment * 0.15 + recovery_alignment * 0.05

    def _intent(self, activity: RoutineActivity) -> str:
        return f"Advance {activity.category} work"

    def _intensity(self, activity: RoutineActivity, context: RoutineContext) -> str:
        energy_delta = activity.energy - context.energy
        focus_delta = activity.focus - context.focus
        if energy_delta >= 0.25 or focus_delta >= 0.25:
            return "High"
        if energy_delta <= -0.4 and activity.recovery > 0.4:
            return "Restorative"
        if abs(energy_delta) <= 0.15 and abs(focus_delta) <= 0.15:
            return "Steady"
        return "Moderate"

    def _recovery_actions(
        self, context: RoutineContext, activities: Sequence[RoutineActivity]
    ) -> tuple[str, ...]:
        actions: list[str] = []
        avg_recovery = sum(item.recovery for item in activities) / len(activities)
        if context.recovery_bias >= 0.6 and avg_recovery < 0.3:
            actions.append("Reserve 15 minutes for deliberate recovery")
        if context.energy < 0.4:
            actions.append("Add short break after the most demanding block")
        if not actions:
            actions.append("Log qualitative energy notes for tomorrow")
        return tuple(actions)

    def _automation_candidates(self, activities: Sequence[RoutineActivity]) -> tuple[str, ...]:
        candidates: list[str] = []
        for activity in activities:
            if activity.importance <= 0.3 and activity.duration_minutes >= 40:
                candidates.append(f"Delegate or automate: {activity.name}")
        return tuple(dict.fromkeys(candidates))

    def _summary(
        self,
        context: RoutineContext,
        primary: Sequence[RoutineBlock],
        recovery_actions: Sequence[str],
    ) -> str:
        booked = sum(block.minutes for block in primary)
        utilisation = 0 if context.available_minutes == 0 else round((booked / context.available_minutes) * 100)
        headline = primary[0].name if primary else "No focus blocks"
        recovery = recovery_actions[0] if recovery_actions else "Document energy signals"
        return (
            f"Mission {context.mission} ({context.cadence}). Utilisation {utilisation}% with focus on "
            f"{headline}. {recovery}."
        )

