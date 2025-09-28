"""Tests for the dynamic acronym registry defaults."""

from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))


from dynamic_acronym import DynamicAcronym
from dynamic_acronym.acronym import DEFAULT_ACRONYMS, create_default_acronym_registry


def test_dynamic_entry_uses_updated_expansion() -> None:
    registry = create_default_acronym_registry()
    entry = registry.lookup("D.Y.N.A.M.I.C.")
    assert entry is not None
    assert (
        entry.primary_expansion
        == "Driving Yield of New Advancements in Markets, Investing & Capital"
    )


def test_default_acronym_tokens_cover_simplified_spelling() -> None:
    registry = create_default_acronym_registry()
    entry = registry.lookup("dynamic")
    assert entry is not None
    assert entry.acronym == "DYNAMIC"


def test_capital_entry_supports_stylized_lookup() -> None:
    registry = create_default_acronym_registry()
    entry = registry.lookup("C.A.P.I.T.A.L.")
    assert entry is not None
    assert (
        entry.primary_expansion
        == "Creating Asset Profitability through Intelligent Trading, Algorithms & Leverage"
    )


def test_dynamic_capital_combination_available() -> None:
    registry = create_default_acronym_registry()
    entry = registry.lookup("Dynamic Capital")
    assert entry is not None
    assert entry.acronym == "DYNAMIC CAPITAL"
    assert entry.primary_expansion.startswith("Dynamic Capital = Driving Yield")


def test_default_constant_is_immutable_tuple() -> None:
    assert isinstance(DEFAULT_ACRONYMS, tuple)
    assert {entry.acronym for entry in DEFAULT_ACRONYMS} >= {
        "DYNAMIC",
        "CAPITAL",
        "DYNAMIC CAPITAL",
    }
    registry = DynamicAcronym(DEFAULT_ACRONYMS)
    dynamic_entry = registry.lookup("dynamic")
    assert dynamic_entry is not None
