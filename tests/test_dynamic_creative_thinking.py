"""Unit tests for the Dynamic Creative Thinking engine."""

from __future__ import annotations

from datetime import datetime

import pytest

from dynamic_creative_thinking import (
    CreativeContext,
    CreativeSignal,
    DynamicCreativeThinking,
)


def test_signal_normalisation_and_capture() -> None:
    engine = DynamicCreativeThinking(history=5)

    naive_timestamp = datetime(2024, 1, 5, 9, 30, 0)
    captured = engine.capture(
        {
            "theme": "  Product Vision  ",
            "concept": "  Modular add-on for partner tools  ",
            "originality": 0.82,
            "resonance": 0.64,
            "viability": 0.58,
            "risk": 0.21,
            "weight": 1.6,
            "timestamp": naive_timestamp,
            "tags": [" Growth ", "focus", "growth"],
            "metadata": {"source": "lab"},
        }
    )

    assert captured.theme == "product vision"
    assert captured.concept == "Modular add-on for partner tools"
    assert captured.originality == pytest.approx(0.82)
    assert captured.resonance == pytest.approx(0.64)
    assert captured.viability == pytest.approx(0.58)
    assert captured.risk == pytest.approx(0.21)
    assert captured.weight == pytest.approx(1.6)
    assert captured.timestamp.tzinfo is not None
    assert captured.tags == ("growth", "focus")
    assert captured.metadata == {"source": "lab"}


def test_build_blueprint_generates_structured_output() -> None:
    engine = DynamicCreativeThinking(history=10)
    engine.extend(
        [
            CreativeSignal(
                theme="Product",
                concept="Modular add-on",
                originality=0.8,
                resonance=0.65,
                viability=0.55,
                risk=0.3,
                weight=2.0,
            ),
            CreativeSignal(
                theme="product",
                concept="Open beta",
                originality=0.6,
                resonance=0.7,
                viability=0.7,
                risk=0.2,
                weight=1.0,
            ),
            CreativeSignal(
                theme="Community",
                concept="Creator lab",
                originality=0.9,
                resonance=0.75,
                viability=0.4,
                risk=0.4,
                weight=1.5,
            ),
        ]
    )

    context = CreativeContext(
        challenge="Design a shareable growth loop",
        desired_outcome="Increase referrals by 25%",
        time_horizon="Quarter",
        risk_appetite=0.45,
        ambiguity_level=0.7,
        resource_level=0.35,
        constraints=("Headcount freeze",),
        inspiration_sources=("Community insights", "Partner playbooks"),
    )

    blueprint = engine.build_blueprint(context)

    assert blueprint.imagination_score == pytest.approx(0.756, abs=1e-3)
    assert blueprint.feasibility_score == pytest.approx(0.454, abs=1e-3)
    assert blueprint.momentum == pytest.approx(0.661, abs=1e-3)
    assert blueprint.spotlight_themes == ("product", "community")
    assert blueprint.friction_alerts == (
        "Feasibility tension: map constraints with operators",
        "Resource squeeze: adapt concepts to available assets",
    )
    assert blueprint.recommended_methods == (
        "SCAMPER Remix",
        "Brainwriting Burst",
        "Constraint Reversal",
        "Design Studio Sprint",
    )
    assert "Challenge: Design a shareable growth loop." in blueprint.concept_summary
    assert blueprint.next_moves == (
        "Stabilise: Feasibility tension: map constraints with operators",
        "Stabilise: Resource squeeze: adapt concepts to available assets",
        "Activate methods: SCAMPER Remix, Brainwriting Burst, Constraint Reversal, Design Studio Sprint",
        "Respect constraints: Headcount freeze",
        "Review inspiration: Community insights, Partner playbooks",
    )

    blueprint_dict = blueprint.as_dict()
    assert blueprint_dict["spotlight_themes"] == ["product", "community"]
    assert blueprint_dict["recommended_methods"][0] == "SCAMPER Remix"
    assert blueprint_dict["next_moves"][0].startswith("Stabilise:")
