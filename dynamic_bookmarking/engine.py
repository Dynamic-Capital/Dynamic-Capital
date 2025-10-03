"""Adaptive bookmarking engine with contextual ranking support."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence
from urllib.parse import urlparse

__all__ = [
    "Bookmark",
    "BookmarkInteraction",
    "BookmarkScore",
    "BookmarkSnapshot",
    "DynamicBookmarkingEngine",
    "DynamicBookmarkingError",
    "BookmarkNotFoundError",
]


# ---------------------------------------------------------------------------
# helpers & errors


class DynamicBookmarkingError(RuntimeError):
    """Base error raised for dynamic bookmarking failures."""


class BookmarkNotFoundError(DynamicBookmarkingError):
    """Raised when a bookmark identifier cannot be resolved."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str) -> str:
    identifier = str(value).strip()
    if not identifier:
        raise DynamicBookmarkingError("identifier must not be empty")
    return identifier.lower()


def _normalise_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _normalise_url(url: str) -> str:
    candidate = str(url).strip()
    if not candidate:
        raise DynamicBookmarkingError("url must not be empty")
    parsed = urlparse(candidate)
    if not parsed.scheme:
        candidate = f"https://{candidate}"
        parsed = urlparse(candidate)
    if not parsed.netloc:
        raise DynamicBookmarkingError("url must include a network location")
    # normalise trailing slash for consistency
    normalised = parsed._replace(path=parsed.path or "/", fragment="").geturl()
    return normalised


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = value.strip().lower()
        if text and text not in seen:
            seen.add(text)
            cleaned.append(text)
    return tuple(cleaned)


