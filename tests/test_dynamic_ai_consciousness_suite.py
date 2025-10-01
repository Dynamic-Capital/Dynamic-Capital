import pytest

from dynamic.intelligence.ai_apps import (
    AwarenessContexts,
    AwarenessDiagnostics,
    DynamicConsciousnessSuite,
)
from dynamic_consciousness import ConsciousnessContext, DynamicConsciousness
from dynamic_self_awareness import AwarenessContext, DynamicSelfAwareness
from dynamic_ultimate_reality import NonDualContext, DynamicUltimateReality
from dynamic.platform.engines import DynamicConsciousnessSuite as EnginesSuite
from dynamic_tool_kits import (
    AwarenessContexts as ToolkitAwarenessContexts,
    AwarenessDiagnostics as ToolkitAwarenessDiagnostics,
)


def test_consciousness_suite_integration_snapshot() -> None:
    suite = DynamicConsciousnessSuite(history=5)
    suite.extend(
        consciousness=[
            {
                "modality": "strategic",
                "observation": "Catalyst aligning with thesis.",
                "salience": 0.78,
                "novelty": 0.74,
                "emotional_tone": 0.6,
                "clarity": 0.72,
                "stability": 0.58,
                "weight": 1.1,
            },
            {
                "modality": "interoception",
                "observation": "Pulse elevated before execution.",
                "salience": 0.7,
                "novelty": 0.55,
                "emotional_tone": 0.4,
                "clarity": 0.5,
                "stability": 0.45,
                "weight": 1.0,
            },
        ],
        self_awareness=[
            {
                "channel": "emotion",
                "observation": "Tightness in chest",
                "clarity": 0.62,
                "alignment": 0.4,
                "agitation": 0.58,
                "action_bias": 0.35,
            },
            {
                "channel": "thought",
                "observation": "Concern about slipping standard",
                "clarity": 0.58,
                "alignment": 0.38,
                "agitation": 0.52,
                "action_bias": 0.3,
            },
        ],
        ultimate_reality=[
            {
                "dimension": "luminosity",
                "insight": "Awareness bright and steady.",
                "luminosity": 0.8,
                "emptiness": 0.72,
                "compassion": 0.66,
                "embodiment": 0.62,
                "coherence": 0.6,
            },
            {
                "dimension": "integration",
                "insight": "Remember to embody simplicity.",
                "luminosity": 0.6,
                "emptiness": 0.58,
                "compassion": 0.64,
                "embodiment": 0.55,
                "coherence": 0.58,
            },
        ],
    )

    contexts = AwarenessContexts.from_payloads(
        consciousness={
            "mission": "Compound deliberate reps",
            "time_horizon": "90-day sprint",
            "cognitive_load": 0.7,
            "emotional_regulation": 0.44,
            "threat_level": 0.56,
            "opportunity_level": 0.66,
            "support_network": 0.6,
            "environmental_complexity": 0.6,
            "stabilising_rituals": ("Grounding breath",),
            "future_snapshot": "Operating from composed conviction",
        },
        self_awareness={
            "situation": "Leading critical briefing",
            "emotion_label": "alert",
            "cognitive_noise": 0.68,
            "bodily_tension": 0.62,
            "readiness_for_action": 0.32,
            "value_alignment_target": 0.82,
            "personal_standards": ("Deliver calm clarity",),
            "support_level": 0.65,
        },
        ultimate_reality={
            "intention": "Live as unbound clarity",
            "integration_capacity": 0.64,
            "nervous_system_regulation": 0.48,
            "community_support": 0.7,
            "stewardship_commitment": 0.6,
            "environmental_noise": 0.52,
            "practice_cadence": 0.46,
            "core_practices": ("Morning sit",),
            "lineage": "Mahamudra",
            "guidance": "Remember breath in the heart.",
        },
    )

    integrated = suite.synthesise(contexts)
    assert 0.0 <= integrated.composite_readiness <= 1.0
    assert 0.0 <= integrated.harmonised_groundedness <= 1.0
    assert any("grounding" in theme.lower() for theme in integrated.recommended_themes)
    assert any("experiment" in theme.lower() or "translate awareness" in theme.lower() for theme in integrated.recommended_themes)
    assert any("Morning sit" in theme for theme in integrated.recommended_themes)
    assert "Mission" in integrated.narrative and "Situation" in integrated.narrative
    assert "Intention" in integrated.narrative and "Composite readiness" in integrated.narrative

    snapshot = integrated.as_dict()
    assert snapshot["consciousness"]["narrative_summary"].startswith("Mission")
    assert snapshot["self_awareness"]["reflection_prompts"]
    assert snapshot["ultimate_reality"]["guiding_principles"]
    assert 0.0 <= snapshot["composite_readiness"] <= 1.0

    integrated_from_payloads, diagnostics = (
        suite.synthesise_from_payloads_with_diagnostics(
            consciousness=contexts.consciousness,
            self_awareness=contexts.self_awareness,
            ultimate_reality=contexts.ultimate_reality,
        )
    )
    assert integrated_from_payloads.narrative == integrated.narrative
    assert diagnostics.signal_counts["consciousness"] == 2
    assert diagnostics.signal_counts["self_awareness"] == 2
    assert diagnostics.signal_counts["ultimate_reality"] == 2
    assert (
        diagnostics.latest_observations["consciousness"]
        == "Pulse elevated before execution."
    )
    assert diagnostics.latest_observations["ultimate_reality"].startswith("Remember")
    assert diagnostics.imbalance_alerts
    assert "readiness_vs_action" in diagnostics.momentum_trends
    diag_snapshot = diagnostics.as_dict()
    assert set(diag_snapshot.keys()) == {
        "signal_counts",
        "latest_observations",
        "imbalance_alerts",
        "momentum_trends",
    }


