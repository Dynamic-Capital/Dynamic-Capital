"""Agent, builder, and helper utilities for dynamic hierarchies."""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Mapping, MutableMapping, Sequence
from dataclasses import dataclass

from .engine import HierarchyBlueprint, HierarchyEngine
from .hierarchy import DynamicHierarchy

__all__ = [
    "HierarchyAgent",
    "HierarchyBuilder",
    "HierarchyHelperBot",
]


@dataclass(slots=True)
class _BuilderNode:
    key: str
    title: str
    parent: str | None
    description: str
    weight: float
    tags: tuple[str, ...]
    metadata: Mapping[str, object] | None


class HierarchyBuilder:
    """Incremental builder for hierarchy nodes."""

    def __init__(self, *, engine: HierarchyEngine | None = None) -> None:
        self.engine = engine or HierarchyEngine()
        self._nodes: dict[str, _BuilderNode] = {}
        # ``_order`` keeps track of the chronological staging sequence. We still
        # re-order nodes by dependency when emitting them, but keeping the
        # original order makes the output deterministic when dependencies are
        # satisfied (for example siblings under the same parent).
        self._order: list[str] = []

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._nodes)

    def add_node(
        self,
        *,
        key: str,
        title: str,
        parent: str | None = None,
        description: str = "",
        weight: float = 1.0,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        key = key.strip()
        if not key:
            raise ValueError("key must not be empty")
        key_lower = key.lower()
        if key_lower in self._nodes:
            raise KeyError(f"node '{key_lower}' already staged")

        if parent is not None:
            parent_key = parent.strip().lower()
            if not parent_key:
                raise ValueError("parent must not be empty when provided")
        else:
            parent_key = None

        staged = _BuilderNode(
            key=key_lower,
            title=title,
            parent=parent_key,
            description=description,
            weight=float(weight),
            tags=tuple(tags or ()),
            metadata=dict(metadata) if metadata is not None else None,
        )
        self._nodes[key_lower] = staged
        self._order.append(key_lower)

    def clear(self) -> None:
        """Remove all staged nodes."""

        self._nodes.clear()
        self._order.clear()

    # ------------------------------------------------------------------
    # ordering helpers

    def _ordered_keys(self, *, allow_external_parents: bool) -> tuple[str, ...]:
        """Return staged keys sorted so parents precede children.

        ``allow_external_parents`` controls whether references to nodes outside
        the staged set (for example nodes that already exist in the managed
        hierarchy) are treated as valid. When ``False`` the method raises a
        :class:`KeyError` if a staged node refers to a missing parent, which is
        used by :meth:`to_blueprints` to guarantee a self-contained tree.
        """

        resolved: set[str] = set()
        visiting: set[str] = set()
        ordered: list[str] = []

        def visit(key: str) -> None:
            if key in resolved:
                return
            if key in visiting:
                raise RuntimeError("detected cycle in staged nodes")
            visiting.add(key)
            node = self._nodes[key]
            if node.parent is not None:
                if node.parent in self._nodes:
                    visit(node.parent)
                elif not allow_external_parents:
                    raise KeyError(
                        f"parent '{node.parent}' must be staged before emitting blueprints"
                    )
                elif self.engine.hierarchy.get(node.parent) is None:
                    raise KeyError(
                        f"parent '{node.parent}' must exist in the current hierarchy before committing"
                    )
            ordered.append(key)
            visiting.remove(key)
            resolved.add(key)

        for key in self._order:
            visit(key)

        return tuple(ordered)

    def iter_pending_nodes(self) -> Iterator[MutableMapping[str, object]]:
        """Yield staged nodes as mapping objects."""

        for key in self._ordered_keys(allow_external_parents=True):
            node = self._nodes[key]
            payload: MutableMapping[str, object] = {
                "key": node.key,
                "title": node.title,
                "parent": node.parent,
                "description": node.description,
                "weight": node.weight,
                "tags": node.tags,
            }
            if node.metadata is not None:
                payload["metadata"] = dict(node.metadata)
            yield payload

    def can_emit_blueprints(self) -> bool:
        """Return ``True`` if all staged parents are also staged."""

        try:
            self._ordered_keys(allow_external_parents=False)
        except KeyError:
            return False
        return True

    def to_blueprints(self) -> tuple[HierarchyBlueprint, ...]:
        """Convert staged nodes into hierarchical blueprints."""

        try:
            ordered_keys = self._ordered_keys(allow_external_parents=False)
        except KeyError as exc:
            raise KeyError(str(exc)) from exc

        children: dict[str, list[str]] = {key: [] for key in ordered_keys}
        for key in ordered_keys:
            node = self._nodes[key]
            if node.parent is not None:
                children.setdefault(node.parent, []).append(node.key)

        def build_node(key: str) -> HierarchyBlueprint:
            node = self._nodes[key]
            nested = tuple(build_node(child) for child in children.get(key, ()))
            return HierarchyBlueprint(
                key=node.key,
                title=node.title,
                description=node.description,
                weight=node.weight,
                tags=node.tags,
                metadata=node.metadata,
                children=nested,
            )

        roots = [key for key in ordered_keys if self._nodes[key].parent is None]
        return tuple(build_node(key) for key in roots)

    def build(self) -> DynamicHierarchy:
        """Build a new hierarchy from staged nodes."""

        blueprints = self.to_blueprints()
        if len(blueprints) == 1:
            payload: HierarchyBlueprint | Iterable[HierarchyBlueprint] = blueprints[0]
        else:
            payload = blueprints
        hierarchy = self.engine.build(payload)
        return hierarchy


class HierarchyAgent:
    """High-level orchestrator for managing hierarchies."""

    def __init__(
        self,
        *,
        engine: HierarchyEngine | None = None,
        builder: HierarchyBuilder | None = None,
    ) -> None:
        self.engine = engine or HierarchyEngine()
        self.builder = builder or HierarchyBuilder(engine=self.engine)
        self.builder.engine = self.engine

    def reset(self) -> None:
        """Reset the managed hierarchy to an empty state."""

        self.engine.hierarchy = DynamicHierarchy()
        self.builder.clear()

    def stage_node(
        self,
        *,
        key: str,
        title: str,
        parent: str | None = None,
        description: str = "",
        weight: float = 1.0,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        """Stage a node for the next commit."""

        self.builder.add_node(
            key=key,
            title=title,
            parent=parent,
            description=description,
            weight=weight,
            tags=tags,
            metadata=metadata,
        )

    def commit(self, *, reset_builder: bool = True) -> DynamicHierarchy:
        """Apply staged nodes to the managed hierarchy."""

        pending = tuple(self.builder.iter_pending_nodes())
        if not pending:
            return self.engine.hierarchy

        hierarchy = self.engine.hierarchy
        if len(hierarchy) == 0 and self.builder.can_emit_blueprints():
            hierarchy = self.builder.build()
        else:
            for node in pending:
                hierarchy.add_node(node)
        if reset_builder:
            self.builder.clear()
        return hierarchy

    def describe(self) -> MutableMapping[str, object]:
        """Return a descriptive summary of the hierarchy."""

        return self.engine.describe()

    def helper(self) -> "HierarchyHelperBot":
        """Return a helper bot bound to the agent."""

        return HierarchyHelperBot(agent=self)


class HierarchyHelperBot:
    """Lightweight helper that produces textual summaries of hierarchies."""

    def __init__(self, *, agent: HierarchyAgent) -> None:
        self.agent = agent

    def describe_node(self, key: str) -> str:
        """Return a human readable description for ``key``."""

        hierarchy = self.agent.engine.hierarchy
        node = hierarchy.get(key)
        if node is None:
            raise KeyError(f"node '{key}' does not exist")

        ancestors = list(hierarchy.ancestors(node.key))
        path_titles = [ancestor.title for ancestor in reversed(ancestors)] + [node.title]
        path = " > ".join(path_titles)
        tag_text = ", ".join(node.tags) if node.tags else "no tags"
        description = node.description or "No description provided."
        return (
            f"{node.title} ({node.key})\n"
            f"Path: {path}\n"
            f"Tags: {tag_text}\n"
            f"Details: {description}"
        )

    def list_branches(self) -> MutableMapping[str, tuple[str, ...]]:
        """Return a mapping of root keys to their descendant keys."""

        hierarchy = self.agent.engine.hierarchy
        branches: MutableMapping[str, tuple[str, ...]] = {}
        for root in hierarchy.roots():
            branches[root.key] = hierarchy.descendants(root.key)
        return branches

    def outline(self) -> str:
        """Return a bullet-point outline of the hierarchy."""

        hierarchy = self.agent.engine.hierarchy
        lines: list[str] = []

        def visit(current_key: str, depth: int) -> None:
            node = hierarchy.get(current_key)
            if node is None:  # pragma: no cover - defensive
                return
            indent = "  " * depth
            lines.append(f"{indent}- {node.title} ({current_key})")
            for child in hierarchy.children(current_key):
                visit(child.key, depth + 1)

        for root in hierarchy.roots():
            visit(root.key, 0)
        return "\n".join(lines)
