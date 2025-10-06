"""Tests for organising project branches and teams."""

from __future__ import annotations

from datetime import datetime, timezone

from dynamic_branch import BranchDefinition, BranchStatus, DynamicBranchPlanner
from dynamic_project import organise_project_branches_and_teams


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

