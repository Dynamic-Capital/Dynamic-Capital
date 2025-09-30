from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_search_engine import Document, DynamicSearchEngine


def test_document_validation() -> None:
    with pytest.raises(ValueError):
        Document(identifier=" ", content="Test content")
    with pytest.raises(ValueError):
        Document(identifier="alpha", content="   ")


def test_search_ranks_relevant_documents() -> None:
    engine = DynamicSearchEngine()
    engine.add_documents(
        [
            Document(
                identifier="one",
                content="The quick brown fox jumps over the lazy dog.",
            ),
            Document(
                identifier="two",
                content="Dynamic strategies demand quick execution and adaptive playbooks.",
            ),
            Document(
                identifier="three",
                content="Meticulous research fuels disciplined capital deployment.",
            ),
        ]
    )

    results = engine.search("quick fox", limit=2)

    assert [result.document.identifier for result in results] == ["one", "two"]
    assert results[0].score >= results[1].score
    assert results[0].snippet is not None


def test_search_respects_filters_and_updates() -> None:
    engine = DynamicSearchEngine()
    doc = Document(
        identifier="alpha",
        content="Search pipelines thrive on well-indexed adaptive corpora.",
    )
    engine.add_document(doc)

    results = engine.search("adaptive corpora")
    assert results and results[0].document.identifier == "alpha"

    filtered = engine.search("adaptive", filter=lambda item: item.identifier == "beta")
    assert filtered == []

    engine.add_document(
        Document(
            identifier="alpha",
            content="Adaptive engines balance recall and precision dynamically.",
        )
    )
    results = engine.search("adaptive precision")
    assert results[0].document.identifier == "alpha"
    assert "precision" in results[0].snippet.lower()

    removed = engine.remove_document("alpha")
    assert removed
    assert engine.search("adaptive") == []
