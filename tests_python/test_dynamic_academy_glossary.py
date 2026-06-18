"""Integration tests for the Dynamic Academy glossary adapter."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_glossary import (  # noqa: E402 - import after path adjustment
    DYNAMIC_ACADEMY_DATA_PATH,
    build_dynamic_academy_glossary,
    load_dynamic_academy_dataset,
    load_dynamic_academy_entries,
)


def test_dataset_is_alphabetically_sorted() -> None:
    dataset = load_dynamic_academy_dataset()
    assert dataset, "expected Dynamic Academy dataset to be non-empty"
    terms = [item["term"] for item in dataset]
    assert terms == sorted(terms, key=lambda value: value.lower())


def test_dataset_has_unique_slugs_and_terms() -> None:
    dataset = load_dynamic_academy_dataset()
    slugs = [item["slug"].lower() for item in dataset]
    terms = [item["term"].lower() for item in dataset]
    assert len(slugs) == len(set(slugs))
    assert len(terms) == len(set(terms))


def test_entries_include_metadata_and_sources() -> None:
    entries = load_dynamic_academy_entries()
    assert entries
    sample = entries[0]
    assert sample.definition
    assert sample.metadata is not None
    assert sample.metadata["slug"]
    assert sample.metadata["term"] == sample.term
    assert sample.metadata["summary"] == sample.definition
    assert sample.metadata["dynamic_slug"] == sample.metadata["slug"]
    assert sample.metadata["dynamic_term"] == sample.metadata["term"]
    assert sample.metadata["dynamic_summary"] == sample.metadata["summary"]
    assert sample.metadata["source_url"].startswith("https://")
    assert "Dynamic Academy" in sample.sources


def test_build_glossary_registers_all_terms() -> None:
    glossary = build_dynamic_academy_glossary()
    dataset = load_dynamic_academy_dataset()
    assert len(glossary) == len(dataset)
    target_term = dataset[0]["term"]
    assert glossary.find(target_term) is not None
    assert DYNAMIC_ACADEMY_DATA_PATH.exists()
