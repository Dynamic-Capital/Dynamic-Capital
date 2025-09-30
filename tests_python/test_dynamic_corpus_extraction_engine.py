"""Tests for the dynamic corpus extraction engine."""

from __future__ import annotations

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_corpus_extraction import (
    CorpusDocument,
    DynamicCorpusExtractionEngine,
)


def test_extracts_and_deduplicates(tmp_path: Path) -> None:
    engine = DynamicCorpusExtractionEngine()
    requested_limits: list[int | None] = []

    def loader_alpha(context):
        requested_limits.append(context.limit)
        yield {"identifier": "alpha-1", "content": "Entry one"}
        yield {"identifier": "alpha-2", "content": "Entry two"}

    def loader_beta(context):
        assert context.metadata["batch"] == "2024-11"
        yield {"identifier": "alpha-2", "content": "Entry two"}  # duplicate id/content
        yield CorpusDocument(
            identifier="beta-1",
            content="Entry three",
            source=context.source,
            tags=("News",),
        )

    engine.register_source("alpha", loader_alpha, tags=["Dictionary"])
    engine.register_source("beta", loader_beta, tags=["News"])

    summary = engine.extract(limit=3, metadata={"batch": "2024-11"})

    assert [document.identifier for document in summary.documents] == [
        "alpha-1",
        "alpha-2",
        "beta-1",
    ]
    assert summary.duplicate_count == 1
    assert summary.source_statistics == {"alpha": 2, "beta": 1}
    assert summary.documents[0].tags == ("dictionary",)
    assert summary.documents[2].tags == ("news",)
    assert summary.documents[2].metadata["source"] == "beta"
    assert summary.documents[2].metadata["batch"] == "2024-11"
    assert requested_limits[0] == 3

    export_path = tmp_path / "corpus.jsonl"
    count = summary.export_jsonl(export_path)
    assert count == 3
    lines = export_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 3
    payload = json.loads(lines[0])
    assert payload["identifier"] == "alpha-1"


def test_registering_duplicate_source_raises() -> None:
    engine = DynamicCorpusExtractionEngine()
    engine.register_source("alpha", lambda context: ())
    with pytest.raises(ValueError):
        engine.register_source("alpha", lambda context: ())


def test_limit_applies_globally() -> None:
    engine = DynamicCorpusExtractionEngine()

    def loader(context):
        for index in range(5):
            yield {"identifier": f"doc-{context.source}-{index}", "content": f"Body {index}"}

    engine.register_source("alpha", loader)
    engine.register_source("beta", loader)

    summary = engine.extract(limit=2)

    assert len(summary.documents) == 2
    assert {document.source for document in summary.documents} == {"alpha"}


def test_selecting_unknown_source_errors() -> None:
    engine = DynamicCorpusExtractionEngine()
    engine.register_source("alpha", lambda context: ())
    with pytest.raises(KeyError):
        engine.extract(sources=["beta"])
