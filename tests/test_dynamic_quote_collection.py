"""Unit tests for the dynamic quote collection helpers."""

from dynamic_quote.collection import QuoteCollection, seed_default_quotes
from dynamic_quote.engine import QuoteContext


def test_seed_default_quotes_catalog_and_digest() -> None:
    collection = QuoteCollection(history=8)
    seed_default_quotes(collection)

    entries = collection.entries()
    assert len(entries) == 4
    assert set(collection.themes()) == {"resilience", "vision"}

    resilience_entries = collection.entries_for_theme("Resilience")
    assert len(resilience_entries) == 2

    growth_entries = collection.entries_for_tag("growth")
    assert len(growth_entries) >= 2

    context = QuoteContext(
        campaign="Activation",
        audience="builders",
        tone="optimistic",
        urgency=0.65,
        novelty_pressure=0.55,
        emotional_intensity=0.7,
        preferred_tags=("growth",),
        avoid_topics=("fear",),
        highlight_limit=2,
    )

    digest = collection.build_digest(context)
    assert len(digest.highlight_quotes) == 2
    assert all(isinstance(item, str) and item for item in digest.highlight_quotes)
    assert any("future" in quote.lower() for quote in digest.highlight_quotes)

