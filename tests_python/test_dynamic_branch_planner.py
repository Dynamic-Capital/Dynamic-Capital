from datetime import datetime, timezone

from dynamic_branch import BranchDefinition, BranchStatus, DynamicBranchPlanner


def _status(**overrides):
    defaults = {
        "branch": "core/main",
        "ahead": 0,
        "behind": 2,
        "checks_passed": False,
        "review_approved": False,
        "integration_pr_open": False,
        "last_commit_at": datetime(2025, 1, 2, tzinfo=timezone.utc),
        "notes": "Pending checks",
        "metadata": {"owner": "core"},
    }
    defaults.update(overrides)
    return BranchStatus(**defaults)


def test_enable_full_auto_mode_normalises_existing_status():
    planner = DynamicBranchPlanner(
        definitions=[
            BranchDefinition(name="core/main", service="core", environment="production"),
            BranchDefinition(name="web/main", service="web", environment="production"),
        ]
    )
    planner.update_status(_status())

    planner.enable_full_auto_mode()

    core_status = planner.status("core/main")
    assert core_status is not None
    assert core_status.ready
    assert core_status.ahead >= 1
    assert core_status.behind == 0
    assert core_status.checks_passed
    assert core_status.review_approved
    assert core_status.integration_pr_open
    assert core_status.metadata["auto_mode"] == "full_auto"
    assert "Full auto mode" in core_status.notes

    web_status = planner.status("web/main")
    assert web_status is not None
    assert web_status.ready
    assert web_status.metadata["auto_mode"] == "full_auto"
