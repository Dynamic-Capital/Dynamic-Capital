"""Derived personas for Dynamic element acronyms.

This module translates the raw element metadata stored in
``dynamic_acronym.element_data`` into higher-level personas that are used
throughout the Dynamic Capital stack.  Each periodic-table element is
rendered into four different personas — *agents*, *keepers*, *bots*, and
*helpers* — so downstream packages can obtain consistent role-specific
descriptions without duplicating the underlying acronym data.
"""

from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Dict, Iterable, Iterator, Literal, Mapping, Sequence

from .element_data import ELEMENT_ACRONYM_DATA

ElementRole = Literal["agent", "keeper", "bot", "helper"]

__all__ = [
    "ElementRole",
    "DynamicElementPersona",
    "ELEMENT_PERSONAS_BY_ROLE",
    "ELEMENT_PERSONAS",
    "ELEMENT_AGENTS",
    "ELEMENT_KEEPERS",
    "ELEMENT_BOTS",
    "ELEMENT_HELPERS",
    "iter_element_personas",
    "list_element_personas",
    "get_element_persona",
    "search_element_personas",
]


@dataclass(frozen=True, slots=True)
class DynamicElementPersona:
    """Role-specific persona derived from a Dynamic element acronym."""

    element: str
    role: ElementRole
    codename: str
    expansion: str
    summary: str
    mission: str
    categories: tuple[str, ...]
    usage_notes: tuple[str, ...]
    metadata: Mapping[str, object]
    keywords: tuple[str, ...]
    confidence: float
    familiarity: float

    @property
    def symbol(self) -> str | None:
        symbol = self.metadata.get("symbol") if self.metadata else None
        if symbol is None:
            return None
        return str(symbol)

    @property
    def atomic_number(self) -> int | None:
        value = self.metadata.get("atomic_number") if self.metadata else None
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None


def _normalise_token(value: str) -> str:
    return " ".join(value.strip().split()).lower()


def _unique(sequence: Sequence[str] | Iterable[str]) -> tuple[str, ...]:
    seen: Dict[str, None] = {}
    result: list[str] = []
    for item in sequence:
        if item not in seen:
            seen[item] = None
            result.append(item)
    return tuple(result)


_ROLE_OVERLAYS: Mapping[ElementRole, Mapping[str, object]] = {
    "agent": {
        "codename_suffix": "Agent",
        "summary_suffix": (
            "This persona deploys the element as a forward operator,"
            " activating opportunities in live missions."
        ),
        "mission_template": (
            "Lead field operations that channel {element} advantages into"
            " Dynamic Capital execution lanes."
        ),
        "extra_categories": ("agents", "execution", "field-ops"),
        "extra_keywords": ("agent", "field", "operations", "deploy"),
        "role_usage_note": (
            "Use when you need a live Dynamic element operator to drive"
            " immediate outcomes."
        ),
    },
    "keeper": {
        "codename_suffix": "Keeper",
        "summary_suffix": (
            "This persona safeguards institutional memory, ensuring the"
            " element's strategies remain auditable and resilient."
        ),
        "mission_template": (
            "Preserve and reconcile {element} knowledge so Dynamic Capital"
            " stays synchronized over time."
        ),
        "extra_categories": ("keepers", "governance", "continuity"),
        "extra_keywords": ("keeper", "archive", "governance", "continuity"),
        "role_usage_note": (
            "Use when you need an archival steward to maintain Dynamic"
            " element playbooks."
        ),
    },
    "bot": {
        "codename_suffix": "Bot",
        "summary_suffix": (
            "This persona automates telemetry and alerting so the element's"
            " insights surface without manual effort."
        ),
        "mission_template": (
            "Automate {element} signal routing and safeguards across Dynamic"
            " Capital pipelines."
        ),
        "extra_categories": ("bots", "automation", "signals"),
        "extra_keywords": ("bot", "automation", "alerts", "routing"),
        "role_usage_note": (
            "Use when you need automated Dynamic element monitoring or"
            " messaging."
        ),
    },
    "helper": {
        "codename_suffix": "Helper",
        "summary_suffix": (
            "This persona mentors teams, translating the element's pattern"
            " into actionable guidance."
        ),
        "mission_template": (
            "Coach Dynamic Capital contributors on activating {element}"
            " practices with clarity."
        ),
        "extra_categories": ("helpers", "enablement", "training"),
        "extra_keywords": ("helper", "mentor", "enablement", "training"),
        "role_usage_note": (
            "Use when you need hands-on guidance for a Dynamic element"
            " initiative."
        ),
    },
}


