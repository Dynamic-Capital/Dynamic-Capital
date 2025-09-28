"""Dynamic metadata tooling shared across the stack."""

from __future__ import annotations

from .engine import (
    MetadataEntry,
    MetadataLedger,
    coerce_entries,
    coerce_filters,
    coerce_focus_terms,
    merge_metadata_dicts,
    summarise_records,
)
from .helper import ensure_metadata_mapping, merge_metadata
from .bot import DynamicMetadataBot
from .keeper import MetadataKeeperSyncResult, DynamicMetadataKeeperAlgorithm

__all__ = [
    "MetadataEntry",
    "MetadataLedger",
    "DynamicMetadataBot",
    "MetadataKeeperSyncResult",
    "DynamicMetadataKeeperAlgorithm",
    "ensure_metadata_mapping",
    "merge_metadata",
    "coerce_entries",
    "coerce_filters",
    "coerce_focus_terms",
    "merge_metadata_dicts",
    "summarise_records",
]
