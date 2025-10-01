"""Elemental balance aggregation utilities for Dynamic Capital.

This module provides a lightweight analytics layer around the elemental
archetypes that power the trading psychology system.  It allows callers to
record weighted contributions for each :class:`~algorithms.python.trading_psychology_elements.Element`
and derive aggregate readiness, caution, and recovery indices.  The
implementation mirrors the ergonomics of :mod:`dynamic.trading.algo.dynamic_psychology`
so higher-level services can reuse familiar patterns when building dashboards
or automated playbooks.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import pstdev
from typing import Deque, Dict, Iterable, Iterator, Mapping, MutableMapping, Optional, Sequence

from algorithms.python.trading_psychology_elements import Element

__all__ = [
    "ElementContribution",
    "ElementSummary",
    "ElementSnapshot",
    "DynamicElementAlgo",
]


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    """Return a timezone-aware :class:`datetime` for *value*."""

    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp must be datetime, ISO-8601 string, or None")


def _coerce_element(value: Element | str) -> Element:
    if isinstance(value, Element):
        return value

    if isinstance(value, str):
        try:
            return Element(value.lower())
        except ValueError as exc:  # pragma: no cover - defensive guardrail
            raise ValueError(f"Unknown element identifier: {value!r}") from exc

    raise TypeError("element must be Element or str")


def _coerce_score(value: object) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise ValueError("score must be numeric") from exc
    return max(0.0, min(10.0, score))


def _coerce_weight(value: object) -> float:
    try:
        weight = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise ValueError("weight must be numeric") from exc

    if weight <= 0:
        raise ValueError("weight must be positive")
    return weight


def _normalise_source(value: str | None) -> str | None:
    if value is None:
        return None
    normalised = str(value).strip()
    return normalised or None


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _element_order(element: Element) -> int:
    return list(Element).index(element)


@dataclass(slots=True)
class ElementContribution:
    """A weighted elemental contribution captured from a trading context."""

    element: Element
    score: float
    weight: float = 1.0
    source: str | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.element = _coerce_element(self.element)
        self.score = _coerce_score(self.score)
        self.weight = _coerce_weight(self.weight)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.source = _normalise_source(self.source)
        self.metadata = _normalise_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "element": self.element.value,
            "score": self.score,
            "weight": self.weight,
            "timestamp": self.timestamp.isoformat(),
        }
        if self.source:
            payload["source"] = self.source
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class ElementSummary:
    """Aggregated metrics for an elemental archetype."""

    element: Element
    sample_count: int
    total_weight: float
    average_score: float
    momentum: float
    top_sources: tuple[str, ...]
    last_seen_at: datetime | None

    @property
    def name(self) -> str:
        return self.element.value

    @property
    def intensity_percent(self) -> float:
        return round(self.average_score * 10, 2)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "element": self.name,
            "sample_count": self.sample_count,
            "total_weight": self.total_weight,
            "average_score": self.average_score,
            "momentum": self.momentum,
            "intensity_percent": self.intensity_percent,
            "top_sources": list(self.top_sources),
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }
        return payload


@dataclass(slots=True)
class ElementSnapshot:
    """Holistic elemental telemetry view."""

    total_samples: int
    readiness_index: float
    caution_index: float
    recovery_index: float
    dispersion: float
    dominant_element: str
    dominant_score: float
    dominant_level: str
    summaries: tuple[ElementSummary, ...]

    @property
    def balance_index(self) -> float:
        return round(self.readiness_index - self.caution_index, 4)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total_samples": self.total_samples,
            "readiness_index": self.readiness_index,
            "caution_index": self.caution_index,
            "recovery_index": self.recovery_index,
            "balance_index": self.balance_index,
            "dispersion": self.dispersion,
            "dominant_element": self.dominant_element,
            "dominant_score": self.dominant_score,
            "dominant_level": self.dominant_level,
            "summaries": [summary.as_dict() for summary in self.summaries],
        }


class DynamicElementAlgo:
    """Maintain rolling elemental contributions and compute aggregate metrics."""

    _READINESS_ELEMENTS = frozenset({Element.EARTH, Element.LIGHT})
    _CAUTION_ELEMENTS = frozenset({Element.FIRE, Element.WATER, Element.WIND, Element.LIGHTNING})
    _RECOVERY_ELEMENTS = frozenset({Element.DARKNESS})

    def __init__(
        self,
        *,
        window_size: int | None = 200,
        window_duration: timedelta | None = None,
    ) -> None:
        self.window_size = window_size
        self.window_duration = window_duration
        self._entries: Dict[Element, Deque[ElementContribution]] = {
            element: deque() for element in Element
        }

    # ------------------------------------------------------------- recording API
    def record(
        self,
        element: Element | str,
        score: float,
        *,
        weight: float = 1.0,
        source: str | None = None,
        timestamp: datetime | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> ElementContribution:
        """Record a weighted elemental score and return the canonical entry."""

        entry = ElementContribution(
            element=_coerce_element(element),
            score=score,
            weight=weight,
            source=source,
            timestamp=_coerce_timestamp(timestamp),
            metadata=metadata,
        )

        history = self._history_for(entry.element)
        history.append(entry)
        self._prune(history, reference=entry.timestamp)
        return entry

    # -------------------------------------------------------------- aggregators
    def summary(self, element: Element | str) -> ElementSummary:
        """Return the aggregated view for *element*."""

        resolved = _coerce_element(element)
        history = self._history_for(resolved)
        self._prune(history)

        if not history:
            return ElementSummary(
                element=resolved,
                sample_count=0,
                total_weight=0.0,
                average_score=0.0,
                momentum=0.0,
                top_sources=(),
                last_seen_at=None,
            )

        total_weight = sum(entry.weight for entry in history)
        weighted_score = sum(entry.score * entry.weight for entry in history)
        average = weighted_score / total_weight if total_weight > 0 else 0.0

        if len(history) >= 2:
            prior_entries = list(history)[:-1]
            previous_weight = sum(entry.weight for entry in prior_entries)
            if previous_weight > 0:
                previous_average = (
                    sum(entry.score * entry.weight for entry in prior_entries) / previous_weight
                )
            else:  # pragma: no cover - defensive guardrail
                previous_average = history[-1].score
            momentum = history[-1].score - previous_average
        else:
            momentum = 0.0

        source_counter: Counter[str] = Counter()
        for entry in history:
            if entry.source:
                source_counter[entry.source] += entry.weight

        top_sources = tuple(source for source, _ in source_counter.most_common(3))
        last_seen = history[-1].timestamp if history else None

        return ElementSummary(
            element=resolved,
            sample_count=len(history),
            total_weight=round(total_weight, 4),
            average_score=round(average, 4),
            momentum=round(momentum, 4),
            top_sources=top_sources,
            last_seen_at=last_seen,
        )

    def snapshot(self) -> ElementSnapshot:
        """Return a holistic snapshot across all elemental archetypes."""

        summaries = [self.summary(element) for element in Element]
        total_samples = sum(summary.sample_count for summary in summaries)

        if total_samples == 0:
            return ElementSnapshot(
                total_samples=0,
                readiness_index=0.0,
                caution_index=0.0,
                recovery_index=0.0,
                dispersion=0.0,
                dominant_element="neutral",
                dominant_score=0.0,
                dominant_level="stable",
                summaries=tuple(summaries),
            )

        readiness = self._average_for(summaries, self._READINESS_ELEMENTS)
        caution = self._average_for(summaries, self._CAUTION_ELEMENTS)
        recovery = self._average_for(summaries, self._RECOVERY_ELEMENTS)
        dispersion = self._dispersion(summaries)

        dominant_summary = max(
            summaries,
            key=lambda summary: (summary.average_score, -_element_order(summary.element)),
        )
        dominant_level = self._level_for(dominant_summary)

        return ElementSnapshot(
            total_samples=total_samples,
            readiness_index=round(readiness, 4),
            caution_index=round(caution, 4),
            recovery_index=round(recovery, 4),
            dispersion=round(dispersion, 4),
            dominant_element=dominant_summary.name,
            dominant_score=dominant_summary.average_score,
            dominant_level=dominant_level,
            summaries=tuple(summaries),
        )

    def state(self) -> MutableMapping[str, object]:
        """Return a dictionary representation suitable for JSON payloads."""

        snapshot = self.snapshot()
        return snapshot.as_dict()

    # ------------------------------------------------------------- maintenance
    def clear(self, element: Element | str | None = None) -> None:
        if element is None:
            for history in self._entries.values():
                history.clear()
            return

        resolved = _coerce_element(element)
        self._entries[resolved].clear()

    def elements(self) -> Iterable[Element]:
        return tuple(Element)

    def contributions(self, element: Element | str) -> Iterator[ElementContribution]:
        history = self._history_for(_coerce_element(element))
        return iter(tuple(history))

    # --------------------------------------------------------------- internals
    def _history_for(self, element: Element) -> Deque[ElementContribution]:
        return self._entries[element]

    def _prune(
        self,
        history: Deque[ElementContribution],
        *,
        reference: datetime | None = None,
    ) -> None:
        if self.window_size is not None:
            while len(history) > self.window_size:
                history.popleft()

        if self.window_duration is not None and history:
            base_time = reference or history[-1].timestamp
            cutoff = base_time - self.window_duration
            while history and history[0].timestamp < cutoff:
                history.popleft()

    def _average_for(
        self,
        summaries: Sequence[ElementSummary],
        elements: Iterable[Element],
    ) -> float:
        scores = [
            summary.average_score
            for summary in summaries
            if summary.element in elements and summary.sample_count > 0
        ]
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def _dispersion(self, summaries: Sequence[ElementSummary]) -> float:
        scores = [summary.average_score for summary in summaries]
        if all(score == scores[0] for score in scores):
            return 0.0
        return float(pstdev(scores))

    def _level_for(self, summary: ElementSummary) -> str:
        score = summary.average_score
        element = summary.element

        if element in self._READINESS_ELEMENTS:
            if score >= 7.0:
                return "peak"
            if score >= 4.0:
                return "building"
            return "nascent"

        if element in self._RECOVERY_ELEMENTS:
            if score >= 7.0:
                return "surging"
            if score >= 4.0:
                return "stabilising"
            return "recovering"

        if score >= 7.0:
            return "critical"
        if score >= 4.0:
            return "elevated"
        return "stable"

