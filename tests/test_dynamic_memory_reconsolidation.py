"""Unit tests for the Dynamic Memory Reconsolidation engine."""

from __future__ import annotations

from datetime import datetime

import pytest

from dynamic_memory_reconsolidation import (
    DynamicMemoryReconsolidation,
    MemoryTrace,
    ReconsolidationContext,
)


def test_memory_trace_normalisation() -> None:
    engine = DynamicMemoryReconsolidation(history=3)

    naive_timestamp = datetime(2024, 4, 20, 15, 45, 0)
    captured = engine.capture(
        {
            "key": "  Launch Memory  ",
            "narrative": "  Team celebration reflection  ",
            "emotional_intensity": 0.86,
            "sensory_richness": 0.72,
            "coherence": 0.5,
            "malleability": 0.6,
            "weight": 1.4,
            "timestamp": naive_timestamp,
            "tags": ["Team", "celebration", "TEAM"],
            "anchors": [" Music  ", "Aroma"],
            "metadata": {"source": "retro"},
        }
    )

    assert captured.key == "launch memory"
    assert captured.narrative == "Team celebration reflection"
    assert captured.emotional_intensity == pytest.approx(0.86)
    assert captured.sensory_richness == pytest.approx(0.72)
    assert captured.coherence == pytest.approx(0.5)
    assert captured.malleability == pytest.approx(0.6)
    assert captured.weight == pytest.approx(1.4)
    assert captured.timestamp.tzinfo is not None
    assert captured.tags == ("team", "celebration")
    assert captured.anchors == ("Music", "Aroma")
    assert captured.metadata == {"source": "retro"}


def test_reconsolidation_plan_metrics() -> None:
    engine = DynamicMemoryReconsolidation(history=5, decay=0.1)
    engine.extend(
        [
            MemoryTrace(
                key="Launch Memory",
                narrative="Initial celebration with confetti",
                emotional_intensity=0.86,
                sensory_richness=0.6,
                coherence=0.42,
                malleability=0.78,
                weight=1.2,
                tags=("Launch", "Team", "Victory"),
                anchors=("Music", "Confetti"),
            ),
            MemoryTrace(
                key="Launch Memory",
                narrative="Integration circle with mentors",
                emotional_intensity=0.8,
                sensory_richness=0.72,
                coherence=0.5,
                malleability=0.62,
                weight=1.0,
                tags=("Reflection", "Team"),
                anchors=("Journaling",),
            ),
        ]
    )

    context = ReconsolidationContext(
        intention="Anchor the launch storyline",
        regulation_capacity=0.64,
        safety=0.55,
        integration_window=0.52,
        support_network=0.58,
        stabilising_practices=("Breath work", "Somatic check-in"),
        environmental_cues=("Soft lighting", "Warm tea"),
        facilitator="  Mira  ",
    )

    plan = engine.reconsolidate(context)

    assert plan.stability_index == pytest.approx(0.476, abs=1e-3)
    assert plan.integration_readiness == pytest.approx(0.509, abs=1e-3)
    assert plan.distortion_risk == pytest.approx(0.65, abs=1e-3)
    assert plan.recommended_interventions[:3] == (
        "Schedule somatic discharge before narrative work.",
        "Use guided imagery to reshape the memory narrative.",
        "Facilitate structured recall to stabilise details.",
    )
    assert plan.safety_protocols == (
        "Establish grounding resources before proceeding.",
        "Document original narrative as fallback reference.",
    )
    assert plan.integration_focus[0].startswith(
        "Prioritise nervous system downshifts"
    )
    assert plan.active_cues[:3] == ("team", "launch", "victory")
    assert "stability at 0.48" in plan.narrative_update

    plan_dict = plan.as_dict()
    assert plan_dict["recommended_interventions"][0].startswith("Schedule somatic")
    assert plan_dict["active_cues"][0] == "team"
