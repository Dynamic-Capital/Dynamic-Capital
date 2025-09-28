"""Metadata bot used by notification surfaces."""

from __future__ import annotations

from typing import Any, Dict, Mapping

from .engine import (
    MetadataLedger,
    coerce_entries,
    coerce_filters,
    coerce_focus_terms,
    summarise_records,
)
from .helper import merge_metadata

__all__ = ["DynamicMetadataBot"]


class DynamicMetadataBot:
    """High-level interface that surfaces metadata digests."""

    def __init__(self, ledger: MetadataLedger | None = None) -> None:
        self.ledger = ledger or MetadataLedger()

    def broadcast(self, payload: Mapping[str, Any] | None = None) -> Dict[str, Any]:
        context = dict(payload or {})
        if context.get("clear") or context.get("reset"):
            self.ledger.clear()

        entries = coerce_entries(context.get("entries") or context.get("entry"))
        ingested = self.ledger.register_many(entries)

        focus_terms = coerce_focus_terms(context.get("focus") or context.get("query"))
        filters = coerce_filters(context.get("filters"))
        records = self.ledger.search(focus_terms=focus_terms, filters=filters)

        summary = summarise_records(records, focus_terms)

        metadata = merge_metadata(context.get("metadata"), {"filters": filters} if filters else None)

        return {
            "summary": summary,
            "focus": list(focus_terms),
            "records": [record.to_dict() for record in records],
            "ingested": len(ingested),
            "ledger_size": len(self.ledger),
            "metadata": metadata,
        }

