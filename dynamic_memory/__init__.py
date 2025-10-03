"""Compatibility facade exposing Dynamic Capital's memory toolkit.

The memory consolidation and engine primitives were unified under the
``dynamic_memory`` package. This module normalises symbol exports via a lazy
loader so legacy imports resolve the canonical implementations without eager
module initialisation.
"""

from __future__ import annotations

from importlib import import_module
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, Mapping, Tuple


_EXPORT_MAP: Mapping[str, Tuple[str, str]] = MappingProxyType(
    {
        "ConsolidationContext": (
            "dynamic_memory.consolidation",
            "ConsolidationContext",
        ),
        "DynamicMemoryConsolidator": (
            "dynamic_memory.consolidation",
            "DynamicMemoryConsolidator",
        ),
        "DynamicMemoryEngine": (
            "dynamic_memory.engine",
            "DynamicMemoryEngine",
        ),
        "MemoryConsolidationReport": (
            "dynamic_memory.consolidation",
            "MemoryConsolidationReport",
        ),
        "MemoryFragment": (
            "dynamic_memory.consolidation",
            "MemoryFragment",
        ),
    }
)

__all__ = tuple(_EXPORT_MAP)


def __getattr__(name: str) -> Any:
    try:
        module_path, attribute_name = _EXPORT_MAP[name]
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise AttributeError(
            f"module 'dynamic_memory' has no attribute '{name}'"
        ) from exc
    module = import_module(module_path)
    return getattr(module, attribute_name)


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(__all__)


if TYPE_CHECKING:  # pragma: no cover - imports for static analysis
    from dynamic_memory.consolidation import (
        ConsolidationContext,
        DynamicMemoryConsolidator,
        MemoryConsolidationReport,
        MemoryFragment,
    )
    from dynamic_memory.engine import DynamicMemoryEngine
