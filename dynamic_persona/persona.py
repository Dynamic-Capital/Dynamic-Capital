"""Core building blocks for composing dynamic personas.

This module provides small, declarative dataclasses that let other
packages describe the intent, rituals, and success conditions of a
persona.  It keeps the data normalised in tuples so the structures are
hashable and safe to reuse across registries and caches.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Dict, Iterable, Iterator, Mapping, Sequence

__all__ = [
    "PersonaDimension",
    "PersonaProfile",
    "PersonaRegistry",
    "build_persona_profile",
    "register_persona",
    "persona_exists",
    "get_persona",
    "list_personas",
]


def _empty_resources() -> Mapping[str, str]:
    return MappingProxyType({})


@dataclass(frozen=True, slots=True)
class PersonaDimension:
    """Represents a single axis a persona optimises for."""

    name: str
    description: str
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def score(self, emphasis: Mapping[str, float] | None = None) -> float:
        """Return the weighted score for this dimension.

        ``emphasis`` lets callers bias the score by providing additional
        multipliers keyed by tag.  Missing tags default to ``1.0`` so the
        base weight is preserved when no extra context is supplied.
        """

        if not emphasis:
            return self.weight
        modifier = self.weight * emphasis.get(self.name, 1.0)
        for tag in self.tags:
            modifier *= emphasis.get(tag, 1.0)
        return modifier


@dataclass(frozen=True, slots=True)
class PersonaProfile:
    """Fully described persona that downstream clients can orchestrate."""

    identifier: str
    display_name: str
    mission: str
    tone: tuple[str, ...]
    expertise: tuple[str, ...]
    dimensions: tuple[PersonaDimension, ...]
    rituals: tuple[str, ...]
    conversation_starters: tuple[str, ...]
    success_metrics: tuple[str, ...]
    failure_modes: tuple[str, ...]
    resources: Mapping[str, str] = field(default_factory=_empty_resources)

    def summary(self) -> str:
        """Return a human-readable, single line overview."""

        focus = ", ".join(dimension.name for dimension in self.dimensions)
        tone = "/".join(self.tone)
        mission = self.mission.strip()
        return f"{self.display_name}: mission to {mission} — tone {tone} — focus on {focus}"

    def to_dict(self) -> Dict[str, object]:
        """Serialise the persona into plain Python primitives."""

        return {
            "identifier": self.identifier,
            "display_name": self.display_name,
            "mission": self.mission,
            "tone": list(self.tone),
            "expertise": list(self.expertise),
            "dimensions": [
                {
                    "name": dimension.name,
                    "description": dimension.description,
                    "weight": dimension.weight,
                    "tags": list(dimension.tags),
                }
                for dimension in self.dimensions
            ],
            "rituals": list(self.rituals),
            "conversation_starters": list(self.conversation_starters),
            "success_metrics": list(self.success_metrics),
            "failure_modes": list(self.failure_modes),
            "resources": dict(self.resources),
            "summary": self.summary(),
        }


class PersonaRegistry:
    """Registry keeping persona profiles accessible by identifier."""

    def __init__(self) -> None:
        self._profiles: Dict[str, PersonaProfile] = {}

    def register(self, profile: PersonaProfile) -> PersonaProfile:
        """Register ``profile`` and return it for fluent chaining."""

        identifier = profile.identifier
        if identifier in self._profiles:
            raise ValueError(f"Persona '{identifier}' is already registered.")
        self._profiles[identifier] = profile
        return profile

    def get(self, identifier: str) -> PersonaProfile:
        """Return the persona registered under ``identifier``."""

        try:
            return self._profiles[identifier]
        except KeyError as exc:  # pragma: no cover - defensive clarity
            raise KeyError(f"Unknown persona '{identifier}'.") from exc

    def list(self) -> tuple[PersonaProfile, ...]:
        """Return all registered personas in registration order."""

        return tuple(self._profiles.values())

    def contains(self, identifier: str) -> bool:
        """Return ``True`` when ``identifier`` is registered."""

        return identifier in self._profiles


_REGISTRY = PersonaRegistry()


def _iter_strings(values: Sequence[str] | Iterable[str]) -> Iterator[str]:
    if isinstance(values, str):
        values = (values,)
    for value in values:
        text = str(value).strip()
        if text:
            yield text


def _normalise_tuple(values: Sequence[str] | Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    normalised: list[str] = []
    for text in _iter_strings(values):
        if text not in seen:
            seen.add(text)
            normalised.append(text)
    return tuple(normalised)


def _normalise_mapping(resources: Mapping[str, str] | None) -> Mapping[str, str]:
    if not resources:
        return MappingProxyType({})
    cleaned: Dict[str, str] = {}
    for key, value in resources.items():
        key_text = str(key).strip()
        value_text = str(value).strip()
        if not key_text or not value_text:
            continue
        cleaned[key_text] = value_text
    return MappingProxyType(cleaned)


def build_persona_profile(
    *,
    identifier: str,
    display_name: str,
    mission: str,
    tone: Sequence[str],
    expertise: Sequence[str],
    dimensions: Sequence[PersonaDimension],
    rituals: Sequence[str],
    conversation_starters: Sequence[str],
    success_metrics: Sequence[str],
    failure_modes: Sequence[str],
    resources: Mapping[str, str] | None = None,
) -> PersonaProfile:
    """Construct a :class:`PersonaProfile` while normalising inputs."""

    identifier_text = str(identifier).strip()
    if not identifier_text:
        raise ValueError("Persona identifier cannot be empty.")

    display_name_text = str(display_name).strip()
    if not display_name_text:
        raise ValueError("Persona display name cannot be empty.")

    mission_text = str(mission).strip()
    if not mission_text:
        raise ValueError("Persona mission cannot be empty.")

    return PersonaProfile(
        identifier=identifier_text,
        display_name=display_name_text,
        mission=mission_text,
        tone=_normalise_tuple(tone),
        expertise=_normalise_tuple(expertise),
        dimensions=tuple(dimensions),
        rituals=_normalise_tuple(rituals),
        conversation_starters=_normalise_tuple(conversation_starters),
        success_metrics=_normalise_tuple(success_metrics),
        failure_modes=_normalise_tuple(failure_modes),
        resources=_normalise_mapping(resources),
    )


def register_persona(profile: PersonaProfile) -> PersonaProfile:
    """Register ``profile`` in the global registry and return it."""

    if _REGISTRY.contains(profile.identifier):
        existing = _REGISTRY.get(profile.identifier)
        if existing != profile:
            raise ValueError(
                "Persona '{identifier}' already registered with different details.".format(
                    identifier=profile.identifier
                )
            )
        return existing
    return _REGISTRY.register(profile)


def get_persona(identifier: str) -> PersonaProfile:
    """Return a persona from the global registry."""

    return _REGISTRY.get(identifier)


def list_personas() -> tuple[PersonaProfile, ...]:
    """Return all personas from the global registry."""

    return _REGISTRY.list()


def persona_exists(identifier: str) -> bool:
    """Return ``True`` if ``identifier`` is registered in the global registry."""

    return _REGISTRY.contains(identifier)
