"""Skill orchestration engine for Dynamic Capital's talent systems."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SkillSignal",
    "SkillContext",
    "SkillFocus",
    "SkillPlan",
    "DynamicSkillsEngine",
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
class SkillSignal:
    """Observed evidence about a particular skill."""

    skill: str
    evidence: str
    proficiency: float = 0.5
    momentum: float = 0.5
    confidence: float = 0.5
    risk: float = 0.0
    leverage: float = 0.5
    time_invested_hours: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    coach: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.skill = _normalise_text(self.skill)
        self.evidence = _normalise_text(self.evidence)
        self.proficiency = _clamp(float(self.proficiency))
        self.momentum = _clamp(float(self.momentum))
        self.confidence = _clamp(float(self.confidence))
        self.risk = _clamp(float(self.risk))
        self.leverage = _clamp(float(self.leverage))
        self.time_invested_hours = max(float(self.time_invested_hours), 0.0)
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.coach = _normalise_optional(self.coach)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class SkillContext:
    """Context for evaluating skill development priorities."""

    mission: str
    role: str
    focus_window_weeks: int
    bandwidth: float
    strategic_weight: float
    stretch_pressure: float
    constraints: tuple[str, ...] = field(default_factory=tuple)
    support_assets: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.role = _normalise_text(self.role)
        self.focus_window_weeks = max(int(self.focus_window_weeks), 0)
        self.bandwidth = _clamp(float(self.bandwidth))
        self.strategic_weight = _clamp(float(self.strategic_weight))
        self.stretch_pressure = _clamp(float(self.stretch_pressure))
        self.constraints = tuple(_normalise_text(item) for item in self.constraints if item.strip())
        self.support_assets = tuple(_normalise_text(item) for item in self.support_assets if item.strip())

    @property
    def is_bandwidth_constrained(self) -> bool:
        return self.bandwidth <= 0.4

    @property
    def is_high_stretch(self) -> bool:
        return self.stretch_pressure >= 0.6


@dataclass(slots=True)
class SkillFocus:
    """Single focus area for the skill plan."""

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
    """Structured plan for upskilling and maintenance."""

    accelerators: tuple[SkillFocus, ...]
    maintenance: tuple[SkillFocus, ...]
    experiments: tuple[str, ...]
    coaching_requests: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "accelerators": [focus.as_dict() for focus in self.accelerators],
            "maintenance": [focus.as_dict() for focus in self.maintenance],
            "experiments": list(self.experiments),
            "coaching_requests": list(self.coaching_requests),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicSkillsEngine:
    """Aggregate skill signals and produce a targeted development plan."""

    def __init__(self, *, history: int = 150) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[SkillSignal] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def capture(self, signal: SkillSignal | Mapping[str, object]) -> SkillSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[SkillSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: SkillSignal | Mapping[str, object]) -> SkillSignal:
        if isinstance(signal, SkillSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return SkillSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be SkillSignal or mapping")

    # ----------------------------------------------------------- computation
    def build_plan(self, context: SkillContext) -> SkillPlan:
        if not self._signals:
            raise RuntimeError("no skill signals captured")

        weighted_total = sum(signal.weight for signal in self._signals if signal.weight > 0)
        if weighted_total <= 0:
            raise RuntimeError("skill signals have zero weight")

        accelerators = self._accelerators(context)
        maintenance = self._maintenance(context)
        experiments = self._experiments(context)
        coaching_requests = self._coaching_requests(context)
        narrative = self._narrative(context, accelerators, maintenance)

        return SkillPlan(
            accelerators=accelerators,
            maintenance=maintenance,
            experiments=experiments,
            coaching_requests=coaching_requests,
            narrative=narrative,
        )

    def _accelerators(self, context: SkillContext) -> tuple[SkillFocus, ...]:
        high_leverage = [
            signal
            for signal in self._signals
            if signal.leverage >= 0.6 and signal.momentum >= 0.5 and signal.weight > 0
        ]
        high_leverage.sort(key=lambda s: (-s.leverage, -s.momentum, -s.proficiency, s.skill))

        focuses: list[SkillFocus] = []
        for signal in high_leverage[:4]:
            priority = "High" if signal.proficiency < 0.75 else "Medium"
            actions = [
                f"Design deliberate practice block for {signal.skill}",
                f"Ship artefact proving {signal.skill} within {context.focus_window_weeks} weeks",
            ]
            if context.is_high_stretch:
                actions.append("Pair with stretch project to accelerate feedback loops")
            focuses.append(
                SkillFocus(
                    skill=signal.skill,
                    priority=priority,
                    actions=tuple(actions),
                )
            )
        if not focuses:
            focuses.append(
                SkillFocus(
                    skill="Meta-Learning",
                    priority="High",
                    actions=("Run weekly reflection on learning velocity", "Increase exposure to new domains"),
                )
            )
        return tuple(focuses)

    def _maintenance(self, context: SkillContext) -> tuple[SkillFocus, ...]:
        maintenance_targets = [
            signal
            for signal in self._signals
            if signal.proficiency >= 0.7 and signal.momentum <= 0.55 and signal.weight > 0
        ]
        maintenance_targets.sort(key=lambda s: (s.momentum, -s.proficiency, s.skill))

        focuses: list[SkillFocus] = []
        for signal in maintenance_targets[:3]:
            actions = [
                f"Set monthly mastery checkpoint for {signal.skill}",
                "Document playbook updates from recent reps",
            ]
            if context.is_bandwidth_constrained:
                actions.append("Automate or templatise routine reps to save bandwidth")
            focuses.append(
                SkillFocus(
                    skill=signal.skill,
                    priority="Maintenance",
                    actions=tuple(actions),
                )
            )
        return tuple(focuses)

    def _experiments(self, context: SkillContext) -> tuple[str, ...]:
        experiments: list[str] = []
        for signal in self._signals:
            if signal.momentum <= 0.45 and signal.risk >= 0.4:
                experiments.append(f"Prototype new training loop for {signal.skill}")
        if not experiments:
            experiments.append("Shadow adjacent expert and extract transferable heuristics")
        if context.support_assets:
            experiments.append("Leverage assets: " + ", ".join(context.support_assets))
        return tuple(dict.fromkeys(experiments))

    def _coaching_requests(self, context: SkillContext) -> tuple[str, ...]:
        requests: list[str] = []
        for signal in self._signals:
            if signal.coach and signal.confidence <= 0.5:
                requests.append(f"Book calibration session with {signal.coach} on {signal.skill}")
        if context.is_high_stretch:
            requests.append("Secure monthly executive mentor for strategic navigation")
        if context.is_bandwidth_constrained:
            requests.append("Request operations support to shield learning time")
        return tuple(dict.fromkeys(requests))

    def _narrative(
        self,
        context: SkillContext,
        accelerators: Sequence[SkillFocus],
        maintenance: Sequence[SkillFocus],
    ) -> str:
        lead_skill = accelerators[0].skill if accelerators else "Meta-Learning"
        maintenance_note = (
            f"Maintenance covers {', '.join(focus.skill for focus in maintenance)}"
            if maintenance
            else "No maintenance tracks scheduled"
        )
        stretch_note = "Stretch window high" if context.is_high_stretch else "Stretch window manageable"
        return (
            f"Mission: {context.mission}. Lead skill: {lead_skill}. {maintenance_note}. {stretch_note}."
        )
