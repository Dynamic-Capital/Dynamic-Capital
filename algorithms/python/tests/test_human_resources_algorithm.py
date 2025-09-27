from __future__ import annotations

from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.human_resources_algorithm import (  # noqa: E402
    DynamicHRAlignmentAlgorithm,
    HRMetricSnapshot,
)


def build_metrics() -> list[HRMetricSnapshot]:
    return [
        HRMetricSnapshot(
            name="Attrition Rate",
            value=0.18,
            target=0.10,
            unit="ratio",
            favourable_direction="below",
            key="attrition_rate",
            description="Rolling 12-month attrition for critical talent.",
        ),
        HRMetricSnapshot(
            name="Offer Acceptance Rate",
            value=0.72,
            target=0.85,
            unit="ratio",
            favourable_direction="above",
            key="offer_acceptance_rate",
        ),
        HRMetricSnapshot(
            name="Engagement Index",
            value=0.82,
            target=0.80,
            unit="index",
            favourable_direction="above",
            key="engagement_index",
        ),
    ]


def test_generate_alignment_plan_maps_actions_to_roles():
    algo = DynamicHRAlignmentAlgorithm(
        severity_overrides={
            "attrition_rate": (0.05, 0.15),
            "offer_acceptance_rate": (0.1, 0.2),
        },
        metric_role_map={
            "attrition_rate": ("People Operations", "People Development"),
            "offer_acceptance_rate": ("Talent Acquisition",),
        },
    )

    metrics = build_metrics()
    plan = algo.generate(
        metrics,
        focus_roles=(
            "People Operations",
            "People Development",
            "Talent Acquisition",
            "Total Rewards",
        ),
        incidents=("Visa processing delays",),
        commitments={
            "People Development": ("Refresh manager coaching sessions",),
        },
    )

    assert plan.metadata["severe_count"] == 1
    assert plan.metadata["warning_count"] == 1
    assert "critical" in plan.summary.lower()

    owners = {action.owner for action in plan.actions}
    assert {"People Operations", "People Development", "Talent Acquisition"}.issubset(owners)

    attrition_actions = [
        action for action in plan.actions if "attrition" in action.description.lower()
    ]
    assert attrition_actions
    assert all(action.priority == "high" for action in attrition_actions)

    commitment_actions = [
        action for action in plan.actions if "commitment" in action.tags
    ]
    assert commitment_actions and commitment_actions[0].owner == "People Development"

    incident_actions = [action for action in plan.actions if "incident" in action.tags]
    assert incident_actions and incident_actions[0].priority == "high"

    assert set(plan.playbooks) == {
        "People Operations",
        "People Development",
        "Talent Acquisition",
        "Total Rewards",
    }


def test_generate_validates_focus_roles():
    algo = DynamicHRAlignmentAlgorithm()

    with pytest.raises(KeyError):
        algo.generate([], focus_roles=("Unknown Role",))
