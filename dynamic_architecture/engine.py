"""Dynamic Architecture engine for orchestrating layered system maps."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from .model import (
    ArchitectureDocument,
    ArchitectureFlow,
    ArchitectureLayer,
    ArchitectureNode,
    _normalise_text,
    _normalise_tuple,
)

__all__ = ["DynamicArchitectureEngine"]


@dataclass(slots=True)
class _LayerDescriptor:
    intent: str
    focus: tuple[str, ...]


def _coerce_node(payload: ArchitectureNode | Mapping[str, object]) -> ArchitectureNode:
    if isinstance(payload, ArchitectureNode):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("node payload must be an ArchitectureNode or mapping")
    data = dict(payload)
    name = _normalise_text(str(data.get("name") or data.get("id") or ""))
    layer = _normalise_text(
        str(
            data.get("layer")
            or data.get("domain")
            or data.get("tier")
            or data.get("zone")
            or "Core Platform"
        )
    )
    description = _normalise_text(str(data.get("description") or data.get("summary") or ""), fallback=name)
    capabilities = _normalise_tuple(data.get("capabilities") or data.get("interfaces"))
    dependencies = _normalise_tuple(data.get("dependencies"))
    tags = _normalise_tuple(data.get("tags"), lower=True)
    return ArchitectureNode(
        name=name,
        description=description,
        layer=layer,
        capabilities=capabilities,
        dependencies=dependencies,
        tags=tags,
    )


def _coerce_flow(payload: ArchitectureFlow | Mapping[str, object]) -> ArchitectureFlow:
    if isinstance(payload, ArchitectureFlow):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("flow payload must be an ArchitectureFlow or mapping")
    data = dict(payload)
    source = _normalise_text(str(data.get("source") or data.get("from") or ""))
    target = _normalise_text(str(data.get("target") or data.get("to") or ""))
    intent = _normalise_text(str(data.get("intent") or data.get("purpose") or "integration"), fallback="integration")
    medium = _normalise_text(str(data.get("medium") or data.get("channel") or "api"), fallback="api")
    cadence = _normalise_text(str(data.get("cadence") or data.get("frequency") or "event-driven"), fallback="event-driven")
    return ArchitectureFlow(
        source=source,
        target=target,
        intent=intent,
        medium=medium,
        cadence=cadence,
    )


class DynamicArchitectureEngine:
    """Compose architecture layers from heterogeneous component sources."""

    def __init__(self, vision: str, narrative: str | None = None) -> None:
        self._vision = _normalise_text(vision)
        self._narrative = _normalise_text(narrative, fallback=self._vision)
        self._layers: MutableMapping[str, _LayerDescriptor] = {}
        self._nodes: MutableMapping[str, ArchitectureNode] = {}
        self._flows: list[ArchitectureFlow] = []
        self._metrics: MutableMapping[str, float] = {}

    # ------------------------------------------------------------------ registry
    def register_layer(
        self,
        name: str,
        *,
        intent: str | None = None,
        focus: Sequence[str] | None = None,
    ) -> ArchitectureLayer:
        normalised_name = _normalise_text(name)
        focus_tuple = _normalise_tuple(focus)
        descriptor = _LayerDescriptor(
            intent=_normalise_text(intent, fallback=normalised_name),
            focus=focus_tuple,
        )
        self._layers[normalised_name] = descriptor
        return ArchitectureLayer(
            name=normalised_name,
            intent=descriptor.intent,
            focus=descriptor.focus,
        )

    def register_node(
        self, node: ArchitectureNode | Mapping[str, object]
    ) -> ArchitectureNode:
        resolved = _coerce_node(node)
        layer_name = resolved.layer
        if layer_name not in self._layers:
            self.register_layer(layer_name, intent=f"{layer_name} capabilities")
        self._nodes[resolved.name] = resolved
        return resolved

    def register_nodes(
        self, nodes: Iterable[ArchitectureNode | Mapping[str, object]]
    ) -> tuple[ArchitectureNode, ...]:
        return tuple(self.register_node(node) for node in nodes)

    def register_flow(
        self, flow: ArchitectureFlow | Mapping[str, object]
    ) -> ArchitectureFlow:
        resolved = _coerce_flow(flow)
        if resolved.source not in self._nodes or resolved.target not in self._nodes:
            # Lazy nodes ensure diagrams can be partially defined before ingesting
            # the concrete components.  The placeholder description is replaced on
            # subsequent registration.
            if resolved.source not in self._nodes:
                self.register_node(
                    {
                        "name": resolved.source,
                        "description": f"Placeholder for {resolved.source}",
                        "layer": "Integration",
                    }
                )
            if resolved.target not in self._nodes:
                self.register_node(
                    {
                        "name": resolved.target,
                        "description": f"Placeholder for {resolved.target}",
                        "layer": "Integration",
                    }
                )
        self._flows.append(resolved)
        return resolved

    def register_flows(
        self, flows: Iterable[ArchitectureFlow | Mapping[str, object]]
    ) -> tuple[ArchitectureFlow, ...]:
        return tuple(self.register_flow(flow) for flow in flows)

    def merge_metrics(self, metrics: Mapping[str, float]) -> None:
        for key, value in metrics.items():
            try:
                self._metrics[_normalise_text(str(key)).lower().replace(" ", "_")] = float(value)
            except (TypeError, ValueError):
                continue

    # ----------------------------------------------------------------- ingestion
    def ingest_blueprint(
        self,
        blueprint: Mapping[str, object] | object,
        *,
        layer_map: Mapping[str, str] | None = None,
        default_layer: str = "Core Platform",
    ) -> None:
        """Convert a Dynamic Architect blueprint into layered architecture nodes."""

        components = self._extract_components(blueprint)
        metrics = self._extract_metrics(blueprint)
        if metrics:
            self.merge_metrics(metrics)
        layer_lookup: dict[str, str] = {}
        if layer_map:
            layer_lookup = {key.lower(): value for key, value in layer_map.items()}

        for component in components:
            component_layer = self._resolve_layer(component, layer_lookup, default_layer)
            node_payload = {
                "name": component.get("name"),
                "description": component.get("description"),
                "layer": component_layer,
                "capabilities": component.get("interfaces", ()),
                "dependencies": component.get("dependencies", ()),
                "tags": component.get("tags", ()),
            }
            node = self.register_node(node_payload)
            for dependency in node.dependencies:
                self.register_flow(
                    {
                        "source": dependency,
                        "target": node.name,
                        "intent": "dependency",
                        "medium": "internal",
                        "cadence": "run-time",
                    }
                )

    def _resolve_layer(
        self,
        component: Mapping[str, object],
        layer_lookup: Mapping[str, str],
        default_layer: str,
    ) -> str:
        tags = tuple(str(tag).lower() for tag in component.get("tags", ()) if str(tag).strip())
        for tag in tags:
            if tag in layer_lookup:
                return layer_lookup[tag]
        interfaces = tuple(
            str(interface).lower() for interface in component.get("interfaces", ()) if str(interface).strip()
        )
        for interface in interfaces:
            if interface in layer_lookup:
                return layer_lookup[interface]
        return default_layer

    def _extract_components(
        self,
        blueprint: Mapping[str, object] | object,
    ) -> tuple[Mapping[str, object], ...]:
        if hasattr(blueprint, "components"):
            raw_components = getattr(blueprint, "components")
        elif isinstance(blueprint, Mapping):
            raw_components = blueprint.get("components")
        else:
            raw_components = None
        if not raw_components:
            return ()
        components: list[Mapping[str, object]] = []
        for component in raw_components:
            if isinstance(component, Mapping):
                components.append(component)
                continue
            attributes = {key: getattr(component, key) for key in dir(component) if not key.startswith("_")}
            # Filter to known fields
            filtered = {
                key: value
                for key, value in attributes.items()
                if key in {"name", "description", "dependencies", "interfaces", "tags"}
            }
            components.append(filtered)
        return tuple(components)

    def _extract_metrics(
        self,
        blueprint: Mapping[str, object] | object,
    ) -> Mapping[str, float]:
        if hasattr(blueprint, "metrics"):
            metrics = getattr(blueprint, "metrics")
            if isinstance(metrics, Mapping):
                return metrics
        if isinstance(blueprint, Mapping):
            metrics = blueprint.get("metrics")
            if isinstance(metrics, Mapping):
                return metrics
        return {}

    # ------------------------------------------------------------------- compile
    def compile(self) -> ArchitectureDocument:
        layer_to_nodes: MutableMapping[str, list[ArchitectureNode]] = {
            name: [] for name in self._layers
        }
        for node in self._nodes.values():
            layer_to_nodes.setdefault(node.layer, []).append(node)
        ordered_layers: list[ArchitectureLayer] = []
        for layer_name, descriptor in self._layers.items():
            nodes = tuple(layer_to_nodes.get(layer_name, ()))
            ordered_layers.append(
                ArchitectureLayer(
                    name=layer_name,
                    intent=descriptor.intent,
                    focus=descriptor.focus,
                    nodes=nodes,
                )
            )
        # Include layers discovered purely through nodes
        for layer_name, nodes in layer_to_nodes.items():
            if layer_name not in self._layers:
                ordered_layers.append(
                    ArchitectureLayer(
                        name=layer_name,
                        intent=f"{layer_name} capabilities",
                        focus=(),
                        nodes=tuple(nodes),
                    )
                )
        unique_flows: list[ArchitectureFlow] = []
        seen_flow_keys: set[tuple[str, str, str, str, str]] = set()
        for flow in self._flows:
            key = (flow.source, flow.target, flow.intent, flow.medium, flow.cadence)
            if key in seen_flow_keys:
                continue
            seen_flow_keys.add(key)
            unique_flows.append(flow)
        metrics = {
            "layer_count": float(len(ordered_layers)),
            "node_count": float(len(self._nodes)),
            "flow_count": float(len(unique_flows)),
        }
        capabilities = {
            capability
            for node in self._nodes.values()
            for capability in node.capabilities
        }
        if capabilities:
            metrics["capability_count"] = float(len(capabilities))
        metrics.update(self._metrics)
        return ArchitectureDocument(
            vision=self._vision,
            narrative=self._narrative,
            layers=tuple(ordered_layers),
            flows=tuple(unique_flows),
            metrics=metrics,
        )
