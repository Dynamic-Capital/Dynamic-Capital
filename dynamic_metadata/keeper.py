"""Keeper orchestration focused on metadata registries."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Mapping, MutableMapping, Optional, Sequence, Tuple

from .engine import (
    MetadataEntry,
    MetadataLedger,
    coerce_entries,
    coerce_filters,
    coerce_focus_terms,
    summarise_records,
)
from .helper import merge_metadata

__all__ = ["MetadataKeeperSyncResult", "DynamicMetadataKeeperAlgorithm"]


def _normalise_timestamp(value: Optional[datetime]) -> datetime:
    timestamp = value or datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class MetadataKeeperSyncResult:
    """Structured output produced by the metadata keeper."""

    timestamp: datetime
    focus: Tuple[str, ...]
    records: Sequence[MutableMapping[str, Any]]
    ledger_size: int
    summary_text: str
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        return self.summary_text

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "timestamp": self.timestamp.isoformat(),
            "focus": list(self.focus),
            "records": [dict(record) for record in self.records],
            "ledger_size": self.ledger_size,
            "summary": self.summary_text,
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


class DynamicMetadataKeeperAlgorithm:
    """Coordinates metadata entry curation for downstream systems."""

    def __init__(self, ledger: MetadataLedger | None = None) -> None:
        self.ledger = ledger or MetadataLedger()

    def register_entry(self, entry: MetadataEntry) -> MetadataEntry:
        return self.ledger.register(entry)

    def register_many(self, entries: Sequence[MetadataEntry]) -> Tuple[MetadataEntry, ...]:
        return self.ledger.register_many(entries)

    def sync(
        self,
        *,
        as_of: Optional[datetime] = None,
        entries: Sequence[Mapping[str, Any]] | Mapping[str, Any] | None = None,
        focus: Sequence[str] | str | None = None,
        filters: Mapping[str, Sequence[str]] | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> MetadataKeeperSyncResult:
        timestamp = _normalise_timestamp(as_of)

        if entries:
            ingested = coerce_entries(entries)
            self.ledger.register_many(ingested)

        focus_terms = coerce_focus_terms(focus)
        filter_map = coerce_filters(filters)
        records = self.ledger.search(focus_terms=focus_terms, filters=filter_map)
        record_payloads = [record.to_dict() for record in records]

        summary = summarise_records(records, focus_terms)
        merged_metadata = merge_metadata(metadata, {"filters": filter_map} if filter_map else None)

        return MetadataKeeperSyncResult(
            timestamp=timestamp,
            focus=focus_terms,
            records=record_payloads,
            ledger_size=len(self.ledger),
            summary_text=summary,
            metadata=merged_metadata,
        )

