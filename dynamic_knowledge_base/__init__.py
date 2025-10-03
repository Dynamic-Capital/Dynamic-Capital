"""Compatibility facade exposing Dynamic Capital's knowledge graph toolkit.

Legacy workflows historically imported knowledge graph utilities from a flat
``dynamic_knowledge_base`` package. The canonical implementations now live
under ``dynamic.intelligence.ai_apps.knowledge_engine``. This module restores
that ergonomic import path and lazily resolves the underlying implementations
so notebooks and orchestration scripts can access the knowledge base without
incurring eager import costs.
"""

from __future__ import annotations

from importlib import import_module
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, Mapping, Tuple


_EXPORT_MAP: Mapping[str, Tuple[str, str]] = MappingProxyType(
    {
        "DynamicKnowledgeEngine": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "DynamicKnowledgeEngine",
        ),
        "KnowledgeEntry": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeEntry",
        ),
        "KnowledgeEdge": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeEdge",
        ),
        "KnowledgeGraph": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeGraph",
        ),
        "KnowledgeGraphSnapshot": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeGraphSnapshot",
        ),
        "KnowledgeNode": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeNode",
        ),
        "KnowledgeSearchHit": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeSearchHit",
        ),
        "KnowledgeSource": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "KnowledgeSource",
        ),
        "LinkRecommendation": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "LinkRecommendation",
        ),
        "RelationHint": (
            "dynamic.intelligence.ai_apps.knowledge_engine",
            "RelationHint",
        ),
    }
)

__all__ = tuple(_EXPORT_MAP)


def __getattr__(name: str) -> Any:
    try:
        module_path, attribute_name = _EXPORT_MAP[name]
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise AttributeError(
            f"module 'dynamic_knowledge_base' has no attribute '{name}'"
        ) from exc
    module = import_module(module_path)
    return getattr(module, attribute_name)


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(__all__)


if TYPE_CHECKING:  # pragma: no cover - imports for static analysis
    from dynamic.intelligence.ai_apps.knowledge_engine import (
        DynamicKnowledgeEngine,
        KnowledgeEdge,
        KnowledgeEntry,
        KnowledgeGraph,
        KnowledgeGraphSnapshot,
        KnowledgeNode,
        KnowledgeSearchHit,
        KnowledgeSource,
        LinkRecommendation,
        RelationHint,
    )
