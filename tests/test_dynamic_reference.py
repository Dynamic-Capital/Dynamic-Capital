from __future__ import annotations

import pytest

from dynamic_reference import DynamicReference, ReferenceContext, ReferenceDigest, ReferenceEntry


def test_reference_entry_normalisation() -> None:
    entry = ReferenceEntry(
        title="  Liquidity Playbook  ",
        description="  Procedures for treasury interventions  ",
        domain="  Operations  ",
        relevance=1.4,
        accuracy=-0.2,
        freshness=1.5,
        endorsement=-0.5,
        weight=-3,
        tags=(" Mission Critical ", "mission critical"),
        sources=("  Ops Desk  ", "Ops Desk"),
        links=("  https://example.com/playbook  ", "https://example.com/playbook"),
        metadata={"owner": " Treasury "},
    )

    assert entry.title == "Liquidity Playbook"
    assert entry.description == "Procedures for treasury interventions"
    assert entry.domain == "operations"
    assert 0.0 <= entry.relevance <= 1.0
    assert 0.0 <= entry.accuracy <= 1.0
    assert 0.0 <= entry.freshness <= 1.0
    assert 0.0 <= entry.endorsement <= 1.0
    assert entry.weight == 0.0
    assert entry.tags == ("mission critical",)
    assert entry.sources == ("Ops Desk", "Ops Desk")
    assert entry.links == ("https://example.com/playbook",)
    assert entry.metadata == {"owner": " Treasury "}


def test_generate_digest_surfaces_alignment() -> None:
    engine = DynamicReference(history=4)
    engine.extend(
        [
            {
                "title": "Dynamic Liquidity Map",
                "description": "Real-time treasury reference stack",
                "domain": "Finance",
                "relevance": 0.9,
                "accuracy": 0.85,
                "freshness": 0.75,
                "endorsement": 0.8,
                "tags": ("liquidity", "treasury"),
            },
            {
                "title": "Partner Coverage Matrix",
                "description": "Reference coverage plan for partnerships",
                "domain": "Growth",
                "relevance": 0.72,
                "accuracy": 0.65,
                "freshness": 0.55,
                "endorsement": 0.6,
                "tags": ("partners", "coverage"),
            },
            {
                "title": "Legacy Integration Checklist",
                "description": "Outdated integration notes",
                "domain": "Engineering",
                "relevance": 0.35,
                "accuracy": 0.4,
                "freshness": 0.2,
                "endorsement": 0.3,
                "tags": ("legacy",),
            },
        ]
    )

    context = ReferenceContext(
        mission="Treasury control tower",
        audience="Revenue desk",
        time_horizon="Quarter",
        change_pressure=0.65,
        adoption_pressure=0.55,
        confidence_threshold=0.7,
        focus_tags=("liquidity", "treasury"),
        retire_tags=("legacy",),
        highlight_limit=2,
    )

    digest = engine.generate_digest(context)

    assert isinstance(digest, ReferenceDigest)
    assert 0.0 <= digest.focus_alignment <= 1.0
    assert 0.0 <= digest.confidence_health <= 1.0
    assert 0.0 <= digest.refresh_pressure <= 1.0
    assert digest.catalogue_size <= context.highlight_limit
    assert any("liquidity" in ref.lower() for ref in digest.highlight_references)
    assert any("briefing" in prompt.lower() for prompt in digest.activation_prompts)
    assert any("legacy" in candidate.lower() for candidate in digest.retire_candidates)
    assert "Treasury control tower" in digest.narrative


def test_generate_digest_requires_entries_and_valid_limit() -> None:
    engine = DynamicReference(history=2)
    context = ReferenceContext(
        mission="Market expansion",
        audience="Ops guild",
        time_horizon="Month",
        change_pressure=0.4,
        adoption_pressure=0.35,
        confidence_threshold=0.6,
    )

    with pytest.raises(RuntimeError):
        engine.generate_digest(context)

    engine.append(
        {
            "title": "Growth Notes",
            "description": "Reference notes",
            "domain": "Growth",
        }
    )

    with pytest.raises(ValueError):
        engine.generate_digest(context, limit=0)
