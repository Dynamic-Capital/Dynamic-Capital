from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.trading_psychology_elements import Element
from dynamic_consciousness.consciousness import ConsciousnessState
from dynamic_persona.persona import PersonaDimension, PersonaProfile
from dynamic_thinking.engine import ThinkingFrame
from dynamic.trading.algo.dynamic_psychology import (
    ElementAggregate,
    PsychologySnapshot,
)

from dynamic_cognition.integration import CognitiveAlignmentEngine


@pytest.fixture()
def _psych_snapshot() -> PsychologySnapshot:
    element = ElementAggregate(
        element=Element.EARTH,
        average_score=6.5,
        level="building",
        reasons=("Grounded execution cadence.",),
        recommendations=("Keep daily review journal.",),
    )
    return PsychologySnapshot(
        trader_id="ALPHA",
        sample_count=3,
        elements=(element,),
        readiness_score=7.0,
        caution_score=3.0,
        recovery_score=6.0,
        stability_index=5.5,
        dominant_element=Element.EARTH.value,
        dominant_score=6.5,
        dominant_level="building",
        last_sample_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )


@pytest.fixture()
def _persona() -> PersonaProfile:
    dimensions = (
        PersonaDimension(
            name="Liquidity Strategy",
            description="Builds resilient liquidity structures",
            weight=1.2,
            tags=("liquidity", "risk"),
        ),
        PersonaDimension(
            name="Human Development",
            description="Coaches teams through growth loops",
            weight=1.0,
            tags=("mentorship", "psychology"),
        ),
    )
    return PersonaProfile(
        identifier="navigator",
        display_name="Navigator Persona",
        mission="Guide liquidity pods through adaptive execution",
        tone=("calm", "precise"),
        expertise=("Liquidity Strategy", "Psychology"),
        dimensions=dimensions,
        rituals=("Daily debrief",),
        conversation_starters=("What insights are surfacing today?",),
        success_metrics=("Clarity regained",),
        failure_modes=("Operating on autopilot",),
        resources={"Playbook": "https://example.com/liquidity"},
    )


def test_alignment_engine_generates_integrated_report(
    _psych_snapshot: PsychologySnapshot, _persona: PersonaProfile
) -> None:
    thinking = ThinkingFrame(
        clarity_index=0.8,
        risk_pressure=0.2,
        idea_velocity=0.7,
        dominant_themes=("Liquidity", "Mentorship"),
        bias_alerts=("Overconfidence bias: run a pre-mortem",),
        recommended_models=("OODA Loop", "MECE Structuring"),
        synthesis="",
        action_steps=("Run mental models: OODA Loop",),
    )
    consciousness = ConsciousnessState(
        awareness_index=0.75,
        readiness_index=0.7,
        stability_index=0.65,
        modal_dominance=("visual", "auditory"),
        critical_signals=("visual: pattern recognition sharp",),
        recommended_focus=("Focus on high-leverage opportunity windows.",),
        stabilisation_rituals=("Box breathing",),
        narrative_summary="",
    )
    knowledge_index = {
        "liquidity": ("Liquidity Playbook",),
        "mentorship": ("Mentorship Rituals",),
        "psychology": ("Psychology Handbook",),
        "visual": ("Visualization Patterns",),
    }

    engine = CognitiveAlignmentEngine(knowledge_index=knowledge_index)
    report = engine.synthesise(
        thinking=thinking,
        consciousness=consciousness,
        psychology=_psych_snapshot,
        persona=_persona,
    )

    assert report.persona_identifier == "navigator"
    assert report.alignment_score == pytest.approx(0.725, rel=1e-5)
    assert report.resilience_score == pytest.approx(0.66, rel=1e-5)
    assert report.persona_resonance == pytest.approx(1.0, rel=1e-5)
    assert "liquidity" in report.emphasis_tags
    assert set(report.knowledgebase_recommendations) == {
        "liquidity: Liquidity Playbook",
        "mentorship: Mentorship Rituals",
        "psychology: Psychology Handbook",
        "visual: Visualization Patterns",
    }
    assert "Navigator Persona" in report.summary
    assert "Dominant themes: Liquidity, Mentorship" in report.summary
    assert any("Bias:" in stream for stream in report.insight_streams)
    payload = report.as_dict()
    assert payload["alignment_score"] == report.alignment_score
    assert payload["knowledgebase_recommendations"] == list(
        report.knowledgebase_recommendations
    )


def test_alignment_engine_flags_gaps_when_metrics_drop(
    _persona: PersonaProfile
) -> None:
    thinking = ThinkingFrame(
        clarity_index=0.4,
        risk_pressure=0.7,
        idea_velocity=0.3,
        dominant_themes=("Fragmentation",),
        bias_alerts=(),
        recommended_models=(),
        synthesis="",
        action_steps=(),
    )
    consciousness = ConsciousnessState(
        awareness_index=0.45,
        readiness_index=0.4,
        stability_index=0.35,
        modal_dominance=("kinesthetic",),
        critical_signals=(),
        recommended_focus=(),
        stabilisation_rituals=(),
        narrative_summary="",
    )
    psychology = PsychologySnapshot(
        trader_id="BETA",
        sample_count=1,
        elements=(),
        readiness_score=3.0,
        caution_score=6.0,
        recovery_score=3.0,
        stability_index=4.0,
        dominant_element=Element.FIRE.value,
        dominant_score=6.0,
        dominant_level="elevated",
        last_sample_at=None,
    )

    engine = CognitiveAlignmentEngine(knowledge_index={})
    report = engine.synthesise(
        thinking=thinking,
        consciousness=consciousness,
        psychology=psychology,
        persona=_persona,
    )

    assert report.alignment_score < 0.5
    assert report.persona_resonance < 0.65
    assert "Clarity index below 0.60" in report.knowledge_gaps[0]
    assert any("Caution load above" in gap for gap in report.knowledge_gaps)
    assert any(
        "No knowledge base recommendations" in gap
        for gap in report.knowledge_gaps
    )
    assert any(
        "Throttle execution tempo" in action
        for action in report.action_recommendations
    )
    assert any(
        "Document next experiment" in action
        for action in report.action_recommendations
    )
    assert report.knowledgebase_recommendations == ()
