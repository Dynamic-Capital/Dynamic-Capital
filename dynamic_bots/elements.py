"""Dynamic element bot personas."""

from __future__ import annotations

from typing import Iterator, Tuple

from dynamic_acronym.element_personas import (
    DynamicElementPersona,
    ELEMENT_BOTS,
    get_element_persona,
    search_element_personas,
)

ElementBotPersona = DynamicElementPersona

__all__ = [
    "ElementBotPersona",
    "ELEMENT_BOTS",
    "list_element_bots",
    "iter_element_bots",
    "get_element_bot",
    "search_element_bots",
]


def list_element_bots() -> Tuple[ElementBotPersona, ...]:
    """Return all Dynamic element bots."""

    return ELEMENT_BOTS


def iter_element_bots() -> Iterator[ElementBotPersona]:
    """Iterate over Dynamic element bots."""

    yield from ELEMENT_BOTS


def get_element_bot(identifier: str) -> ElementBotPersona:
    """Resolve a Dynamic element bot by element name, symbol, or number."""

    return get_element_persona(identifier, role="bot")


def search_element_bots(query: str) -> Tuple[ElementBotPersona, ...]:
    """Search Dynamic element bots by keyword."""

    return search_element_personas(query, role="bot")

