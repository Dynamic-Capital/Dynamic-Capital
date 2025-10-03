from __future__ import annotations

import pytest

from dynamic_self_learning import (
    DynamicSelfLearning,
    LearningContext,
    LearningPlan,
    LearningSignal,
)


def test_learning_signal_normalisation() -> None:
    signal = LearningSignal(
        domain="  Strategy  ",
        skill="  Execution Cadence  ",
        challenge="  Reduce drift  ",
        effort=1.2,
        practice_quality=-0.2,
        outcome_quality=1.4,
        retention=-5.0,
        integration=1.7,
        insight="  keep better notes  ",
        experiment="  Adjust routine  ",
        weight=-3.0,
    )

    assert signal.domain == "strategy"
    assert signal.skill == "Execution Cadence"
    assert signal.challenge == "Reduce drift"
    assert 0.0 <= signal.effort <= 1.0
    assert 0.0 <= signal.practice_quality <= 1.0
    assert 0.0 <= signal.outcome_quality <= 1.0
    assert 0.0 <= signal.retention <= 1.0
    assert 0.0 <= signal.integration <= 1.0
    assert signal.insight == "keep better notes"
    assert signal.experiment == "Adjust routine"
    assert signal.weight == 0.0


def test_generate_plan_surfaces_growth_zones_and_experiments() -> None:
    engine = DynamicSelfLearning(history=5)
    engine.extend(
        [
            {
                "domain": "strategy",
                "skill": "Hypothesis design",
                "challenge": "Translate feedback",
                "effort": 0.7,
                "practice_quality": 0.4,
                "outcome_quality": 0.45,
                "retention": 0.5,
                "integration": 0.4,
            },
            {
                "domain": "analysis",
                "skill": "Hypothesis design",
                "challenge": "Measure experiments",
                "effort": 0.6,
                "practice_quality": 0.5,
                "outcome_quality": 0.42,
                "retention": 0.48,
                "integration": 0.38,
            },
            {
                "domain": "execution",
                "skill": "Feedback loop",
                "challenge": "Close loops fast",
                "effort": 0.55,
                "practice_quality": 0.45,
                "outcome_quality": 0.4,
                "retention": 0.52,
                "integration": 0.46,
            },
        ]
    )

    context = LearningContext(
        goal="Amplify experimentation throughput",
        available_time=0.3,
        energy_level=0.4,
        support_level=0.25,
        focus_window_hours=1.0,
        experiments_completed=0,
        feedback_notes=("Tighten measurement on experiments",),
    )

    plan = engine.generate_plan(context)

    assert isinstance(plan, LearningPlan)
    assert 0.0 <= plan.momentum <= 1.0
    assert 0.0 <= plan.stability <= 1.0
    assert plan.focus_domains[0] in {"strategy", "analysis", "execution"}
    assert any("micro-practice" in zone for zone in plan.growth_zones)
    assert any("feedback" in prompt.lower() for prompt in plan.reflection_prompts)
    assert "Goal:" in plan.narrative


def test_generate_plan_requires_signals() -> None:
    engine = DynamicSelfLearning()
    context = LearningContext(
        goal="Build deliberate practice cadence",
        available_time=0.6,
        energy_level=0.7,
        support_level=0.5,
    )

    with pytest.raises(RuntimeError):
        engine.generate_plan(context)
