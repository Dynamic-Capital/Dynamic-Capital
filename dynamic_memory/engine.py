"""Core dynamic memory engine providing adaptive capture and recall."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

from .consolidation import (
    ConsolidationContext,
    DynamicMemoryConsolidator,
    MemoryConsolidationReport,
    MemoryFragment,
)

__all__ = ["DynamicMemoryEngine", "FragmentStatistics"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


@dataclass(slots=True)
class FragmentStatistics:
    """Summary statistics for tracked memory fragments."""

    total: int
    domains: Mapping[str, int]
    tags: Mapping[str, int]
    mean_recency: float
    mean_relevance: float
    mean_novelty: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total": self.total,
            "domains": dict(self.domains),
            "tags": dict(self.tags),
            "mean_recency": self.mean_recency,
            "mean_relevance": self.mean_relevance,
            "mean_novelty": self.mean_novelty,
        }


class DynamicMemoryEngine:
    """Manage memory fragments with adaptive capture, decay, and recall."""

    def __init__(
        self,
        *,
        history: int = 240,
        decay: float = 0.08,
        consolidation_factory: Callable[[int], DynamicMemoryConsolidator] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if not (0.0 <= decay < 1.0):
            raise ValueError("decay must be in [0.0, 1.0)")
        self._history = int(history)
        self._decay = float(decay)
        self._fragments: Deque[MemoryFragment] = deque(maxlen=self._history)
        self._consolidation_factory = (
            consolidation_factory
            if consolidation_factory is not None
            else lambda capacity: DynamicMemoryConsolidator(history=capacity)
        )

    # ----------------------------------------------------------------- capture
    def capture(self, fragment: MemoryFragment | Mapping[str, object]) -> MemoryFragment:
        resolved = self._coerce_fragment(fragment)
        self._fragments.append(resolved)
        return resolved

    def extend(self, fragments: Iterable[MemoryFragment | Mapping[str, object]]) -> None:
        for fragment in fragments:
            self.capture(fragment)

    def forget(self, predicate: Callable[[MemoryFragment], bool]) -> int:
        """Remove fragments matching ``predicate`` and return the count removed."""

        retained: Deque[MemoryFragment] = deque(maxlen=self._history)
        removed = 0
        for fragment in self._fragments:
            if predicate(fragment):
                removed += 1
                continue
            retained.append(fragment)
        self._fragments = retained
        return removed

    def reset(self) -> None:
        self._fragments.clear()

    # ------------------------------------------------------------------- recall
    def recall_recent(self, limit: int = 5) -> tuple[MemoryFragment, ...]:
        if limit <= 0:
            return ()
        sorted_fragments = sorted(self._fragments, key=lambda frag: frag.timestamp, reverse=True)
        return tuple(sorted_fragments[:limit])

    def recall_by_tag(self, tag: str, *, limit: int = 5) -> tuple[MemoryFragment, ...]:
        normalised_tag = _normalise_text(tag).lower()
        if limit <= 0:
            return ()
        matching = [fragment for fragment in reversed(self._fragments) if normalised_tag in fragment.tags]
        return tuple(matching[:limit])

    def recall_by_domain(self, domain: str, *, limit: int = 5) -> tuple[MemoryFragment, ...]:
        normalised_domain = _normalise_text(domain).lower()
        if limit <= 0:
            return ()
        matching = [fragment for fragment in reversed(self._fragments) if fragment.domain == normalised_domain]
        return tuple(matching[:limit])

    # ------------------------------------------------------------- consolidation
    def consolidate(self, context: ConsolidationContext) -> MemoryConsolidationReport:
        if not self._fragments:
            raise RuntimeError("no memory fragments available for consolidation")

        capacity = max(self._history, len(self._fragments))
        consolidator = self._consolidation_factory(capacity)
        consolidator.reset()
        consolidator.extend(self._fragments)
        return consolidator.generate_report(context)

    # ---------------------------------------------------------------- analytics
    def statistics(self) -> FragmentStatistics:
        if not self._fragments:
            return FragmentStatistics(
                total=0,
                domains={},
                tags={},
                mean_recency=0.0,
                mean_relevance=0.0,
                mean_novelty=0.0,
            )

        domain_counter: Counter[str] = Counter()
        tag_counter: Counter[str] = Counter()
        recency_total = 0.0
        relevance_total = 0.0
        novelty_total = 0.0
        weight_total = 0.0

        for fragment in self._fragments:
            weight = fragment.weight if fragment.weight > 0 else 1.0
            domain_counter[fragment.domain] += 1
            if fragment.tags:
                tag_counter.update(fragment.tags)
            recency_total += fragment.recency * weight
            relevance_total += fragment.relevance * weight
            novelty_total += fragment.novelty * weight
            weight_total += weight

        mean_recency = recency_total / weight_total if weight_total else 0.0
        mean_relevance = relevance_total / weight_total if weight_total else 0.0
        mean_novelty = novelty_total / weight_total if weight_total else 0.0

        return FragmentStatistics(
            total=len(self._fragments),
            domains=dict(domain_counter),
            tags=dict(tag_counter),
            mean_recency=round(mean_recency, 3),
            mean_relevance=round(mean_relevance, 3),
            mean_novelty=round(mean_novelty, 3),
        )

    # --------------------------------------------------------------- maintenance
    def decay(self) -> None:
        """Apply exponential decay to fragment weights based on recency."""

        if not self._fragments:
            return

        latest_timestamp = max(fragment.timestamp for fragment in self._fragments)
        for fragment in self._fragments:
            elapsed = max((latest_timestamp - fragment.timestamp).total_seconds(), 0.0)
            scaled_decay = _clamp(self._decay * (elapsed / 3600.0))
            fragment.weight = max(fragment.weight * (1.0 - scaled_decay), 0.0)

    def ingest_snapshot(self, snapshot: Mapping[str, object]) -> MemoryFragment:
        """Capture fragment from a raw snapshot structure."""

        payload = dict(snapshot)
        tags = _normalise_tags(payload.get("tags"))
        payload["tags"] = tags
        if "timestamp" not in payload:
            payload["timestamp"] = _utcnow()
        return self.capture(payload)

    # ---------------------------------------------------------------- utilities
    def _coerce_fragment(self, fragment: MemoryFragment | Mapping[str, object]) -> MemoryFragment:
        if isinstance(fragment, MemoryFragment):
            return fragment
        if isinstance(fragment, Mapping):
            payload: MutableMapping[str, object] = dict(fragment)
            if "timestamp" in payload and isinstance(payload["timestamp"], str):
                raise TypeError("timestamp must be datetime, not string")
            if "tags" in payload:
                payload["tags"] = _normalise_tags(payload["tags"])
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return MemoryFragment(**payload)  # type: ignore[arg-type]
        raise TypeError("fragment must be MemoryFragment or mapping")

    @property
    def fragments(self) -> tuple[MemoryFragment, ...]:
        return tuple(self._fragments)

