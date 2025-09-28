"""Automation helpers for implementing and synchronising playbooks."""

from __future__ import annotations

from dataclasses import asdict, replace
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping

from .engine import (
    DynamicPlaybookEngine,
    PlaybookBlueprint,
    PlaybookContext,
    PlaybookEntry,
)

__all__ = ["PlaybookSynchronizer"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_title(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("title must not be empty")
    return cleaned.lower()


def _serialise_entry(entry: PlaybookEntry) -> MutableMapping[str, object]:
    payload = asdict(entry)
    payload["timestamp"] = entry.timestamp.isoformat()
    payload["tags"] = list(entry.tags)
    payload["dependencies"] = list(entry.dependencies)
    payload["owners"] = list(entry.owners)
    return payload


class PlaybookSynchronizer:
    """Automates implementing, updating, and syncing playbook entries."""

    def __init__(self, *, engine: DynamicPlaybookEngine | None = None) -> None:
        self._engine = engine or DynamicPlaybookEngine()
        self._catalogue: dict[str, PlaybookEntry] = {}
        self._dirty = True
        self._ordered_cache: tuple[PlaybookEntry, ...] | None = None
        self._serialised_cache: tuple[Mapping[str, object], ...] | None = None

    @property
    def engine(self) -> DynamicPlaybookEngine:
        return self._engine

    def implement(
        self, entry: PlaybookEntry | Mapping[str, object]
    ) -> PlaybookEntry:
        resolved = self._coerce_entry(entry)
        key = _normalise_title(resolved.title)
        existing = self._catalogue.get(key)
        if existing == resolved:
            return existing
        self._catalogue[key] = resolved
        self._mark_dirty()
        return resolved

    def implement_many(
        self, entries: Iterable[PlaybookEntry | Mapping[str, object]]
    ) -> tuple[PlaybookEntry, ...]:
        resolved_entries = tuple(self._coerce_entry(entry) for entry in entries)
        updated = False
        for entry in resolved_entries:
            key = _normalise_title(entry.title)
            if self._catalogue.get(key) != entry:
                self._catalogue[key] = entry
                updated = True
        if updated:
            self._mark_dirty()
        return resolved_entries

    def update(self, title: str, /, **changes: object) -> PlaybookEntry:
        key = _normalise_title(title)
        if key not in self._catalogue:
            raise KeyError(f"playbook entry {title!r} not found")
        current = self._catalogue[key]
        if not changes:
            return current
        updated = replace(current, **changes)
        if updated == current:
            return current
        new_key = _normalise_title(updated.title)
        if new_key != key:
            if new_key in self._catalogue:
                raise KeyError(
                    f"playbook entry {updated.title!r} already exists"
                )
            self._catalogue.pop(key)
            self._catalogue[new_key] = updated
        else:
            self._catalogue[key] = updated
        self._mark_dirty()
        return updated

    def remove(self, title: str) -> PlaybookEntry:
        key = _normalise_title(title)
        try:
            removed = self._catalogue.pop(key)
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"playbook entry {title!r} not found") from exc
        self._mark_dirty()
        return removed

    def catalogue(self) -> tuple[PlaybookEntry, ...]:
        return self._ordered_entries()

    def sync_blueprint(
        self, context: PlaybookContext, *, limit: int | None = None
    ) -> PlaybookBlueprint:
        self._ensure_engine_current()
        return self._engine.build_blueprint(context, limit=limit)

    def sync_payload(
        self, context: PlaybookContext, *, limit: int | None = None
    ) -> Mapping[str, object]:
        blueprint = self.sync_blueprint(context, limit=limit)
        entries = [dict(entry) for entry in self._serialised_entries()]
        return {"blueprint": blueprint.as_dict(), "entries": entries}

    def _coerce_entry(
        self, entry: PlaybookEntry | Mapping[str, object]
    ) -> PlaybookEntry:
        if isinstance(entry, PlaybookEntry):
            return entry
        if isinstance(entry, Mapping):
            payload: MutableMapping[str, object] = dict(entry)
            payload.setdefault("timestamp", _utcnow())
            return PlaybookEntry(**payload)  # type: ignore[arg-type]
        raise TypeError("entry must be PlaybookEntry or mapping")

    def _ordered_entries(self) -> tuple[PlaybookEntry, ...]:
        if self._ordered_cache is None:
            self._ordered_cache = tuple(
                sorted(
                    self._catalogue.values(),
                    key=lambda entry: (entry.timestamp, entry.title.lower()),
                )
            )
        return self._ordered_cache

    def _serialised_entries(self) -> tuple[Mapping[str, object], ...]:
        if self._serialised_cache is None:
            self._serialised_cache = tuple(
                _serialise_entry(entry) for entry in self._ordered_entries()
            )
        return self._serialised_cache

    def _ensure_engine_current(self) -> None:
        if not self._dirty:
            return
        ordered = self._ordered_entries()
        self._engine.reset()
        for entry in ordered:
            self._engine.capture(entry)
        self._dirty = False

    def _mark_dirty(self) -> None:
        self._dirty = True
        self._ordered_cache = None
        self._serialised_cache = None

