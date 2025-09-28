"""Dynamic element agent personas."""

from __future__ import annotations

from typing import Iterator, Tuple

from dynamic_acronym.element_personas import (
    DynamicElementPersona,
    ELEMENT_AGENTS,
    get_element_persona,
    search_element_personas,
)

ElementAgentPersona = DynamicElementPersona

__all__ = [
    "ElementAgentPersona",
    "ELEMENT_AGENTS",
    "list_element_agents",
    "iter_element_agents",
    "get_element_agent",
    "search_element_agents",
]


def list_element_agents() -> Tuple[ElementAgentPersona, ...]:
    """Return all Dynamic element agents."""

    return ELEMENT_AGENTS


def iter_element_agents() -> Iterator[ElementAgentPersona]:
    """Iterate over Dynamic element agents."""

    yield from ELEMENT_AGENTS


def get_element_agent(identifier: str) -> ElementAgentPersona:
    """Resolve a Dynamic element agent by element name, symbol, or number."""

    return get_element_persona(identifier, role="agent")


def search_element_agents(query: str) -> Tuple[ElementAgentPersona, ...]:
    """Search Dynamic element agents by keyword."""

    return search_element_personas(query, role="agent")

