"""Dynamic Playbook Engine for orchestrating execution blueprints."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "PlaybookEntry",
    "PlaybookContext",
    "PlaybookBlueprint",
    "DynamicPlaybookEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(values: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        if lower:
            cleaned_lower = cleaned.lower()
            if cleaned_lower in seen:
                continue
            seen.add(cleaned_lower)
            normalised.append(cleaned_lower)
        else:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _weighted_average(values: Sequence[float], weights: Sequence[float]) -> float:
    if not values:
        raise ValueError("values must not be empty")
    if len(values) != len(weights):  # pragma: no cover - defensive guard
        raise ValueError("values and weights must have the same length")
    total_weight = sum(weights)
    if total_weight <= 0:
        return fmean(values)
    return sum(value * weight for value, weight in zip(values, weights)) / total_weight


def _top_items(counter: Counter[str], *, limit: int) -> tuple[str, ...]:
    if limit <= 0:
        return ()
    return tuple(item for item, _ in counter.most_common(limit))


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class PlaybookEntry:
    """Single executable block inside a dynamic playbook."""

    title: str
    objective: str
    stage: str
    readiness: float = 0.5
    automation: float = 0.5
    risk: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    owners: tuple[str, ...] = field(default_factory=tuple)
    notes: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.title = _normalise_text(self.title)
        self.objective = _normalise_text(self.objective)
        self.stage = _normalise_lower(self.stage)
        self.readiness = _clamp(float(self.readiness))
        self.automation = _clamp(float(self.automation))
        self.risk = _clamp(float(self.risk))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags, lower=True)
        self.dependencies = _normalise_tuple(self.dependencies)
        self.owners = _normalise_tuple(self.owners)
        self.notes = _normalise_optional_text(self.notes)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def is_blocked(self) -> bool:
        return self.readiness < 0.45

    @property
    def is_high_risk(self) -> bool:
        return self.risk >= 0.6


@dataclass(slots=True)
class PlaybookContext:
    """Parameters describing how the playbook should operate."""

    mission: str
    cadence: str
    risk_tolerance: float
    automation_expectation: float
    readiness_pressure: float
    oversight_level: float
    escalation_channels: tuple[str, ...] = field(default_factory=tuple)
    scenario_focus: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 3

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.cadence = _normalise_text(self.cadence)
        self.risk_tolerance = _clamp(float(self.risk_tolerance))
        self.automation_expectation = _clamp(float(self.automation_expectation))
        self.readiness_pressure = _clamp(float(self.readiness_pressure))
        self.oversight_level = _clamp(float(self.oversight_level))
        self.escalation_channels = _normalise_tuple(self.escalation_channels)
        self.scenario_focus = _normalise_tuple(self.scenario_focus, lower=True)
        self.highlight_limit = max(int(self.highlight_limit), 0)

    @property
    def requires_high_oversight(self) -> bool:
        return self.oversight_level >= 0.65

    @property
    def is_automation_driven(self) -> bool:
        return self.automation_expectation >= 0.6


@dataclass(slots=True)
class PlaybookBlueprint:
    """Structured output highlighting playbook execution posture."""

    total_entries: int
    mission_summary: str
    focus_streams: tuple[str, ...]
    readiness_alignment: float
    automation_alignment: float
    risk_outlook: str
    enablement_actions: tuple[str, ...]
    escalation_plan: tuple[str, ...]
    narrative: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "total_entries": self.total_entries,
            "mission_summary": self.mission_summary,
            "focus_streams": list(self.focus_streams),
            "readiness_alignment": self.readiness_alignment,
            "automation_alignment": self.automation_alignment,
            "risk_outlook": self.risk_outlook,
            "enablement_actions": list(self.enablement_actions),
            "escalation_plan": list(self.escalation_plan),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# dynamic playbook engine


class DynamicPlaybookEngine:
    """Aggregate playbook entries and surface execution guidance."""

    def __init__(self, *, history: int = 150) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._entries: Deque[PlaybookEntry] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def capture(self, entry: PlaybookEntry | Mapping[str, object]) -> PlaybookEntry:
        resolved = self._coerce_entry(entry)
        self._entries.append(resolved)
        return resolved

    def extend(self, entries: Iterable[PlaybookEntry | Mapping[str, object]]) -> None:
        for entry in entries:
            self.capture(entry)

    def reset(self) -> None:
        self._entries.clear()

    def _coerce_entry(self, entry: PlaybookEntry | Mapping[str, object]) -> PlaybookEntry:
        if isinstance(entry, PlaybookEntry):
            return entry
        if isinstance(entry, Mapping):
            payload: MutableMapping[str, object] = dict(entry)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return PlaybookEntry(**payload)  # type: ignore[arg-type]
        raise TypeError("entry must be PlaybookEntry or mapping")

    # ---------------------------------------------------------- diagnostics
    def snapshot(self) -> tuple[PlaybookEntry, ...]:
        return tuple(self._entries)

    def catalogue_size(self) -> int:
        return len(self._entries)

    # -------------------------------------------------------------- planning
    def build_blueprint(
        self, context: PlaybookContext, *, limit: int | None = None
    ) -> PlaybookBlueprint:
        if limit is not None and limit <= 0:
            raise ValueError("limit must be positive")

        if not self._entries:
            raise RuntimeError("no playbook entries captured")

        entries: Sequence[PlaybookEntry]
        if limit is not None:
            entries = tuple(self._entries)[-limit:]
        else:
            entries = tuple(self._entries)

        total_entries = len(entries)
        weights = [entry.weight or 0.0 for entry in entries]

        readiness_scores = [entry.readiness for entry in entries]
        automation_scores = [entry.automation for entry in entries]
        risk_scores = [entry.risk for entry in entries]

        readiness_alignment = _weighted_average(readiness_scores, weights)
        automation_alignment = _weighted_average(automation_scores, weights)
        risk_index = _weighted_average(risk_scores, weights)

        highlight_limit = context.highlight_limit or 0
        stage_counter: Counter[str] = Counter(entry.stage for entry in entries if entry.stage)
        tag_counter: Counter[str] = Counter(tag for entry in entries for tag in entry.tags if tag)

        focus_streams = _top_items(stage_counter, limit=highlight_limit)
        if highlight_limit and len(focus_streams) < highlight_limit:
            remaining = highlight_limit - len(focus_streams)
            focus_streams = focus_streams + _top_items(tag_counter, limit=remaining)

        if context.scenario_focus and highlight_limit:
            for focus in context.scenario_focus:
                if focus not in focus_streams and len(focus_streams) < highlight_limit:
                    focus_streams = focus_streams + (focus,)

        if not focus_streams and context.scenario_focus:
            focus_streams = context.scenario_focus[:highlight_limit] or context.scenario_focus
        if not focus_streams:
            focus_streams = ("execution",)

        enablement_actions: list[str] = []
        if readiness_alignment < max(context.readiness_pressure, 0.5):
            enablement_actions.append("Activate readiness drills for underprepared plays.")
        if context.is_automation_driven and automation_alignment < context.automation_expectation:
            enablement_actions.append("Accelerate automation backlog to hit expectation.")
        if any(entry.is_blocked for entry in entries):
            enablement_actions.append("Clear blockers before next operating window.")
        if not enablement_actions:
            enablement_actions.append("Maintain current playbook cadence with routine reviews.")

        escalation_plan: list[str] = []
        if context.requires_high_oversight:
            escalation_plan.append(
                "Run weekly oversight sync to review playbook posture."
            )
        if context.escalation_channels:
            joined = ", ".join(context.escalation_channels)
            escalation_plan.append(f"Route urgent issues through {joined}.")
        if any(entry.is_high_risk for entry in entries):
            escalation_plan.append("Escalate high-risk plays for immediate decision.")
        if not escalation_plan:
            escalation_plan.append("Standard cadence sufficient — monitor for changes.")

        if risk_index >= max(context.risk_tolerance + 0.15, 0.75):
            risk_outlook = "Critical risk"
        elif risk_index >= context.risk_tolerance + 0.05:
            risk_outlook = "Elevated risk"
        elif risk_index >= context.risk_tolerance - 0.1:
            risk_outlook = "Aligned"
        else:
            risk_outlook = "Comfortable"

        mission_summary = f"{context.mission} ({context.cadence})"
        narrative = (
            "Playbook blueprint covering {count} entries. Readiness {readiness:.2f}, "
            "automation {automation:.2f}, risk index {risk:.2f} against tolerance {tolerance:.2f}."
        ).format(
            count=total_entries,
            readiness=readiness_alignment,
            automation=automation_alignment,
            risk=risk_index,
            tolerance=context.risk_tolerance,
        )

        return PlaybookBlueprint(
            total_entries=total_entries,
            mission_summary=mission_summary,
            focus_streams=focus_streams,
            readiness_alignment=readiness_alignment,
            automation_alignment=automation_alignment,
            risk_outlook=risk_outlook,
            enablement_actions=tuple(enablement_actions),
            escalation_plan=tuple(escalation_plan),
            narrative=narrative,
        )
