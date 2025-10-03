"""Shared metadata helpers for Dynamic Capital models."""

from .versioning import ModelVersion, VersionNumber

try:
    # Re-export the rich metadata synthesis utilities so callers can access
    # them via the lightweight ``dynamic_metadata`` namespace.
    from dynamic.trading.algo.dynamic_metadata import (
        DynamicMetadataAlgo,
        MetadataAttribute,
    )
except Exception:  # pragma: no cover - fallback for stripped-down deployments
    DynamicMetadataAlgo = None  # type: ignore[assignment]
    MetadataAttribute = None  # type: ignore[assignment]

__all__ = [
    "ModelVersion",
    "VersionNumber",
    "DynamicMetadataAlgo",
    "MetadataAttribute",
]
