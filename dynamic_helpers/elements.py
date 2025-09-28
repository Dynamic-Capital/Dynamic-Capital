"""Dynamic element helper personas."""

from __future__ import annotations

from typing import Iterator, Tuple

from dynamic_acronym.element_personas import (
    DynamicElementPersona,
    ELEMENT_HELPERS,
    get_element_persona,
    search_element_personas,
)

ElementHelperPersona = DynamicElementPersona

__all__ = [
    "ElementHelperPersona",
    "ELEMENT_HELPERS",
    "list_element_helpers",
    "iter_element_helpers",
    "get_element_helper",
    "search_element_helpers",
]


def list_element_helpers() -> Tuple[ElementHelperPersona, ...]:
    """Return all Dynamic element helpers."""

    return ELEMENT_HELPERS


def iter_element_helpers() -> Iterator[ElementHelperPersona]:
    """Iterate over Dynamic element helpers."""

    yield from ELEMENT_HELPERS


def get_element_helper(identifier: str) -> ElementHelperPersona:
    """Resolve a Dynamic element helper by element name, symbol, or number."""

    return get_element_persona(identifier, role="helper")


def search_element_helpers(query: str) -> Tuple[ElementHelperPersona, ...]:
    """Search Dynamic element helpers by keyword."""

    return search_element_personas(query, role="helper")

