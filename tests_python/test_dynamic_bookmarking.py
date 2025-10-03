from datetime import timedelta

import pytest

from dynamic_bookmarking import (
    Bookmark,
    BookmarkScore,
    BookmarkSnapshot,
    DynamicBookmarkingEngine,
    DynamicBookmarkingError,
)


def test_rank_prioritises_recent_engagement() -> None:
    engine = DynamicBookmarkingEngine(history=10, recency_horizon_hours=48)

    research = engine.register(
        {
            "identifier": "alpha",
            "url": "dynamic.capital/research",
            "title": "Dynamic Research Dashboard",
            "tags": ("research", "intelligence"),
            "contexts": ("strategy",),
            "importance": 0.7,
        }
    )
    operations = engine.register(
        {
            "identifier": "beta",
            "url": "https://dynamic.capital/ops",
            "title": "Operations Runbook",
            "tags": ("operations",),
            "contexts": ("runbooks",),
            "importance": 0.5,
        }
    )

    engine.record_interaction("alpha", "visit", weight=2.0, context="research")
    engine.record_interaction("alpha", "annotate", context="strategy")
    engine.record_interaction("beta", "visit", weight=0.5, context="operations")

    ranked = engine.rank(tags=["research", "operations"])

    assert ranked
    assert isinstance(ranked[0], BookmarkScore)
    assert ranked[0].bookmark.identifier == research.identifier
    assert "research" in ranked[0].matched_tags
    assert ranked[0].total_weight >= 2.0

    # Ensure other bookmarks are still included
    identifiers = [entry.bookmark.identifier for entry in ranked]
    assert operations.identifier in identifiers


def test_snapshot_flags_stale_bookmarks() -> None:
    engine = DynamicBookmarkingEngine(history=5, recency_horizon_hours=24)
    engine.register(
        Bookmark(
            identifier="alpha",
            url="https://dynamic.capital/tools",
            title="Operator Toolkit",
            tags=("operations", "tools"),
            contexts=("ops",),
        )
    )
    beta = engine.register(
        {
            "identifier": "beta",
            "url": "dynamic.capital/alpha",
            "title": "Alpha Launch Checklist",
            "tags": ("launch", "ops"),
            "contexts": ("ops",),
        }
    )

    now = engine.get("alpha").created_at
    engine.record_interaction("alpha", "visit", timestamp=now + timedelta(hours=1))
    engine.record_interaction(
        "beta",
        "visit",
        weight=1.0,
        timestamp=now - timedelta(days=2),
        context=("ops",),
    )

    snapshot = engine.snapshot(stale_after_hours=24)

    assert isinstance(snapshot, BookmarkSnapshot)
    assert snapshot.total == 2
    assert snapshot.tag_counts["ops"] == 1
    assert snapshot.tag_counts["operations"] == 1
    assert beta.identifier in snapshot.stale


def test_update_rejects_unknown_fields() -> None:
    engine = DynamicBookmarkingEngine()
    engine.register(
        {
            "identifier": "alpha",
            "url": "dynamic.capital/docs",
            "title": "Documentation",
        }
    )

    with pytest.raises(DynamicBookmarkingError):
        engine.update("alpha", unknown_field="value")
