"""Curated dynamic quote collection utilities."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, Iterator, Mapping, Sequence

from .engine import DynamicQuote, QuoteContext, QuoteDigest, QuoteIdea

__all__ = [
    "QuoteEntry",
    "QuoteCollection",
    "seed_default_quotes",
]


@dataclass(slots=True)
class QuoteEntry:
    """Immutable representation of a curated quote."""

    theme: str
    text: str
    author: str
    tags: tuple[str, ...]
    sources: tuple[str, ...]
    metadata: Mapping[str, object] | None
    idea: QuoteIdea


class QuoteCollection:
    """High level helper around :class:`DynamicQuote`."""

    def __init__(self, *, history: int = 64) -> None:
        self._engine = DynamicQuote(history=history)
        self._catalog: Dict[str, list[QuoteEntry]] = defaultdict(list)

    def __len__(self) -> int:  # pragma: no cover - simple proxy
        return len(self._engine)

    @staticmethod
    def _coerce_payload(payload: QuoteIdea | Mapping[str, object]) -> QuoteIdea:
        if isinstance(payload, QuoteIdea):
            return payload
        if not isinstance(payload, Mapping):  # pragma: no cover - defensive
            raise TypeError("Quote payload must be mapping or QuoteIdea instance")
        return QuoteIdea(**dict(payload))  # type: ignore[arg-type]

    def add(self, payload: QuoteIdea | Mapping[str, object]) -> QuoteEntry:
        """Capture a quote idea and return the stored entry."""

        idea = self._coerce_payload(payload)
        self._engine.capture(idea)
        entry = QuoteEntry(
            theme=idea.theme,
            text=idea.text,
            author=idea.author,
            tags=idea.tags,
            sources=idea.sources,
            metadata=idea.metadata,
            idea=idea,
        )
        self._catalog[idea.theme].append(entry)
        return entry

    def extend(self, payloads: Iterable[QuoteIdea | Mapping[str, object]]) -> None:
        for payload in payloads:
            self.add(payload)

    def themes(self) -> tuple[str, ...]:
        return tuple(sorted(self._catalog))

    def entries(self) -> tuple[QuoteEntry, ...]:
        all_entries: list[QuoteEntry] = []
        for entries in self._catalog.values():
            all_entries.extend(entries)
        return tuple(all_entries)

    def entries_for_theme(self, theme: str) -> tuple[QuoteEntry, ...]:
        key = theme.strip().lower()
        return tuple(self._catalog.get(key, ()))

    def entries_for_tag(self, tag: str) -> tuple[QuoteEntry, ...]:
        cleaned = tag.strip().lower()
        if not cleaned:
            return ()
        matches: list[QuoteEntry] = []
        for entries in self._catalog.values():
            for entry in entries:
                if cleaned in entry.tags:
                    matches.append(entry)
        return tuple(matches)

    def catalog(self) -> Mapping[str, Sequence[QuoteEntry]]:
        view: Dict[str, Sequence[QuoteEntry]] = {}
        for key, items in self._catalog.items():
            view[key] = tuple(items)
        return view

    def build_digest(
        self, context: QuoteContext, *, limit: int | None = None
    ) -> QuoteDigest:
        return self._engine.generate_digest(context, limit=limit)

    def reset(self) -> None:
        self._engine.reset()
        self._catalog.clear()

    def __iter__(self) -> Iterator[QuoteEntry]:  # pragma: no cover - trivial
        return iter(self.entries())


def seed_default_quotes(collection: QuoteCollection) -> None:
    """Populate the collection with a curated default lineup."""

    collection.extend(
        [
            {
                "theme": "resilience",
                "text": (
                    "People have many different ways of thinking. Even if you make a "
                    "mistake, if you realize it was a mistake, you can always fix it. "
                    "Then if you turn around, you will see the future. This must be "
                    "realized by oneself."
                ),
                "author": "Vash the Stampede",
                "tags": ("reflection", "growth", "hope"),
                "sources": ("Trigun",),
                "metadata": {"origin": "Trigun", "type": "anime"},
                "originality": 0.82,
                "resonance": 0.88,
                "clarity": 0.74,
                "energy": 0.66,
                "longevity": 0.8,
            },
            {
                "theme": "resilience",
                "text": "Fall seven times and stand up eight.",
                "author": "Japanese Proverb",
                "tags": ("perseverance", "growth"),
                "sources": ("Proverb",),
                "metadata": {"culture": "Japanese"},
                "originality": 0.65,
                "resonance": 0.83,
                "clarity": 0.9,
                "energy": 0.72,
                "longevity": 0.85,
            },
            {
                "theme": "vision",
                "text": "The future depends on what you do today.",
                "author": "Mahatma Gandhi",
                "tags": ("action", "future"),
                "sources": ("Speech",),
                "metadata": {"century": 20},
                "originality": 0.6,
                "resonance": 0.86,
                "clarity": 0.88,
                "energy": 0.7,
                "longevity": 0.92,
            },
            {
                "theme": "vision",
                "text": "Imagination is more important than knowledge.",
                "author": "Albert Einstein",
                "tags": ("creativity", "innovation"),
                "sources": ("Interview",),
                "metadata": {"context": "Cosmic mind"},
                "originality": 0.77,
                "resonance": 0.81,
                "clarity": 0.72,
                "energy": 0.69,
                "longevity": 0.95,
            },
        ]
    )

