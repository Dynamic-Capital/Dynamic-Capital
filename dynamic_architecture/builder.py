"""Builder utilities wrapping :class:`DynamicArchitectureEngine`."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from .engine import DynamicArchitectureEngine
from .model import (
    ArchitectureDocument,
    ArchitectureFlow,
    ArchitectureLayer,
    ArchitectureNode,
    _normalise_text,
)

__all__ = ["DynamicArchitectureBuilder", "BuilderPayload"]


@dataclass(slots=True)
class BuilderPayload:
    """Input payload used by :class:`DynamicArchitectureBuilder.apply_payload`."""

    layers: Sequence[ArchitectureLayer | Mapping[str, object]] | None = None
    nodes: Sequence[ArchitectureNode | Mapping[str, object]] | None = None
    flows: Sequence[ArchitectureFlow | Mapping[str, object]] | None = None
    metrics: Mapping[str, float] | None = None
    blueprint: Mapping[str, object] | object | None = None
    layer_map: Mapping[str, str] | None = None
    default_layer: str | None = None


def _as_iterable(value: object | None) -> Iterable[object]:
    if value is None:
        return ()
    if isinstance(value, Mapping):
        return (value,)
    if isinstance(value, (str, bytes)):
        return (value,)
    if isinstance(value, Iterable):  # type: ignore[return-value]
        return value
    return (value,)


def _coerce_layer(payload: ArchitectureLayer | Mapping[str, object]) -> tuple[str, str | None, Sequence[str] | None]:
    if isinstance(payload, ArchitectureLayer):
        return payload.name, payload.intent, payload.focus
    if not isinstance(payload, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("layer payload must be an ArchitectureLayer or mapping")
    return (
        _normalise_text(str(payload.get("name") or "")),
        payload.get("intent"),
        payload.get("focus"),
    )


class DynamicArchitectureBuilder:
    """High level façade simplifying engine orchestration for callers."""

    def __init__(
        self,
        vision: str,
        narrative: str | None = None,
        *,
        engine: DynamicArchitectureEngine | None = None,
    ) -> None:
        self._engine = engine or DynamicArchitectureEngine(vision, narrative)

    @property
    def engine(self) -> DynamicArchitectureEngine:
        return self._engine

    # --------------------------------------------------------------------- setup
    def add_layer(
        self,
        layer: ArchitectureLayer | Mapping[str, object],
    ) -> ArchitectureLayer:
        name, intent, focus = _coerce_layer(layer)
        return self._engine.register_layer(name, intent=intent, focus=focus)

    def add_layers(
        self, layers: Sequence[ArchitectureLayer | Mapping[str, object]] | None
    ) -> tuple[ArchitectureLayer, ...]:
        return tuple(self.add_layer(layer) for layer in _as_iterable(layers))

    def add_node(
        self, node: ArchitectureNode | Mapping[str, object]
    ) -> ArchitectureNode:
        return self._engine.register_node(node)

    def add_nodes(
        self, nodes: Sequence[ArchitectureNode | Mapping[str, object]] | None
    ) -> tuple[ArchitectureNode, ...]:
        return tuple(self.add_node(node) for node in _as_iterable(nodes))

    def add_flow(
        self, flow: ArchitectureFlow | Mapping[str, object]
    ) -> ArchitectureFlow:
        return self._engine.register_flow(flow)

    def add_flows(
        self, flows: Sequence[ArchitectureFlow | Mapping[str, object]] | None
    ) -> tuple[ArchitectureFlow, ...]:
        return tuple(self.add_flow(flow) for flow in _as_iterable(flows))

    def merge_metrics(self, metrics: Mapping[str, float] | None) -> None:
        if metrics:
            self._engine.merge_metrics(metrics)

    def ingest_blueprint(
        self,
        blueprint: Mapping[str, object] | object,
        *,
        layer_map: Mapping[str, str] | None = None,
        default_layer: str | None = None,
    ) -> None:
        if default_layer is None:
            default_layer = "Core Platform"
        self._engine.ingest_blueprint(
            blueprint,
            layer_map=layer_map,
            default_layer=default_layer,
        )

    # ------------------------------------------------------------------ payloads
    def apply_payload(self, payload: Mapping[str, object] | BuilderPayload) -> None:
        """Apply a loosely structured payload to the underlying engine."""

        if isinstance(payload, BuilderPayload):
            mapping: Mapping[str, object] = {
                "layers": payload.layers or (),
                "nodes": payload.nodes or (),
                "flows": payload.flows or (),
                "metrics": payload.metrics or {},
                "blueprint": payload.blueprint,
                "layer_map": payload.layer_map or {},
                "default_layer": payload.default_layer,
            }
        else:
            mapping = payload

        layers = mapping.get("layers")
        if layers is not None:
            self.add_layers(_as_iterable(layers))

        nodes = mapping.get("nodes")
        if nodes is not None:
            self.add_nodes(_as_iterable(nodes))

        flows = mapping.get("flows")
        if flows is not None:
            self.add_flows(_as_iterable(flows))

        metrics = mapping.get("metrics")
        if isinstance(metrics, Mapping):
            self.merge_metrics(metrics)  # type: ignore[arg-type]

        blueprint = mapping.get("blueprint")
        if blueprint is not None:
            layer_map = mapping.get("layer_map")
            default_layer = mapping.get("default_layer")
            self.ingest_blueprint(
                blueprint,
                layer_map=layer_map if isinstance(layer_map, Mapping) else None,
                default_layer=str(default_layer) if default_layer else None,
            )

    # ------------------------------------------------------------------- compile
    def compile(self) -> ArchitectureDocument:
        return self._engine.compile()

    def build(self) -> ArchitectureDocument:
        """Alias for :meth:`compile` to align with builder semantics."""

        return self.compile()

