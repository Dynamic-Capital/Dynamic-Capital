"""Integration tests for the JSON helpers in :mod:`dynamic_ton.api`."""

from __future__ import annotations

import pytest

from dynamic_ton import (
    TonExecutionPlan,
    build_execution_plan,
    serialise_execution_plan,
)


def test_build_and_serialise_execution_plan_round_trip() -> None:
    payload = {
        "engine": {"minTotalDepthTon": 1_000_000, "utilisationCeiling": 0.8},
        "liquidity": [
            {
                "venue": "STON.fi",
                "pair": "dct/ton",
                "tonDepth": 250_000,
                "quoteDepth": 200_000,
            },
            {
                "venue": "DeDust",
                "pair": "ton/usdt",
                "tonDepth": 300_000,
                "quoteDepth": 500_000,
            },
        ],
        "telemetry": {"tonPriceUsd": 2.3, "bridgeLatencyMs": 400.0},
        "treasury": {
            "tonReserve": 600_000,
            "stableReserve": 400_000,
            "targetTonRatio": 0.55,
        },
    }

    plan = build_execution_plan(payload)
    assert isinstance(plan, TonExecutionPlan)
    assert plan.has_high_priority_actions

    serialised = serialise_execution_plan(plan)
    assert serialised["hasHighPriorityActions"] is True
    assert serialised["tonAllocation"]["liquidity"] == pytest.approx(450_000)
    action_categories = {action["category"] for action in serialised["actions"]}
    assert "liquidity" in action_categories


def test_build_execution_plan_requires_required_sections() -> None:
    payload = {
        "liquidity": [],
        "treasury": {"tonReserve": 10, "stableReserve": 5, "targetTonRatio": 0.5},
    }

    with pytest.raises(ValueError):
        build_execution_plan(payload)
