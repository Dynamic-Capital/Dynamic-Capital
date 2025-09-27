"""Signal synthesis for Dynamic Proof of Reputation."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicProofOfReputation",
    "ReputationProfile",
    "ReputationProof",
    "ReputationSignal",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


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


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _coerce_score(value: float | int) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("score must be numeric") from exc
    if not -1.0 <= score <= 1.0:
        raise ValueError("score must be between -1.0 and 1.0")
    return score


def _coerce_weight(value: float | int) -> float:
    try:
        weight = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("weight must be numeric") from exc
    if weight <= 0:
        raise ValueError("weight must be positive")
    return weight


def _coerce_confidence(value: float | int) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("confidence must be numeric") from exc
    if not 0.0 <= confidence <= 1.0:
        raise ValueError("confidence must be between 0.0 and 1.0")
    return confidence


def _coerce_signal(value: ReputationSignal | Mapping[str, object]) -> ReputationSignal:
    if isinstance(value, ReputationSignal):
        return value
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("signal must be a ReputationSignal or mapping")
    return ReputationSignal(**value)


@dataclass(slots=True)
class ReputationSignal:
    """A single endorsement, critique, or attestment affecting reputation."""

    subject: str
    source: str
    score: float
    weight: float = 1.0
    confidence: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    summary: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.subject = _normalise_identifier(self.subject)
        self.source = _normalise_identifier(self.source)
        self.score = _coerce_score(self.score)
        self.weight = _coerce_weight(self.weight)
        self.confidence = _coerce_confidence(self.confidence)
        self.timestamp = _ensure_utc(self.timestamp)
        self.tags = _normalise_tags(self.tags)
        self.summary = _normalise_optional_text(self.summary)
        self.metadata = _coerce_metadata(self.metadata)

    def weighted_score(self) -> float:
        return self.score * self.weight * self.confidence

    def influence(self) -> float:
        return self.weight * self.confidence

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "subject": self.subject,
            "source": self.source,
            "score": self.score,
            "weight": self.weight,
            "confidence": self.confidence,
            "timestamp": self.timestamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": self.tags,
            "summary": self.summary,
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class ReputationProfile:
    """Aggregated state for an entity's reputation."""

    subject: str
    trust_score: float
    confidence: float
    total_influence: float
    positive_contributions: float
    negative_contributions: float
    sources: tuple[str, ...]
    tags: tuple[str, ...]
    last_updated: datetime | None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "subject": self.subject,
            "trust_score": self.trust_score,
            "confidence": self.confidence,
            "total_influence": self.total_influence,
            "positive_contributions": self.positive_contributions,
            "negative_contributions": self.negative_contributions,
            "sources": self.sources,
            "tags": self.tags,
            "last_updated": self.last_updated.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            if self.last_updated
            else None,
        }


@dataclass(slots=True)
class ReputationProof:
    """Digest suitable for external verification of reputation."""

    subject: str
    trust_score: float
    confidence: float
    total_signals: int
    issued_at: datetime
    sources: tuple[str, ...]
    tags: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "subject": self.subject,
            "trust_score": self.trust_score,
            "confidence": self.confidence,
            "total_signals": self.total_signals,
            "issued_at": self.issued_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sources": self.sources,
            "tags": self.tags,
        }


class DynamicProofOfReputation:
    """Synthesises signals into resilient reputation attestations."""

    _TOLERANCE = 1e-9

    def __init__(self) -> None:
        self._signals: dict[str, list[ReputationSignal]] = {}

    def record(self, signal: ReputationSignal | Mapping[str, object]) -> ReputationSignal:
        entry = _coerce_signal(signal)
        bucket = self._signals.setdefault(entry.subject, [])
        if bucket and entry.timestamp < bucket[-1].timestamp:
            raise ValueError("signals must be recorded in chronological order")
        bucket.append(entry)
        return entry

    def record_many(self, signals: Iterable[ReputationSignal | Mapping[str, object]]) -> None:
        staged = [_coerce_signal(signal) for signal in signals]
        for signal in staged:
            self.record(signal)

    def subjects(self) -> tuple[str, ...]:
        return tuple(sorted(self._signals))

    def signals(self, subject: str) -> tuple[ReputationSignal, ...]:
        normalised = _normalise_identifier(subject)
        return tuple(self._signals.get(normalised, ()))

    def profile(self, subject: str) -> ReputationProfile:
        normalised = _normalise_identifier(subject)
        entries = self._signals.get(normalised, [])
        if not entries:
            return ReputationProfile(
                subject=normalised,
                trust_score=0.5,
                confidence=0.0,
                total_influence=0.0,
                positive_contributions=0.0,
                negative_contributions=0.0,
                sources=(),
                tags=(),
                last_updated=None,
            )

        total_weighted = sum(entry.weighted_score() for entry in entries)
        total_influence = sum(entry.influence() for entry in entries)
        if total_influence <= self._TOLERANCE:
            trust_score = 0.5
        else:
            average_score = total_weighted / max(total_influence, self._TOLERANCE)
            trust_score = max(0.0, min(1.0, (average_score + 1.0) / 2.0))

        positive = sum(
            entry.weighted_score() for entry in entries if entry.weighted_score() > 0
        )
        negative = sum(
            -entry.weighted_score() for entry in entries if entry.weighted_score() < 0
        )
        sources = tuple(sorted({entry.source for entry in entries}))
        tags = tuple(sorted({tag for entry in entries for tag in entry.tags}))
        last_updated = entries[-1].timestamp
        confidence = min(1.0, total_influence / (total_influence + 5.0))
        return ReputationProfile(
            subject=normalised,
            trust_score=trust_score,
            confidence=confidence,
            total_influence=total_influence,
            positive_contributions=positive,
            negative_contributions=negative,
            sources=sources,
            tags=tags,
            last_updated=last_updated,
        )

    def generate_proof(self, subject: str) -> ReputationProof:
        profile = self.profile(subject)
        entries = self._signals.get(profile.subject, [])
        issued_at = entries[-1].timestamp if entries else _utcnow()
        return ReputationProof(
            subject=profile.subject,
            trust_score=profile.trust_score,
            confidence=profile.confidence,
            total_signals=len(entries),
            issued_at=issued_at,
            sources=profile.sources,
            tags=profile.tags,
        )

    def verify_proof(self, proof: ReputationProof) -> bool:
        regenerated = self.generate_proof(proof.subject)
        return (
            abs(proof.trust_score - regenerated.trust_score) <= self._TOLERANCE
            and abs(proof.confidence - regenerated.confidence) <= self._TOLERANCE
            and proof.total_signals == regenerated.total_signals
            and proof.sources == regenerated.sources
            and proof.tags == regenerated.tags
        )
