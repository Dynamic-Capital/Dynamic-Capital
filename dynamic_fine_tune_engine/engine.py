"""Dynamic fine-tune dataset engine.

This module provides lightweight primitives for building and maintaining prompt /
completion corpora that can be streamed into model fine-tuning workflows.  The
engine focuses on three responsibilities:

* normalise inputs into a structured :class:`FineTuneRecord`,
* maintain a rolling window of high-signal records, and
* expose batching utilities that prioritise quality and freshness.

It purposely avoids prescribing storage backends or framework integrations so it
can be embedded in CLI tools, background workers, or notebooks.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Dict, Iterable, Iterator, List, Mapping, MutableMapping, Optional, Sequence, Tuple

__all__ = [
    "FineTuneRecord",
    "FineTuneRecordBatch",
    "DynamicFineTuneEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, field_name: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_tags(values: Sequence[str] | None) -> Tuple[str, ...]:
    if not values:
        return ()
    normalised: List[str] = []
    seen: set[str] = set()
    for item in values:
        candidate = item.strip()
        if not candidate:
            continue
        candidate = candidate.lower()
        if candidate not in seen:
            seen.add(candidate)
            normalised.append(candidate)
    return tuple(normalised)


def _coerce_mapping(payload: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if payload is None:
        return None
    if not isinstance(payload, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(payload)


@dataclass(slots=True)
class FineTuneRecord:
    """Single fine-tune ready example."""

    prompt: str
    completion: str
    source: str
    quality: float = 0.6
    priority: float = 0.5
    tags: Tuple[str, ...] = ()
    metadata: Mapping[str, object] | None = None
    created_at: datetime = field(default_factory=_utcnow)
    token_estimate: int | None = None
    _fingerprint: str = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.prompt = _normalise_text(self.prompt, field_name="prompt")
        self.completion = _normalise_text(self.completion, field_name="completion")
        self.source = _normalise_text(self.source, field_name="source")
        self.quality = max(0.0, min(1.0, float(self.quality)))
        self.priority = max(0.0, min(1.0, float(self.priority)))
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)
        if self.token_estimate is not None:
            estimate = int(self.token_estimate)
            self.token_estimate = max(estimate, 0)
        self._fingerprint = f"{self.prompt}\u241f{self.completion}"

    @property
    def fingerprint(self) -> str:
        """Stable identifier used for deduplication."""

        return self._fingerprint

    @property
    def score(self) -> float:
        """Composite scoring used for prioritisation."""

        return (self.quality * 0.7) + (self.priority * 0.3)

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "prompt": self.prompt,
            "completion": self.completion,
            "source": self.source,
            "quality": self.quality,
            "priority": self.priority,
            "tags": list(self.tags),
            "created_at": self.created_at.isoformat(),
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        if self.token_estimate is not None:
            payload["token_estimate"] = self.token_estimate
        return payload


@dataclass(slots=True)
class FineTuneRecordBatch:
    """Batch container returned by :class:`DynamicFineTuneEngine`."""

    records: Tuple[FineTuneRecord, ...]
    created_at: datetime = field(default_factory=_utcnow)
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)

    @property
    def size(self) -> int:
        return len(self.records)

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "created_at": self.created_at.isoformat(),
            "size": self.size,
            "records": [record.to_dict() for record in self.records],
        }
        if self.notes is not None:
            payload["notes"] = self.notes
        return payload


class DynamicFineTuneEngine:
    """Rolling dataset engine with prioritised batching."""

    def __init__(
        self,
        *,
        capacity: int = 1024,
        deduplicate: bool = True,
        decay: float = 0.1,
    ) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        if not 0 <= decay <= 1:
            raise ValueError("decay must be between 0 and 1")
        self.capacity = capacity
        self.deduplicate = deduplicate
        self.decay = float(decay)
        self._records: Deque[FineTuneRecord] = deque()
        self._fingerprints: set[str] = set()
        self._tag_counts: Counter[str] = Counter()
        self._source_scores: Dict[str, List[float]] = {}

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._records)

    def __iter__(self) -> Iterator[FineTuneRecord]:  # pragma: no cover - trivial
        return iter(self._records)

    def ingest(self, records: Iterable[FineTuneRecord | Mapping[str, object]]) -> int:
        """Normalise and store incoming records.

        Returns the number of accepted records.
        """

        accepted = 0
        for payload in records:
            record = self._coerce_record(payload)
            if self.deduplicate and record.fingerprint in self._fingerprints:
                continue
            self._evict_if_needed()
            self._records.append(record)
            self._register(record)
            accepted += 1
        return accepted

    def harvest(
        self,
        *,
        batch_size: int = 32,
        minimum_quality: float = 0.6,
        remove: bool = False,
        notes: Optional[str] = None,
    ) -> FineTuneRecordBatch:
        """Return a prioritised batch of records.

        Records are sorted by composite score with a light decay applied so that
        fresher entries are slightly favoured when scores tie.  When ``remove`` is
        ``True`` the harvested records are pruned from the rolling window.
        """

        if batch_size <= 0:
            raise ValueError("batch_size must be positive")
        minimum_quality = max(0.0, min(1.0, float(minimum_quality)))

        candidates: List[Tuple[float, FineTuneRecord]] = []
        for index, record in enumerate(self._records):
            if record.quality < minimum_quality:
                continue
            age_penalty = self.decay * index
            score = record.score - age_penalty
            candidates.append((score, record))

        candidates.sort(key=lambda item: item[0], reverse=True)
        selected_records = tuple(record for _, record in candidates[:batch_size])

        if remove and selected_records:
            retained: Deque[FineTuneRecord] = deque()
            selected_set = {record.fingerprint for record in selected_records}
            while self._records:
                record = self._records.popleft()
                if record.fingerprint in selected_set:
                    self._forget(record)
                    continue
                retained.append(record)
            self._records = retained

        return FineTuneRecordBatch(records=selected_records, notes=notes)

    def stats(self) -> Dict[str, object]:
        qualities = [record.quality for record in self._records]
        priorities = [record.priority for record in self._records]
        token_estimates = [
            record.token_estimate
            for record in self._records
            if record.token_estimate is not None
        ]
        return {
            "count": len(self._records),
            "capacity": self.capacity,
            "average_quality": fmean(qualities) if qualities else 0.0,
            "average_priority": fmean(priorities) if priorities else 0.0,
            "token_estimate_total": sum(token_estimates) if token_estimates else 0,
            "tag_histogram": dict(sorted(self._tag_counts.items())),
            "sources": {
                source: {
                    "count": len(scores),
                    "average_quality": fmean(scores) if scores else 0.0,
                }
                for source, scores in sorted(self._source_scores.items())
            },
        }

    def recent(self, limit: int = 5) -> Tuple[FineTuneRecord, ...]:
        if limit <= 0:
            raise ValueError("limit must be positive")
        return tuple(list(self._records)[-limit:])

    def clear(self) -> None:
        self._records.clear()
        self._fingerprints.clear()
        self._tag_counts.clear()
        self._source_scores.clear()

    def _coerce_record(self, payload: FineTuneRecord | Mapping[str, object]) -> FineTuneRecord:
        if isinstance(payload, FineTuneRecord):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("record payload must be a FineTuneRecord or mapping")
        data: MutableMapping[str, object] = dict(payload)
        return FineTuneRecord(
            prompt=str(data.get("prompt", "")),
            completion=str(data.get("completion", "")),
            source=str(data.get("source", "")),
            quality=float(data.get("quality", 0.6) or 0.0),
            priority=float(data.get("priority", 0.5) or 0.0),
            tags=tuple(data.get("tags", ()) or ()),
            metadata=_coerce_mapping(data.get("metadata")),
            created_at=data.get("created_at", _utcnow()),
            token_estimate=data.get("token_estimate"),
        )

    def _evict_if_needed(self) -> None:
        while len(self._records) >= self.capacity:
            record = self._records.popleft()
            self._forget(record)

    def _register(self, record: FineTuneRecord) -> None:
        self._fingerprints.add(record.fingerprint)
        for tag in record.tags:
            self._tag_counts[tag] += 1
        self._source_scores.setdefault(record.source, []).append(record.quality)

    def _forget(self, record: FineTuneRecord) -> None:
        self._fingerprints.discard(record.fingerprint)
        for tag in record.tags:
            current = self._tag_counts.get(tag, 0)
            if current <= 1:
                self._tag_counts.pop(tag, None)
            else:
                self._tag_counts[tag] = current - 1
        scores = self._source_scores.get(record.source)
        if scores:
            try:
                scores.remove(record.quality)
            except ValueError:  # pragma: no cover - defensive
                pass
            if not scores:
                self._source_scores.pop(record.source, None)

