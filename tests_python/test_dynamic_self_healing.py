from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_heal import HealingPlan, HealingSignal
from dynamic_self_healing import (
    DynamicSelfHealing,
    RestorativePractice,
    SelfHealingContext,
    SelfHealingRecommendation,
    SelfHealingSignal,
)
from dynamic.platform.engines import DynamicSelfHealing as LegacySelfHealing


def test_self_healing_signal_conversion() -> None:
    signal = SelfHealingSignal(
        identifier="burnout",
        description="High cognitive load with emotional fatigue",
        severity=0.7,
        affected_domains=("Cognitive", "Emotional"),
        energy_drain=0.8,
        emotional_weight=0.6,
    )

    converted = signal.to_healing_signal()

    assert isinstance(converted, HealingSignal)
    assert converted.identifier == "burnout"
    assert converted.severity == pytest.approx(0.71, rel=1e-6)
    assert converted.blast_radius == pytest.approx(0.74, rel=1e-6)
    assert converted.metadata["self_healing"] is True
    assert converted.metadata["domains"] == ("cognitive", "emotional")


def test_dynamic_self_healing_compile_plan_produces_sequence() -> None:
    engine = DynamicSelfHealing()

    signals = [
        {
            "identifier": "strategy-fatigue",
            "description": "Decision fatigue emerging after multi-day sprint",
            "severity": 0.65,
            "affected_domains": ("Cognitive", "Strategic"),
            "energy_drain": 0.7,
            "emotional_weight": 0.5,
        },
        SelfHealingSignal(
            identifier="somatic-tension",
            description="Persistent tension in shoulders",
            severity=0.55,
            affected_domains=("Physical",),
            energy_drain=0.6,
            emotional_weight=0.4,
        ),
    ]

    practices = [
        RestorativePractice(
            name="Guided Breathwork",
            domains=("Physical", "Emotional"),
            restoration_power=0.82,
            stabilisation_speed=0.7,
            effort_minutes=15,
            support_profile="coach",
        ),
        {
            "name": "Journaling Reset",
            "domains": ("Cognitive", "Strategic"),
            "restoration_power": 0.65,
            "stabilisation_speed": 0.55,
            "effort_minutes": 25,
        },
    ]

    context = {
        "focus_area": "Cognitive Resilience",
        "available_minutes": 45,
        "support_level": 0.35,
        "baseline_resilience": 0.55,
        "urgency": 0.6,
    }

    recommendation = engine.compile_plan(signals, practices, context)

    assert isinstance(recommendation, SelfHealingRecommendation)
    assert isinstance(recommendation.plan, HealingPlan)
    assert recommendation.plan.actions
    assert recommendation.recovery_readiness == pytest.approx(recommendation.recovery_readiness, rel=1e-6)
    assert recommendation.suggested_sequence[0].startswith(
        "Focus on restoring cognitive resilience"
    )
    assert any(prompt.startswith("Share the recovery plan") for prompt in recommendation.aftercare_prompts)

    payload = recommendation.as_dict()
    assert payload["plan"]["actions"]
    assert payload["recovery_readiness"] == pytest.approx(recommendation.recovery_readiness, rel=1e-6)
    assert payload["aftercare_prompts"][-1].startswith("Log insights")


def test_dynamic_engines_legacy_self_healing_entrypoint() -> None:
    legacy = LegacySelfHealing()
    assert isinstance(legacy, DynamicSelfHealing)

    recommendation = legacy.compile_plan(
        [
            {
                "identifier": "focus-drift",
                "description": "Focus drifting across workstreams",
                "severity": 0.6,
                "affected_domains": ("Cognitive",),
                "energy_drain": 0.5,
            }
        ],
        [
            {
                "name": "Movement Break",
                "domains": ("Physical", "Cognitive"),
                "restoration_power": 0.7,
                "stabilisation_speed": 0.6,
                "effort_minutes": 10,
            }
        ],
        SelfHealingContext(),
    )

    assert isinstance(recommendation, SelfHealingRecommendation)
    assert isinstance(recommendation.plan, HealingPlan)
    assert recommendation.plan.actions
