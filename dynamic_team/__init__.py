"""Dynamic team operations toolkit built on the canonical playbooks."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional

from algorithms.python.desk_sync import (
    DynamicTeamRoleSyncAlgorithm,
    TeamRolePlaybook,
    TeamRoleSyncResult,
)
from algorithms.python.multi_llm import LLMConfig
from algorithms.python.team_operations import (
    TEAM_OPERATIONS_PLAYBOOKS,
    TeamOperationsAlignmentReport,
    TeamOperationsLLMPlanner,
    build_team_operations_playbooks as _build_team_operations_playbooks,
    build_team_operations_sync_algorithm as _build_team_operations_sync_algorithm,
)

__all__ = [
    "TEAM_PLAYBOOKS",
    "TeamOperationsAlignmentReport",
    "TeamOperationsLLMPlanner",
    "LLMConfig",
    "TeamAgentResult",
    "DynamicTeamAgent",
    "build_team_playbooks",
    "build_team_sync",
    "get_team_playbook",
    "list_team_agents",
    "plan_team_alignment",
    "synchronise_team",
]

TEAM_PLAYBOOKS = TEAM_OPERATIONS_PLAYBOOKS

_FOCUS_KEYS = (
    "focus",
    "priorities",
    "tickets",
    "initiatives",
    "milestones",
    "epics",
)


def _normalise_strings(value: Any) -> tuple[str, ...]:
    """Return a tuple of cleaned string values extracted from ``value``."""

    if value is None:
        return ()
    if isinstance(value, str):
        text = value.strip()
        return (text,) if text else ()
    if isinstance(value, Mapping):
        return _normalise_strings(value.values())
    if isinstance(value, Iterable):
        results: list[str] = []
        for item in value:
            if isinstance(item, Mapping):
                results.extend(_normalise_strings(item.values()))
            elif isinstance(item, (list, tuple, set)):
                results.extend(_normalise_strings(item))
            else:
                text = str(item).strip()
                if text:
                    results.append(text)
        return tuple(results)
    text = str(value).strip()
    return (text,) if text else ()


def _extract_focus(context: Mapping[str, Any]) -> tuple[str, ...]:
    """Gather any focus indicators present in ``context``."""

    focus_items: list[str] = []
    for key in _FOCUS_KEYS:
        focus_items.extend(_normalise_strings(context.get(key)))
    seen: set[str] = set()
    unique_focus: list[str] = []
    for item in focus_items:
        if item not in seen:
            seen.add(item)
            unique_focus.append(item)
    return tuple(unique_focus)


def _serialise_notes(context: Mapping[str, Any]) -> Dict[str, Any]:
    """Serialise arbitrary context values into JSON-friendly structures."""

    notes: Dict[str, Any] = {}
    for key, value in context.items():
        if key in _FOCUS_KEYS or value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            notes[key] = value
            continue
        if isinstance(value, Mapping):
            nested = {str(nk): nv for nk, nv in value.items() if nv not in (None, "")}
            if nested:
                notes[key] = nested
            continue
        if isinstance(value, (list, tuple, set)):
            values = [str(item).strip() for item in value if str(item).strip()]
            if values:
                notes[key] = values
            continue
        text = str(value).strip()
        if text:
            notes[key] = text
    return notes


@dataclass(slots=True)
class TeamAgentResult:
    """Structured response emitted by a dynamic team agent."""

    role: str
    objectives: tuple[str, ...]
    workflow: tuple[str, ...]
    outputs: tuple[str, ...]
    kpis: tuple[str, ...]
    focus: tuple[str, ...] = field(default_factory=tuple)
    notes: Dict[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a concise human-readable summary."""

        steps = len(self.workflow)
        summary = f"{self.role} playbook with {steps} workflow steps"
        if self.focus:
            summary = f"{summary}; focus on {', '.join(self.focus)}"
        return summary

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-friendly representation of the result."""

        payload: Dict[str, Any] = {
            "role": self.role,
            "objectives": list(self.objectives),
            "workflow": list(self.workflow),
            "outputs": list(self.outputs),
            "kpis": list(self.kpis),
            "focus": list(self.focus),
            "summary": self.summary(),
        }
        if self.notes:
            payload["notes"] = dict(self.notes)
        return payload


class DynamicTeamAgent:
    """Lightweight wrapper around a team operations playbook."""

    def __init__(self, playbook: TeamRolePlaybook) -> None:
        self._playbook = playbook

    @property
    def name(self) -> str:
        """Return the role name for this agent."""

        return self._playbook.name

    def plan(self) -> TeamRolePlaybook:
        """Expose the underlying playbook for downstream use."""

        return self._playbook

    def run(self, context: Mapping[str, Any] | None = None) -> TeamAgentResult:
        """Return the structured plan for this role."""

        mapping: MutableMapping[str, Any] = dict(context or {})
        focus = _extract_focus(mapping)
        notes = _serialise_notes(mapping)
        return TeamAgentResult(
            role=self._playbook.name,
            objectives=tuple(self._playbook.objectives),
            workflow=tuple(self._playbook.workflow),
            outputs=tuple(self._playbook.outputs),
            kpis=tuple(self._playbook.kpis),
            focus=focus,
            notes=notes,
        )


def build_team_playbooks(*, include_optional: bool = True) -> Dict[str, TeamRolePlaybook]:
    """Return Dynamic Capital team playbooks keyed by role name."""

    return _build_team_operations_playbooks(include_optional=include_optional)


def get_team_playbook(role: str, *, include_optional: bool = True) -> TeamRolePlaybook:
    """Return the playbook for ``role`` from the team catalogue."""

    playbooks = build_team_playbooks(include_optional=include_optional)
    try:
        return playbooks[role]
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise KeyError(f"Unknown team role: {role}") from exc


def list_team_agents(*, include_optional: bool = True) -> Dict[str, DynamicTeamAgent]:
    """Return ready-to-use agents keyed by role name."""

    playbooks = build_team_playbooks(include_optional=include_optional)
    return {name: DynamicTeamAgent(playbook) for name, playbook in playbooks.items()}


def build_team_sync(*, include_optional: bool = True) -> DynamicTeamRoleSyncAlgorithm:
    """Construct a sync algorithm for the selected team playbooks."""

    return _build_team_operations_sync_algorithm(include_optional=include_optional)


def synchronise_team(
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, Any] | None = None,
    include_optional: bool = True,
) -> TeamRoleSyncResult:
    """Synchronise the team playbooks and return the result."""

    algorithm = build_team_sync(include_optional=include_optional)
    return algorithm.synchronise(focus=focus, context=context)


def plan_team_alignment(
    planner: TeamOperationsLLMPlanner,
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, Any] | None = None,
    playbooks: Mapping[str, TeamRolePlaybook] | None = None,
    include_optional: bool = True,
) -> TeamOperationsAlignmentReport:
    """Generate a cross-team alignment report using the supplied planner."""

    catalogue: Mapping[str, TeamRolePlaybook]
    if playbooks is not None:
        catalogue = playbooks
    else:
        catalogue = build_team_playbooks(include_optional=include_optional)
    return planner.generate(catalogue, focus=focus, context=context)
