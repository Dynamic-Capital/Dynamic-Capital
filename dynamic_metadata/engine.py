"""Core metadata primitives used across agents, bots, and keepers."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "MetadataEntry",
    "MetadataLedger",
    "coerce_entries",
    "coerce_filters",
    "coerce_focus_terms",
    "merge_metadata_dicts",
    "summarise_records",
]


def _normalise_string(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text


def _normalise_tags(tags: Any) -> Tuple[str, ...]:
    if tags is None:
        return ()
    if isinstance(tags, str):
        candidates = tags.split(",")
    else:
        candidates = tags
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in candidates:
        text = _normalise_string(raw)
        if not text or text.lower() in seen:
            continue
        seen.add(text.lower())
        normalised.append(text)
    return tuple(normalised)


def ensure_metadata_mapping(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, MetadataEntry):  # pragma: no cover - defensive
        return value.to_dict()["metadata"]
    if not isinstance(value, Mapping):
        raise TypeError("metadata must be provided as a mapping")
    payload: Dict[str, Any] = {}
    for key, metadata_value in value.items():
        key_text = _normalise_string(key)
        if not key_text:
            continue
        if isinstance(metadata_value, str):
            payload[key_text] = metadata_value.strip()
        else:
            payload[key_text] = metadata_value
    return payload


def merge_metadata_dicts(*sources: Mapping[str, Any] | None) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    for source in sources:
        if source is None:
            continue
        if not isinstance(source, Mapping):
            raise TypeError("metadata sources must be mappings")
        for key, value in source.items():
            key_text = _normalise_string(key)
            if not key_text:
                continue
            merged[key_text] = value
    return merged


@dataclass(slots=True, frozen=True)
class MetadataEntry:
    """Represents a single metadata record tracked across the platform."""

    identifier: str
    kind: str = "resource"
    owner: str = ""
    description: str = ""
    tags: Tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        identifier = _normalise_string(self.identifier)
        if not identifier:
            raise ValueError("MetadataEntry identifier is required")
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "kind", _normalise_string(self.kind) or "resource")
        object.__setattr__(self, "owner", _normalise_string(self.owner))
        object.__setattr__(self, "description", _normalise_string(self.description))
        object.__setattr__(self, "tags", _normalise_tags(self.tags))
        object.__setattr__(self, "metadata", ensure_metadata_mapping(self.metadata))
        timestamp = self.updated_at
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        else:
            timestamp = timestamp.astimezone(timezone.utc)
        object.__setattr__(self, "updated_at", timestamp)

    def merge(self, update: Mapping[str, Any]) -> "MetadataEntry":
        payload = dict(update or {})
        identifier = _normalise_string(
            payload.get("identifier")
            or payload.get("name")
            or payload.get("key")
            or self.identifier
        )
        kind = _normalise_string(payload.get("kind") or payload.get("type") or self.kind) or "resource"
        owner = _normalise_string(payload.get("owner") or payload.get("team") or self.owner)
        description = _normalise_string(payload.get("description") or payload.get("detail") or self.description)
        tags = _normalise_tags(payload.get("tags") or payload.get("labels") or self.tags)
        metadata = merge_metadata_dicts(self.metadata, payload.get("metadata") or payload.get("properties"))
        return MetadataEntry(
            identifier=identifier,
            kind=kind,
            owner=owner,
            description=description,
            tags=tags,
            metadata=metadata,
        )

    def matches(self, focus_terms: Sequence[str], filters: Mapping[str, set[str]]) -> bool:
        if filters:
            tag_filter = filters.get("tags") or filters.get("tag")
            if tag_filter:
                tag_values = {tag.lower() for tag in self.tags}
                if not tag_filter.intersection(tag_values):
                    return False
            for key in ("owner", "kind"):
                allowed = filters.get(key)
                if allowed:
                    value = getattr(self, key)
                    if _normalise_string(value).lower() not in allowed:
                        return False
            for key, allowed in filters.items():
                if key in {"tags", "tag", "owner", "kind"}:
                    continue
                meta_value = self.metadata.get(key)
                if meta_value is None:
                    return False
                value_text = _normalise_string(meta_value).lower()
                if value_text not in allowed:
                    return False
        if focus_terms:
            haystack_parts: list[str] = [
                self.identifier,
                self.kind,
                self.owner,
                self.description,
                *self.tags,
            ]
            haystack_parts.extend(str(value) for value in self.metadata.values())
            haystack = " ".join(part.lower() for part in haystack_parts if part)
            return all(term in haystack for term in focus_terms)
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "identifier": self.identifier,
            "kind": self.kind,
            "owner": self.owner,
            "description": self.description,
            "tags": list(self.tags),
            "metadata": dict(self.metadata),
            "updated_at": self.updated_at.isoformat(),
        }


class MetadataLedger:
    """In-memory registry that keeps metadata entries deduplicated."""

    def __init__(self) -> None:
        self._entries: Dict[str, MetadataEntry] = {}

    def __len__(self) -> int:
        return len(self._entries)

    def clear(self) -> None:
        self._entries.clear()

    def register(self, entry: MetadataEntry) -> MetadataEntry:
        existing = self._entries.get(entry.identifier)
        if existing is None:
            self._entries[entry.identifier] = entry
            return entry
        merged = existing.merge(entry.to_dict())
        self._entries[merged.identifier] = merged
        return merged

    def register_many(self, entries: Iterable[MetadataEntry]) -> Tuple[MetadataEntry, ...]:
        recorded: list[MetadataEntry] = []
        for entry in entries:
            recorded.append(self.register(entry))
        return tuple(recorded)

    def snapshot(self) -> Tuple[MetadataEntry, ...]:
        return tuple(sorted(self._entries.values(), key=lambda entry: entry.identifier.lower()))

    def search(
        self,
        *,
        focus_terms: Sequence[str] | None = None,
        filters: Mapping[str, Sequence[str]] | None = None,
    ) -> Tuple[MetadataEntry, ...]:
        focus = tuple(term.lower() for term in (focus_terms or ()) if _normalise_string(term))
        filter_map: Dict[str, set[str]] = {}
        if filters:
            for key, values in filters.items():
                key_text = _normalise_string(key).lower()
                if not key_text or values is None:
                    continue
                allowed = { _normalise_string(value).lower() for value in values if _normalise_string(value) }
                if allowed:
                    filter_map[key_text] = allowed
        matches = [
            entry
            for entry in self.snapshot()
            if entry.matches(focus, filter_map)
        ]
        return tuple(matches)


def _coerce_entry_payload(payload: Mapping[str, Any]) -> MetadataEntry:
    identifier = (
        payload.get("identifier")
        or payload.get("name")
        or payload.get("key")
        or payload.get("id")
    )
    if identifier is None:
        raise ValueError("metadata entries require an identifier or name")
    return MetadataEntry(
        identifier=identifier,
        kind=payload.get("kind") or payload.get("type") or "resource",
        owner=payload.get("owner") or payload.get("team") or "",
        description=payload.get("description") or payload.get("detail") or "",
        tags=payload.get("tags") or payload.get("labels") or (),
        metadata=payload.get("metadata") or payload.get("properties") or {},
    )


def coerce_entries(value: Any) -> Tuple[MetadataEntry, ...]:
    if value is None:
        return ()
    if isinstance(value, MetadataEntry):
        return (value,)
    if isinstance(value, Mapping):
        return (_coerce_entry_payload(value),)
    entries: list[MetadataEntry] = []
    try:
        iterator = iter(value)
    except TypeError as exc:
        raise TypeError("metadata entries must be provided as a mapping or iterable") from exc
    for item in iterator:
        if item is None:
            continue
        if isinstance(item, MetadataEntry):
            entries.append(item)
        elif isinstance(item, Mapping):
            entries.append(_coerce_entry_payload(item))
        else:
            raise TypeError("metadata entry iterable must contain mappings or MetadataEntry instances")
    return tuple(entries)


def coerce_focus_terms(value: Any) -> Tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        candidates = value.split(",")
    else:
        try:
            candidates = list(value)
        except TypeError as exc:
            raise TypeError("focus terms must be provided as a string or iterable") from exc
    terms = tuple(term.lower() for term in candidates if _normalise_string(term))
    seen: set[str] = set()
    ordered: list[str] = []
    for term in terms:
        if term in seen:
            continue
        seen.add(term)
        ordered.append(term)
    return tuple(ordered)


def coerce_filters(value: Any) -> Dict[str, Tuple[str, ...]]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        raise TypeError("filters must be provided as a mapping")
    filters: Dict[str, Tuple[str, ...]] = {}
    for key, raw in value.items():
        key_text = _normalise_string(key).lower()
        if not key_text:
            continue
        if isinstance(raw, str):
            candidates = raw.split(",")
        else:
            try:
                candidates = list(raw)
            except TypeError as exc:
                raise TypeError("filter values must be strings or iterables") from exc
        values = tuple(
            _normalise_string(candidate).lower()
            for candidate in candidates
            if _normalise_string(candidate)
        )
        if values:
            filters[key_text] = values
    return filters


def summarise_records(records: Sequence[MetadataEntry], focus: Sequence[str]) -> str:
    if not records:
        return "No metadata records matched the requested criteria."
    count = len(records)
    focus_text = ", ".join(sorted({term for term in focus if term}))
    primary = records[0]
    summary_parts = [f"{count} metadata record" + ("s" if count != 1 else "")]
    if focus_text:
        summary_parts.append(f"focus: {focus_text}")
    summary_parts.append(f"highlight: {primary.identifier}")
    if primary.description:
        summary_parts.append(primary.description)
    tags = ", ".join(primary.tags[:3])
    if tags:
        summary_parts.append(f"tags: {tags}")
    return "; ".join(summary_parts)

