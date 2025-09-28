"""Tests for the dynamic hierarchy conceptual model."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - import side effect
    sys.path.insert(0, str(PROJECT_ROOT))

from dynamic_hierarchy import (  # noqa: E402  - imported after sys.path mutation
    HIERARCHY_MODEL,
    OrganizationalHierarchy,
    organizational_hierarchy_catalogue,
)


def test_model_contains_expected_characteristics() -> None:
    names = {characteristic.name for characteristic in HIERARCHY_MODEL.characteristics}
    assert {
        "Clear levels",
        "Chain of command",
        "Structured communication",
        "Accountability",
    } <= names


def test_examples_cover_multiple_domains() -> None:
    domains = {example.domain for example in HIERARCHY_MODEL.examples}
    assert {
        "Organisations",
        "Biology",
        "Social structures",
        "Military",
        "Computer science",
    } == domains


def test_catalogue_entries_are_dataclasses() -> None:
    assert all(
        isinstance(entry, OrganizationalHierarchy)
        for entry in organizational_hierarchy_catalogue
    )


def test_public_model_types_are_frozen_dataclasses() -> None:
    for value in (
        HIERARCHY_MODEL.characteristics[0],
        HIERARCHY_MODEL.examples[0],
        organizational_hierarchy_catalogue[0],
    ):
        assert hasattr(value, "__dataclass_fields__")
        # Mutating a frozen dataclass should raise dataclasses.FrozenInstanceError.
        try:
            setattr(value, "name", "changed")
        except (AttributeError, TypeError):
            # frozen dataclasses with slots raise AttributeError or TypeError
            pass
        else:  # pragma: no cover - defensive
            raise AssertionError("dataclass instance is not frozen")
