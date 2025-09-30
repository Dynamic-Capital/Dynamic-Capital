"""Composable corpus extraction engine with deduplication and export helpers."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass, field, replace
from pathlib import Path
from time import monotonic
from typing import Callable, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CorpusDocument",
    "CorpusExtractionContext",
    "CorpusExtractionSummary",
    "DynamicCorpusExtractionEngine",
]
@dataclass(slots=True)
class CorpusDocument:
    """Normalised representation of a corpus entry."""

    identifier: str
    content: str
    source: str
    metadata: MutableMapping[str, object] = field(default_factory=dict)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.content = _normalise_text(self.content)
        self.source = _normalise_identifier(self.source)
        self.metadata = dict(self.metadata)
        self.tags = _normalise_tags(self.tags)

    def as_payload(self) -> MutableMapping[str, object]:
        """Return a serialisable payload suitable for JSONL export."""

        return {
            "identifier": self.identifier,
            "content": self.content,
            "source": self.source,
            "metadata": dict(self.metadata),
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class CorpusExtractionContext:
    """Context passed to source loaders with run level metadata."""

    source: str
    limit: int | None
    metadata: Mapping[str, object]


@dataclass(slots=True)
class CorpusExtractionSummary:
    """Summary returned after running an extraction cycle."""

    documents: tuple[CorpusDocument, ...]
    source_statistics: Mapping[str, int]
    duplicate_count: int
    elapsed_seconds: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "documents": [document.as_payload() for document in self.documents],
            "source_statistics": dict(self.source_statistics),
            "duplicate_count": self.duplicate_count,
            "elapsed_seconds": self.elapsed_seconds,
        }

    def export_jsonl(self, path: str | Path, *, ensure_ascii: bool = False) -> int:
        """Write the extracted documents to ``path`` as JSONL and return count."""

        handle_path = Path(path)
        handle_path.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        with handle_path.open("w", encoding="utf-8") as handle:
            for document in self.documents:
                json.dump(document.as_payload(), handle, ensure_ascii=ensure_ascii)
                handle.write("\n")
                count += 1
        return count


ExtractionLoader = Callable[[CorpusExtractionContext], Iterable[CorpusDocument | Mapping[str, object]]]


@dataclass(slots=True)
class _RegisteredSource:
    name: str
    loader: ExtractionLoader
    tags: tuple[str, ...]
    metadata: Mapping[str, object]


class DynamicCorpusExtractionEngine:
    """Coordinate multiple corpus loaders with optional deduplication."""

    def __init__(
        self,
        *,
        deduplicate: bool = True,
        attach_source_metadata: bool = True,
    ) -> None:
        self._deduplicate = deduplicate
        self._attach_source_metadata = attach_source_metadata
        self._sources: dict[str, _RegisteredSource] = {}

    # ---------------------------------------------------------------- register
    def register_source(
        self,
        name: str,
        loader: ExtractionLoader,
        *,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        """Register a new corpus source."""

        key = _normalise_identifier(name)
        if key in self._sources:
            raise ValueError(f"source '{key}' is already registered")
        self._sources[key] = _RegisteredSource(
            name=key,
            loader=loader,
            tags=_normalise_tags(tags),
            metadata=dict(metadata or {}),
        )

    def unregister_source(self, name: str) -> None:
        key = _normalise_identifier(name)
        self._sources.pop(key, None)

    def list_sources(self) -> tuple[str, ...]:
        return tuple(self._sources)

    # ------------------------------------------------------------------- extract
    def extract(
        self,
        *,
        sources: Sequence[str] | None = None,
        limit: int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> CorpusExtractionSummary:
        """Run extraction across selected sources and return a summary."""

        selected = self._resolve_sources(sources)
        run_metadata = dict(metadata or {})
        documents: list[CorpusDocument] = []
        counts: Counter[str] = Counter()
        duplicates = 0
        seen_identifiers: set[str] = set()
        seen_contents: set[str] = set()
        start_time = monotonic()
        remaining = limit

        for source in selected:
            context = CorpusExtractionContext(
                source=source.name,
                limit=remaining,
                metadata=run_metadata,
            )
            try:
                stream = source.loader(context)
            except Exception as error:  # pragma: no cover - runtime safety net
                raise RuntimeError(f"source '{source.name}' loader failed") from error
            for raw_document in stream:
                document = self._coerce_document(
                    raw_document,
                    source,
                    run_metadata=run_metadata,
                )
                if self._deduplicate:
                    if document.identifier in seen_identifiers or document.content in seen_contents:
                        duplicates += 1
                        continue
                    seen_identifiers.add(document.identifier)
                    seen_contents.add(document.content)
                documents.append(document)
                counts[source.name] += 1
                if remaining is not None:
                    remaining -= 1
                    if remaining <= 0:
                        elapsed = monotonic() - start_time
                        return CorpusExtractionSummary(
                            documents=tuple(documents),
                            source_statistics=dict(counts),
                            duplicate_count=duplicates,
                            elapsed_seconds=elapsed,
                        )
        elapsed = monotonic() - start_time
        return CorpusExtractionSummary(
            documents=tuple(documents),
            source_statistics=dict(counts),
            duplicate_count=duplicates,
            elapsed_seconds=elapsed,
        )

    # ------------------------------------------------------------------- helpers
    def _resolve_sources(self, sources: Sequence[str] | None) -> tuple[_RegisteredSource, ...]:
        if not sources:
            return tuple(self._sources.values())
        resolved: list[_RegisteredSource] = []
        for name in sources:
            key = _normalise_identifier(name)
            if key not in self._sources:
                raise KeyError(f"unknown source '{key}'")
            resolved.append(self._sources[key])
        return tuple(resolved)

    def _coerce_document(
        self,
        payload: CorpusDocument | Mapping[str, object],
        source: _RegisteredSource,
        *,
        run_metadata: Mapping[str, object],
    ) -> CorpusDocument:
        if isinstance(payload, CorpusDocument):
            document = payload
            if payload.source != source.name or source.tags:
                document = replace(
                    payload,
                    source=source.name,
                    tags=_merge_tags(payload.tags, source.tags),
                )
        else:
            mapping = dict(payload)
            identifier = str(mapping.get("identifier") or mapping.get("id") or "")
            content = str(
                mapping.get("content")
                or mapping.get("text")
                or mapping.get("body")
                or mapping.get("response")
                or ""
            )
            metadata = _normalise_metadata(mapping.get("metadata"))
            tags = mapping.get("tags")
            document = CorpusDocument(
                identifier=identifier,
                content=content,
                source=source.name,
                metadata=metadata,
                tags=_merge_tags(tags, source.tags),
            )
        merged_metadata = self._merge_metadata(document.metadata, source.metadata, run_metadata)
        if self._attach_source_metadata:
            merged_metadata.setdefault("source", source.name)
        document.metadata = merged_metadata
        return document

    @staticmethod
    def _merge_metadata(
        *sources: Mapping[str, object] | MutableMapping[str, object]
    ) -> MutableMapping[str, object]:
        merged: dict[str, object] = {}
        for metadata in sources:
            if metadata:
                merged.update(metadata)
        return merged


def _normalise_identifier(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _normalise_text(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("content must not be empty")
    return text


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    result: list[str] = []
    for tag in values:
        candidate = tag.strip().lower()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        result.append(candidate)
    return tuple(result)


def _merge_tags(
    values: Sequence[str] | None, defaults: Sequence[str] | None
) -> tuple[str, ...]:
    combined: list[str] = []
    if defaults:
        combined.extend(defaults)
    if values:
        combined.extend(values)
    return _normalise_tags(combined)


def _normalise_metadata(metadata: object) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if isinstance(metadata, Mapping):
        return dict(metadata)
    raise TypeError("metadata must be a mapping if provided")
