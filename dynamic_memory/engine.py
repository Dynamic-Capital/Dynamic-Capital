"""Core dynamic memory engine providing adaptive capture and recall."""

from __future__ import annotations

from collections import Counter, deque
from heapq import nlargest
from dataclasses import dataclass
from itertools import islice
from typing import (
    Callable,
    Deque,
    Iterable,
    Iterator,
    Mapping,
    MutableMapping,
    NamedTuple,
    Sequence,
)

from ._utils import clamp, normalise_tags, normalise_text, utcnow
from .consolidation import (
    ConsolidationContext,
    DynamicMemoryConsolidator,
    MemoryConsolidationReport,
    MemoryFragment,
)

__all__ = ["DynamicMemoryEngine", "FragmentStatistics"]


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
        return tuple(islice(reversed(self._fragments), limit))

    def recall_by_tag(self, tag: str, *, limit: int = 5) -> tuple[MemoryFragment, ...]:
        normalised_tag = normalise_text(tag).lower()
        if limit <= 0:
            return ()
        matching = self._iter_matching(lambda fragment: normalised_tag in fragment.tags)
        return tuple(islice(matching, limit))

    def recall_by_domain(self, domain: str, *, limit: int = 5) -> tuple[MemoryFragment, ...]:
        normalised_domain = normalise_text(domain).lower()
        if limit <= 0:
            return ()
        matching = self._iter_matching(lambda fragment: fragment.domain == normalised_domain)
        return tuple(islice(matching, limit))

    def recall_ranked(
        self,
        *,
        limit: int = 5,
        weights: Mapping[str, float] | None = None,
        tags: Sequence[str] | None = None,
        domain: str | None = None,
    ) -> tuple[MemoryFragment, ...]:
        """Return the highest scoring fragments based on configurable weighting.

        The ranking score blends fragment ``recency``, ``relevance`` and ``novelty``
        attributes. Optional ``tags`` and ``domain`` filters narrow the candidate set
        before scoring. When ``tags`` are provided fragments must contain at least
        one matching tag and gain a small boost for each match, rewarding topical
        alignment.
        """

        if limit <= 0 or not self._fragments:
            return ()

        resolved_weights = self._resolve_weights(weights)
        focus_tags = frozenset(normalise_tags(tags)) if tags else None
        focus_domain = normalise_text(domain).lower() if domain else None

        candidates = self._iter_rank_candidates(
            resolved_weights, focus_tags, focus_domain
        )
        top_candidates = nlargest(
            limit,
            candidates,
            key=lambda candidate: (candidate.score, candidate.timestamp),
        )

        if not top_candidates:
            return ()

        return tuple(candidate.fragment for candidate in top_candidates)

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
            scaled_decay = clamp(self._decay * (elapsed / 3600.0))
            fragment.weight = max(fragment.weight * (1.0 - scaled_decay), 0.0)

    def ingest_snapshot(self, snapshot: Mapping[str, object]) -> MemoryFragment:
        """Capture fragment from a raw snapshot structure."""

        payload = dict(snapshot)
        tags = normalise_tags(payload.get("tags"))
        payload["tags"] = tags
        if "timestamp" not in payload:
            payload["timestamp"] = utcnow()
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
                payload["tags"] = normalise_tags(payload["tags"])
            if "timestamp" not in payload:
                payload["timestamp"] = utcnow()
            return MemoryFragment(**payload)  # type: ignore[arg-type]
        raise TypeError("fragment must be MemoryFragment or mapping")

    def _iter_matching(self, predicate: Callable[[MemoryFragment], bool]) -> Iterator[MemoryFragment]:
        for fragment in reversed(self._fragments):
            if predicate(fragment):
                yield fragment

    @property
    def fragments(self) -> tuple[MemoryFragment, ...]:
        return tuple(self._fragments)

    def _resolve_weights(self, weights: Mapping[str, float] | None) -> Mapping[str, float]:
        base = {"recency": 0.35, "relevance": 0.45, "novelty": 0.2}
        if weights:
            for key, value in weights.items():
                if key not in base:
                    raise KeyError(f"unsupported weight key: {key}")
                if value < 0:
                    raise ValueError("weight values must be non-negative")
                base[key] = float(value)

        total = sum(base.values())
        if total <= 0:
            raise ValueError("weight values must sum to a positive number")

        return {key: value / total for key, value in base.items()}

    class _RankCandidate(NamedTuple):
        score: float
        timestamp: float
        fragment: MemoryFragment

    def _iter_rank_candidates(
        self,
        weights: Mapping[str, float],
        focus_tags: frozenset[str] | None,
        focus_domain: str | None,
    ) -> Iterator[_RankCandidate]:
        weight_recency = weights["recency"]
        weight_relevance = weights["relevance"]
        weight_novelty = weights["novelty"]

        for fragment in reversed(self._fragments):
            if focus_domain and fragment.domain != focus_domain:
                continue

            if fragment.weight <= 0:
                continue

            matches = 0
            if focus_tags:
                matches = sum(1 for tag in fragment.tags if tag in focus_tags)
                if matches == 0:
                    continue

            score = fragment.weight * (
                (fragment.recency * weight_recency)
                + (fragment.relevance * weight_relevance)
                + (fragment.novelty * weight_novelty)
            )
            if matches:
                score += 0.05 * matches

            yield self._RankCandidate(
                score=score,
                timestamp=fragment.timestamp.timestamp(),
                fragment=fragment,
            )

