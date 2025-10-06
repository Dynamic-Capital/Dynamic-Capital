"""Project organisation utilities for Dynamic Capital."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, MutableMapping

from dynamic_branch import DynamicBranchPlanner, PromotionPlan
from dynamic_team import DynamicTeamAgent, list_team_agents

__all__ = [
    "ProjectBranchSnapshot",
    "ProjectTeamSnapshot",
    "ProjectBranchGroup",
    "ProjectOrganisation",
    "organise_project_branches_and_teams",
]


def _normalise_focus(focus: Iterable[str] | None) -> tuple[str, ...]:
    """Return a tuple of unique, trimmed focus labels."""

    if not focus:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for item in focus:
        text = str(item).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        ordered.append(text)
    return tuple(ordered)


def _merge_context(
    context: Mapping[str, Any] | None, focus: tuple[str, ...]
) -> Mapping[str, Any]:
    if context is None and not focus:
        return {}
    payload: dict[str, Any] = {}
    if context:
        payload.update({str(key): value for key, value in context.items()})
    if focus and "focus" not in payload:
        payload["focus"] = focus
    return payload


def _status_payload(plan: PromotionPlan) -> MutableMapping[str, Any]:
    status = plan.status
    payload: MutableMapping[str, Any] = {
        "ready": plan.ready,
        "blocked_by": list(plan.blocked_by),
        "summary": plan.summary,
    }
    if status is None:
        return payload
    payload.update(
        {
            "ahead": status.ahead,
            "behind": status.behind,
            "checks_passed": status.checks_passed,
            "review_approved": status.review_approved,
            "integration_pr_open": status.integration_pr_open,
            "last_commit_at": status.last_commit_at.isoformat(),
            "notes": status.notes,
            "metadata": dict(status.metadata),
        }
    )
    return payload


@dataclass(slots=True, frozen=True)
class ProjectBranchSnapshot:
    """Normalised view of a single branch within a project."""

    name: str
    service: str
    environment: str
    description: str
    dependencies: tuple[str, ...]
    tags: tuple[str, ...]
    protected: bool
    status: Mapping[str, Any]

    def to_dict(self) -> MutableMapping[str, Any]:
        payload: MutableMapping[str, Any] = {
            "name": self.name,
            "service": self.service,
            "environment": self.environment,
            "description": self.description,
            "dependencies": list(self.dependencies),
            "tags": list(self.tags),
            "protected": self.protected,
        }
        payload.update(self.status)
        return payload


@dataclass(slots=True, frozen=True)
class ProjectTeamSnapshot:
    """Structured representation of a Dynamic team playbook."""

    role: str
    summary: str
    objectives: tuple[str, ...]
    workflow: tuple[str, ...]
    outputs: tuple[str, ...]
    kpis: tuple[str, ...]
    focus: tuple[str, ...]
    notes: Mapping[str, Any]

    def to_dict(self) -> MutableMapping[str, Any]:
        payload: MutableMapping[str, Any] = {
            "role": self.role,
            "summary": self.summary,
            "objectives": list(self.objectives),
            "workflow": list(self.workflow),
            "outputs": list(self.outputs),
            "kpis": list(self.kpis),
            "focus": list(self.focus),
        }
        if self.notes:
            payload["notes"] = dict(self.notes)
        return payload


@dataclass(slots=True, frozen=True)
class ProjectBranchGroup:
    """Collection of branches grouped by service and environment."""

    service: str
    environment: str
    branches: tuple[ProjectBranchSnapshot, ...]

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "service": self.service,
            "environment": self.environment,
            "branches": [branch.to_dict() for branch in self.branches],
        }


@dataclass(slots=True, frozen=True)
class ProjectOrganisation:
    """Organised project state for release and execution planning."""

    branches: tuple[ProjectBranchGroup, ...]
    teams: tuple[ProjectTeamSnapshot, ...]
    focus: tuple[str, ...]

    @property
    def branch_count(self) -> int:
        return sum(len(group.branches) for group in self.branches)

    @property
    def team_count(self) -> int:
        return len(self.teams)

    @property
    def summary(self) -> str:
        branch_word = "branch" if self.branch_count == 1 else "branches"
        team_word = "team" if self.team_count == 1 else "teams"
        return (
            f"{self.branch_count} {branch_word} across {len(self.branches)} groups; "
            f"{self.team_count} {team_word} aligned"
        )

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "focus": list(self.focus),
            "branches": [group.to_dict() for group in self.branches],
            "teams": [team.to_dict() for team in self.teams],
            "summary": self.summary,
        }


def organise_project_branches_and_teams(
    planner: DynamicBranchPlanner,
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, Any] | None = None,
    include_optional_playbooks: bool = True,
    roles: Iterable[str] | None = None,
) -> ProjectOrganisation:
    """Organise the project branches alongside supporting team playbooks."""

    if not isinstance(planner, DynamicBranchPlanner):  # pragma: no cover - defensive
        raise TypeError("planner must be a DynamicBranchPlanner")

    focus_labels = _normalise_focus(focus)
    branch_overview = planner.overview()

    grouped: dict[tuple[str, str], list[ProjectBranchSnapshot]] = defaultdict(list)
    for plan in branch_overview.values():
        definition = plan.definition
        status_payload = _status_payload(plan)
        snapshot = ProjectBranchSnapshot(
            name=definition.name,
            service=definition.service,
            environment=definition.environment,
            description=definition.description,
            dependencies=definition.dependencies,
            tags=definition.tags,
            protected=definition.protected,
            status=status_payload,
        )
        grouped[(definition.service, definition.environment)].append(snapshot)

    branch_groups = [
        ProjectBranchGroup(
            service=service,
            environment=environment,
            branches=tuple(
                sorted(
                    branches,
                    key=lambda item: item.name.lower(),
                )
            ),
        )
        for (service, environment), branches in grouped.items()
    ]
    branch_groups.sort(key=lambda item: (item.service, item.environment))

    agent_catalogue: Mapping[str, DynamicTeamAgent] = list_team_agents(
        include_optional=include_optional_playbooks
    )
    if roles:
        allowed = {str(role).strip() for role in roles if str(role).strip()}
    else:
        allowed = None

    agent_context = _merge_context(context, focus_labels)
    team_snapshots: list[ProjectTeamSnapshot] = []
    for role, agent in sorted(agent_catalogue.items()):
        if allowed is not None and role not in allowed:
            continue
        result = agent.run(agent_context)
        team_snapshots.append(
            ProjectTeamSnapshot(
                role=result.role,
                summary=result.summary(),
                objectives=result.objectives,
                workflow=result.workflow,
                outputs=result.outputs,
                kpis=result.kpis,
                focus=result.focus,
                notes=result.notes,
            )
        )

    return ProjectOrganisation(
        branches=tuple(branch_groups),
        teams=tuple(team_snapshots),
        focus=focus_labels,
    )

