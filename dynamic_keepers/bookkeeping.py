"""Book keeper utilities for organising Google Drive derived datasets."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_corpus_extraction.engine import CorpusDocument
from dynamic_database.database import (
    DatabaseRecord,
    DynamicDatabase,
    ReplicationEvent,
    TableSnapshot,
)

__all__ = ["GoogleDriveBookkeeper", "IndexedDocument"]


@dataclass(slots=True)
class IndexedDocument:
    """Normalised view of a corpus document ready for database indexing."""

    identifier: str
    content: str
    source: str
    metadata: MutableMapping[str, object]
    tags: tuple[str, ...]


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = str(tag).strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _ensure_mapping(metadata: object) -> MutableMapping[str, object]:
    if isinstance(metadata, MutableMapping):
        return dict(metadata)
    if isinstance(metadata, Mapping):
        return dict(metadata)
    return {}


def _coerce_document(document: CorpusDocument | Mapping[str, object]) -> IndexedDocument:
    if isinstance(document, CorpusDocument):
        return IndexedDocument(
            identifier=document.identifier,
            content=document.content,
            source=document.source,
            metadata=dict(document.metadata),
            tags=tuple(document.tags),
        )

    if not isinstance(document, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("document must be a mapping or CorpusDocument")

    identifier = str(document.get("identifier", "")).strip()
    if not identifier:
        raise ValueError("document is missing an identifier")

    content = str(document.get("content", "")).strip()
    if not content:
        raise ValueError("document is missing extractable content")

    source = str(document.get("source", "google_drive")).strip() or "google_drive"
    metadata = _ensure_mapping(document.get("metadata", {}))
    tags = _normalise_tags(document.get("tags"))

    return IndexedDocument(
        identifier=identifier,
        content=content,
        source=source,
        metadata=metadata,
        tags=tags,
    )


class GoogleDriveBookkeeper:
    """Assign documents to dynamic database tables for long term storage."""

    def __init__(
        self,
        *,
        table: str = "google_drive_pdfs",
        database: DynamicDatabase | None = None,
        default_tags: Sequence[str] | None = ("google_drive", "pdf"),
    ) -> None:
        table_name = str(table).strip()
        if not table_name:
            raise ValueError("table must not be empty")
        self._table = table_name
        self._database = database or DynamicDatabase()
        self._default_tags = _normalise_tags(default_tags)

    @property
    def table(self) -> str:
        return self._table

    @property
    def database(self) -> DynamicDatabase:
        return self._database

    def index_documents(
        self,
        documents: Iterable[CorpusDocument | Mapping[str, object]],
        *,
        confidence: float = 0.65,
        relevance: float = 0.6,
        freshness: float = 0.55,
        extra_tags: Sequence[str] | None = None,
    ) -> list[DatabaseRecord]:
        """Normalise and ingest documents into the configured database table."""

        combined_tags = tuple(self._default_tags) + _normalise_tags(extra_tags)
        merged_tags = _normalise_tags(combined_tags)
        ingested: list[DatabaseRecord] = []
        for document in documents:
            normalised = _coerce_document(document)
            payload: MutableMapping[str, object] = {
                "content": normalised.content,
                "source": normalised.source,
                "metadata": dict(normalised.metadata),
            }
            link_value: str | None = None
            if normalised.tags:
                payload["document_tags"] = list(normalised.tags)
            if "web_view_link" in normalised.metadata:
                link_value = str(normalised.metadata["web_view_link"])
                payload.setdefault("links", []).append(link_value)

            record_tags = _normalise_tags(normalised.tags + merged_tags)
            sources = _normalise_tags((normalised.source,))
            if link_value is not None:
                sources += _normalise_tags((link_value,))

            record = DatabaseRecord(
                key=normalised.identifier,
                payload=payload,
                confidence=confidence,
                relevance=relevance,
                freshness=freshness,
                tags=record_tags,
                sources=sources,
            )
            ingested.append(self._database.ingest(self._table, record))
        return ingested

    def snapshot(self) -> TableSnapshot:
        """Return the current state of the managed table."""

        return self._database.snapshot(self._table)

    def recent_events(self, limit: int = 25) -> tuple[ReplicationEvent, ...]:
        """Expose the most recent replication events for audit trails."""

        return self._database.recent_events(limit=limit)

    def evict(self, keys: Iterable[str]) -> int:
        """Remove a set of document identifiers from the table."""

        return self._database.evict(self._table, keys)
