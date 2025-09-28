"""Dynamic element keeper personas."""

from __future__ import annotations

from typing import Iterator, Tuple

from dynamic_acronym.element_personas import (
    DynamicElementPersona,
    ELEMENT_KEEPERS,
    get_element_persona,
    search_element_personas,
)

ElementKeeperPersona = DynamicElementPersona

__all__ = [
    "ElementKeeperPersona",
    "ELEMENT_KEEPERS",
    "list_element_keepers",
    "iter_element_keepers",
    "get_element_keeper",
    "search_element_keepers",
]


def list_element_keepers() -> Tuple[ElementKeeperPersona, ...]:
    """Return all Dynamic element keepers."""

    return ELEMENT_KEEPERS


def iter_element_keepers() -> Iterator[ElementKeeperPersona]:
    """Iterate over Dynamic element keepers."""

    yield from ELEMENT_KEEPERS


def get_element_keeper(identifier: str) -> ElementKeeperPersona:
    """Resolve a Dynamic element keeper by element name, symbol, or number."""

    return get_element_persona(identifier, role="keeper")


def search_element_keepers(query: str) -> Tuple[ElementKeeperPersona, ...]:
    """Search Dynamic element keepers by keyword."""

    return search_element_personas(query, role="keeper")

