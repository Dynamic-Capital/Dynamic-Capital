"""Unit tests for the Dynamic Creative Thinking engine."""

from __future__ import annotations

from datetime import datetime

import pytest

from dynamic_creative_thinking import (
    CreativeContext,
    CreativeSignal,
    DynamicCreativeThinking,
)


def test_creative_signal_normalisation() -> None:
    engine = DynamicCreativeThinking(history=4)

    naive_timestamp = datetime(2024, 5, 17, 9, 30, 0)
    captured = engine.capture(
        {
            "motif": "  Welcome  Arc ",
            "concept": "  tactile arrival kit  ",
            "originality": 0.91,
            "resonance": 0.62,
            "feasibility": 0.58,
            "energy": 0.77,
            "risk": 0.22,
            "weight": 1.6,
            "timestamp": naive_timestamp,
            "tags": ["Onboarding", "delight", "ONBOARDING"],
            "references": ["Field study", " Mood board  "],
            "metadata": {"source": "research-sprint"},
        }
    )

    assert captured.motif == "welcome  arc".strip().lower()
    assert captured.concept == "tactile arrival kit"
    assert captured.originality == pytest.approx(0.91)
    assert captured.resonance == pytest.approx(0.62)
    assert captured.feasibility == pytest.approx(0.58)
    assert captured.energy == pytest.approx(0.77)
    assert captured.risk == pytest.approx(0.22)
    assert captured.weight == pytest.approx(1.6)
    assert captured.timestamp.tzinfo is not None
    assert captured.tags == ("onboarding", "delight")
    assert captured.references == ("Field study", "Mood board")
    assert captured.metadata == {"source": "research-sprint"}


def test_creative_frame_synthesis() -> None:
    engine = DynamicCreativeThinking(history=6)
    engine.extend(
        [
            CreativeSignal(
                motif="Product",
                concept="Haptic welcome touchpoint",
                originality=0.9,
                resonance=0.7,
                feasibility=0.6,
                energy=0.8,
                risk=0.2,
                weight=2.0,
                tags=("hardware", "touch", "premium"),
                references=("Concept sketch", "Vendor call"),
            ),
            CreativeSignal(
                motif="Service",
                concept="Concierge intro video",
                originality=0.5,
                resonance=0.4,
                feasibility=0.3,
                energy=0.45,
                risk=0.6,
                weight=1.0,
                tags=("video", "remote"),
            ),
            CreativeSignal(
                motif="Community",
                concept="Founder story deck",
                originality=0.65,
                resonance=0.45,
                feasibility=0.35,
                energy=0.55,
                risk=0.5,
                weight=1.5,
                tags=("narrative",),
            ),
        ]
    )

    context = CreativeContext(
        challenge="Design an onboarding surprise",
        horizon="30 days",
        cadence_pressure=0.75,
        ambiguity_tolerance=0.7,
        risk_appetite=0.6,
        resource_flexibility=0.3,
        constraints=("Two-week build cap",),
        inspiration_sources=("Analog hospitality",),
        guiding_principles=("Delight the customer",),
    )

    frame = engine.build_frame(context)

    assert frame.spark_index == pytest.approx(0.692, abs=1e-3)
    assert frame.adoption_readiness == pytest.approx(0.544, abs=1e-3)
    assert frame.exploration_depth == pytest.approx(0.738, abs=1e-3)
    assert frame.momentum == pytest.approx(0.639, abs=1e-3)
    assert frame.dominant_motifs == ("product", "community", "service")
    assert frame.friction_points == (
        "Prototype viability is weak—run fast validation loops",
    )
    assert frame.recommended_rituals == (
        "Lightning Decision Jam",
        "What-if Futures Wheel",
        "Constraint Remix Challenge",
        "Storyboarding Sprint",
    )
    assert "Challenge: Design an onboarding surprise." in frame.narrative
    assert frame.suggested_experiments[0].startswith("Prototype viability is weak")
    assert frame.suggested_experiments[1].startswith("Plan rituals: ")

    frame_dict = frame.as_dict()
    assert frame_dict["dominant_motifs"] == ["product", "community", "service"]
    assert frame_dict["suggested_experiments"][0].startswith("Prototype viability is weak")
