"""Utilities for synchronising model version numbers and metadata."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp without relying on global state."""

    return datetime.now(timezone.utc)


@dataclass(slots=True, frozen=True)
class VersionNumber:
    """Structured representation of a model version number."""

    major: int = 0
    minor: int = 0
    patch: int = 0
    width: int = 2

    def __post_init__(self) -> None:
        for value, label in ((self.major, "major"), (self.minor, "minor"), (self.patch, "patch")):
            if value < 0:
                raise ValueError(f"{label} version component cannot be negative")
        if self.width < 1:
            raise ValueError("width must be at least 1")

    def format(self) -> str:
        """Render the version number as a zero-padded string."""

        components = [f"{self.major:0{self.width}d}", f"{self.minor:0{self.width}d}"]
        if self.patch:
            components.append(f"{self.patch:0{self.width}d}")
        return ".".join(components)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "major": self.major,
            "minor": self.minor,
            "patch": self.patch,
            "width": self.width,
            "formatted": self.format(),
        }


@dataclass(slots=True, frozen=True)
class ModelVersion:
    """Wrapper containing naming, numbering, and timestamp metadata."""

    name: str
    number: VersionNumber = field(default_factory=VersionNumber)
    build_timestamp: datetime = field(default_factory=_utcnow)
    source: str = "registry"

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("name must not be empty")
        if self.build_timestamp.tzinfo is None:
            object.__setattr__(self, "build_timestamp", self.build_timestamp.replace(tzinfo=timezone.utc))
        else:
            object.__setattr__(self, "build_timestamp", self.build_timestamp.astimezone(timezone.utc))

    @property
    def tag(self) -> str:
        return f"{self.name}-{self.number.format()}"

    def with_source(self, source: str) -> "ModelVersion":
        return ModelVersion(
            name=self.name,
            number=self.number,
            build_timestamp=self.build_timestamp,
            source=source,
        )

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.tag,
            "number": self.number.to_dict(),
            "build_timestamp": self.build_timestamp.isoformat(),
            "source": self.source,
        }
