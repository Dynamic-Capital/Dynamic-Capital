"""Tests for organising project branches and teams."""

from __future__ import annotations

from datetime import datetime, timezone

from dynamic_branch import BranchDefinition, BranchStatus, DynamicBranchPlanner
from dynamic_project import (
    audit_and_optimise_project_branches_and_teams,
    audit_project_branches,
    optimise_project_promotion,
    organise_project_branches_and_teams,
    export_release_planning_dashboard,
    ReleasePlanningDashboardSnapshot,
)


def _build_planner() -> DynamicBranchPlanner:
    planner = DynamicBranchPlanner(
        definitions=[
            BranchDefinition(
                name="core/main",
                service="platform",
                environment="production",
                description="Primary integration trunk",
                tags=("core", "critical"),
            ),
            BranchDefinition(
                name="web/main",
                service="web",
                environment="production",
                description="Customer facing web experience",
                dependencies=("core/main",),
            ),
        ]
    )

    planner.update_status(
        BranchStatus(
            branch="core/main",
            ahead=2,
            behind=0,
            checks_passed=True,
            review_approved=True,
            integration_pr_open=True,
            last_commit_at=datetime(2024, 5, 1, tzinfo=timezone.utc),
            notes="Ready for release",
        )
    )

    planner.update_status(
        BranchStatus(
            branch="web/main",
            ahead=3,
            behind=1,
            checks_passed=False,
            review_approved=False,
            integration_pr_open=False,
            last_commit_at=datetime(2024, 5, 2, tzinfo=timezone.utc),
        )
    )
    return planner


def test_project_organisation_groups_branches_and_teams() -> None:
    planner = _build_planner()

    organisation = organise_project_branches_and_teams(
        planner,
        focus=("release", "risk"),
        context={"tickets": ["OPS-21"]},
        roles=("DevOps Engineer", "Project Manager"),
    )

    assert organisation.focus == ("release", "risk")
    assert organisation.branch_count == 2
    assert organisation.team_count == 2

    matrix = organisation.to_dict()
    services = {group["service"] for group in matrix["branches"]}
    assert services == {"platform", "web"}

    platform_branch = next(
        group for group in matrix["branches"] if group["service"] == "platform"
    )["branches"][0]
    assert platform_branch["ready"] is True
    assert platform_branch["summary"].lower().startswith("branch")

    web_branch = next(
        group for group in matrix["branches"] if group["service"] == "web"
    )["branches"][0]
    assert web_branch["ready"] is False
    assert web_branch["blocked_by"] == []

    team_roles = {team["role"] for team in matrix["teams"]}
    assert team_roles == {"DevOps Engineer", "Project Manager"}

    for team in matrix["teams"]:
        assert team["focus"]
        assert team["workflow"]
        assert "workflow steps" in team["summary"]
        assert team["persona"] in {
            "developers",
            "managers",
        }

    personas = organisation.personas
    assert [group.persona for group in personas] == ["developers", "managers"]
    assert personas[0].team_count == 1
    assert personas[0].teams[0].role == "DevOps Engineer"
    assert personas[1].teams[0].role == "Project Manager"

    persona_payloads = matrix["personas"]
    assert persona_payloads[0]["persona"] == "developers"
    assert persona_payloads[0]["team_count"] == 1
    assert persona_payloads[1]["persona"] == "managers"


def test_audit_and_optimise_project_runs_back_to_back() -> None:
    planner = _build_planner()

    review = audit_and_optimise_project_branches_and_teams(
        planner,
        focus=("release", "risk"),
        context={"tickets": ["OPS-21"]},
        roles=("DevOps Engineer", "Project Manager"),
    )

    assert review.organisation.branch_count == 2
    assert review.audit.issue_count == 1
    finding = review.audit.findings[0]
    assert finding.branch == "web/main"
    assert any("checks" in issue.lower() for issue in finding.issues)
    assert review.optimisation.promotion_sequence == ("core/main",)
    assert review.optimisation.pending == ("web/main",)
    assert any(
        "checks" in step.lower() for step in review.recommended_next_steps
    )

    audit = audit_project_branches(planner)
    optimisation = optimise_project_promotion(planner)

    assert audit.issue_count == 1
    assert audit.ready == ("core/main",)
    assert optimisation.promotion_sequence == ("core/main",)
    assert "web/main" in optimisation.pending


def test_release_planning_dashboard_snapshot_builds_review_payload() -> None:
    planner = _build_planner()

    dashboard = export_release_planning_dashboard(
        planner,
        focus=("release", "risk"),
        context={"tickets": ["OPS-21"]},
        roles=("DevOps Engineer", "Project Manager"),
    )

    assert isinstance(dashboard, ReleasePlanningDashboardSnapshot)
    assert dashboard.focus == ("release", "risk")
    assert dashboard.review.organisation.branch_count == 2
    assert "audit findings" in dashboard.summary.lower()

    payload = dashboard.to_dict()
    assert payload["counts"]["ready"] == len(dashboard.ready)
    assert payload["counts"]["findings"] == dashboard.review.audit.issue_count
    assert payload["organisation"]["summary"].startswith("2 branches")
    assert len(payload["recommended_next_steps"]) == len(
        set(payload["recommended_next_steps"])
    )
    assert all(
        {"branch", "blocked_by"}.issubset(entry.keys())
        for entry in payload["blocked_dependencies"]
    )
    persona_categories = [
        group["persona"] for group in payload["organisation"]["personas"]
    ]
    assert persona_categories == ["developers", "managers"]

