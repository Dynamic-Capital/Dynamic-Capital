from __future__ import annotations

import pytest

from dynamic_memory import (
    ConsolidationContext,
    DynamicMemoryConsolidator,
    MemoryConsolidationReport,
    MemoryFragment,
)


def test_memory_fragment_normalisation() -> None:
    fragment = MemoryFragment(
        domain="  Strategy  ",
        summary="  Capture client insight about treasury runway  ",
        recency=1.4,
        relevance=-0.2,
        novelty=1.2,
        emotional_intensity=0.9,
        confidence=1.5,
        weight=-4,
        tags=(" Mission Critical ", "mission critical"),
        source="  Ops Desk  ",
    )

    assert fragment.domain == "strategy"
    assert fragment.summary == "Capture client insight about treasury runway"
    assert 0.0 <= fragment.recency <= 1.0
    assert 0.0 <= fragment.relevance <= 1.0
    assert 0.0 <= fragment.novelty <= 1.0
    assert 0.0 <= fragment.confidence <= 1.0
    assert fragment.weight == 0.0
    assert fragment.tags == ("mission critical",)
    assert fragment.source == "Ops Desk"


def test_consolidation_report_balances_recency_and_relevance() -> None:
    engine = DynamicMemoryConsolidator(history=10)
    engine.extend(
        [
            {
                "domain": "governance",
                "summary": "Ratified new incident response escalation tree",
                "recency": 0.9,
                "relevance": 0.8,
                "novelty": 0.6,
                "emotional_intensity": 0.4,
                "confidence": 0.7,
                "tags": ("playbooks", "risk"),
            },
            {
                "domain": "treasury",
                "summary": "Liquidity runway stable at 14 months",
                "recency": 0.6,
                "relevance": 0.9,
                "novelty": 0.3,
                "emotional_intensity": 0.3,
                "confidence": 0.8,
                "tags": ("mission critical", "treasury"),
            },
            {
                "domain": "markets",
                "summary": "Alpha stream flagged regime shift in volatility clusters",
                "recency": 0.4,
                "relevance": 0.7,
                "novelty": 0.75,
                "emotional_intensity": 0.6,
                "confidence": 0.55,
                "tags": ("market intel",),
            },
        ]
    )

    context = ConsolidationContext(
        mission="Protect treasury and execution excellence",
        retention_horizon="30-day cycle",
        operational_tempo=0.65,
        cognitive_bandwidth=0.55,
        archive_pressure=0.45,
        environmental_volatility=0.5,
        support_level=0.7,
        fatigue_level=0.35,
        retrieval_pressure=0.6,
        focus_theme="treasury confidence",
    )

    report = engine.generate_report(context)

    assert isinstance(report, MemoryConsolidationReport)
    assert 0.0 <= report.retention_strength <= 1.0
    assert 0.0 <= report.clarity_index <= 1.0
    assert 0.0 <= report.loss_risk <= 1.0
    assert any("treasury" in anchor for anchor in report.anchor_topics)
    assert any("review" in action or "synthesis" in action for action in report.integration_actions)
    assert any("theme" in prompt or "signals" in prompt for prompt in report.reflection_prompts)
    assert "Loss risk" in report.narrative or "Retention strength" in report.narrative


def test_generate_report_requires_fragments() -> None:
    engine = DynamicMemoryConsolidator()
    context = ConsolidationContext(
        mission="Stabilise liquidity ops",
        retention_horizon="14-day sprint",
        operational_tempo=0.4,
        cognitive_bandwidth=0.6,
        archive_pressure=0.2,
        environmental_volatility=0.3,
        support_level=0.8,
        fatigue_level=0.2,
        retrieval_pressure=0.5,
    )

    with pytest.raises(RuntimeError):
        engine.generate_report(context)
