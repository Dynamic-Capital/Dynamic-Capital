"""Core building blocks for composing dynamic personas.

This module provides small, declarative dataclasses that let other
packages describe the intent, rituals, and success conditions of a
persona.  It keeps the data normalised in tuples so the structures are
hashable and safe to reuse across registries and caches.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Mapping, Sequence

__all__ = [
    "PersonaDimension",
    "PersonaProfile",
    "PersonaRegistry",
    "build_persona_profile",
    "register_persona",
    "get_persona",
    "list_personas",
]


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
        modifier = self.weight
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
    resources: Mapping[str, str] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a human-readable, single line overview."""

        focus = ", ".join(dimension.name for dimension in self.dimensions)
        tone = "/".join(self.tone)
        return (
            f"{self.display_name}: mission to {self.mission.lower()} — "
            f"tone {tone} — focus on {focus}"
        )

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

        self._profiles[profile.identifier] = profile
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


_REGISTRY = PersonaRegistry()


def _normalise_tuple(values: Sequence[str] | Iterable[str]) -> tuple[str, ...]:
    return tuple(str(value).strip() for value in values if str(value).strip())


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

    return PersonaProfile(
        identifier=identifier,
        display_name=display_name,
        mission=mission,
        tone=_normalise_tuple(tone),
        expertise=_normalise_tuple(expertise),
        dimensions=tuple(dimensions),
        rituals=_normalise_tuple(rituals),
        conversation_starters=_normalise_tuple(conversation_starters),
        success_metrics=_normalise_tuple(success_metrics),
        failure_modes=_normalise_tuple(failure_modes),
        resources=dict(resources or {}),
    )


def register_persona(profile: PersonaProfile) -> PersonaProfile:
    """Register ``profile`` in the global registry and return it."""

    return _REGISTRY.register(profile)


def get_persona(identifier: str) -> PersonaProfile:
    """Return a persona from the global registry."""

    return _REGISTRY.get(identifier)


def list_personas() -> tuple[PersonaProfile, ...]:
    """Return all personas from the global registry."""

    return _REGISTRY.list()
