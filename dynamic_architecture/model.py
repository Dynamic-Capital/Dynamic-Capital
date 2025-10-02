"""Core data structures powering Dynamic Architecture planning."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence

__all__ = [
    "ArchitectureNode",
    "ArchitectureLayer",
    "ArchitectureFlow",
    "ArchitectureDocument",
]


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    """Return trimmed text or raise when empty.

    Parameters
    ----------
    value:
        Candidate value provided by callers. When ``None`` or an empty string the
        function falls back to ``fallback``.  The fallback is also stripped of
        surrounding whitespace before being returned.
    fallback:
        Optional value used when ``value`` does not contain non-whitespace
        characters.  When both ``value`` and ``fallback`` are empty a
        ``ValueError`` is raised to keep downstream dataclasses well defined.
    """

    text = (value or "").strip()
    if text:
        # Normalise consecutive whitespace to a single space without touching
        # intentional line breaks that may carry semantic weight in docs.
        return " ".join(text.split())
    if fallback is not None:
        fallback_text = (fallback or "").strip()
        if fallback_text:
            return " ".join(fallback_text.split())
    raise ValueError("text value must not be empty")


def _normalise_tuple(values: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in values:
        candidate = " ".join(item.split()).strip()
        if not candidate:
            continue
        candidate = candidate.lower() if lower else candidate
        if candidate not in seen:
            seen.add(candidate)
            normalised.append(candidate)
    return tuple(normalised)


@dataclass(slots=True)
class ArchitectureNode:
    """Represents a deployable capability inside the architecture."""

    name: str
    description: str
    layer: str
    capabilities: tuple[str, ...] = field(default_factory=tuple)
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.description = _normalise_text(self.description, fallback=self.name)
        self.layer = _normalise_text(self.layer)
        self.capabilities = _normalise_tuple(self.capabilities)
        self.dependencies = _normalise_tuple(self.dependencies)
        self.tags = _normalise_tuple(self.tags, lower=True)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "layer": self.layer,
            "capabilities": list(self.capabilities),
            "dependencies": list(self.dependencies),
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class ArchitectureLayer:
    """Grouping of related nodes within a strategic layer."""

    name: str
    intent: str
    focus: tuple[str, ...]
    nodes: tuple[ArchitectureNode, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.intent = _normalise_text(self.intent, fallback=self.name)
        self.focus = _normalise_tuple(self.focus, lower=True)
        # Nodes are validated by :class:`ArchitectureNode` already but enforcing a
        # tuple guarantees immutability when exposed via ``as_dict``.
        self.nodes = tuple(self.nodes)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "intent": self.intent,
            "focus": list(self.focus),
            "nodes": [node.as_dict() for node in self.nodes],
        }


@dataclass(slots=True)
class ArchitectureFlow:
    """Directed relationship connecting two nodes."""

    source: str
    target: str
    intent: str
    medium: str
    cadence: str

    def __post_init__(self) -> None:
        self.source = _normalise_text(self.source)
        self.target = _normalise_text(self.target)
        self.intent = _normalise_text(self.intent, fallback="integration")
        self.medium = _normalise_text(self.medium, fallback="api")
        self.cadence = _normalise_text(self.cadence, fallback="event-driven")

    def as_dict(self) -> Mapping[str, object]:
        return {
            "source": self.source,
            "target": self.target,
            "intent": self.intent,
            "medium": self.medium,
            "cadence": self.cadence,
        }


@dataclass(slots=True)
class ArchitectureDocument:
    """Immutable representation of the composed architecture."""

    vision: str
    narrative: str
    layers: tuple[ArchitectureLayer, ...]
    flows: tuple[ArchitectureFlow, ...]
    metrics: Mapping[str, float]

    def __post_init__(self) -> None:
        self.vision = _normalise_text(self.vision)
        self.narrative = _normalise_text(self.narrative, fallback=self.vision)
        self.layers = tuple(self.layers)
        self.flows = tuple(self.flows)
        self.metrics = dict(self.metrics)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "vision": self.vision,
            "narrative": self.narrative,
            "layers": [layer.as_dict() for layer in self.layers],
            "flows": [flow.as_dict() for flow in self.flows],
            "metrics": dict(self.metrics),
        }

    def to_markdown(self) -> str:
        """Render the document into a concise Markdown report."""

        lines: list[str] = [f"# {self.vision}", ""]
        if self.narrative:
            lines.append(self.narrative)
            lines.append("")

        if self.metrics:
            lines.append("## Metrics")
            for key, value in sorted(self.metrics.items()):
                lines.append(f"- **{key.replace('_', ' ').title()}**: {value:.2f}")
            lines.append("")

        for layer in self.layers:
            lines.append(f"## {layer.name}")
            lines.append(layer.intent)
            if layer.focus:
                focus_text = ", ".join(layer.focus)
                lines.append(f"_Focus_: {focus_text}")
            lines.append("")
            for node in layer.nodes:
                lines.append(f"- **{node.name}** — {node.description}")
                if node.capabilities:
                    caps = ", ".join(node.capabilities)
                    lines.append(f"  - Capabilities: {caps}")
                if node.dependencies:
                    deps = ", ".join(node.dependencies)
                    lines.append(f"  - Depends on: {deps}")
                if node.tags:
                    tags = ", ".join(node.tags)
                    lines.append(f"  - Tags: {tags}")
            lines.append("")

        if self.flows:
            lines.append("## Flows")
            for flow in self.flows:
                lines.append(
                    f"- {flow.source} → {flow.target} ({flow.intent}; {flow.medium}; {flow.cadence})"
                )

        return "\n".join(lines).strip()