def _build_personas_for_role(role: ElementRole) -> tuple[DynamicElementPersona, ...]:
    overlay = _ROLE_OVERLAYS[role]
    personas: list[DynamicElementPersona] = []
    for record in ELEMENT_ACRONYM_DATA:
        name = str(record["name"]).strip()
        expansion = str(record["expansion"]).strip()
        description = str(record["description"]).strip()
        categories = tuple(str(category).strip() for category in record["categories"])
        usage_notes = tuple(str(note).strip() for note in record["usage_notes"])
        metadata = dict(record["metadata"])
        metadata["role"] = role
        codename = f"Dynamic {name} {overlay['codename_suffix']}"
        enriched_categories = _unique((*categories, *overlay["extra_categories"]))
        enriched_usage = _unique((*usage_notes, codename, overlay["role_usage_note"]))
        summary = f"{description} {overlay['summary_suffix']}".strip()
        mission = overlay["mission_template"].format(element=name).strip()
        symbol = metadata.get("symbol")
        atomic_number = metadata.get("atomic_number")
        keyword_candidates: list[str] = [
            name,
            f"dynamic {name}",
            codename,
            role,
            f"{name} {role}",
            f"dynamic {name} {role}",
            overlay["codename_suffix"],
            *enriched_categories,
            *overlay["extra_keywords"],
        ]
        if symbol:
            symbol_text = str(symbol)
            keyword_candidates.extend(
                [symbol_text, symbol_text.lower(), f"{symbol_text} {role}"]
            )
        if atomic_number is not None:
            keyword_candidates.append(str(atomic_number))
            keyword_candidates.append(f"{atomic_number} {role}")
        keyword_candidates.extend(enriched_usage)
        keywords = _unique(_normalise_token(token) for token in keyword_candidates if token)
        persona = DynamicElementPersona(
            element=name,
            role=role,
            codename=codename,
            expansion=expansion,
            summary=summary,
            mission=mission,
            categories=enriched_categories,
            usage_notes=enriched_usage,
            metadata=MappingProxyType(metadata),
            keywords=keywords,
            confidence=float(record["confidence"]),
            familiarity=float(record["familiarity"]),
        )
        personas.append(persona)

    personas.sort(key=lambda persona: (persona.atomic_number or 10_000, persona.element))
    return tuple(personas)


ELEMENT_PERSONAS_BY_ROLE: Mapping[ElementRole, tuple[DynamicElementPersona, ...]] = {
    role: _build_personas_for_role(role)
    for role in _ROLE_OVERLAYS
}

_EXPECTED_COUNT = len(ELEMENT_ACRONYM_DATA)
for role, personas in ELEMENT_PERSONAS_BY_ROLE.items():
    if len(personas) != _EXPECTED_COUNT:
        raise RuntimeError(
            f"Expected {_EXPECTED_COUNT} personas for role {role!r}, found {len(personas)}"
        )

ELEMENT_AGENTS = ELEMENT_PERSONAS_BY_ROLE["agent"]
ELEMENT_KEEPERS = ELEMENT_PERSONAS_BY_ROLE["keeper"]
ELEMENT_BOTS = ELEMENT_PERSONAS_BY_ROLE["bot"]
ELEMENT_HELPERS = ELEMENT_PERSONAS_BY_ROLE["helper"]

ELEMENT_PERSONAS: tuple[DynamicElementPersona, ...] = tuple(
    persona
    for role in ("agent", "keeper", "bot", "helper")
    for persona in ELEMENT_PERSONAS_BY_ROLE[role]
)

_PERSONA_LOOKUPS: Mapping[ElementRole, Dict[str, DynamicElementPersona]] = {}


def _register_identifiers(persona: DynamicElementPersona) -> Iterable[str]:
    identifiers = {
        _normalise_token(persona.element),
        _normalise_token(persona.codename),
        _normalise_token(f"dynamic {persona.element}"),
        _normalise_token(f"{persona.element} {persona.role}"),
        _normalise_token(f"dynamic {persona.element} {persona.role}"),
    }
    if persona.symbol:
        symbol = _normalise_token(persona.symbol)
        identifiers.add(symbol)
        identifiers.add(_normalise_token(f"{persona.symbol} {persona.role}"))
    if persona.atomic_number is not None:
        identifiers.add(str(persona.atomic_number))
        identifiers.add(_normalise_token(f"{persona.atomic_number} {persona.role}"))
    return identifiers


for role, personas in ELEMENT_PERSONAS_BY_ROLE.items():
    lookup: Dict[str, DynamicElementPersona] = {}
    for persona in personas:
        for identifier in _register_identifiers(persona):
            lookup.setdefault(identifier, persona)
    _PERSONA_LOOKUPS[role] = lookup


def iter_element_personas(role: ElementRole | None = None) -> Iterator[DynamicElementPersona]:
    """Iterate over personas, optionally constrained to a specific role."""

    if role is None:
        yield from ELEMENT_PERSONAS
        return
    yield from ELEMENT_PERSONAS_BY_ROLE[role]


def list_element_personas(role: ElementRole | None = None) -> tuple[DynamicElementPersona, ...]:
    """Return a tuple of personas for the requested role."""

    if role is None:
        return ELEMENT_PERSONAS
    return ELEMENT_PERSONAS_BY_ROLE[role]


def get_element_persona(identifier: str, role: ElementRole) -> DynamicElementPersona:
    """Retrieve a persona by element name, symbol, or atomic number."""

    cleaned = _normalise_token(identifier)
    if not cleaned:
        raise ValueError("identifier must not be empty")
    try:
        return _PERSONA_LOOKUPS[role][cleaned]
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise KeyError(f"No persona found for {identifier!r} as role {role!r}") from exc


def search_element_personas(
    query: str,
    *,
    role: ElementRole | None = None,
) -> tuple[DynamicElementPersona, ...]:
    """Search personas by keyword substring.

    The search is case-insensitive and operates on the pre-computed keyword
    tokens to keep the matching predictable.
    """

    needle = _normalise_token(query)
    if not needle:
        raise ValueError("query must not be empty")

    haystacks: Iterable[DynamicElementPersona]
    if role is None:
        haystacks = ELEMENT_PERSONAS
    else:
        haystacks = ELEMENT_PERSONAS_BY_ROLE[role]

    results: list[DynamicElementPersona] = []
    seen: Dict[str, None] = {}
    for persona in haystacks:
        if any(needle in keyword for keyword in persona.keywords):
            key = f"{persona.role}:{persona.element}"
            if key not in seen:
                seen[key] = None
                results.append(persona)
    return tuple(results)

