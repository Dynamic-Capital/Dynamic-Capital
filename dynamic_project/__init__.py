"""Project organisation utilities for Dynamic Capital."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Literal, Mapping, MutableMapping

from dynamic_branch import DynamicBranchPlanner, PromotionPlan
from dynamic_team import DynamicTeamAgent, list_team_agents

__all__ = [
    "ProjectBranchSnapshot",
    "ProjectTeamSnapshot",
    "ProjectTeamGroup",
    "ProjectBranchGroup",
    "ProjectOrganisation",
    "ProjectAuditFinding",
    "ProjectAuditReport",
    "ProjectOptimisationPlan",
    "ProjectDeliveryReview",
    "ReleasePlanningDashboardSnapshot",
    "export_release_planning_dashboard",
    "organise_project_branches_and_teams",
    "audit_project_branches",
    "optimise_project_promotion",
    "audit_and_optimise_project_branches_and_teams",
    "DEFAULT_RELEASE_PLANNING_ROLES",
    "build_release_planning_planner",
    "build_release_planning_dashboard_snapshot",
    "export_release_planning_dashboard_json",
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


def _group_branch_plans(
    branch_overview: Mapping[str, PromotionPlan]
) -> tuple["ProjectBranchGroup", ...]:
    grouped: dict[tuple[str, str], list[ProjectBranchSnapshot]] = defaultdict(list)
    for plan in branch_overview.values():
        definition = plan.definition
        status_payload = _status_payload(plan)
        grouped[(definition.service, definition.environment)].append(
            ProjectBranchSnapshot(
                name=definition.name,
                service=definition.service,
                environment=definition.environment,
                description=definition.description,
                dependencies=definition.dependencies,
                tags=definition.tags,
                protected=definition.protected,
                status=status_payload,
            )
        )

    branch_groups = [
        ProjectBranchGroup(
            service=service,
            environment=environment,
            branches=tuple(
                sorted(branches, key=lambda item: item.name.lower())
            ),
        )
        for (service, environment), branches in grouped.items()
    ]
    branch_groups.sort(key=lambda item: (item.service, item.environment))
    return tuple(branch_groups)


def _team_snapshots(
    *,
    focus_labels: tuple[str, ...],
    context: Mapping[str, Any] | None,
    include_optional_playbooks: bool,
    roles: Iterable[str] | None,
) -> tuple["ProjectTeamSnapshot", ...]:
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
                persona=_classify_team_persona(result.role),
            )
        )

    return tuple(team_snapshots)


def _group_team_personas(
    teams: Iterable["ProjectTeamSnapshot"],
) -> tuple[ProjectTeamGroup, ...]:
    buckets: dict[str, list[ProjectTeamSnapshot]] = {
        persona: [] for persona in _PERSONA_ORDER
    }

    for team in teams:
        persona = team.persona
        if persona not in buckets:
            buckets[persona] = []
        buckets[persona].append(team)

    ordered_groups: list[ProjectTeamGroup] = []
    for persona in _PERSONA_ORDER:
        members = buckets.get(persona)
        if not members:
            continue
        ordered_groups.append(
            ProjectTeamGroup(
                persona=persona,
                teams=tuple(sorted(members, key=lambda item: item.role.lower())),
            )
        )

    extra_personas = {
        persona: members
        for persona, members in buckets.items()
        if persona not in _PERSONA_ORDER and members
    }
    for persona in sorted(extra_personas):
        members = extra_personas[persona]
        ordered_groups.append(
            ProjectTeamGroup(
                persona=persona,
                teams=tuple(sorted(members, key=lambda item: item.role.lower())),
            )
        )

    return tuple(ordered_groups)


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


_PERSONA_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("agents", ("agent",)),
    ("developers", ("developer", "engineer", "devops", "software")),
    ("managers", ("manager", "lead", "director", "head", "owner")),
    ("bots", ("bot", "automation")),
    ("keepers", ("keeper", "warden")),
    ("organizers", ("organiser", "organizer", "coordinator", "planner")),
    ("builders", ("builder", "architect", "maker")),
    ("helpers", ("helper", "support", "assistant", "ally", "guide")),
    ("watchers", ("watch", "observer", "monitor", "sentinel", "lookout")),
)

_PERSONA_ORDER: tuple[str, ...] = (
    "agents",
    "developers",
    "managers",
    "bots",
    "keepers",
    "organizers",
    "builders",
    "helpers",
    "watchers",
    "others",
)


def _classify_team_persona(role: str) -> str:
    """Return the primary persona category for ``role``."""

    lowered = role.lower()
    for persona, keywords in _PERSONA_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return persona
    return "others"


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
    persona: str

    def to_dict(self) -> MutableMapping[str, Any]:
        payload: MutableMapping[str, Any] = {
            "role": self.role,
            "summary": self.summary,
            "objectives": list(self.objectives),
            "workflow": list(self.workflow),
            "outputs": list(self.outputs),
            "kpis": list(self.kpis),
            "focus": list(self.focus),
            "persona": self.persona,
        }
        if self.notes:
            payload["notes"] = dict(self.notes)
        return payload


@dataclass(slots=True, frozen=True)
class ProjectTeamGroup:
    """Grouping of team playbooks by persona category."""

    persona: str
    teams: tuple[ProjectTeamSnapshot, ...]

    @property
    def team_count(self) -> int:
        return len(self.teams)

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "persona": self.persona,
            "team_count": self.team_count,
            "teams": [team.to_dict() for team in self.teams],
        }


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
    personas: tuple[ProjectTeamGroup, ...]

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
            "personas": [group.to_dict() for group in self.personas],
            "summary": self.summary,
        }


@dataclass(slots=True, frozen=True)
class ProjectAuditFinding:
    """Finding captured during a project branch audit."""

    branch: str
    severity: Literal["info", "warning", "critical"]
    issues: tuple[str, ...]
    blocked_by: tuple[str, ...]
    recommended_actions: tuple[str, ...]

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "branch": self.branch,
            "severity": self.severity,
            "issues": list(self.issues),
            "blocked_by": list(self.blocked_by),
            "recommended_actions": list(self.recommended_actions),
        }


@dataclass(slots=True, frozen=True)
class ProjectAuditReport:
    """Aggregated audit output for project branches."""

    findings: tuple[ProjectAuditFinding, ...]
    ready: tuple[str, ...]

    @property
    def issue_count(self) -> int:
        return len(self.findings)

    @property
    def blocked(self) -> tuple[str, ...]:
        return tuple(
            finding.branch for finding in self.findings if finding.blocked_by
        )

    @property
    def summary(self) -> str:
        ready_count = len(self.ready)
        finding_count = self.issue_count
        blocked_count = len(self.blocked)
        return (
            f"{ready_count} branches ready; "
            f"{finding_count} requiring attention ({blocked_count} blocked)"
        )

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "ready": list(self.ready),
            "findings": [finding.to_dict() for finding in self.findings],
            "summary": self.summary,
        }


@dataclass(slots=True, frozen=True)
class ProjectOptimisationPlan:
    """Recommended promotion workflow derived from branch readiness."""

    promotion_sequence: tuple[str, ...]
    pending: tuple[str, ...]
    blocked: tuple[tuple[str, tuple[str, ...]], ...]
    recommended_actions: tuple[str, ...]

    @property
    def summary(self) -> str:
        return (
            f"{len(self.promotion_sequence)} ready for promotion; "
            f"{len(self.pending)} pending readiness"
        )

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "promotion_sequence": list(self.promotion_sequence),
            "pending": list(self.pending),
            "blocked": [
                {"branch": branch, "blocked_by": list(blocked_by)}
                for branch, blocked_by in self.blocked
            ],
            "recommended_actions": list(self.recommended_actions),
            "summary": self.summary,
        }


@dataclass(slots=True, frozen=True)
class ProjectDeliveryReview:
    """Combined organisation, audit, and optimisation summary."""

    organisation: ProjectOrganisation
    audit: ProjectAuditReport
    optimisation: ProjectOptimisationPlan

    @property
    def recommended_next_steps(self) -> tuple[str, ...]:
        steps: list[str] = []
        for finding in self.audit.findings:
            steps.extend(finding.recommended_actions)
        steps.extend(self.optimisation.recommended_actions)
        ordered: list[str] = []
        seen: set[str] = set()
        for step in steps:
            if step not in seen:
                seen.add(step)
                ordered.append(step)
        return tuple(ordered)

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "organisation": self.organisation.to_dict(),
            "audit": self.audit.to_dict(),
            "optimisation": self.optimisation.to_dict(),
            "recommended_next_steps": list(self.recommended_next_steps),
        }


@dataclass(slots=True, frozen=True)
class ReleasePlanningDashboardSnapshot:
    """Dashboard-friendly wrapper around the delivery review."""

    review: ProjectDeliveryReview
    generated_at: datetime | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        timestamp = self.generated_at or datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        else:
            timestamp = timestamp.astimezone(timezone.utc)
        object.__setattr__(self, "generated_at", timestamp)

    @property
    def focus(self) -> tuple[str, ...]:
        return self.review.organisation.focus

    @property
    def ready(self) -> tuple[str, ...]:
        return self.review.audit.ready

    @property
    def blocked(self) -> tuple[str, ...]:
        return tuple(branch for branch, _ in self.review.optimisation.blocked)

    @property
    def pending(self) -> tuple[str, ...]:
        return self.review.optimisation.pending

    @property
    def recommended_next_steps(self) -> tuple[str, ...]:
        return self.review.recommended_next_steps

    @property
    def summary(self) -> str:
        ready_count = len(self.ready)
        finding_count = self.review.audit.issue_count
        pending_count = len(self.pending)
        return (
            f"{ready_count} ready, {finding_count} audit findings, "
            f"{pending_count} pending"
        )

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "generated_at": self.generated_at.isoformat(),
            "summary": self.summary,
            "focus": list(self.focus),
            "organisation": self.review.organisation.to_dict(),
            "audit": self.review.audit.to_dict(),
            "optimisation": self.review.optimisation.to_dict(),
            "recommended_next_steps": list(self.recommended_next_steps),
            "counts": {
                "branches": self.review.organisation.branch_count,
                "teams": self.review.organisation.team_count,
                "ready": len(self.ready),
                "pending": len(self.pending),
                "blocked": len(self.blocked),
                "findings": self.review.audit.issue_count,
            },
            "blocked_dependencies": [
                {"branch": branch, "blocked_by": list(blocked_by)}
                for branch, blocked_by in self.review.optimisation.blocked
            ],
        }


def _build_project_organisation(
    *,
    branch_overview: Mapping[str, PromotionPlan],
    focus_labels: tuple[str, ...],
    context: Mapping[str, Any] | None,
    include_optional_playbooks: bool,
    roles: Iterable[str] | None,
) -> ProjectOrganisation:
    teams = _team_snapshots(
        focus_labels=focus_labels,
        context=context,
        include_optional_playbooks=include_optional_playbooks,
        roles=roles,
    )
    return ProjectOrganisation(
        branches=_group_branch_plans(branch_overview),
        teams=teams,
        focus=focus_labels,
        personas=_group_team_personas(teams),
    )


def _audit_branch_overview(
    branch_overview: Mapping[str, PromotionPlan]
) -> ProjectAuditReport:
    findings: list[ProjectAuditFinding] = []
    ready_branches: list[str] = []

    for plan in branch_overview.values():
        if plan.ready:
            ready_branches.append(plan.branch)
            continue

        issues: list[str] = []
        actions: list[str] = []
        severity: Literal["info", "warning", "critical"] = "info"

        if plan.blocked_by:
            deps = ", ".join(plan.blocked_by)
            issues.append(f"Blocked by dependencies: {deps}")
            actions.append(f"Resolve blockers for {plan.branch}: {deps}")
            severity = "critical"

        status = plan.status
        if status is None:
            issues.append("Status telemetry missing")
            actions.append(
                f"Instrument branch telemetry so {plan.branch} reports readiness"
            )
            severity = "critical"
        else:
            if status.behind > 0:
                issues.append(f"Behind trunk by {status.behind} commits")
                actions.append("Synchronise with trunk to clear the backlog")
                severity = "warning"
            if not status.checks_passed:
                issues.append("Required checks failing or incomplete")
                actions.append("Stabilise CI checks to restore readiness")
                severity = "warning"
            if not status.review_approved:
                issues.append("Reviews pending approval")
                actions.append("Secure required code review approvals")
                severity = "warning"
            if not status.integration_pr_open:
                issues.append("Integration PR not open")
                actions.append("Open integration PR to stage promotion")
                severity = "warning"
            if status.ahead == 0:
                issues.append("No commits queued for promotion")
                actions.append("Confirm scope or add deliverables before promotion")
                severity = "warning"

        if not issues:
            issues.append("Branch requires manual validation")
            actions.append(f"Review {plan.branch} manually to confirm readiness")
            severity = "warning"

        findings.append(
            ProjectAuditFinding(
                branch=plan.branch,
                severity=severity,
                issues=tuple(issues),
                blocked_by=plan.blocked_by,
                recommended_actions=tuple(actions),
            )
        )

    return ProjectAuditReport(
        findings=tuple(findings),
        ready=tuple(sorted(ready_branches)),
    )


def _optimisation_plan(
    planner: DynamicBranchPlanner,
    branch_overview: Mapping[str, PromotionPlan],
) -> ProjectOptimisationPlan:
    promotion_sequence = tuple(
        plan.branch for plan in planner.promote_ready_branches()
    )
    promotion_ready = set(promotion_sequence)
    pending = tuple(
        plan.branch for plan in branch_overview.values() if plan.branch not in promotion_ready
    )
    blocked_entries: list[tuple[str, tuple[str, ...]]] = [
        (plan.branch, plan.blocked_by)
        for plan in branch_overview.values()
        if plan.blocked_by
    ]

    recommended: list[str] = [
        f"Promote {branch} in the next release window"
        for branch in promotion_sequence
    ]
    for branch, blockers in blocked_entries:
        recommended.append(
            f"Clear blockers for {branch}: {', '.join(blockers)}"
        )
    for branch in pending:
        if branch not in {name for name, _ in blocked_entries}:
            recommended.append(f"Finalise readiness tasks for {branch}")

    ordered: list[str] = []
    seen: set[str] = set()
    for action in recommended:
        if action not in seen:
            seen.add(action)
            ordered.append(action)

    return ProjectOptimisationPlan(
        promotion_sequence=promotion_sequence,
        pending=pending,
        blocked=tuple(blocked_entries),
        recommended_actions=tuple(ordered),
    )


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
    return _build_project_organisation(
        branch_overview=branch_overview,
        focus_labels=focus_labels,
        context=context,
        include_optional_playbooks=include_optional_playbooks,
        roles=roles,
    )


def audit_project_branches(planner: DynamicBranchPlanner) -> ProjectAuditReport:
    """Audit the current branch plans and highlight remediation items."""

    if not isinstance(planner, DynamicBranchPlanner):  # pragma: no cover - defensive
        raise TypeError("planner must be a DynamicBranchPlanner")

    branch_overview = planner.overview()
    return _audit_branch_overview(branch_overview)


def optimise_project_promotion(
    planner: DynamicBranchPlanner,
) -> ProjectOptimisationPlan:
    """Build a promotion sequence recommendation from branch readiness."""

    if not isinstance(planner, DynamicBranchPlanner):  # pragma: no cover - defensive
        raise TypeError("planner must be a DynamicBranchPlanner")

    branch_overview = planner.overview()
    return _optimisation_plan(planner, branch_overview)


def audit_and_optimise_project_branches_and_teams(
    planner: DynamicBranchPlanner,
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, Any] | None = None,
    include_optional_playbooks: bool = True,
    roles: Iterable[str] | None = None,
) -> ProjectDeliveryReview:
    """Run audit and optimisation before returning the project organisation."""

    if not isinstance(planner, DynamicBranchPlanner):  # pragma: no cover - defensive
        raise TypeError("planner must be a DynamicBranchPlanner")

    focus_labels = _normalise_focus(focus)
    branch_overview = planner.overview()

    organisation = _build_project_organisation(
        branch_overview=branch_overview,
        focus_labels=focus_labels,
        context=context,
        include_optional_playbooks=include_optional_playbooks,
        roles=roles,
    )
    audit_report = _audit_branch_overview(branch_overview)
    optimisation_plan = _optimisation_plan(planner, branch_overview)

    return ProjectDeliveryReview(
        organisation=organisation,
        audit=audit_report,
        optimisation=optimisation_plan,
    )


def export_release_planning_dashboard(
    planner: DynamicBranchPlanner,
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, Any] | None = None,
    include_optional_playbooks: bool = True,
    roles: Iterable[str] | None = None,
) -> ReleasePlanningDashboardSnapshot:
    """Build a dashboard snapshot for release planning surfaces."""

    review = audit_and_optimise_project_branches_and_teams(
        planner,
        focus=focus,
        context=context,
        include_optional_playbooks=include_optional_playbooks,
        roles=roles,
    )
    return ReleasePlanningDashboardSnapshot(review=review)


from .dashboard_export import (  # noqa: E402  # isort: skip
    DEFAULT_RELEASE_PLANNING_ROLES,
    build_release_planning_dashboard_snapshot,
    build_release_planning_planner,
    export_release_planning_dashboard_json,
)

