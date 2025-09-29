"""Shared normalisation utilities for dynamic memory modules."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Mapping, Sequence

__all__ = [
    "utcnow",
    "clamp",
    "normalise_text",
    "normalise_lower",
    "normalise_optional_text",
    "normalise_tags",
    "coerce_mapping",
]


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(timezone.utc)


def clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` to the inclusive range ``[lower, upper]``."""

    return max(lower, min(upper, value))


def normalise_text(value: str) -> str:
    """Trim whitespace and ensure a non-empty string."""

    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def normalise_lower(value: str, *, default: str = "") -> str:
    """Normalise text to lowercase, returning ``default`` when empty."""

    cleaned = value.strip().lower()
    return cleaned or default


def normalise_optional_text(value: str | None) -> str | None:
    """Return a cleaned string or ``None`` if empty after trimming."""

    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    """Deduplicate and lowercase tags, omitting empty entries."""

    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    """Return a shallow copy of ``mapping`` ensuring mapping semantics."""

    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)

