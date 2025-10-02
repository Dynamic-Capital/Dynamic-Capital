"""Agent persona orchestrating dynamic architecture compilation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .builder import DynamicArchitectureBuilder
from .helper import DynamicArchitectureHelper
from .model import ArchitectureDocument, _normalise_text

__all__ = ["DynamicArchitectureAgentResult", "DynamicArchitectureAgent"]


@dataclass(slots=True)
class DynamicArchitectureAgentResult:
    """Result payload returned by :class:`DynamicArchitectureAgent`."""

    agent: str
    summary: str
    confidence: float
    document: ArchitectureDocument
    highlights: tuple[str, ...]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "agent": self.agent,
            "summary": self.summary,
            "confidence": round(self.confidence, 4),
            "document": self.document.as_dict(),
            "highlights": list(self.highlights),
            "metrics": dict(self.document.metrics),
        }


class DynamicArchitectureAgent:
    """Lightweight persona returning architecture documents and summaries."""

    name = "dynamic-architecture"

    def __init__(
        self,
        *,
        helper: DynamicArchitectureHelper | None = None,
        builder_cls: type[DynamicArchitectureBuilder] = DynamicArchitectureBuilder,
    ) -> None:
        self._helper = helper or DynamicArchitectureHelper()
        self._builder_cls = builder_cls

    # ------------------------------------------------------------------ lifecycle
    def run(self, payload: Mapping[str, object]) -> DynamicArchitectureAgentResult:
        vision = _normalise_text(str(payload.get("vision") or "Dynamic Architecture"))
        narrative = payload.get("narrative")
        narrative_text = (
            _normalise_text(str(narrative), fallback=vision)
            if narrative is not None
            else vision
        )

        builder = self._builder_cls(vision, narrative_text)
        builder.apply_payload(payload)

        document = builder.compile()
        summary = self._helper.summarise(document)
        highlights = self._helper.highlights(document)
        confidence = self._confidence(document)

        return DynamicArchitectureAgentResult(
            agent=self.name,
            summary=summary,
            confidence=confidence,
            document=document,
            highlights=highlights,
        )

    # ------------------------------------------------------------------- internal
    def _confidence(self, document: ArchitectureDocument) -> float:
        metrics = document.metrics
        node_score = float(metrics.get("node_count", 0.0))
        flow_score = float(metrics.get("flow_count", 0.0))
        layer_score = float(metrics.get("layer_count", 0.0))
        capability_score = float(metrics.get("capability_count", 0.0))

        score = 0.0
        if node_score:
            score += min(0.35, node_score / 20.0)
        if flow_score:
            score += min(0.25, flow_score / max(node_score or 1.0, 1.0))
        if layer_score:
            score += min(0.2, layer_score / 10.0)
        if capability_score:
            score += min(0.2, capability_score / 25.0)

        return round(max(0.1, min(1.0, 0.35 + score)), 4)

