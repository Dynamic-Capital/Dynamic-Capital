import json
from types import SimpleNamespace

from automation import run_project_review


class _OrganisationSection:
    def __init__(self, focus, *, branch_count=0, team_count=0):
        self.focus = tuple(focus)
        self.branch_count = branch_count
        self.team_count = team_count

    def to_dict(self):
        return {
            "focus": list(self.focus),
            "branchCount": self.branch_count,
            "teamCount": self.team_count,
        }


class _AuditSection:
    def __init__(self, *, ready=None, blocked=None, issue_count=0):
        self.ready = tuple(ready or ())
        self.blocked = tuple(blocked or ())
        self.issue_count = issue_count

    def to_dict(self):
        return {
            "ready": list(self.ready),
            "blocked": list(self.blocked),
            "issueCount": self.issue_count,
        }


class _OptimisationSection:
    def __init__(self, *, pending=None):
        self.pending = tuple(pending or ())

    def to_dict(self):
        return {"pending": list(self.pending)}


def test_project_review_full_auto_mode(tmp_path, monkeypatch):
    captured = {}

    def fake_build_review(
        planner,
        *,
        focus_labels,
        context,
        include_optional,
        roles,
    ):
        captured["include_optional"] = include_optional
        captured["planner"] = planner
        organisation = _OrganisationSection(focus_labels, branch_count=2, team_count=0)
        audit = _AuditSection(ready=("core/main",), blocked=(), issue_count=0)
        optimisation = _OptimisationSection(pending=())
        return SimpleNamespace(
            organisation=organisation,
            audit=audit,
            optimisation=optimisation,
            recommended_next_steps=("Monitor automation",),
        )

    monkeypatch.setattr(run_project_review, "_build_review", fake_build_review)

    topology = {
        "focus": ["release"],
        "context": {"owner": "platform"},
        "includeOptionalPlaybooks": False,
        "automationMode": "full_auto",
        "branches": [
            {
                "name": "core/main",
                "service": "core",
                "environment": "production",
            },
            {
                "name": "web/main",
                "service": "web",
                "environment": "production",
                "dependencies": ["core/main"],
            },
        ],
        "statuses": [
            {
                "branch": "core/main",
                "ahead": 0,
                "behind": 5,
                "checks_passed": False,
                "review_approved": False,
                "integration_pr_open": False,
                "notes": "Pending review",
            }
        ],
    }

    config_path = tmp_path / "topology.json"
    output_path = tmp_path / "review.json"
    config_path.write_text(json.dumps(topology))

    exit_code = run_project_review.main([
        "--config",
        str(config_path),
        "--output",
        str(output_path),
    ])

    assert exit_code == 0
    assert captured["include_optional"] is True

    planner = captured["planner"]
    core_status = planner.status("core/main")
    web_status = planner.status("web/main")
    assert core_status is not None and core_status.ready
    assert web_status is not None and web_status.ready

    payload = json.loads(output_path.read_text())
    assert payload["automationMode"] == "full_auto"
    assert all(plan["ready"] for plan in payload["overview"].values())