def test_consciousness_suite_requires_positive_history() -> None:
    with pytest.raises(ValueError):
        DynamicConsciousnessSuite(history=0)


def test_suite_accepts_custom_engines_and_toolkit_exports() -> None:
    suite = DynamicConsciousnessSuite(
        consciousness=DynamicConsciousness(history=3),
        self_awareness=DynamicSelfAwareness(history=3),
        ultimate_reality=DynamicUltimateReality(history=3),
    )

    suite.capture_consciousness(
        {
            "modality": "market",
            "observation": "Volatility compressing.",
            "salience": 0.6,
            "novelty": 0.4,
            "emotional_tone": 0.65,
            "clarity": 0.7,
            "stability": 0.62,
        }
    )
    suite.capture_self_awareness(
        {
            "channel": "thought",
            "observation": "Planning day with focus.",
            "clarity": 0.68,
            "alignment": 0.66,
            "agitation": 0.2,
            "action_bias": 0.72,
        }
    )
    suite.capture_ultimate_reality(
        {
            "dimension": "groundedness",
            "insight": "Attention steady and relaxed.",
            "luminosity": 0.7,
            "emptiness": 0.6,
            "compassion": 0.64,
            "embodiment": 0.7,
            "coherence": 0.72,
        }
    )

    contexts = AwarenessContexts.from_payloads(
        consciousness=ConsciousnessContext(
            mission="Stabilise strategic flow",
            time_horizon="Daily cadence",
            cognitive_load=0.4,
            emotional_regulation=0.65,
            threat_level=0.3,
            opportunity_level=0.55,
            support_network=0.6,
            environmental_complexity=0.35,
        ),
        self_awareness=AwarenessContext(
            situation="Morning planning",
            emotion_label="steady",
            cognitive_noise=0.25,
            bodily_tension=0.28,
            readiness_for_action=0.74,
            value_alignment_target=0.7,
            personal_standards=("Act with clarity",),
            support_level=0.6,
        ),
        ultimate_reality=NonDualContext(
            intention="Stay present",
            integration_capacity=0.72,
            nervous_system_regulation=0.7,
            community_support=0.6,
            stewardship_commitment=0.55,
            environmental_noise=0.3,
            practice_cadence=0.52,
            core_practices=("Walking meditation",),
        ),
    )

    integrated = suite.synthesise(contexts)
    assert integrated.composite_readiness > 0.0
    assert integrated.harmonised_groundedness > 0.0
    assert EnginesSuite is DynamicConsciousnessSuite
    assert ToolkitAwarenessContexts is AwarenessContexts
    assert ToolkitAwarenessDiagnostics is AwarenessDiagnostics
