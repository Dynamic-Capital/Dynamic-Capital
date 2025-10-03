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
from types import MappingProxyType
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
    "QualityAssuranceAgent",
    "GeneralDevelopmentAgent",
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


_SUPPLEMENTARY_PLAYBOOKS: Dict[str, TeamRolePlaybook] = {
    "Quality Assurance": TeamRolePlaybook(
        name="Quality Assurance",
        objectives=(
            "Safeguard product quality with risk-based testing aligned to release goals.",
            "Maintain fast feedback loops by automating high-value regression suites.",
            "Provide actionable insights on defects, coverage, and readiness to ship.",
        ),
        workflow=(
            "Review iteration goals, critical user journeys, and recent incidents to refine the test strategy.",
            "Update automation suites and exploratory charters focusing on high-risk areas and new capabilities.",
            "Execute smoke and regression suites on every build; file defects with reproducible steps and severity.",
            "Pair with developers to reproduce and isolate issues, validating fixes within the same cycle.",
            "Track coverage, defect trends, and flake rates; escalate blocking quality risks immediately.",
            "Publish release readiness summaries including open defects, test evidence, and sign-off status.",
        ),
        outputs=(
            "Risk-based test plan",
            "Automated and exploratory test results",
            "Defect log with remediation status",
            "Release readiness summary",
        ),
        kpis=(
            "Defect escape rate",
            "Automation pass rate",
            "Mean time to validate fixes",
            "Critical defect closure time",
        ),
    ),
    "General Development": TeamRolePlaybook(
        name="General Development",
        objectives=(
            "Deliver cross-functional iteration work that accelerates product outcomes.",
            "Support teammates by filling gaps across stack, process, and documentation needs.",
            "Continuously reduce tech debt while maintaining shipping momentum.",
        ),
        workflow=(
            "Clarify objectives and unblockers across squads; pull the highest impact tasks lacking an owner.",
            "Pair with specialists to progress stories outside their primary domains and capture key learnings.",
            "Implement changes with tests, docs, and telemetry ensuring standards remain consistent.",
            "Proactively tackle tech debt tickets when cycle slack appears, documenting rationale and outcomes.",
            "Facilitate async status updates highlighting progress, blockers, and support provided to peers.",
            "Log retrospectives on cross-functional work and propose improvements to tooling or process.",
        ),
        outputs=(
            "Multi-domain implementation notes",
            "Pull request summaries with linked evidence",
            "Updated documentation or runbooks",
            "Tech debt remediation log",
        ),
        kpis=(
            "Cross-team blocker resolution time",
            "Cycle time for generalist tickets",
            "Documentation completeness",
            "Tech debt reduction velocity",
        ),
    ),
}


def _build_development_playbooks() -> Mapping[str, TeamRolePlaybook]:
    """Merge canonical playbooks with local supplements."""

    merged: Dict[str, TeamRolePlaybook] = dict(TEAM_DEVELOPMENT_PLAYBOOKS)
    for role, playbook in _SUPPLEMENTARY_PLAYBOOKS.items():
        merged.setdefault(role, playbook)
    return MappingProxyType(merged)


_DEVELOPMENT_PLAYBOOKS = _build_development_playbooks()


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

        if context is not None and not isinstance(context, Mapping):
            raise TypeError("context must be a mapping when provided")
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
        super().__init__(get_development_playbook("Front-End Developer"))


class BackEndDeveloperAgent(DevelopmentTeamAgent):
    """Agent for the Back-End Developer playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("Back-End Developer"))


class BlockchainDeveloperAgent(DevelopmentTeamAgent):
    """Agent for the Blockchain Developer playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("Blockchain Developer"))


class DynamicLanguagesExpertAgent(DevelopmentTeamAgent):
    """Agent for the Dynamic Languages Expert playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("Dynamic Languages Expert"))


class UiUxDesignerAgent(DevelopmentTeamAgent):
    """Agent for the UI/UX Designer playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("UI/UX Designer"))


class DevOpsEngineerAgent(DevelopmentTeamAgent):
    """Agent for the DevOps Engineer playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("DevOps Engineer"))


class QualityAssuranceAgent(DevelopmentTeamAgent):
    """Agent for the Quality Assurance playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("Quality Assurance"))


class GeneralDevelopmentAgent(DevelopmentTeamAgent):
    """Agent for the General Development playbook."""

    def __init__(self) -> None:
        super().__init__(get_development_playbook("General Development"))


def get_development_playbook(role: str) -> TeamRolePlaybook:
    """Return the playbook for ``role`` from the development catalogue."""

    try:
        return _DEVELOPMENT_PLAYBOOKS[role]
    except KeyError as exc:  # pragma: no cover - defensive guard
        available = ", ".join(sorted(_DEVELOPMENT_PLAYBOOKS))
        raise KeyError(f"Unknown development role '{role}'. Available roles: {available}.") from exc


def list_development_agents() -> Dict[str, DevelopmentTeamAgent]:
    """Return ready-to-use agents keyed by role name."""

    role_factories: Dict[str, Type[DevelopmentTeamAgent]] = {
        "Front-End Developer": FrontEndDeveloperAgent,
        "Back-End Developer": BackEndDeveloperAgent,
        "Blockchain Developer": BlockchainDeveloperAgent,
        "Dynamic Languages Expert": DynamicLanguagesExpertAgent,
        "UI/UX Designer": UiUxDesignerAgent,
        "DevOps Engineer": DevOpsEngineerAgent,
        "Quality Assurance": QualityAssuranceAgent,
        "General Development": GeneralDevelopmentAgent,
    }

    agents: Dict[str, DevelopmentTeamAgent] = {}
    for role, playbook in _DEVELOPMENT_PLAYBOOKS.items():
        factory = role_factories.get(role)
        if factory is not None:
            agents[role] = factory()
        else:
            agents[role] = DevelopmentTeamAgent(playbook)
    return agents


def build_development_team_sync() -> DynamicTeamRoleSyncAlgorithm:
    """Construct a sync algorithm limited to development playbooks."""

    return DynamicTeamRoleSyncAlgorithm(_DEVELOPMENT_PLAYBOOKS.values())


def synchronise_development_team(
    *, focus: Iterable[str] | None = None, context: Mapping[str, Any] | None = None
):
    """Synchronise the development team playbooks and return the result."""

    algorithm = build_development_team_sync()
    return algorithm.synchronise(focus=focus, context=context)

