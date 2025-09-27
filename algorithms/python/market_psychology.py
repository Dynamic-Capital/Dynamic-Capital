"""Market psychology consensus aggregation utilities."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, Protocol, Sequence

from .supabase_sync import SupabaseTableWriter
from .trading_psychology_elements import (
    Element,
    ElementProfile,
    PsychologyTelemetry,
    score_elements,
)

__all__ = [
    "PsychologySample",
    "ElementConsensus",
    "MarketPsychologySnapshot",
    "MarketPsychologyProvider",
    "MarketPsychologyEngine",
    "MarketPsychologyConsensusProvider",
    "MarketPsychologySyncJob",
]


@dataclass(slots=True)
class PsychologySample:
    """Single trading psychology reading captured for a market."""

    symbol: str
    telemetry: PsychologyTelemetry | None = None
    profile: ElementProfile | None = None
    weight: float = 1.0

    def resolve_profile(self) -> ElementProfile:
        """Return the pre-computed profile or derive it from telemetry."""

        if self.profile is not None:
            return self.profile
        if self.telemetry is None:
            raise ValueError("PsychologySample requires telemetry or a profile")
        return score_elements(self.telemetry)


@dataclass(slots=True)
class ElementConsensus:
    """Aggregate view of an elemental archetype across a cohort."""

    element: Element
    score: float
    level: str
    reasons: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)


@dataclass(slots=True)
class MarketPsychologySnapshot:
    """Consensus psychology profile for a single market."""

    symbol: str
    consensus: Sequence[ElementConsensus]
    consensus_ratio: float
    confidence_gap: float
    cohort_size: int
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))

    @property
    def dominant(self) -> ElementConsensus:
        """Return the highest scoring elemental consensus."""

        if not self.consensus:
            raise ValueError("Consensus breakdown is empty")
        return self.consensus[0]

    def to_row(self) -> dict[str, object]:
        """Serialise the snapshot into a Supabase-friendly payload."""

        breakdown = [
            {
                "element": entry.element.value,
                "score": round(entry.score, 4),
                "level": entry.level,
                "reasons": list(entry.reasons),
                "recommendations": list(entry.recommendations),
            }
            for entry in self.consensus
        ]
        dominant = self.dominant
        return {
            "symbol": self.symbol,
            "dominantElement": dominant.element.value,
            "dominantScore": round(dominant.score, 4),
            "dominantLevel": dominant.level,
            "consensus": round(self.consensus_ratio, 4),
            "confidence": round(self.confidence_gap, 4),
            "cohortSize": self.cohort_size,
            "breakdown": breakdown,
            "createdAt": self.created_at,
        }


class MarketPsychologyProvider(Protocol):  # pragma: no cover - interface definition
    """Interface for adapters that supply psychology consensus snapshots."""

    def fetch(self) -> Sequence[MarketPsychologySnapshot]:
        """Return the latest market psychology snapshots."""


class MarketPsychologyEngine:
    """Aggregate psychology samples into market-level consensus snapshots."""

    _POSITIVE_ELEMENTS: frozenset[Element] = frozenset({Element.EARTH, Element.LIGHT})
    _LEVEL_PRIORITY: Mapping[str, int] = {
        "critical": 6,
        "peak": 6,
        "elevated": 5,
        "building": 4,
        "stable": 3,
        "nascent": 2,
    }

    def run(self, samples: Sequence[PsychologySample]) -> list[MarketPsychologySnapshot]:
        """Compute consensus snapshots for each unique symbol present."""

        grouped: dict[str, list[PsychologySample]] = defaultdict(list)
        for sample in samples:
            grouped[sample.symbol].append(sample)

        snapshots: list[MarketPsychologySnapshot] = []
        for symbol, symbol_samples in grouped.items():
            if not symbol_samples:
                continue
            snapshots.append(self._build_snapshot(symbol, symbol_samples))

        snapshots.sort(key=lambda snap: (-snap.dominant.score, -snap.confidence_gap, snap.symbol))
        return snapshots

    def _build_snapshot(
        self, symbol: str, samples: Sequence[PsychologySample]
    ) -> MarketPsychologySnapshot:
        totals: dict[Element, float] = {element: 0.0 for element in Element}
        level_votes: dict[Element, Counter[str]] = {element: Counter() for element in Element}
        reason_map: dict[Element, list[str]] = {element: [] for element in Element}
        recommendation_map: dict[Element, list[str]] = {element: [] for element in Element}

        total_weight = 0.0
        for sample in samples:
            weight = max(float(sample.weight), 0.0)
            profile = sample.resolve_profile()
            vote_weight = weight if weight > 0 else 1.0
            for signal in profile.signals:
                totals[signal.element] += signal.score * weight
                if signal.level:
                    level_votes[signal.element][signal.level] += vote_weight
                if signal.reasons:
                    reason_map[signal.element].extend(signal.reasons)
                if signal.recommendations:
                    recommendation_map[signal.element].extend(signal.recommendations)
            total_weight += weight

        if total_weight <= 0 and samples:
            total_weight = float(len(samples))

        consensus_entries: list[ElementConsensus] = []
        for element in Element:
            avg_score = totals[element] / total_weight if total_weight > 0 else 0.0
            level = self._select_level(level_votes[element], element)
            consensus_entries.append(
                ElementConsensus(
                    element=element,
                    score=avg_score,
                    level=level,
                    reasons=_deduplicate(reason_map[element]),
                    recommendations=_deduplicate(recommendation_map[element]),
                )
            )

        consensus_entries.sort(
            key=lambda entry: (entry.score, _element_order(entry.element)),
            reverse=True,
        )

        positive_total = sum(max(entry.score, 0.0) for entry in consensus_entries)
        consensus_ratio = (
            consensus_entries[0].score / positive_total if positive_total > 0 else 0.0
        )
        confidence_gap = (
            consensus_entries[0].score - consensus_entries[1].score
            if len(consensus_entries) > 1
            else consensus_entries[0].score
        )

        return MarketPsychologySnapshot(
            symbol=symbol,
            consensus=consensus_entries,
            consensus_ratio=consensus_ratio,
            confidence_gap=confidence_gap,
            cohort_size=len(samples),
        )

    def _select_level(self, votes: Counter[str], element: Element) -> str:
        if not votes:
            return "nascent" if element in self._POSITIVE_ELEMENTS else "stable"
        return max(
            votes.items(),
            key=lambda item: (item[1], self._LEVEL_PRIORITY.get(item[0], 0)),
        )[0]


@dataclass(slots=True)
class MarketPsychologyConsensusProvider:
    """Provider that aggregates local samples into consensus snapshots."""

    samples: Sequence[PsychologySample]
    engine: MarketPsychologyEngine = field(default_factory=MarketPsychologyEngine)

    def fetch(self) -> Sequence[MarketPsychologySnapshot]:
        return self.engine.run(self.samples)


@dataclass(slots=True)
class MarketPsychologySyncJob:
    """Persist market psychology consensus snapshots into Supabase."""

    provider: MarketPsychologyProvider
    writer: SupabaseTableWriter

    def run(self) -> int:
        rows = [snapshot.to_row() for snapshot in self.provider.fetch()]
        return self.writer.upsert(rows)


def _deduplicate(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            unique.append(value)
    return unique


def _element_order(element: Element) -> int:
    return list(Element).index(element)