def _normalise_contexts(values: Sequence[str] | None) -> tuple[str, ...]:
    return _normalise_tags(values)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _ensure_mapping(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return MappingProxyType({})
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise DynamicBookmarkingError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class Bookmark:
    """Representation of a saved resource."""

    identifier: str
    url: str
    title: str
    description: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    contexts: tuple[str, ...] = field(default_factory=tuple)
    importance: float = 0.5
    metadata: Mapping[str, object] | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    engagement: float = 0.0

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.url = _normalise_url(self.url)
        title = str(self.title).strip()
        if not title:
            raise DynamicBookmarkingError("title must not be empty")
        self.title = title
        self.description = _normalise_text(self.description)
        self.tags = _normalise_tags(self.tags)
        self.contexts = _normalise_contexts(self.contexts)
        self.importance = _clamp01(self.importance)
        self.metadata = _ensure_mapping(self.metadata)
        if self.engagement < 0:
            raise DynamicBookmarkingError("engagement must be non-negative")


@dataclass(slots=True)
class BookmarkInteraction:
    """Interaction event for a bookmark."""

    bookmark_id: str
    event_type: str
    timestamp: datetime
    weight: float = 1.0
    context: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.bookmark_id = _normalise_identifier(self.bookmark_id)
        event = str(self.event_type).strip().lower()
        if not event:
            raise DynamicBookmarkingError("event_type must not be empty")
        self.event_type = event
        if self.weight <= 0:
            raise DynamicBookmarkingError("weight must be positive")
        if not isinstance(self.timestamp, datetime):  # pragma: no cover - defensive
            raise DynamicBookmarkingError("timestamp must be a datetime instance")
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        self.context = _normalise_contexts(self.context)
        self.metadata = _ensure_mapping(self.metadata)


@dataclass(slots=True)
class BookmarkScore:
    """Ranked bookmark enriched with scoring metadata."""

    bookmark: Bookmark
    score: float
    matched_tags: tuple[str, ...]
    matched_contexts: tuple[str, ...]
    last_interaction: datetime | None
    total_weight: float


@dataclass(slots=True)
class BookmarkSnapshot:
    """Summary view of the bookmarking engine state."""

    generated_at: datetime
    total: int
    tag_counts: Mapping[str, int]
    context_counts: Mapping[str, int]
    stale: tuple[str, ...]


# ---------------------------------------------------------------------------
# engine


class DynamicBookmarkingEngine:
    """Manage bookmark lifecycles and compute adaptive rankings."""

    def __init__(self, *, history: int = 250, recency_horizon_hours: int = 168) -> None:
        if history <= 0:
            raise DynamicBookmarkingError("history must be positive")
        if recency_horizon_hours <= 0:
            raise DynamicBookmarkingError("recency_horizon_hours must be positive")
        self._history = int(history)
        self._recency_horizon = timedelta(hours=int(recency_horizon_hours))
        self._bookmarks: MutableMapping[str, Bookmark] = {}
        self._events: MutableMapping[str, Deque[BookmarkInteraction]] = {}

    # ------------------------------------------------------------------ mutate
    def register(self, bookmark: Bookmark | Mapping[str, object]) -> Bookmark:
        """Register or update a bookmark."""

        resolved = self._coerce_bookmark(bookmark)
        existing = self._bookmarks.get(resolved.identifier)
        if existing is not None:
            payload = self._bookmark_to_payload(existing)
            payload.update(self._bookmark_to_payload(resolved))
            payload["created_at"] = existing.created_at
            payload["engagement"] = max(existing.engagement, resolved.engagement)
            resolved = Bookmark(**payload)
        resolved.updated_at = _utcnow()
        self._bookmarks[resolved.identifier] = resolved
        self._events.setdefault(resolved.identifier, deque(maxlen=self._history))
        return resolved

    def extend(self, bookmarks: Iterable[Bookmark | Mapping[str, object]]) -> None:
        for bookmark in bookmarks:
            self.register(bookmark)

    def update(self, identifier: str, **changes: object) -> Bookmark:
        bookmark = self.get(identifier)
        payload = self._bookmark_to_payload(bookmark)
        for key, value in changes.items():
            if key not in payload:
                raise DynamicBookmarkingError(f"unsupported update field: {key}")
            payload[key] = value
        payload["identifier"] = bookmark.identifier
        payload["created_at"] = bookmark.created_at
        updated = Bookmark(**payload)
        updated.updated_at = _utcnow()
        self._bookmarks[bookmark.identifier] = updated
        return updated

    def remove(self, identifier: str) -> Bookmark:
        bookmark_id = _normalise_identifier(identifier)
        try:
            bookmark = self._bookmarks.pop(bookmark_id)
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise BookmarkNotFoundError(f"bookmark '{identifier}' not found") from exc
        self._events.pop(bookmark_id, None)
        return bookmark

    # ------------------------------------------------------------------ access
    def get(self, identifier: str) -> Bookmark:
        bookmark_id = _normalise_identifier(identifier)
        try:
            return self._bookmarks[bookmark_id]
        except KeyError as exc:
            raise BookmarkNotFoundError(f"bookmark '{identifier}' not found") from exc

    def all(self) -> tuple[Bookmark, ...]:
        return tuple(self._bookmarks.values())

    # ------------------------------------------------------------- interactions
    def record_interaction(
        self,
        identifier: str,
        event_type: str,
        *,
        weight: float = 1.0,
        context: Sequence[str] | str | None = None,
        metadata: Mapping[str, object] | None = None,
        timestamp: datetime | None = None,
    ) -> BookmarkInteraction:
        bookmark = self.get(identifier)
        resolved_context = self._ensure_sequence(context)
        interaction = BookmarkInteraction(
            bookmark_id=bookmark.identifier,
            event_type=event_type,
            weight=weight,
            context=resolved_context,
            metadata=metadata,
            timestamp=timestamp or _utcnow(),
        )
        events = self._events.setdefault(bookmark.identifier, deque(maxlen=self._history))
        events.append(interaction)
        if interaction.event_type == "visit":
            bookmark.engagement += interaction.weight
        bookmark.updated_at = interaction.timestamp
        return interaction

    def interactions(self, identifier: str) -> tuple[BookmarkInteraction, ...]:
        bookmark_id = _normalise_identifier(identifier)
        return tuple(self._events.get(bookmark_id, ()))

    # ------------------------------------------------------------------- ranking
    def rank(
        self,
        *,
        limit: int = 10,
        tags: Sequence[str] | None = None,
        contexts: Sequence[str] | None = None,
    ) -> tuple[BookmarkScore, ...]:
        if limit <= 0:
            return ()
        focus_tags = _normalise_tags(tags) if tags else ()
        focus_contexts = _normalise_contexts(contexts) if contexts else ()
        now = _utcnow()
        ranked: list[BookmarkScore] = []
        for bookmark in self._bookmarks.values():
            matched_tags = tuple(tag for tag in bookmark.tags if tag in focus_tags) if focus_tags else ()
            matched_contexts = (
                tuple(ctx for ctx in bookmark.contexts if ctx in focus_contexts)
                if focus_contexts
                else ()
            )
            last_interaction = self._last_interaction(bookmark.identifier)
            total_weight = self._interaction_weight(bookmark.identifier)
            recency_score = self._score_recency(last_interaction, now)
            frequency_score = self._score_frequency(total_weight)
            match_bonus = 0.08 * len(matched_tags) + 0.06 * len(matched_contexts)
            score = (
                bookmark.importance * 0.45
                + recency_score * 0.30
                + frequency_score * 0.25
                + match_bonus
            )
            ranked.append(
                BookmarkScore(
                    bookmark=bookmark,
                    score=score,
                    matched_tags=matched_tags,
                    matched_contexts=matched_contexts,
                    last_interaction=last_interaction,
                    total_weight=total_weight,
                )
            )

        baseline = datetime.min.replace(tzinfo=timezone.utc)
        ranked.sort(key=lambda item: (item.score, item.last_interaction or baseline), reverse=True)
        return tuple(ranked[:limit])

    # ----------------------------------------------------------------- snapshot
    def snapshot(self, *, stale_after_hours: int = 168) -> BookmarkSnapshot:
        if stale_after_hours <= 0:
            raise DynamicBookmarkingError("stale_after_hours must be positive")
        generated_at = _utcnow()
        tag_counter: Counter[str] = Counter()
        context_counter: Counter[str] = Counter()
        stale_cutoff = generated_at - timedelta(hours=stale_after_hours)
        stale_identifiers: list[str] = []
        for bookmark in self._bookmarks.values():
            tag_counter.update(bookmark.tags)
            context_counter.update(bookmark.contexts)
            last = self._last_interaction(bookmark.identifier)
            if last is None or last < stale_cutoff:
                stale_identifiers.append(bookmark.identifier)
        return BookmarkSnapshot(
            generated_at=generated_at,
            total=len(self._bookmarks),
            tag_counts=MappingProxyType(dict(sorted(tag_counter.items()))),
            context_counts=MappingProxyType(dict(sorted(context_counter.items()))),
            stale=tuple(sorted(stale_identifiers)),
        )

    # ----------------------------------------------------------------- internals
    def _coerce_bookmark(self, bookmark: Bookmark | Mapping[str, object]) -> Bookmark:
        if isinstance(bookmark, Bookmark):
            return Bookmark(**self._bookmark_to_payload(bookmark))
        if isinstance(bookmark, Mapping):
            payload = dict(bookmark)
            payload.setdefault("tags", ())
            payload.setdefault("contexts", ())
            payload.setdefault("importance", 0.5)
            return Bookmark(**payload)
        raise TypeError("bookmark must be a Bookmark or mapping")

    def _bookmark_to_payload(self, bookmark: Bookmark) -> dict[str, object]:
        return {
            "identifier": bookmark.identifier,
            "url": bookmark.url,
            "title": bookmark.title,
            "description": bookmark.description,
            "tags": tuple(bookmark.tags),
            "contexts": tuple(bookmark.contexts),
            "importance": bookmark.importance,
            "metadata": dict(bookmark.metadata),
            "created_at": bookmark.created_at,
            "updated_at": bookmark.updated_at,
            "engagement": bookmark.engagement,
        }

    def _ensure_sequence(self, context: Sequence[str] | str | None) -> tuple[str, ...]:
        if context is None:
            return ()
        if isinstance(context, str):
            return _normalise_contexts((context,))
        return _normalise_contexts(context)

    def _last_interaction(self, identifier: str) -> datetime | None:
        events = self._events.get(identifier)
        if not events:
            return None
        return events[-1].timestamp

    def _interaction_weight(self, identifier: str) -> float:
        events = self._events.get(identifier)
        if not events:
            return 0.0
        return sum(event.weight for event in events if event.event_type == "visit")

    def _score_recency(self, last: datetime | None, now: datetime) -> float:
        if last is None:
            return 0.0
        elapsed = now - last
        if elapsed <= timedelta(0):
            return 1.0
        return max(0.0, 1.0 - (elapsed / self._recency_horizon))

    @staticmethod
    def _score_frequency(total_weight: float) -> float:
        if total_weight <= 0:
            return 0.0
        # Normalise using a diminishing returns curve to reward sustained usage.
        return _clamp01((total_weight ** 0.5) / 5.0)
