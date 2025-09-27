"""Dynamic proof assembly toolkit for building compliance-ready attestations.

The module models proof requirements and supporting evidence for Dynamic Capital.
It helps teams ingest criteria, attach evidence, and compute coverage metrics that
highlight high-risk gaps ahead of investor or regulator reviews.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ProofCriterion",
    "EvidenceRecord",
    "ProofContext",
    "OutstandingCriterion",
    "EvidenceInsight",
    "ProofAssessment",
    "DynamicProofAssembler",
]


# ---------------------------------------------------------------------------
# Normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str, *, default: str = "") -> str:
    cleaned = value.strip().lower()
    return cleaned or default


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


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# Dataclass definitions


@dataclass(slots=True)
class ProofCriterion:
    """Single proof requirement that must be evidenced."""

    identifier: str
    description: str
    category: str = "general"
    weight: float = 1.0
    critical: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier)
        self.description = _normalise_text(self.description)
        self.category = _normalise_lower(self.category, default="general")
        self.weight = max(float(self.weight), 0.0)
        self.critical = bool(self.critical)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class EvidenceRecord:
    """Evidence submitted to satisfy a proof criterion."""

    criterion_id: str
    summary: str
    source: str
    confidence: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    link: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.criterion_id = _normalise_text(self.criterion_id)
        self.summary = _normalise_text(self.summary)
        self.source = _normalise_text(self.source)
        self.confidence = _clamp(float(self.confidence))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.link = _normalise_optional_text(self.link)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class ProofContext:
    """Contextual information for the proof engagement."""

    name: str
    owner: str
    review_horizon: str
    risk_rating: float
    reviewer: str | None = None
    status: str = "draft"
    tags: tuple[str, ...] = field(default_factory=tuple)
    notes: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.owner = _normalise_text(self.owner)
        self.review_horizon = _normalise_text(self.review_horizon)
        self.risk_rating = _clamp(float(self.risk_rating))
        self.reviewer = _normalise_optional_text(self.reviewer)
        self.status = _normalise_lower(self.status, default="draft")
        self.tags = _normalise_tags(self.tags)
        self.notes = _normalise_optional_text(self.notes)


@dataclass(slots=True)
class OutstandingCriterion:
    """Represents a missing or incomplete proof requirement."""

    identifier: str
    description: str
    critical: bool
    weight: float
    category: str
    tags: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "description": self.description,
            "critical": self.critical,
            "weight": self.weight,
            "category": self.category,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class EvidenceInsight:
    """Normalised view of a captured evidence record."""

    criterion_id: str
    summary: str
    source: str
    timestamp: datetime
    confidence: float
    link: str | None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "criterion_id": self.criterion_id,
            "summary": self.summary,
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "confidence": self.confidence,
            "link": self.link,
        }


@dataclass(slots=True)
class ProofAssessment:
    """Structured output capturing the current proof posture."""

    coverage_score: float
    satisfied_criteria: tuple[str, ...]
    outstanding_criteria: tuple[OutstandingCriterion, ...]
    high_risk_flags: tuple[str, ...]
    evidence_timeline: tuple[EvidenceInsight, ...]
    recommended_actions: tuple[str, ...]
    context: ProofContext | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "coverage_score": self.coverage_score,
            "satisfied_criteria": list(self.satisfied_criteria),
            "outstanding_criteria": [item.as_dict() for item in self.outstanding_criteria],
            "high_risk_flags": list(self.high_risk_flags),
            "evidence_timeline": [item.as_dict() for item in self.evidence_timeline],
            "recommended_actions": list(self.recommended_actions),
            "context": self.context.__dict__ if self.context else None,
        }


class DynamicProofAssembler:
    """Aggregate proof criteria and evidence to produce actionable assessments."""

    def __init__(self, *, context: ProofContext | None = None) -> None:
        self._criteria: dict[str, ProofCriterion] = {}
        self._evidence: list[EvidenceRecord] = []
        self._context = context

    @property
    def context(self) -> ProofContext | None:
        return self._context

    @context.setter
    def context(self, value: ProofContext | None) -> None:
        self._context = value

    def add_criterion(self, criterion: ProofCriterion) -> None:
        self._criteria[criterion.identifier] = criterion

    def ingest_criteria(self, criteria: Iterable[ProofCriterion]) -> None:
        for criterion in criteria:
            self.add_criterion(criterion)

    def add_evidence(self, evidence: EvidenceRecord) -> None:
        if evidence.criterion_id not in self._criteria:
            raise KeyError(f"unknown criterion: {evidence.criterion_id}")
        self._evidence.append(evidence)

    def ingest_evidence(self, evidence: Iterable[EvidenceRecord]) -> None:
        for record in evidence:
            self.add_evidence(record)

    def iter_criteria(self) -> tuple[ProofCriterion, ...]:
        return tuple(self._criteria.values())

    def iter_evidence(self) -> tuple[EvidenceRecord, ...]:
        return tuple(self._evidence)

    def _classify_high_risk(self, outstanding: Sequence[OutstandingCriterion], coverage: float) -> list[str]:
        flags: list[str] = []
        for item in outstanding:
            if item.critical:
                flags.append(f"Critical criterion '{item.identifier}' lacks evidence")
            elif item.weight >= 2.0:
                flags.append(f"High-weight criterion '{item.identifier}' remains open")
        if coverage < 0.5:
            flags.append("Overall coverage below 50%; escalate for rapid remediation")
        return flags

    def _recommend_actions(
        self,
        outstanding: Sequence[OutstandingCriterion],
        coverage: float,
    ) -> tuple[str, ...]:
        actions: list[str] = []
        if not outstanding:
            actions.append("Archive proof package and schedule periodic refresh cadence")
        else:
            outstanding_sorted = sorted(outstanding, key=lambda item: (not item.critical, -item.weight))
            for item in outstanding_sorted:
                urgency = "critical" if item.critical else "priority"
                actions.append(
                    f"Collect evidence for {urgency} criterion '{item.identifier}' in category '{item.category}'"
                )
        if coverage < 0.75:
            actions.append("Increase reviewer touchpoints until coverage exceeds 75%")
        return tuple(dict.fromkeys(actions))

    def build_assessment(self) -> ProofAssessment:
        total_weight = sum(criterion.weight for criterion in self._criteria.values())
        if total_weight == 0:
            coverage_score = 1.0 if self._criteria else 0.0
        else:
            satisfied_weight = 0.0
            satisfied_ids: set[str] = set()
            for record in self._evidence:
                criterion = self._criteria.get(record.criterion_id)
                if criterion and record.confidence >= 0.4:
                    if record.criterion_id not in satisfied_ids:
                        satisfied_weight += criterion.weight
                        satisfied_ids.add(record.criterion_id)
            coverage_score = satisfied_weight / total_weight if total_weight else 0.0

        satisfied_identifiers = tuple(sorted({record.criterion_id for record in self._evidence}))
        outstanding: list[OutstandingCriterion] = []
        for identifier, criterion in self._criteria.items():
            if identifier not in satisfied_identifiers:
                outstanding.append(
                    OutstandingCriterion(
                        identifier=identifier,
                        description=criterion.description,
                        critical=criterion.critical,
                        weight=criterion.weight,
                        category=criterion.category,
                        tags=criterion.tags,
                    )
                )

        outstanding_tuple = tuple(outstanding)
        high_risk_flags = tuple(self._classify_high_risk(outstanding_tuple, coverage_score))

        evidence_timeline = tuple(
            EvidenceInsight(
                criterion_id=record.criterion_id,
                summary=record.summary,
                source=record.source,
                timestamp=record.timestamp,
                confidence=record.confidence,
                link=record.link,
            )
            for record in sorted(self._evidence, key=lambda item: item.timestamp)
        )

        recommended_actions = self._recommend_actions(outstanding_tuple, coverage_score)

        return ProofAssessment(
            coverage_score=coverage_score,
            satisfied_criteria=satisfied_identifiers,
            outstanding_criteria=outstanding_tuple,
            high_risk_flags=tuple(high_risk_flags),
            evidence_timeline=evidence_timeline,
            recommended_actions=recommended_actions,
            context=self._context,
        )
