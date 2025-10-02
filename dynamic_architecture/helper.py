"""Helper utilities for summarising compiled architecture documents."""

from __future__ import annotations

from collections import Counter
from typing import Mapping, Sequence

from .model import ArchitectureDocument, ArchitectureLayer, ArchitectureNode

__all__ = ["DynamicArchitectureHelper"]


def _collect_focus(layers: Sequence[ArchitectureLayer]) -> tuple[str, ...]:
    focus: Counter[str] = Counter()
    for layer in layers:
        for item in layer.focus:
            focus[item.lower()] += 1
    return tuple(item for item, _ in focus.most_common())


def _layer_anchor(layer: ArchitectureLayer) -> str | None:
    if not layer.nodes:
        return None
    anchor = layer.nodes[0]
    return f"{anchor.name} anchors {len(layer.nodes)} node(s)"


class DynamicArchitectureHelper:
    """Produce human-readable summaries of architecture documents."""

    def __init__(self, *, highlight_limit: int = 3) -> None:
        if highlight_limit < 1:
            raise ValueError("highlight_limit must be >= 1")
        self._highlight_limit = highlight_limit

    @property
    def highlight_limit(self) -> int:
        return self._highlight_limit

    # ------------------------------------------------------------------- summary
    def summarise(self, document: ArchitectureDocument) -> str:
        layers = document.layers
        metrics = document.metrics
        layer_count = int(metrics.get("layer_count", len(layers)))
        node_total = int(
            metrics.get(
                "node_count",
                sum(len(layer.nodes) for layer in layers),
            )
        )
        flow_count = int(metrics.get("flow_count", len(document.flows)))
        focus = _collect_focus(layers)
        focus_text = ", ".join(focus[:3]) if focus else "no declared focus"
        return (
            f"{document.vision} organises {node_total} node(s) across "
            f"{layer_count} layer(s) with {flow_count} flow(s); "
            f"primary focus: {focus_text}."
        )

    # ----------------------------------------------------------------- highlights
    def highlights(
        self, document: ArchitectureDocument, *, limit: int | None = None
    ) -> tuple[str, ...]:
        target = limit or self._highlight_limit
        anchors = [
            text
            for layer in document.layers
            if (text := _layer_anchor(layer))
        ]
        flow_highlights = [
            f"{flow.source}→{flow.target} via {flow.medium}" for flow in document.flows
        ]
        metrics = document.metrics
        metric_items = [
            f"{key.replace('_', ' ').title()}: {value:.2f}"
            for key, value in sorted(metrics.items())
        ]
        highlights = anchors + flow_highlights + metric_items
        return tuple(highlights[:target])

    # ------------------------------------------------------------------- payloads
    def digest(self, document: ArchitectureDocument) -> Mapping[str, object]:
        """Return a dict representation suited for conversational agents."""

        return {
            "vision": document.vision,
            "narrative": document.narrative,
            "summary": self.summarise(document),
            "highlights": list(self.highlights(document)),
            "metrics": dict(document.metrics),
            "layers": [self._layer_payload(layer) for layer in document.layers],
        }

    # ------------------------------------------------------------------- internal
    def _layer_payload(self, layer: ArchitectureLayer) -> Mapping[str, object]:
        return {
            "name": layer.name,
            "intent": layer.intent,
            "focus": list(layer.focus),
            "nodes": [self._node_payload(node) for node in layer.nodes],
        }

    def _node_payload(self, node: ArchitectureNode) -> Mapping[str, object]:
        return {
            "name": node.name,
            "description": node.description,
            "capabilities": list(node.capabilities),
            "dependencies": list(node.dependencies),
            "tags": list(node.tags),
        }

