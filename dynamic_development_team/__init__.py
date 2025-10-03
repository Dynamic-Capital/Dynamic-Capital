"""Development team personas built on the Dynamic team playbooks.

This module lifts the development-focused playbooks defined inside
``algorithms.python.team_operations`` into lightweight agent wrappers.  The
historic automation estate referenced a ``dynamic_development_team`` package
that exposed role-specific helpers for front-end, back-end, blockchain, and
operations collaborators.  Re-introducing this surface keeps older workflows
and notebooks operational while still sourcing the canonical playbook content
from :mod:`algorithms.python`.

Each agent simply wraps a :class:`~algorithms.python.desk_sync.TeamRolePlaybook`
instance and returns a structured :class:`DevelopmentAgentResult` describing the
objectives, workflow steps, and guardrails for the role.  Context provided to
``run`` is preserved for downstream tooling (for example, sprint automation or
LLM copilots) without requiring any additional dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Type

from algorithms.python import TEAM_DEVELOPMENT_PLAYBOOKS
from algorithms.python.desk_sync import DynamicTeamRoleSyncAlgorithm, TeamRolePlaybook

__all__ = [
    "DevelopmentAgentResult",
    "DevelopmentTeamAgent",
    "FrontEndDeveloperAgent",
    "BackEndDeveloperAgent",
    "BlockchainDeveloperAgent",
    "DynamicLanguagesExpertAgent",
    "UiUxDesignerAgent",
    "DevOpsEngineerAgent",
    "get_development_playbook",
    "list_development_agents",
    "build_development_team_sync",
    "synchronise_development_team",
]


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
class DevelopmentAgentResult:
    """Structured response emitted by a development team agent."""

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


class DevelopmentTeamAgent:
    """Lightweight wrapper around a development playbook."""

    def __init__(self, playbook: TeamRolePlaybook) -> None:
        self._playbook = playbook

    @property
    def name(self) -> str:
        return self._playbook.name

    def plan(self) -> TeamRolePlaybook:
        """Expose the underlying playbook for downstream use."""

        return self._playbook

    def run(self, context: Mapping[str, Any] | None = None) -> DevelopmentAgentResult:
        """Return the structured plan for this role."""

        mapping: MutableMapping[str, Any] = dict(context or {})
        focus = _extract_focus(mapping)
        notes = _serialise_notes(mapping)
        return DevelopmentAgentResult(
            role=self._playbook.name,
            objectives=tuple(self._playbook.objectives),
            workflow=tuple(self._playbook.workflow),
            outputs=tuple(self._playbook.outputs),
            kpis=tuple(self._playbook.kpis),
            focus=focus,
            notes=notes,
        )


class FrontEndDeveloperAgent(DevelopmentTeamAgent):
    """Agent for the Front-End Developer playbook."""

    def __init__(self) -> None:
        super().__init__(TEAM_DEVELOPMENT_PLAYBOOKS["Front-End Developer"])


class BackEndDeveloperAgent(DevelopmentTeamAgent):
    """Agent for the Back-End Developer playbook."""

    def __init__(self) -> None:
        super().__init__(TEAM_DEVELOPMENT_PLAYBOOKS["Back-End Developer"])


class BlockchainDeveloperAgent(DevelopmentTeamAgent):
    """Agent for the Blockchain Developer playbook."""

    def __init__(self) -> None:
        super().__init__(TEAM_DEVELOPMENT_PLAYBOOKS["Blockchain Developer"])


class DynamicLanguagesExpertAgent(DevelopmentTeamAgent):
    """Agent for the Dynamic Languages Expert playbook."""

    def __init__(self) -> None:
        super().__init__(TEAM_DEVELOPMENT_PLAYBOOKS["Dynamic Languages Expert"])


class UiUxDesignerAgent(DevelopmentTeamAgent):
    """Agent for the UI/UX Designer playbook."""

    def __init__(self) -> None:
        super().__init__(TEAM_DEVELOPMENT_PLAYBOOKS["UI/UX Designer"])


class DevOpsEngineerAgent(DevelopmentTeamAgent):
    """Agent for the DevOps Engineer playbook."""

    def __init__(self) -> None:
        super().__init__(TEAM_DEVELOPMENT_PLAYBOOKS["DevOps Engineer"])


def get_development_playbook(role: str) -> TeamRolePlaybook:
    """Return the playbook for ``role`` from the development catalogue."""

    return TEAM_DEVELOPMENT_PLAYBOOKS[role]


def list_development_agents() -> Dict[str, DevelopmentTeamAgent]:
    """Return ready-to-use agents keyed by role name."""

    role_factories: Dict[str, Type[DevelopmentTeamAgent]] = {
        "Front-End Developer": FrontEndDeveloperAgent,
        "Back-End Developer": BackEndDeveloperAgent,
        "Blockchain Developer": BlockchainDeveloperAgent,
        "Dynamic Languages Expert": DynamicLanguagesExpertAgent,
        "UI/UX Designer": UiUxDesignerAgent,
        "DevOps Engineer": DevOpsEngineerAgent,
    }

    agents: Dict[str, DevelopmentTeamAgent] = {}
    for role, playbook in TEAM_DEVELOPMENT_PLAYBOOKS.items():
        factory = role_factories.get(role)
        if factory is not None:
            agents[role] = factory()
        else:
            agents[role] = DevelopmentTeamAgent(playbook)
    return agents


def build_development_team_sync() -> DynamicTeamRoleSyncAlgorithm:
    """Construct a sync algorithm limited to development playbooks."""

    return DynamicTeamRoleSyncAlgorithm(TEAM_DEVELOPMENT_PLAYBOOKS.values())


def synchronise_development_team(
    *, focus: Iterable[str] | None = None, context: Mapping[str, Any] | None = None
):
    """Synchronise the development team playbooks and return the result."""

    algorithm = build_development_team_sync()
    return algorithm.synchronise(focus=focus, context=context)

