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

    @property
    def engine(self) -> DynamicPlaybookEngine:
        return self._engine

    def implement(
        self, entry: PlaybookEntry | Mapping[str, object]
    ) -> PlaybookEntry:
        resolved = self._coerce_entry(entry)
        key = _normalise_title(resolved.title)
        self._catalogue[key] = resolved
        self._dirty = True
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
            self._dirty = True
        return resolved_entries

    def update(self, title: str, **changes: object) -> PlaybookEntry:
        key = _normalise_title(title)
        if key not in self._catalogue:
            raise KeyError(f"playbook entry {title!r} not found")
        current = self._catalogue[key]
        updated = replace(current, **changes)
        self._catalogue[key] = updated
        self._dirty = True
        return updated

    def remove(self, title: str) -> PlaybookEntry:
        key = _normalise_title(title)
        try:
            removed = self._catalogue.pop(key)
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"playbook entry {title!r} not found") from exc
        self._dirty = True
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
        entries = [_serialise_entry(entry) for entry in self._ordered_entries()]
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
        return tuple(
            sorted(
                self._catalogue.values(),
                key=lambda entry: (entry.timestamp, entry.title.lower()),
            )
        )

    def _ensure_engine_current(self) -> None:
        if not self._dirty:
            return
        self._engine.reset()
        for entry in self._ordered_entries():
            self._engine.capture(entry)
        self._dirty = False

