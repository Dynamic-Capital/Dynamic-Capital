"""Tests for the Dynamic Branch planner."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_branch import BranchDefinition, BranchStatus, DynamicBranchPlanner


def test_register_and_plan_ready_branch() -> None:
    planner = DynamicBranchPlanner()
    planner.register(
        {
            "name": "web/main",
            "service": "Web",
            "environment": "production",
            "description": "Next.js app serving the primary web experience.",
            "dependencies": ("main",),
            "tags": ("web", "critical"),
        }
    )

    status = planner.update_status(
        BranchStatus(
            branch="web/main",
            ahead=3,
            behind=0,
            checks_passed=True,
            review_approved=True,
            integration_pr_open=True,
            last_commit_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
    )
    assert status.ready is True

    plan = planner.plan("web/main")
    assert plan.ready is False  # dependency is missing status
    assert plan.blocked_by == ("main",)
    assert "Blocked by dependencies" in plan.summary

    planner.register(
        BranchDefinition(
            name="main",
            service="integration",
            environment="production",
            description="Integration trunk",
        )
    )
    planner.update_status(
        {
            "branch": "main",
            "ahead": 2,
            "behind": 0,
            "checks_passed": True,
            "review_approved": True,
            "integration_pr_open": True,
        }
    )

    refreshed = planner.plan("web/main")
    assert refreshed.ready is True
    assert refreshed.blocked_by == ()
    assert "ready to promote" in refreshed.summary.lower()
    payload = refreshed.as_dict()
    assert payload["definition"]["service"] == "web"


def test_dependency_blocking_and_summary_messages() -> None:
    planner = DynamicBranchPlanner(
        definitions=[
            {
                "name": "bot/main",
                "service": "Bot",
                "environment": "staging",
                "dependencies": ("web/main",),
            }
        ]
    )

    planner.register(
        {
            "name": "web/main",
            "service": "Web",
            "environment": "staging",
        }
    )

    planner.update_status(
        {
            "branch": "web/main",
            "ahead": 1,
            "behind": 0,
            "checks_passed": True,
            "review_approved": True,
            "integration_pr_open": True,
        }
    )

    planner.update_status(
        {
            "branch": "bot/main",
            "ahead": 2,
            "behind": 1,
            "checks_passed": False,
            "review_approved": False,
            "integration_pr_open": False,
        }
    )

    plan = planner.plan("bot/main")
    assert plan.ready is False
    assert plan.blocked_by == ()
    assert "behind target" in plan.summary.lower()
    assert "checks" in plan.summary.lower()
    assert "reviews" in plan.summary.lower()
    assert "integration pr" in plan.summary.lower()
    assert "no new commits" not in plan.summary.lower()


def test_promote_ready_branches_ordered_by_dependencies() -> None:
    planner = DynamicBranchPlanner()
    planner.register(
        {
            "name": "main",
            "service": "integration",
            "environment": "production",
        }
    )
    planner.register(
        {
            "name": "web/main",
            "service": "web",
            "environment": "production",
            "dependencies": ("main",),
        }
    )
    planner.register(
        {
            "name": "bot/main",
            "service": "bot",
            "environment": "production",
            "dependencies": ("web/main",),
        }
    )

    planner.update_status(
        BranchStatus(
            branch="main",
            ahead=1,
            checks_passed=True,
            review_approved=True,
            integration_pr_open=True,
        )
    )
    planner.update_status(
        BranchStatus(
            branch="web/main",
            ahead=2,
            checks_passed=True,
            review_approved=True,
            integration_pr_open=True,
        )
    )
    planner.update_status(
        BranchStatus(
            branch="bot/main",
            ahead=5,
            checks_passed=True,
            review_approved=True,
            integration_pr_open=True,
        )
    )

    ready = planner.promote_ready_branches()
    assert [plan.branch for plan in ready] == ["main", "web/main", "bot/main"]

    overview = planner.overview()
    assert set(overview.keys()) == {"bot/main", "main", "web/main"}
    assert overview["main"].ready is True


def test_cycle_detection() -> None:
    planner = DynamicBranchPlanner(
        definitions=[
            {"name": "alpha", "service": "ops", "environment": "prod", "dependencies": ("beta",)},
            {"name": "beta", "service": "ops", "environment": "prod", "dependencies": ("alpha",)},
        ]
    )

    planner.update_status(
        {
            "branch": "alpha",
            "ahead": 1,
            "checks_passed": True,
            "review_approved": True,
            "integration_pr_open": True,
        }
    )
    planner.update_status(
        {
            "branch": "beta",
            "ahead": 1,
            "checks_passed": True,
            "review_approved": True,
            "integration_pr_open": True,
        }
    )

    with pytest.raises(ValueError):
        planner.promote_ready_branches()
