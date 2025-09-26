from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.exness_partnership_algorithm import (  # noqa: E402  (import after path fix)
    ExnessPartnershipAlgorithm,
    ExnessPartnershipPlan,
)


def build_plan(include_white_label: bool = True) -> ExnessPartnershipPlan:
    algorithm = ExnessPartnershipAlgorithm(
        ib_tracking_url="https://one.exnessonelink.com/a/s58ps2kc",
        jurisdictions=("Maldives", "Seychelles"),
        partner_brand="Dynamic Capital",
        include_white_label=include_white_label,
    )
    return algorithm.build()


def test_plan_sequences_partnership_phases() -> None:
    plan = build_plan()

    assert plan.ib_tracking_url.endswith("/a/s58ps2kc")
    assert "Dynamic Capital" == plan.metadata["partner_brand"]
    assert plan.metadata["white_label_considered"] is True
    assert plan.compliance_requirements == (
        "Maintain regulatory compliance for Maldives with documented audits",
        "Maintain regulatory compliance for Seychelles with documented audits",
    )

    ordered = plan.ordered_tasks()
    names = [task.name for task in ordered]

    assert names.index("research-exness-offering") < names.index("contact-exness-partnership-team")
    assert names.index("contact-exness-partnership-team") < names.index("assess-ib-model-fit")
    assert names.index("assess-ib-model-fit") < names.index("select-primary-operating-model")
    assert names.index("draft-contracting-and-ndas") > names.index("engage-legal-review")
    assert names.index("publish-shared-messaging-assets") > names.index("configure-analytics-and-sla-monitoring")
    assert ordered[-1].name == "deploy-value-added-services"

    task_map = plan.task_map()
    assert "assess-white-label-model" in task_map
    assert set(plan.revenue_model) == {
        "IB commissions indexed to referred client trading volume",
        "Customisable spread markups for white-label deployments",
        "Deposit rebate sharing with transparent ledgering",
    }
    assert plan.activation_channels == (
        "Telegram bot broadcasts and referral deep links",
        "Mini-app paywall and promo journeys",
        "Marketing site CTAs and educational landing pages",
    )


def test_plan_excludes_white_label_when_disabled() -> None:
    plan = build_plan(include_white_label=False)

    assert plan.metadata["white_label_considered"] is False
    assert "assess-white-label-model" not in plan.task_map()

    ordered_names = [task.name for task in plan.ordered_tasks()]
    assert "assess-ib-model-fit" in ordered_names
    assert ordered_names.index("assess-ib-model-fit") < ordered_names.index("select-primary-operating-model")


def test_missing_inputs_raise_value_error() -> None:
    with pytest.raises(ValueError):
        ExnessPartnershipAlgorithm(ib_tracking_url="", jurisdictions=("Maldives",))

    with pytest.raises(ValueError):
        ExnessPartnershipAlgorithm(ib_tracking_url="https://example.com", jurisdictions=())
