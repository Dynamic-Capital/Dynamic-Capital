"""Dynamic hierarchy engine utilities.

This module builds on :mod:`dynamic_hierarchy.hierarchy` and
:mod:`dynamic_hierarchy.model` to provide a higher-level engine for creating
and describing hierarchical systems.  The engine consumes declarative
"blueprints" and translates them into :class:`~dynamic_hierarchy.hierarchy.DynamicHierarchy`
instances that can be inspected or serialised.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Mapping, MutableMapping, Sequence
from dataclasses import dataclass

from .hierarchy import DynamicHierarchy, HierarchyNode
from .model import HIERARCHY_MODEL, HierarchyModel

__all__ = [
    "HierarchyBlueprint",
    "HierarchyEngine",
]


@dataclass(frozen=True, slots=True)
class HierarchyBlueprint:
    """Declarative description of a hierarchy node.

    Attributes:
        key: Stable identifier for the node.
        title: Human friendly name for the node.
        description: Optional free-form text describing the node.
        weight: Weighting used for ordering or ranking.
        tags: Lightweight taxonomy for filtering and lookup.
        metadata: Arbitrary additional information about the node.
        children: Nested blueprints that should become children of this node.
    """

    key: str
    title: str
    description: str = ""
    weight: float = 1.0
    tags: Sequence[str] = ()
    metadata: Mapping[str, object] | None = None
    children: Sequence["HierarchyBlueprint" | Mapping[str, object]] = ()


class HierarchyEngine:
    """Engine that materialises hierarchies from declarative input."""

    def __init__(
        self,
        *,
        model: HierarchyModel = HIERARCHY_MODEL,
        hierarchy: DynamicHierarchy | None = None,
    ) -> None:
        self.model = model
        self.hierarchy = hierarchy or DynamicHierarchy()

    # ------------------------------------------------------------------
    # public API

    def build(
        self,
        blueprints: HierarchyBlueprint
        | Mapping[str, object]
        | Sequence[HierarchyBlueprint | Mapping[str, object]],
    ) -> DynamicHierarchy:
        """Create a fresh :class:`DynamicHierarchy` from ``blueprints``."""

        hierarchy = DynamicHierarchy()
        self._populate(hierarchy, blueprints)
        self.hierarchy = hierarchy
        return hierarchy

    def extend(
        self,
        blueprints: HierarchyBlueprint
        | Mapping[str, object]
        | Sequence[HierarchyBlueprint | Mapping[str, object]],
    ) -> DynamicHierarchy:
        """Extend the existing hierarchy with ``blueprints``."""

        self._populate(self.hierarchy, blueprints)
        return self.hierarchy

    def describe(self) -> MutableMapping[str, object]:
        """Return a description that combines the model and hierarchy."""

        return {
            "definition": self.model.definition,
            "characteristics": [
                {
                    "name": item.name,
                    "description": item.description,
                }
                for item in self.model.characteristics
            ],
            "examples": [
                {
                    "domain": example.domain,
                    "description": example.description,
                }
                for example in self.model.examples
            ],
            "organizational_hierarchies": [
                {
                    "name": entry.name,
                    "summary": entry.summary,
                }
                for entry in self.model.organizational_hierarchies
            ],
            "nodes": self.hierarchy.to_mapping(),
        }

    # ------------------------------------------------------------------
    # helpers

    def _populate(
        self,
        hierarchy: DynamicHierarchy,
        blueprints: HierarchyBlueprint
        | Mapping[str, object]
        | Sequence[HierarchyBlueprint | Mapping[str, object]],
    ) -> None:
        for node in self._iter_nodes(blueprints):
            hierarchy.add_node(node)

    def _iter_nodes(
        self,
        blueprints: HierarchyBlueprint
        | Mapping[str, object]
        | Sequence[HierarchyBlueprint | Mapping[str, object]],
        *,
        parent: str | None = None,
    ) -> Iterator[HierarchyNode]:
        for blueprint in self._ensure_sequence(blueprints):
            resolved = self._normalise_blueprint(blueprint)
            yield HierarchyNode(
                key=resolved.key,
                title=resolved.title,
                parent=parent,
                description=resolved.description,
                weight=resolved.weight,
                tags=tuple(resolved.tags),
                metadata=resolved.metadata,
            )
            if resolved.children:
                yield from self._iter_nodes(resolved.children, parent=resolved.key)

    def _ensure_sequence(
        self,
        blueprints: HierarchyBlueprint
        | Mapping[str, object]
        | Sequence[HierarchyBlueprint | Mapping[str, object]],
    ) -> Iterable[HierarchyBlueprint | Mapping[str, object]]:
        if isinstance(blueprints, Sequence) and not isinstance(blueprints, (str, bytes)):
            return blueprints
        return (blueprints,)

    def _normalise_blueprint(
        self,
        blueprint: HierarchyBlueprint | Mapping[str, object],
    ) -> HierarchyBlueprint:
        if isinstance(blueprint, HierarchyBlueprint):
            return blueprint
        if not isinstance(blueprint, Mapping):  # pragma: no cover - defensive
            raise TypeError("blueprint must be a HierarchyBlueprint or mapping")

        try:
            key = str(blueprint["key"])
            title = str(blueprint["title"])
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError("blueprint mapping requires 'key' and 'title'") from exc

        description = str(blueprint.get("description", ""))
        weight = float(blueprint.get("weight", 1.0))
        tags_value = blueprint.get("tags", ())
        if isinstance(tags_value, (str, bytes)):
            tags: Sequence[str] = (str(tags_value),)
        elif tags_value:
            tags = tuple(str(tag) for tag in tags_value)
        else:
            tags = ()
        metadata = blueprint.get("metadata")
        if metadata is not None and not isinstance(metadata, Mapping):
            raise TypeError("metadata must be a mapping")
        children_data = blueprint.get("children") or ()
        children = tuple(self._normalise_blueprint(child) for child in children_data)
        return HierarchyBlueprint(
            key=key,
            title=title,
            description=description,
            weight=weight,
            tags=tags,
            metadata=metadata,
            children=children,
        )
