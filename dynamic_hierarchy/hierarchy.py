"""Tools for modelling dynamic hierarchical structures.

The module provides dataclasses and management helpers that make it easy to
construct, mutate, and introspect hierarchical trees while preserving
structural integrity. Hierarchies are a common pattern across Dynamic Capital
projects, powering everything from strategy decomposition to UI navigation
models. This implementation focuses on ergonomics (clear typing, immutable
snapshots) and safety (cycle detection, normalised identifiers).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicHierarchy",
    "HierarchyNode",
    "HierarchySnapshot",
]


# ---------------------------------------------------------------------------
# helpers


def _normalise_key(value: str) -> str:
    """Return a lowercase identifier without surrounding whitespace.

    The function guards against empty identifiers which would break the
    internal mapping used by :class:`DynamicHierarchy`.
    """

    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_title(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("title must not be empty")
    return cleaned


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class HierarchyNode:
    """Definition for a node inside a hierarchy tree."""

    key: str
    title: str
    parent: str | None = None
    description: str = ""
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_title(self.title)
        self.parent = None if self.parent is None else _normalise_key(self.parent)
        self.description = self.description.strip()
        self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class HierarchySnapshot:
    """Immutable representation of a hierarchy node state."""

    key: str
    title: str
    parent: str | None
    depth: int
    order: int
    description: str
    weight: float
    tags: tuple[str, ...]
    metadata: Mapping[str, object] | None


# ---------------------------------------------------------------------------
# main container


class DynamicHierarchy:
    """Container that manages a forest of :class:`HierarchyNode` objects.

    The hierarchy operates on normalised node identifiers. Each node can have
    zero or one parent but may have many children. The public API focuses on
    three core workflows:

    * Construction from declarative input (:meth:`add_node`, :meth:`extend`).
    * Mutation while guaranteeing the structure stays acyclic
      (:meth:`reparent`, :meth:`remove`).
    * Introspection helpers (:meth:`ancestors`, :meth:`descendants`,
      :meth:`snapshot`).
    """

    def __init__(self, nodes: Iterable[HierarchyNode | Mapping[str, object]] | None = None):
        self._nodes: Dict[str, HierarchyNode] = {}
        self._children: Dict[str, list[str]] = {}
        if nodes:
            self.extend(nodes)

    # ------------------------------------------------------------------
    # construction helpers

    def add_node(self, node: HierarchyNode | Mapping[str, object]) -> HierarchyNode:
        """Insert a node into the hierarchy.

        Args:
            node: Either a :class:`HierarchyNode` instance or a mapping with the
                same keyword arguments.

        Returns:
            The stored :class:`HierarchyNode` instance.
        """

        if not isinstance(node, HierarchyNode):
            if not isinstance(node, Mapping):  # pragma: no cover - defensive
                raise TypeError("node must be a HierarchyNode or mapping")
            node = HierarchyNode(**node)

        if node.key in self._nodes:
            raise KeyError(f"node '{node.key}' already exists")

        if node.parent is not None and node.parent not in self._nodes:
            raise KeyError(f"parent '{node.parent}' must exist before adding child '{node.key}'")

        self._nodes[node.key] = node
        if node.parent is not None:
            self._children.setdefault(node.parent, []).append(node.key)
        self._children.setdefault(node.key, [])
        return node

    def extend(self, nodes: Iterable[HierarchyNode | Mapping[str, object]]) -> None:
        """Add multiple nodes in a single pass.

        Nodes should be ordered such that parents appear before their children.
        """

        for node in nodes:
            self.add_node(node)

    # ------------------------------------------------------------------
    # mutation helpers

    def reparent(self, key: str, new_parent: str | None) -> HierarchyNode:
        """Move ``key`` under ``new_parent``.

        ``new_parent`` may be ``None`` to make the node a root. The method
        ensures the operation does not introduce cycles.
        """

        key = _normalise_key(key)
        parent = None if new_parent is None else _normalise_key(new_parent)

        node = self._nodes.get(key)
        if node is None:
            raise KeyError(f"node '{key}' does not exist")

        if parent == key:
            raise ValueError("a node cannot be its own parent")

        if parent is not None and parent not in self._nodes:
            raise KeyError(f"parent '{parent}' does not exist")

        if parent is not None and key in self.descendants(parent):
            raise ValueError("reparenting would create a cycle")

        # Remove from old parent list
        if node.parent is not None:
            siblings = self._children[node.parent]
            siblings.remove(key)

        # Attach to the new parent
        if parent is not None:
            self._children.setdefault(parent, []).append(key)

        node.parent = parent
        self._children.setdefault(key, [])
        return node

    def remove(self, key: str, *, cascade: bool = True) -> None:
        """Remove a node from the hierarchy.

        Args:
            key: Identifier of the node to remove.
            cascade: When ``True`` (default) delete the entire subtree rooted at
                ``key``. When ``False`` the children become roots.
        """

        key = _normalise_key(key)
        if key not in self._nodes:
            raise KeyError(f"node '{key}' does not exist")

        to_remove = [key]
        if cascade:
            to_remove.extend(self.descendants(key))
        else:
            # promote children to roots
            for child in self._children.get(key, []):
                self._nodes[child].parent = None
            self._children[key] = []

        for node_key in to_remove:
            parent = self._nodes[node_key].parent
            if parent is not None:
                siblings = self._children[parent]
                if node_key in siblings:
                    siblings.remove(node_key)
            self._children.pop(node_key, None)
            self._nodes.pop(node_key, None)

    # ------------------------------------------------------------------
    # inspection helpers

    def __contains__(self, key: object) -> bool:  # pragma: no cover - behaviour
        if not isinstance(key, str):
            return False
        return _normalise_key(key) in self._nodes

    def __len__(self) -> int:  # pragma: no cover - behaviour
        return len(self._nodes)

    def get(self, key: str) -> HierarchyNode | None:
        return self._nodes.get(_normalise_key(key))

    def children(self, key: str) -> tuple[HierarchyNode, ...]:
        key = _normalise_key(key)
        return tuple(self._nodes[child] for child in self._children.get(key, ()))

    def roots(self) -> tuple[HierarchyNode, ...]:
        return tuple(node for node in self._nodes.values() if node.parent is None)

    def ancestors(self, key: str) -> tuple[HierarchyNode, ...]:
        key = _normalise_key(key)
        node = self._nodes.get(key)
        if node is None:
            raise KeyError(f"node '{key}' does not exist")

        lineage: list[HierarchyNode] = []
        while node.parent is not None:
            node = self._nodes[node.parent]
            lineage.append(node)
        return tuple(lineage)

    def descendants(self, key: str) -> tuple[str, ...]:
        key = _normalise_key(key)
        if key not in self._nodes:
            raise KeyError(f"node '{key}' does not exist")

        ordered: list[str] = []
        stack: list[str] = list(self._children.get(key, ()))
        while stack:
            current = stack.pop()
            ordered.append(current)
            stack.extend(self._children.get(current, ()))
        return tuple(ordered)

    def walk(self, *, depth_first: bool = True) -> Iterator[HierarchySnapshot]:
        """Yield snapshots for every node in the hierarchy.

        Args:
            depth_first: When ``True`` traverse depth-first, otherwise breadth-first.
        """

        if depth_first:
            yield from self._walk_depth_first()
        else:
            yield from self._walk_breadth_first()

    def _walk_depth_first(self) -> Iterator[HierarchySnapshot]:
        order = 0
        stack: list[tuple[str, int]] = [(node.key, 0) for node in reversed(self.roots())]
        while stack:
            key, depth = stack.pop()
            node = self._nodes[key]
            yield self._snapshot(node, depth=depth, order=order)
            order += 1
            children = list(reversed(self._children.get(key, ())))
            for child in children:
                stack.append((child, depth + 1))

    def _walk_breadth_first(self) -> Iterator[HierarchySnapshot]:
        order = 0
        queue: list[tuple[str, int]] = [(node.key, 0) for node in self.roots()]
        index = 0
        while index < len(queue):
            key, depth = queue[index]
            index += 1
            node = self._nodes[key]
            yield self._snapshot(node, depth=depth, order=order)
            order += 1
            for child in self._children.get(key, ()):  # maintain insertion order
                queue.append((child, depth + 1))

    def snapshot(self) -> tuple[HierarchySnapshot, ...]:
        """Return an immutable snapshot of the entire hierarchy."""

        return tuple(self.walk())

    def to_mapping(self) -> Dict[str, MutableMapping[str, object]]:
        """Export the hierarchy to a serialisable mapping structure."""

        exported: Dict[str, MutableMapping[str, object]] = {}
        for node in self.walk(depth_first=False):
            exported[node.key] = {
                "title": node.title,
                "parent": node.parent,
                "description": node.description,
                "weight": node.weight,
                "tags": list(node.tags),
                "metadata": dict(node.metadata or {}),
            }
        return exported

    # ------------------------------------------------------------------
    # helpers

    def _snapshot(self, node: HierarchyNode, *, depth: int, order: int) -> HierarchySnapshot:
        return HierarchySnapshot(
            key=node.key,
            title=node.title,
            parent=node.parent,
            depth=depth,
            order=order,
            description=node.description,
            weight=node.weight,
            tags=node.tags,
            metadata=node.metadata,
        )
