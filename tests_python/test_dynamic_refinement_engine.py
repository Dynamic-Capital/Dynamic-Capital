from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_refinement.engine import (  # noqa: E402 - path mutation for tests
    DynamicRefinementEngine,
    RefinementSignal,
    RefinementStep,
)


def _build_steps() -> tuple[RefinementStep, ...]:
    return (
        RefinementStep(
            identifier="collect-insights",
            summary="Longitudinal feedback harvest",
            stage="discovery",
            impact=0.7,
            effort=0.3,
            risk=0.2,
            tags=("feedback", "analysis"),
        ),
        RefinementStep(
            identifier="optimize-flow",
            summary="Activation journey friction reduction",
            stage="activation",
            impact=0.9,
            effort=0.6,
            risk=0.4,
            tags=("onboarding", "ux"),
        ),
        RefinementStep(
            identifier="scale-infra",
            summary="Resilient infrastructure scaling",
            stage="scaling",
            impact=0.8,
            effort=0.7,
            risk=0.5,
            tags=("infra", "reliability"),
        ),
    )


def _build_signals() -> tuple[RefinementSignal, ...]:
    return (
        RefinementSignal(
            source="support",
            theme="onboarding friction",
            intensity=0.8,
            alignment=0.7,
            urgency=0.6,
            target_stage="activation",
            target_tags=("ux",),
        ),
        RefinementSignal(
            source="analytics",
            theme="drop-off cliff",
            intensity=0.6,
            alignment=0.8,
            urgency=0.7,
            target_stage="activation",
            target_tags=("onboarding",),
        ),
        RefinementSignal(
            source="sre",
            theme="capacity risk",
            intensity=0.5,
            alignment=0.9,
            urgency=0.4,
            target_stage="scaling",
            target_tags=("reliability",),
        ),
    )


def test_rank_orders_steps_by_signal_pressure() -> None:
    engine = DynamicRefinementEngine()
    steps = _build_steps()
    signals = _build_signals()

    insights = engine.rank(steps, signals)

    assert tuple(insight.identifier for insight in insights) == (
        "optimize-flow",
        "scale-infra",
        "collect-insights",
    )
    top = insights[0]
    assert top.priority == pytest.approx(0.9261, abs=1e-4)
    assert top.confidence == pytest.approx(0.6794, abs=1e-4)
    assert top.signals == (
        "support: onboarding friction",
        "analytics: drop-off cliff",
    )


def test_refine_generates_capacity_aware_plan() -> None:
    engine = DynamicRefinementEngine()
    steps = _build_steps()
    signals = _build_signals()

    plan = engine.refine(steps, signals, capacity=1.1)

    assert tuple(action.identifier for action in plan.actions) == (
        "optimize-flow",
        "collect-insights",
    )
    assert plan.focus_areas == ("activation", "discovery")
    assert plan.deferred == ("scale-infra",)
    assert plan.metrics["utilised_capacity"] == pytest.approx(0.9, abs=1e-4)
    assert plan.metrics["remaining_capacity"] == pytest.approx(0.2, abs=1e-4)
    assert plan.metrics["average_priority"] == pytest.approx(0.8051, abs=1e-4)
    assert plan.metrics["signal_coverage"] == pytest.approx(0.6667, abs=1e-4)
    assert plan.actions[0].action.startswith("Accelerate")
    assert "Deferred: scale-infra." in plan.narrative
