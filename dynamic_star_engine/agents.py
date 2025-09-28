"""Data structures describing synthetic star agents."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, MutableMapping, Sequence

__all__ = ["StarAgent"]


@dataclass(slots=True)
class StarAgent:
    """Container describing a synthetic star persona."""

    identifier: str
    designation: str
    spectral_type: str
    absolute_magnitude: float
    distance_ly: float
    roles: tuple[str, ...] = field(default_factory=tuple)
    temperament: Mapping[str, float] = field(default_factory=dict)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        """Serialise the agent to a JSON-friendly mapping."""

        return {
            "identifier": self.identifier,
            "designation": self.designation,
            "spectral_type": self.spectral_type,
            "absolute_magnitude": self.absolute_magnitude,
            "distance_ly": self.distance_ly,
            "roles": list(self.roles),
            "temperament": dict(self.temperament),
            "tags": list(self.tags),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }

    def with_roles(self, *roles: str) -> "StarAgent":
        """Return a copy with the provided roles merged in."""

        merged_roles = _merge_unique((*self.roles, *roles))
        return StarAgent(
            identifier=self.identifier,
            designation=self.designation,
            spectral_type=self.spectral_type,
            absolute_magnitude=self.absolute_magnitude,
            distance_ly=self.distance_ly,
            roles=merged_roles,
            temperament=self.temperament,
            tags=self.tags,
            metadata=self.metadata,
        )

    def with_tags(self, *tags: str) -> "StarAgent":
        """Return a copy with the provided tags merged in."""

        merged_tags = _merge_unique((*self.tags, *tags))
        return StarAgent(
            identifier=self.identifier,
            designation=self.designation,
            spectral_type=self.spectral_type,
            absolute_magnitude=self.absolute_magnitude,
            distance_ly=self.distance_ly,
            roles=self.roles,
            temperament=self.temperament,
            tags=merged_tags,
            metadata=self.metadata,
        )


def _merge_unique(values: Sequence[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    merged: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            merged.append(cleaned)
    return tuple(merged)
