"""Unit tests for the adaptive glossary primitives."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_glossary import DynamicGlossary, GlossaryEntry


def _build_sample_glossary() -> DynamicGlossary:
    entry = GlossaryEntry(
        term="Dynamic Intelligence",
        definition="Coordinated systems that adapt to contextual insights.",
        categories=("AI", "Knowledge"),
        synonyms=("Adaptive Intelligence",),
        related_terms=("Cognitive Systems",),
        sources=("Dynamic Capital",),
        usage_examples=("Dynamic intelligence drives responsive automation.",),
    )
    return DynamicGlossary([entry])


def test_search_returns_empty_tuple_for_blank_keyword() -> None:
    glossary = _build_sample_glossary()
    assert glossary.search("") == ()


def test_search_returns_empty_tuple_for_whitespace_keyword() -> None:
    glossary = _build_sample_glossary()
    assert glossary.search("   \t  \n") == ()


def test_search_matches_term_when_keyword_present() -> None:
    glossary = _build_sample_glossary()
    results = glossary.search("intelligence")
    assert len(results) == 1
    assert results[0].term == "Dynamic Intelligence"


def test_search_reindexes_entry_after_update() -> None:
    glossary = DynamicGlossary(
        [
            GlossaryEntry(
                term="Adaptive Signal",
                definition="Initial systems insight.",
                synonyms=("Alpha Signal",),
            )
        ]
    )

    assert glossary.search("initial")

    glossary.add_or_update(
        GlossaryEntry(
            term="Adaptive Signal",
            definition="Refined intelligence descriptor.",
            synonyms=("Beta Signal",),
        )
    )

    assert glossary.search("initial") == ()
    results = glossary.search("refined")
    assert len(results) == 1
    assert results[0].synonyms == ("Beta Signal",)
