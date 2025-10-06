"""Utilities to export release planning dashboard snapshots."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Mapping

from dynamic_branch import BranchDefinition, BranchStatus, DynamicBranchPlanner

from . import export_release_planning_dashboard, ReleasePlanningDashboardSnapshot

__all__ = [
    "DEFAULT_RELEASE_PLANNING_ROLES",
    "build_release_planning_planner",
    "build_release_planning_dashboard_snapshot",
    "export_release_planning_dashboard_json",
]

DEFAULT_RELEASE_PLANNING_ROLES: tuple[str, ...] = (
    "DevOps Engineer",
    "Project Manager",
    "Quality Assurance",
    "Marketing Strategist",
    "Customer Support Specialist",
)


def build_release_planning_planner() -> DynamicBranchPlanner:
    """Return a branch planner populated with representative release data."""

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
                name="api/release",
                service="api",
                environment="production",
                description="Gateway deployment for public API",
                dependencies=("core/main",),
                tags=("api", "external"),
            ),
            BranchDefinition(
                name="web/release",
                service="web",
                environment="staging",
                description="Customer web experience rollout",
                dependencies=("core/main", "api/release"),
                tags=("web", "customer"),
            ),
            BranchDefinition(
                name="ops/automation",
                service="ops",
                environment="staging",
                description="Operational tooling automation",
                dependencies=("core/main",),
                tags=("automation",),
            ),
        ]
    )

    planner.update_status(
        BranchStatus(
            branch="core/main",
            ahead=4,
            behind=0,
            checks_passed=True,
            review_approved=True,
            integration_pr_open=True,
            last_commit_at=datetime(2024, 5, 3, 12, 30, tzinfo=timezone.utc),
            notes="Ready for production push",
        )
    )

    planner.update_status(
        BranchStatus(
            branch="api/release",
            ahead=3,
            behind=1,
            checks_passed=False,
            review_approved=False,
            integration_pr_open=False,
            last_commit_at=datetime(2024, 5, 4, 9, 0, tzinfo=timezone.utc),
            notes="Stabilising integration tests",
        )
    )

    planner.update_status(
        BranchStatus(
            branch="web/release",
            ahead=2,
            behind=2,
            checks_passed=False,
            review_approved=False,
            integration_pr_open=False,
            last_commit_at=datetime(2024, 5, 2, 18, 45, tzinfo=timezone.utc),
            notes="Waiting on API readiness",
        )
    )

    planner.update_status(
        BranchStatus(
            branch="ops/automation",
            ahead=1,
            behind=0,
            checks_passed=True,
            review_approved=False,
            integration_pr_open=False,
            last_commit_at=datetime(2024, 5, 5, 7, 15, tzinfo=timezone.utc),
            notes="Requires final approval",
        )
    )

    return planner


def build_release_planning_dashboard_snapshot(
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, object] | None = None,
    roles: Iterable[str] | None = DEFAULT_RELEASE_PLANNING_ROLES,
) -> ReleasePlanningDashboardSnapshot:
    """Assemble a release planning dashboard snapshot for downstream consumers."""

    planner = build_release_planning_planner()
    snapshot = export_release_planning_dashboard(
        planner,
        focus=focus
        or ("release readiness", "risk mitigation", "customer commitments"),
        context=context
        or {
            "release_window": "2024-05-10",
            "tickets": ["OPS-21", "OPS-27"],
            "owner": "Release Management Guild",
        },
        include_optional_playbooks=False,
        roles=roles,
    )
    return snapshot


def export_release_planning_dashboard_json(
    path: str | Path,
    *,
    focus: Iterable[str] | None = None,
    context: Mapping[str, object] | None = None,
    roles: Iterable[str] | None = DEFAULT_RELEASE_PLANNING_ROLES,
    indent: int = 2,
) -> Path:
    """Persist the release planning snapshot as formatted JSON at ``path``."""

    snapshot = build_release_planning_dashboard_snapshot(
        focus=focus,
        context=context,
        roles=roles,
    )
    payload = snapshot.to_dict()

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, indent=indent, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return output_path
