from __future__ import annotations

from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.supabase_edge_functions import (  # noqa: E402
    EdgeFunctionSpec,
    SupabaseEdgeFunctionAlgorithm,
)


def build_algorithm() -> SupabaseEdgeFunctionAlgorithm:
    specs = [
        EdgeFunctionSpec(
            name="shared-utils",
            description="Utility helpers shared by other functions.",
            triggers=("http",),
            owners=("platform",),
            env_requirements={"SUPABASE_URL": "Base project URL"},
        ),
        EdgeFunctionSpec(
            name="payments-webhook",
            description="Processes payment gateway callbacks.",
            triggers=("webhook", "http"),
            owners=("payments", "risk"),
            dependencies=("shared-utils",),
            env_requirements={"PAYMENTS_SECRET": "Webhook signature"},
            tags=("critical", "revenue"),
        ),
        EdgeFunctionSpec(
            name="analytics-cron",
            description="Publishes analytics events for dashboards.",
            triggers=("cron",),
            owners=("data",),
            schedule="*/5 * * * *",
        ),
    ]
    return SupabaseEdgeFunctionAlgorithm(specs)


def test_supabase_edge_function_plan_orders_dependencies() -> None:
    algo = build_algorithm()

    plan = algo.build_plan(environment="production", focus=("payments-webhook", "analytics-cron"))

    names = [runbook.name for runbook in plan.runbooks]
    assert names == ["shared-utils", "payments-webhook", "analytics-cron"]

    payments = plan.runbooks[1]
    assert "shared-utils" in payments.preflight[2]
    assert any("PAYMENTS_SECRET" in step for step in payments.preflight)
    assert any("supabase functions deploy payments-webhook" in step for step in payments.deployment)
    assert "critical" in payments.deployment[-1]

    analytics = plan.runbooks[-1]
    assert any("cron" in step.lower() for step in analytics.deployment)
    assert any("scheduler" in step.lower() for step in analytics.validation)

    assert "production" in plan.summary
    assert plan.metadata["function_names"] == names
    assert plan.metadata["owners"]["payments-webhook"] == ["payments", "risk"]

    payload = plan.to_dict()
    assert payload["environment"] == "production"
    assert payload["runbooks"][0]["name"] == "shared-utils"
    assert payload["runbooks"][1]["metadata"]["env_requirements"]["PAYMENTS_SECRET"] == "Webhook signature"


def test_supabase_edge_function_unknown_dependency() -> None:
    spec = EdgeFunctionSpec(
        name="orphan",
        description="Broken dependency graph",
        triggers=("http",),
        owners=("platform",),
        dependencies=("missing",),
    )
    algo = SupabaseEdgeFunctionAlgorithm([spec])

    with pytest.raises(KeyError):
        algo.build_plan(environment="staging")


def test_supabase_edge_function_cycle_detection() -> None:
    a = EdgeFunctionSpec(
        name="a",
        description="Function A",
        triggers=("http",),
        owners=("ops",),
        dependencies=("b",),
    )
    b = EdgeFunctionSpec(
        name="b",
        description="Function B",
        triggers=("http",),
        owners=("ops",),
        dependencies=("a",),
    )

    algo = SupabaseEdgeFunctionAlgorithm([a, b])

    with pytest.raises(ValueError):
        algo.build_plan(environment="dev")
