"""Dynamic node orchestration utilities.

The dynamic node scheduler keeps track of heterogeneous automation nodes –
ingestion feeds, AI processing lobes, policy engines, and community dispatches.
Each node advertises its upstream ``dependencies`` and downstream ``outputs``.

This module mirrors the Supabase ``node_configs`` schema so research notebooks
and tests can reason about execution order without requiring the database.  The
registry performs three core duties:

1. Normalise and validate node configuration payloads.
2. Track lightweight runtime metadata such as the last execution timestamp and
   status.
3. Resolve a dependency-aware execution plan for the nodes that are due to run.

Example usage::

    registry = DynamicNodeRegistry([
        {"node_id": "market-data", "type": "ingestion", "interval_sec": 60,
         "outputs": ["ticks"]},
        {"node_id": "fusion", "type": "processing", "interval_sec": 120,
         "dependencies": ["ticks"], "outputs": ["signals"], "weight": 0.8},
    ])

    ready = registry.resolve_ready_nodes()
    # -> [DynamicNode(node_id='market-data'), DynamicNode(node_id='fusion')]

The registry raises :class:`NodeDependencyError` if a cycle or unsatisfied
dependency is detected so schedulers can surface the configuration issue.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, Iterator, List, Mapping, MutableMapping, Optional, Sequence, Tuple

NodeType = str

VALID_NODE_TYPES: tuple[NodeType, ...] = ("ingestion", "processing", "policy", "community")


class DynamicNodeError(RuntimeError):
    """Base exception for dynamic node orchestration errors."""


class NodeConfigError(DynamicNodeError):
    """Raised when an invalid configuration payload is supplied."""


class NodeDependencyError(DynamicNodeError):
    """Raised when dependencies cannot be resolved (missing or cyclical)."""


def _normalise_identifier(value: str) -> str:
    normalised = str(value).strip()
    if not normalised:
        raise NodeConfigError("Identifier values cannot be empty")
    return normalised


def _normalise_collection(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in values:
        item = str(raw).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        normalised.append(item)
    return tuple(normalised)


def _ensure_mapping(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise NodeConfigError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class DynamicNode:
    """Container for a single dynamic node configuration and runtime state."""

    node_id: str
    type: NodeType
    interval_sec: int
    enabled: bool = True
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    outputs: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)
    weight: float | None = None

    # Runtime telemetry (mutable fields managed by the registry)
    last_run_at: datetime | None = None
    last_status: str = "idle"
    last_error: str | None = None
    last_outputs: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.node_id = _normalise_identifier(self.node_id)

        node_type = str(self.type).strip().lower()
        if node_type not in VALID_NODE_TYPES:
            raise NodeConfigError(
                f"Unsupported node type '{self.type}'. Expected one of {VALID_NODE_TYPES}."
            )
        self.type = node_type

        if self.interval_sec <= 0:
            raise NodeConfigError("interval_sec must be a positive integer")
        self.interval_sec = int(self.interval_sec)

        self.dependencies = _normalise_collection(self.dependencies)
        self.outputs = _normalise_collection(self.outputs)
        self.metadata = _ensure_mapping(self.metadata)

        if self.weight is not None:
            try:
                self.weight = float(self.weight)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
                raise NodeConfigError("weight must be numeric") from exc

    # ------------------------------------------------------------------ runtime
    def is_due(self, *, now: Optional[datetime] = None) -> bool:
        """Return ``True`` when the node should be scheduled for execution."""

        if not self.enabled:
            return False
        if self.last_run_at is None:
            return True

        current_time = now or datetime.now(timezone.utc)
        next_due = self.last_run_at + timedelta(seconds=self.interval_sec)
        return current_time >= next_due

    def mark_run(
        self,
        *,
        completed_at: Optional[datetime] = None,
        status: str = "success",
        error: str | None = None,
        outputs: Optional[Iterable[str]] = None,
    ) -> None:
        """Update the runtime telemetry after an execution attempt."""

        timestamp = completed_at or datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        self.last_run_at = timestamp
        self.last_status = status
        self.last_error = error

        if outputs is not None:
            self.last_outputs = _normalise_collection(outputs)


class DynamicNodeRegistry:
    """Manage a collection of :class:`DynamicNode` instances."""

    def __init__(self, nodes: Optional[Iterable[DynamicNode | Mapping[str, object]]] = None) -> None:
        self._nodes: Dict[str, DynamicNode] = {}
        if nodes:
            for node in nodes:
                self.register(node)

    # ----------------------------------------------------------------- mutation
    def register(self, node: DynamicNode | Mapping[str, object]) -> DynamicNode:
        """Register ``node`` and return the normalised :class:`DynamicNode`."""

        if isinstance(node, Mapping):
            dynamic_node = DynamicNode(**node)  # type: ignore[arg-type]
        elif isinstance(node, DynamicNode):
            dynamic_node = node
        else:  # pragma: no cover - defensive guardrail
            raise NodeConfigError("node must be a mapping or DynamicNode instance")

        self._nodes[dynamic_node.node_id] = dynamic_node
        return dynamic_node

    def remove(self, node_id: str) -> bool:
        """Remove ``node_id`` from the registry. Returns ``True`` if removed."""

        return self._nodes.pop(node_id, None) is not None

    # ------------------------------------------------------------------- lookup
    def get(self, node_id: str) -> DynamicNode:
        try:
            return self._nodes[node_id]
        except KeyError as exc:  # pragma: no cover - defensive
            raise NodeConfigError(f"Node '{node_id}' not registered") from exc

    def __contains__(self, node_id: object) -> bool:  # pragma: no cover - trivial
        return node_id in self._nodes

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._nodes)

    def __iter__(self) -> Iterator[DynamicNode]:  # pragma: no cover - trivial
        return iter(self._nodes.values())

    # ------------------------------------------------------------- plan/schedule
    def resolve_ready_nodes(
        self,
        *,
        available_outputs: Optional[Iterable[str]] = None,
        now: Optional[datetime] = None,
    ) -> List[DynamicNode]:
        """Return nodes that are due to run ordered by dependency and weight.

        The algorithm performs a dependency-aware topological sort using
        ``available_outputs`` as the initial pool of satisfied dependencies.  A
        :class:`NodeDependencyError` is raised when a cycle or unsatisfied
        dependency prevents progress.
        """

        satisfied = set(_normalise_collection(available_outputs or ()))
        produced_by_registry = {
            output
            for node in self._nodes.values()
            for output in node.outputs
        }
        pending: Dict[str, DynamicNode] = {
            node_id: node
            for node_id, node in self._nodes.items()
            if node.is_due(now=now)
        }

        ordered: List[DynamicNode] = []

        while pending:
            ready_batch = [
                node
                for node in pending.values()
                if set(node.dependencies).issubset(satisfied)
            ]

            if not ready_batch:
                unresolved = {
                    node_id: tuple(dep for dep in node.dependencies if dep not in satisfied)
                    for node_id, node in pending.items()
                }

                produced_by_pending = {
                    output
                    for node in pending.values()
                    for output in node.outputs
                }

                missing_providers = {
                    node_id: tuple(
                        dep
                        for dep in deps
                        if dep not in produced_by_registry and dep not in satisfied
                    )
                    for node_id, deps in unresolved.items()
                    if any(dep not in produced_by_registry and dep not in satisfied for dep in deps)
                }
                if missing_providers:
                    raise NodeDependencyError(
                        "Missing providers for dependencies: "
                        + ", ".join(f"{node_id} -> {deps}" for node_id, deps in missing_providers.items())
                    )

                cyclical_nodes = [
                    node_id
                    for node_id, deps in unresolved.items()
                    if deps and all(dep in produced_by_pending for dep in deps)
                ]
                if cyclical_nodes:
                    raise NodeDependencyError(
                        "Cyclical dependencies detected for nodes: " + ", ".join(cyclical_nodes)
                    )

                break

            ready_batch.sort(
                key=lambda node: (
                    -(node.weight if node.weight is not None else 0.0),
                    node.interval_sec,
                    node.node_id,
                )
            )

            for node in ready_batch:
                ordered.append(node)
                satisfied.update(node.outputs)
                pending.pop(node.node_id, None)

        return ordered

    # ------------------------------------------------------------- runtime state
    def record_result(
        self,
        node_id: str,
        *,
        completed_at: Optional[datetime] = None,
        status: str = "success",
        error: str | None = None,
        outputs: Optional[Iterable[str]] = None,
    ) -> DynamicNode:
        """Update runtime telemetry for ``node_id`` and return the node."""

        node = self.get(node_id)
        node.mark_run(completed_at=completed_at, status=status, error=error, outputs=outputs)
        return node

    def snapshot(self) -> Tuple[DynamicNode, ...]:
        """Return an immutable snapshot of the registered nodes."""

        return tuple(self._nodes.values())


__all__ = [
    "DynamicNode",
    "DynamicNodeRegistry",
    "DynamicNodeError",
    "NodeConfigError",
    "NodeDependencyError",
]

