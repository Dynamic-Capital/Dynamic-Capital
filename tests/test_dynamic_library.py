from __future__ import annotations

import pytest

from dynamic_library import DynamicLibrary, LibraryAsset, LibraryContext, LibraryDigest


def test_library_asset_normalisation() -> None:
    asset = LibraryAsset(
        title="  Treasury Runbook  ",
        summary="  Detailed playbook for liquidity operations  ",
        category="  Playbooks  ",
        importance=1.3,
        freshness=-0.2,
        usage_frequency=1.2,
        confidence=1.4,
        weight=-2,
        tags=(" Mission Critical ", "mission critical"),
        authors=("  Ops Desk  ", "Ops Desk"),
        source="  Notion  ",
    )

    assert asset.title == "Treasury Runbook"
    assert asset.summary == "Detailed playbook for liquidity operations"
    assert asset.category == "playbooks"
    assert 0.0 <= asset.importance <= 1.0
    assert 0.0 <= asset.freshness <= 1.0
    assert 0.0 <= asset.usage_frequency <= 1.0
    assert 0.0 <= asset.confidence <= 1.0
    assert asset.weight == 0.0
    assert asset.tags == ("mission critical",)
    assert asset.authors == ("Ops Desk", "Ops Desk")
    assert asset.source == "Notion"


def test_generate_digest_highlights_trends() -> None:
    library = DynamicLibrary(history=5)
    library.extend(
        [
            {
                "title": "Treasury Control Tower",
                "summary": "Monthly reconciliation operating procedure",
                "category": "Playbooks",
                "importance": 0.9,
                "freshness": 0.8,
                "usage_frequency": 0.7,
                "confidence": 0.85,
                "tags": ("treasury", "controls"),
            },
            {
                "title": "Market Intelligence Radar",
                "summary": "Rolling market indicators for liquidity risk",
                "category": "Research",
                "importance": 0.75,
                "freshness": 0.55,
                "usage_frequency": 0.6,
                "confidence": 0.7,
                "tags": ("markets", "signals"),
            },
            {
                "title": "Ops Rituals",
                "summary": "Weekly sync rituals for revenue team",
                "category": "Playbooks",
                "importance": 0.65,
                "freshness": 0.45,
                "usage_frequency": 0.35,
                "confidence": 0.6,
                "tags": ("rituals", "enablement"),
            },
        ]
    )

    context = LibraryContext(
        portfolio="Revenue enablement canon",
        review_cadence="Bi-weekly",
        refresh_pressure=0.55,
        adoption_pressure=0.6,
        operational_load=0.4,
        collaboration_level=0.7,
        focus_topics=("treasury",),
        retiring_themes=("legacy playbooks",),
        highlight_limit=3,
    )

    digest = library.generate_digest(context)

    assert isinstance(digest, LibraryDigest)
    assert 0.0 <= digest.stability_score <= 1.0
    assert 0.0 <= digest.refresh_priority <= 1.0
    assert len(digest.highlight_topics) <= context.highlight_limit
    assert any("playbooks" in topic or "treasury" in topic for topic in digest.highlight_topics)
    assert any("refresh" in action.lower() or "promote" in action.lower() for action in digest.maintenance_actions)
    assert any("collaborative" in prompt.lower() or "digest" in prompt.lower() for prompt in digest.share_prompts)
    assert "Library snapshot" in digest.narrative


def test_generate_digest_with_limit_and_requires_assets() -> None:
    library = DynamicLibrary(history=4)
    library.extend(
        [
            {
                "title": "Legacy Reference",
                "summary": "Deprecated process map",
                "category": "Archive",
                "importance": 0.4,
                "freshness": 0.2,
                "usage_frequency": 0.1,
                "confidence": 0.5,
                "tags": ("legacy",),
            },
            {
                "title": "New Onboarding Guide",
                "summary": "Structured onboarding experience",
                "category": "Playbooks",
                "importance": 0.8,
                "freshness": 0.7,
                "usage_frequency": 0.65,
                "confidence": 0.75,
                "tags": ("onboarding",),
            },
            {
                "title": "Analytics Handbook",
                "summary": "Data analysis standards",
                "category": "Standards",
                "importance": 0.85,
                "freshness": 0.6,
                "usage_frequency": 0.5,
                "confidence": 0.7,
                "tags": ("analytics",),
            },
        ]
    )

    context = LibraryContext(
        portfolio="Growth Ops",
        review_cadence="Monthly",
        refresh_pressure=0.3,
        adoption_pressure=0.4,
        operational_load=0.5,
        collaboration_level=0.5,
        highlight_limit=2,
    )

    digest = library.generate_digest(context, limit=2)

    assert digest.catalogue_size == 2
    assert all(topic in {"playbooks", "standards", "analytics"} for topic in digest.highlight_topics)

    library.reset()
    with pytest.raises(RuntimeError):
        library.generate_digest(context)

    with pytest.raises(ValueError):
        library.generate_digest(context, limit=0)
