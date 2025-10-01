"""Tests for the Dynamic Decision-making algorithm."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic.trading.algo.dynamic_decision import (
    DecisionContext,
    DecisionOption,
    DecisionSignal,
    DynamicDecisionAlgo,
)


def _ts(hour: int) -> datetime:
    return datetime(2024, 1, 1, hour=hour, tzinfo=timezone.utc)


def test_signal_summary_and_recommendations() -> None:
    algo = DynamicDecisionAlgo(
        signals=[
            DecisionSignal(
                theme="Growth",
                confidence=0.8,
                urgency=0.6,
                strategic_fit=0.9,
                risk=0.2,
                weight=1.5,
                timestamp=_ts(8),
                note="Pipeline showing warm enterprise demand.",
            ),
            DecisionSignal(
                theme="Efficiency",
                confidence=0.6,
                urgency=0.4,
                strategic_fit=0.7,
                risk=0.3,
                weight=1.0,
                timestamp=_ts(10),
            ),
        ]
    )

    summary = algo.summarise_signals()

    assert summary.total_signals == 2
    assert summary.total_weight == 2.5
    assert summary.dominant_themes == ("growth", "efficiency")
    assert summary.confidence_index == pytest.approx(0.72, rel=1e-2)
    assert summary.momentum_index == pytest.approx(0.68, rel=1e-2)

    context = DecisionContext(
        objective="Scale ARR efficiently",
        risk_tolerance=0.5,
        capacity=0.6,
        principle_alignment=0.9,
        time_pressure=0.6,
        data_confidence=0.7,
    )

    options = [
        DecisionOption(
            option_id="launch-growth-push",
            description="Expand GTM pod to chase enterprise signals",
            expected_impact=0.8,
            execution_complexity=0.3,
            risk=0.5,
            cost_of_delay=0.8,
            reversibility=0.6,
        ),
        DecisionOption(
            option_id="automation-program",
            description="Automate fulfillment workflows",
            expected_impact=0.5,
            execution_complexity=0.7,
            risk=0.7,
            cost_of_delay=0.3,
            reversibility=0.2,
        ),
    ]

    recommendations = algo.evaluate_options(options, context=context)

    assert [rec.option_id for rec in recommendations] == ["launch-growth-push", "automation-program"]
    assert recommendations[0].priority == "immediate"
    assert recommendations[0].guardrails == ()
    assert recommendations[0].composite_score == pytest.approx(0.74, rel=1e-2)

    assert recommendations[1].priority == "schedule"
    assert recommendations[1].composite_score == pytest.approx(0.51, rel=1e-2)
    assert "Run risk scenario review" in recommendations[1].guardrails[0]
    assert any("exit criteria" in guard for guard in recommendations[1].guardrails)


def test_low_confidence_triggers_guardrail() -> None:
    algo = DynamicDecisionAlgo()
    algo.record_signal(
        theme="strategy",
        confidence=0.3,
        urgency=0.4,
        strategic_fit=0.5,
        risk=0.4,
        weight=1.0,
    )

    context = DecisionContext(
        objective="Decide on vendor migration",
        risk_tolerance=0.7,
        capacity=0.8,
        principle_alignment=0.6,
        time_pressure=0.3,
        data_confidence=0.4,
    )

    option = DecisionOption(
        option_id="migrate",
        description="Move workloads to new vendor",
        expected_impact=0.6,
        execution_complexity=0.4,
        risk=0.5,
        cost_of_delay=0.4,
        reversibility=0.7,
    )

    recommendation = algo.evaluate_options([option], context=context)[0]

    assert recommendation.priority == "monitor"
    assert any("data confidence" in guard for guard in recommendation.guardrails)

