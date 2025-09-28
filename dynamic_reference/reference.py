"""Dynamic reference intelligence primitives."""

from __future__ import annotations

import heapq
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ReferenceEntry",
    "ReferenceContext",
    "ReferenceDigest",
    "DynamicReference",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_title(value: str) -> str:
    return _normalise_text(value)


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_links(links: Sequence[str] | None) -> tuple[str, ...]:
    if not links:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for link in links:
        cleaned = link.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class ReferenceEntry:
    """Single reference artefact tracked by the intelligence system."""

    title: str
    description: str
    domain: str
    relevance: float = 0.5
    accuracy: float = 0.5
    freshness: float = 0.5
    endorsement: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)
    links: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.title = _normalise_title(self.title)
        self.description = _normalise_text(self.description)
        self.domain = _normalise_lower(self.domain)
        self.relevance = _clamp(float(self.relevance))
        self.accuracy = _clamp(float(self.accuracy))
        self.freshness = _clamp(float(self.freshness))
        self.endorsement = _clamp(float(self.endorsement))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.sources = _normalise_tuple(self.sources)
        self.links = _normalise_links(self.links)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def is_stale(self) -> bool:
        return self.freshness < 0.35

    @property
    def is_low_confidence(self) -> bool:
        return self.accuracy < 0.4


@dataclass(slots=True)
class ReferenceContext:
    """Mission context used when evaluating the references."""

    mission: str
    audience: str
    time_horizon: str
    change_pressure: float
    adoption_pressure: float
    confidence_threshold: float
    focus_tags: tuple[str, ...] = field(default_factory=tuple)
    retire_tags: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 5

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.audience = _normalise_text(self.audience)
        self.time_horizon = _normalise_text(self.time_horizon)
        self.change_pressure = _clamp(float(self.change_pressure))
        self.adoption_pressure = _clamp(float(self.adoption_pressure))
        self.confidence_threshold = _clamp(float(self.confidence_threshold))
        self.focus_tags = _normalise_tags(self.focus_tags)
        self.retire_tags = _normalise_tags(self.retire_tags)
        limit = int(self.highlight_limit)
        if limit <= 0:
            raise ValueError("highlight_limit must be positive")
        self.highlight_limit = limit

    @property
    def is_high_change(self) -> bool:
        return self.change_pressure >= 0.6

    @property
    def requires_high_confidence(self) -> bool:
        return self.confidence_threshold >= 0.7


@dataclass(slots=True)
class ReferenceDigest:
    """Synthesis of the most actionable references."""

    catalogue_size: int
    focus_alignment: float
    confidence_health: float
    refresh_pressure: float
    highlight_references: tuple[str, ...]
    activation_prompts: tuple[str, ...]
    retire_candidates: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "catalogue_size": self.catalogue_size,
            "focus_alignment": self.focus_alignment,
            "confidence_health": self.confidence_health,
            "refresh_pressure": self.refresh_pressure,
            "highlight_references": list(self.highlight_references),
            "activation_prompts": list(self.activation_prompts),
            "retire_candidates": list(self.retire_candidates),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# dynamic orchestrator


class DynamicReference:
    """Maintains a rolling window of reference intelligence."""

    def __init__(self, *, history: int = 15) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = history
        self._entries: Deque[ReferenceEntry] = deque(maxlen=history)

    @property
    def history(self) -> int:
        return self._history

    def __len__(self) -> int:
        return len(self._entries)

    def append(
        self, entry: ReferenceEntry | Mapping[str, object]
    ) -> ReferenceEntry:
        if isinstance(entry, ReferenceEntry):
            item = entry
        else:
            item = ReferenceEntry(**dict(entry))
        self._entries.append(item)
        return item

    def extend(self, entries: Iterable[ReferenceEntry | Mapping[str, object]]) -> None:
        for entry in entries:
            self.append(entry)

    def reset(self) -> None:
        self._entries.clear()

    def _score_entry(self, entry: ReferenceEntry, focus: set[str]) -> float:
        base = (
            entry.relevance * 0.4
            + entry.accuracy * 0.3
            + entry.freshness * 0.2
            + entry.endorsement * 0.1
        )
        if focus and focus.intersection(entry.tags):
            base += 0.15
        return base * max(entry.weight, 0.1)

    def _retire_candidates(
        self, entries: Sequence[ReferenceEntry], retire_tags: set[str]
    ) -> tuple[str, ...]:
        candidates: list[str] = []
        for entry in entries:
            if entry.is_stale and entry.relevance < 0.35:
                candidates.append(entry.title)
            elif retire_tags and retire_tags.intersection(entry.tags):
                candidates.append(entry.title)
        return tuple(dict.fromkeys(candidates))

    def generate_digest(
        self, context: ReferenceContext, *, limit: int | None = None
    ) -> ReferenceDigest:
        if not self._entries:
            raise RuntimeError("no reference entries available")

        highlight_limit = context.highlight_limit if limit is None else int(limit)
        if highlight_limit <= 0:
            raise ValueError("limit must be positive")

        entries = list(self._entries)
        focus_tags = set(context.focus_tags)
        retire_tags = set(context.retire_tags)

        focus_hits = (
            sum(
                1
                for entry in entries
                if any(tag in focus_tags for tag in entry.tags)
            )
            if focus_tags
            else 0
        )
        focus_alignment = (
            focus_hits / len(entries) if entries else 0.0
        )
        confidence_health = fmean(entry.accuracy for entry in entries)
        refresh_pressure = fmean(1.0 - entry.freshness for entry in entries)

        highlight_slice = heapq.nlargest(
            highlight_limit,
            entries,
            key=lambda entry: self._score_entry(entry, focus_tags),
        )
        highlight_references = tuple(entry.title for entry in highlight_slice)

        prompts: list[str] = []
        for entry in highlight_slice:
            focus_hits_for_entry = sorted(
                tag for tag in entry.tags if tag in focus_tags
            )
            if focus_hits_for_entry:
                focus_clause = ", ".join(focus_hits_for_entry)
            else:
                focus_clause = entry.domain
            prompts.append(
                (
                    f"Craft a briefing for {context.audience} on {focus_clause} using"
                    f" insights from '{entry.title}'."
                )
            )
        if context.is_high_change:
            prompts.append(
                (
                    "Spin up a rapid update cadence to keep references current while"
                    " change pressure remains elevated."
                )
            )
        if context.requires_high_confidence and confidence_health < context.confidence_threshold:
            prompts.append(
                "Launch fact-check sprints to raise confidence above mission threshold."
            )

        retire_candidates = self._retire_candidates(entries, retire_tags)

        narrative_parts = [
            f"Dynamic reference briefing for {context.mission} over {context.time_horizon} horizon.",
            f"Focus alignment at {focus_alignment:.0%} with confidence health {confidence_health:.0%}.",
        ]
        if refresh_pressure > 0.5:
            narrative_parts.append("Refresh pressure is elevated; prioritise updates.")
        else:
            narrative_parts.append("Refresh pressure is stable; maintain regular reviews.")
        if retire_candidates:
            narrative_parts.append(
                "Consider retiring: " + ", ".join(retire_candidates[:3]) + ("…" if len(retire_candidates) > 3 else "")
            )

        narrative = " ".join(narrative_parts)

        return ReferenceDigest(
            catalogue_size=len(highlight_references),
            focus_alignment=_clamp(focus_alignment),
            confidence_health=_clamp(confidence_health),
            refresh_pressure=_clamp(refresh_pressure),
            highlight_references=highlight_references,
            activation_prompts=tuple(prompts),
            retire_candidates=retire_candidates,
            narrative=narrative,
        )
