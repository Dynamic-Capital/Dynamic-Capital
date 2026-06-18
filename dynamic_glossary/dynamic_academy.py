"""Dynamic Academy glossary integration for Dynamic Capital."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Mapping, Sequence

from .glossary import DynamicGlossary, GlossaryEntry

__all__ = [
    "DATA_PATH",
    "load_dataset",
    "load_entries",
    "build_glossary",
]

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "dynamic_academy_glossary.json"


def _coerce_entry(payload: Mapping[str, object]) -> GlossaryEntry:
    slug = str(payload.get("slug", "")).strip()
    term = str(payload.get("term", "")).strip()
    summary = str(payload.get("summary", "")).strip()
    if not slug or not term or not summary:
        missing: list[str] = []
        if not slug:
            missing.append("slug")
        if not term:
            missing.append("term")
        if not summary:
            missing.append("summary")
        joined = ", ".join(missing)
        raise ValueError(f"dataset entry missing required fields: {joined}")
    metadata = {
        "slug": slug,
        "term": term,
        "summary": summary,
        "dynamic_slug": slug,
        "dynamic_term": term,
        "dynamic_summary": summary,
        "source": "Dynamic Academy",
        "source_url": f"https://academy.binance.com/en/glossary/{slug}",
    }
    sources = ("Dynamic Academy", metadata["source_url"])
    categories: Sequence[str] = ("Web3", "Finance")
    return GlossaryEntry(
        term=term,
        definition=summary,
        categories=tuple(categories),
        sources=tuple(sources),
        metadata=metadata,
        confidence=0.55,
        stability=0.5,
        usage_frequency=0.35,
    )


@lru_cache(maxsize=1)
def load_dataset() -> tuple[Mapping[str, object], ...]:
    """Return the Dynamic Academy glossary payload sorted from A to Z."""

    raw_text = DATA_PATH.read_text(encoding="utf-8")
    payload = json.loads(raw_text)
    if not isinstance(payload, list):
        raise TypeError("glossary dataset must be a list of mappings")
    normalised: list[Mapping[str, object]] = []
    previous_term: str | None = None
    previous_display_term: str | None = None
    seen_slugs: set[str] = set()
    seen_terms: set[str] = set()
    for index, item in enumerate(payload):
        if not isinstance(item, Mapping):
            raise TypeError("glossary entries must be mappings")
        slug = str(item.get("slug", "")).strip()
        if not slug:
            raise ValueError(f"glossary entry at position {index} is missing a slug")
        term = str(item.get("term", "")).strip()
        if not term:
            raise ValueError(f"glossary entry at position {index} is missing a term")
        lower_term = term.lower()
        lower_slug = slug.lower()
        if previous_term is not None and lower_term < previous_term:
            raise ValueError(
                "glossary dataset is not sorted from A to Z: "
                f"'{term}' should come after '{previous_display_term or ''}'"
            )
        if lower_slug in seen_slugs:
            raise ValueError(f"duplicate slug detected in dataset: {slug}")
        if lower_term in seen_terms:
            raise ValueError(f"duplicate term detected in dataset: {term}")
        seen_slugs.add(lower_slug)
        seen_terms.add(lower_term)
        previous_term = lower_term
        previous_display_term = term
        normalised.append(item)
    return tuple(normalised)


@lru_cache(maxsize=1)
def load_entries() -> tuple[GlossaryEntry, ...]:
    """Convert the Dynamic Academy dataset into :class:`GlossaryEntry` instances."""

    entries: list[GlossaryEntry] = []
    for record in load_dataset():
        entries.append(_coerce_entry(record))
    return tuple(entries)


def build_glossary(existing: Iterable[GlossaryEntry] | None = None) -> DynamicGlossary:
    """Return a :class:`DynamicGlossary` seeded with Dynamic Academy terminology."""

    entries = list(load_entries())
    if existing is not None:
        entries.extend(existing)
    return DynamicGlossary(entries)
