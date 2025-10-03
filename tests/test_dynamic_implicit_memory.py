from __future__ import annotations

import pytest

from dynamic_implicit_memory import (
    DynamicImplicitMemory,
    ImplicitMemoryTrace,
    MemoryContext,
)


def test_trace_normalisation_and_clamping() -> None:
    trace = ImplicitMemoryTrace(
        cue="  Elevator ding  ",
        modality=" Auditory  ",
        emotional_valence=1.4,
        salience=1.3,
        body_activation=1.5,
        safety_signal=-0.2,
        integration_success=1.2,
        repetitions=-3,
        tags=("  Trauma  ", "trauma", " City "),
        notes="   ",
    )

    assert trace.cue == "Elevator ding"
    assert trace.modality == "auditory"
    assert trace.emotional_valence == 1.0
    assert trace.salience == 1.0
    assert trace.body_activation == 1.0
    assert trace.safety_signal == 0.0
    assert trace.integration_success == 1.0
    assert trace.repetitions == 0
    assert trace.tags == ("trauma", "city")
    assert trace.notes is None


def test_generate_report_produces_coherent_guidance() -> None:
    engine = DynamicImplicitMemory(history=5)
    engine.extend(
        [
            {
                "cue": "Elevator ding",
                "modality": "auditory",
                "emotional_valence": -0.6,
                "salience": 0.8,
                "body_activation": 0.7,
                "safety_signal": 0.3,
                "integration_success": 0.2,
                "repetitions": 3,
            },
            {
                "cue": "Metal walls",
                "modality": "visual",
                "emotional_valence": -0.4,
                "salience": 0.6,
                "body_activation": 0.6,
                "safety_signal": 0.4,
                "integration_success": 0.3,
                "repetitions": 2,
            },
            {
                "cue": "Fresh air",
                "modality": "olfactory",
                "emotional_valence": 0.2,
                "salience": 0.4,
                "body_activation": 0.3,
                "safety_signal": 0.7,
                "integration_success": 0.5,
                "repetitions": 1,
            },
        ]
    )

    context = MemoryContext(
        intention="Rehearse calm elevator transitions",
        physiological_regulation=0.45,
        stress_level=0.65,
        novelty=0.5,
        relational_support=0.3,
        environmental_safety=0.6,
        sleep_quality=0.4,
        practice_time=0.35,
        anchors=("breath", "wall contact"),
    )

    report = engine.generate_report(context)

    assert 0.0 <= report.priming_index <= 1.0
    assert 0.0 <= report.integration_readiness <= 1.0
    assert 0.0 <= report.regulation_need <= 1.0
    assert report.dominant_modalities[:2] == ("auditory", "visual")
    assert any("integration reps" in strategy for strategy in report.reconsolidation_strategies)
    assert any("breathwork" in action for action in report.supportive_actions)
    assert "Implicit memory priming" in report.narrative
    assert "Available anchors" in report.narrative

    payload = report.as_dict()
    assert payload["dominant_modalities"][0] == "auditory"


def test_generate_report_requires_traces() -> None:
    engine = DynamicImplicitMemory()
    context = MemoryContext(
        intention="Stabilise evening wind-down",
        physiological_regulation=0.7,
        stress_level=0.3,
        novelty=0.2,
        relational_support=0.8,
        environmental_safety=0.9,
    )

    with pytest.raises(RuntimeError):
        engine.generate_report(context)


def test_toolkit_exports_engine() -> None:
    from dynamic_tool_kits import DynamicImplicitMemory as ToolkitExport

    engine = ToolkitExport()
    assert isinstance(engine, DynamicImplicitMemory)
