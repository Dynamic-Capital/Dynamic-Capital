from __future__ import annotations

import pytest

from algorithms.python.dynamic_orc_algo import (
    DynamicORCAlgo,
    ORCContext,
    ORCRequirement,
    ORCStatus,
)


@pytest.fixture()
def sample_context() -> ORCContext:
    return ORCContext(
        initiative="Desk Hub Launch",
        scope="Operational readiness across risk, compliance, and support",
        stakeholders=("Engineering", "Risk", "Support"),
        objectives=("Stabilise go-live", "Protect treasury"),
        go_live_date="2024-12-15",
    )


def test_build_report_highlights_blockers(sample_context: ORCContext) -> None:
    algo = DynamicORCAlgo(categories={"governance": 2.0, "operations": 1.5})
    algo.extend(
        (
            ORCRequirement(
                identifier="policy",
                title="Ratify governance policy",
                category="Governance",
                description="Contributor council policy approved",
                status=ORCStatus.VERIFIED,
                weight=2.0,
            ),
            ORCRequirement(
                identifier="runbook",
                title="Ship runbook",
                category="Operations",
                description="Incident response runbook published",
                status=ORCStatus.IN_PROGRESS,
                weight=1.0,
            ),
            ORCRequirement(
                identifier="monitoring",
                title="Enable monitoring",
                category="Operations",
                description="Alerting wired into PagerDuty",
                status=ORCStatus.BLOCKED,
                weight=1.5,
                dependencies=("runbook",),
            ),
        )
    )

    report = algo.build_report(context=sample_context)

    assert pytest.approx(report.overall_score, rel=1e-3) == 0.6222
    assert report.readiness_level == "escalate_blockers"

    categories = {summary.name: summary for summary in report.category_summaries}
    assert categories["governance"].score == 1.0
    assert pytest.approx(categories["operations"].score, rel=1e-3) == 0.32

    assert {req.identifier for req in report.flagged_requirements} == {"monitoring"}
    assert report.dependency_gaps["monitoring"] == ("runbook",)


def test_report_serialisation_and_status_updates() -> None:
    algo = DynamicORCAlgo()
    requirement = ORCRequirement(
        identifier="support_training",
        title="Train support squad",
        category="Enablement",
        description="Live training completed with support playbooks",
    )
    algo.register(requirement)
    algo.update_status("support_training", ORCStatus.VERIFIED, note="Workshop complete")

    report = algo.build_report()
    payload = report.to_dict()

    assert payload["overall_score"] == 1.0
    assert payload["readiness_level"] == "launch_ready"
    assert payload["flagged"] == []
    assert payload["dependency_gaps"] == {}

    stored_requirement = algo.requirements()[0]
    assert stored_requirement.notes == ["Workshop complete"]
    assert algo.category_matrix()["enablement"][0].status is ORCStatus.VERIFIED


@pytest.mark.parametrize(
    "incoming_status",
    ["verified", " VERIFIED ", "VERIFIED", "vErIfIeD"],
)
def test_update_status_normalises_strings(incoming_status: str) -> None:
    algo = DynamicORCAlgo()
    requirement = ORCRequirement(
        identifier="support_training",
        title="Train support squad",
        category="Enablement",
        description="Live training completed with support playbooks",
    )
    algo.register(requirement)

    algo.update_status("support_training", incoming_status)

    assert algo.requirements()[0].status is ORCStatus.VERIFIED
