"""Shared primitives for Dynamic AI core adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Mapping, MutableMapping

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

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        """Return a relative suitability score for ``envelope``."""

    @abstractmethod
    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        """Produce a decision for ``envelope``."""
