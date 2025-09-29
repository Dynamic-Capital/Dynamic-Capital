"""Shared primitives for Dynamic AI core adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, MutableMapping, Tuple

from ..io_bus.schema import TaskEnvelope


@dataclass(slots=True)
class CoreDecision:
    """Decision emitted by a reasoning core."""

    action: str
    confidence: float
    rationale: str

    def as_payload(self) -> MutableMapping[str, float | str]:
        """Return a serialisable representation of the decision."""

        return {
            "action": self.action,
            "confidence": round(self.confidence, 4),
            "rationale": self.rationale,
        }


class BaseCoreAdapter(ABC):
    """Minimal interface shared by all Phase 1 adapters."""

    name: str
    data_zones: Tuple[str, ...]
    privacy: str

    def __init__(
        self,
        name: str,
        *,
        data_zones: Iterable[str] | None = None,
        privacy: str = "standard",
    ) -> None:
        self.name = name
        zones = tuple(zone.lower() for zone in (data_zones or ("global",)))
        self.data_zones = zones or ("global",)
        self.privacy = privacy

    def supports_zone(self, zone: str) -> bool:
        """Return ``True`` when the adapter can operate in ``zone``."""

        zone = zone.lower()
        return zone in self.data_zones or "global" in self.data_zones

    @abstractmethod
    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        """Return a relative suitability score for ``envelope``."""

    @abstractmethod
    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        """Produce a decision for ``envelope``."""
