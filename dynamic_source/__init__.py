"""Dynamic source intelligence package."""

from .catalog import (
    REFERENCE_SOURCE_TAXONOMY,
    build_reference_descriptors,
    register_reference_catalog,
)
from .engine import (
    DynamicSourceEngine,
    SourceDescriptor,
    SourceSignal,
    SourceSnapshot,
)

__all__ = [
    "SourceDescriptor",
    "SourceSignal",
    "SourceSnapshot",
    "DynamicSourceEngine",
    "REFERENCE_SOURCE_TAXONOMY",
    "build_reference_descriptors",
    "register_reference_catalog",
]
