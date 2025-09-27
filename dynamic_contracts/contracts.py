"""Dynamic contract authoring primitives."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from math import exp
from statistics import fmean
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ContractClause",
    "ContractContext",
    "ContractDraft",
    "DynamicContractComposer",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str, *, empty_error: str) -> str:
    cleaned = str(value).strip()
    if not cleaned:
        raise ValueError(empty_error)
    return cleaned


def _normalise_lower(value: str, *, empty_error: str) -> str:
    return _normalise_text(value, empty_error=empty_error).lower()


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


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_datetime(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def _time_to_deadline(deadline: datetime | None, *, reference: datetime | None = None) -> timedelta | None:
    if deadline is None:
        return None
    anchor = reference or _utcnow()
    return deadline - anchor


def _decay(value: float, *, half_life_hours: float, age: timedelta | None) -> float:
    if not age:
        return value
    if age.total_seconds() <= 0:
        return value
    half_life_seconds = max(half_life_hours, 0.1) * 3600
    decay_factor = exp(-age.total_seconds() / half_life_seconds)
    return _clamp(value * decay_factor)


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class ContractClause:
    """A reusable clause fragment with meta assessment."""

    title: str
    body: str
    category: str
    importance: float = 0.5
    risk: float = 0.5
    negotiability: float = 0.5
    enforceability: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    references: tuple[str, ...] = field(default_factory=tuple)
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.title = _normalise_text(self.title, empty_error="clause title must be provided")
        self.body = _normalise_text(self.body, empty_error="clause body must be provided")
        self.category = _normalise_lower(self.category, empty_error="clause category must be provided")
        self.importance = _clamp(float(self.importance))
        self.risk = _clamp(float(self.risk))
        self.negotiability = _clamp(float(self.negotiability))
        self.enforceability = _clamp(float(self.enforceability))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.references = _normalise_tuple(self.references)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def is_high_risk(self) -> bool:
        return self.risk >= 0.7

    @property
    def is_material(self) -> bool:
        return self.importance >= 0.65

    @property
    def freshness(self) -> float:
        age = _utcnow() - self.timestamp
        return _decay(1.0, half_life_hours=72, age=age)


@dataclass(slots=True)
class ContractContext:
    """Mission profile for a contract negotiation."""

    jurisdiction: str
    industry: str
    counterparty_type: str
    urgency: float
    risk_tolerance: float
    relationship_stage: str
    required_tags: tuple[str, ...] = field(default_factory=tuple)
    prohibited_tags: tuple[str, ...] = field(default_factory=tuple)
    negotiation_focus: tuple[str, ...] = field(default_factory=tuple)
    amendment_deadline: datetime | None = None
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.jurisdiction = _normalise_lower(self.jurisdiction, empty_error="jurisdiction is required")
        self.industry = _normalise_lower(self.industry, empty_error="industry is required")
        self.counterparty_type = _normalise_lower(self.counterparty_type, empty_error="counterparty type is required")
        self.relationship_stage = _normalise_lower(self.relationship_stage, empty_error="relationship stage is required")
        self.urgency = _clamp(float(self.urgency))
        self.risk_tolerance = _clamp(float(self.risk_tolerance))
        self.required_tags = _normalise_tags(self.required_tags)
        self.prohibited_tags = _normalise_tags(self.prohibited_tags)
        self.negotiation_focus = _normalise_tags(self.negotiation_focus)
        self.amendment_deadline = _coerce_datetime(self.amendment_deadline)
        self.notes = _normalise_tuple(self.notes)

    @property
    def is_time_sensitive(self) -> bool:
        if self.urgency >= 0.7:
            return True
        deadline = self.amendment_deadline
        if deadline is None:
            return False
        window = _time_to_deadline(deadline)
        return window is not None and window.total_seconds() <= 72 * 3600

    @property
    def time_pressure_factor(self) -> float:
        if not self.amendment_deadline:
            return self.urgency
        window = _time_to_deadline(self.amendment_deadline)
        if not window:
            return 1.0
        hours = max(window.total_seconds() / 3600, 0.0)
        if hours >= 96:
            return self.urgency
        # map 0-96 hours into 1.0-urgency smoothly
        return _clamp(self.urgency + (1 - self.urgency) * (1 - hours / 96))


@dataclass(slots=True)
class ContractDraft:
    """Structured contract output ready for review."""

    title: str
    effective_date: datetime
    clauses: tuple[ContractClause, ...]
    highlights: tuple[str, ...]
    risk_notes: tuple[str, ...]
    negotiation_actions: tuple[str, ...]
    summary: str
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.title = _normalise_text(self.title, empty_error="draft title must be provided")
        if self.effective_date.tzinfo is None:
            self.effective_date = self.effective_date.replace(tzinfo=timezone.utc)
        else:
            self.effective_date = self.effective_date.astimezone(timezone.utc)
        self.clauses = tuple(self.clauses)
        self.highlights = _normalise_tuple(self.highlights)
        self.risk_notes = _normalise_tuple(self.risk_notes)
        self.negotiation_actions = _normalise_tuple(self.negotiation_actions)
        self.summary = _normalise_text(self.summary, empty_error="draft summary must be provided")
        self.metadata = _coerce_mapping(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "title": self.title,
            "effective_date": self.effective_date.isoformat(),
            "clauses": [clause.title for clause in self.clauses],
            "highlights": list(self.highlights),
            "risk_notes": list(self.risk_notes),
            "negotiation_actions": list(self.negotiation_actions),
            "summary": self.summary,
            "metadata": dict(self.metadata or {}),
        }


# ---------------------------------------------------------------------------
# core engine


class DynamicContractComposer:
    """Compose dynamic contract drafts from reusable clauses."""

    def __init__(self, clauses: Sequence[ContractClause] | None = None) -> None:
        self._catalogue: list[ContractClause] = []
        if clauses:
            for clause in clauses:
                self.ingest_clause(clause)

    def ingest_clause(self, clause: ContractClause) -> None:
        if not isinstance(clause, ContractClause):  # pragma: no cover - defensive guard
            raise TypeError("clause must be a ContractClause instance")
        self._catalogue.append(clause)

    @property
    def catalogue(self) -> tuple[ContractClause, ...]:
        return tuple(self._catalogue)

    def _filter_by_tags(self, clause: ContractClause, context: ContractContext) -> bool:
        tags = set(clause.tags)
        if context.prohibited_tags and tags.intersection(context.prohibited_tags):
            return False
        if context.required_tags and not context.required_tags.intersection(tags):
            return False
        return True

    def _score_clause(self, clause: ContractClause, context: ContractContext) -> float:
        base = clause.importance * 0.6 + clause.enforceability * 0.2 + clause.freshness * 0.2
        risk_alignment = 1 - abs(clause.risk - context.risk_tolerance)
        negotiability_weight = 1 - (clause.negotiability * 0.5)
        time_pressure = context.time_pressure_factor
        category_focus = 1.0
        if context.negotiation_focus and clause.category in context.negotiation_focus:
            category_focus = 1.15
        return _clamp(base * (0.7 + 0.3 * risk_alignment) * negotiability_weight * (0.8 + 0.2 * time_pressure) * category_focus)

    def _select_clauses(self, context: ContractContext, *, limit: int = 12) -> list[ContractClause]:
        candidates: list[tuple[float, ContractClause]] = []
        for clause in self._catalogue:
            if not self._filter_by_tags(clause, context):
                continue
            score = self._score_clause(clause, context)
            if score <= 0.05:
                continue
            candidates.append((score, clause))
        candidates.sort(key=lambda item: item[0], reverse=True)
        return [clause for _, clause in candidates[:limit]]

    def compose_draft(
        self,
        context: ContractContext,
        *,
        title: str,
        include_notes: Iterable[str] | None = None,
        effective_date: datetime | None = None,
    ) -> ContractDraft:
        if not self._catalogue:
            raise ValueError("no clauses have been ingested")

        selected_clauses = self._select_clauses(context)
        if not selected_clauses:
            raise ValueError("no clauses matched the provided context")

        highlights = tuple(clause.title for clause in selected_clauses[:5])
        risk_notes = tuple(
            f"Review {clause.title}: risk score {clause.risk:.2f} exceeds tolerance"
            for clause in selected_clauses
            if clause.risk - context.risk_tolerance >= 0.2
        )

        negotiation_actions = tuple(
            {
                action
                for clause in selected_clauses
                if clause.negotiability >= 0.55
                for action in (
                    f"Prepare fallback for {clause.title}",
                    (
                        f"Escalate {clause.title} to legal leadership"
                        if clause.is_high_risk
                        else f"Offer alternate language for {clause.title}"
                    ),
                )
            }
        )

        if include_notes:
            extra_notes = tuple(note.strip() for note in include_notes if note and note.strip())
        else:
            extra_notes = ()

        summary_bits: list[str] = [
            f"Draft tailored for {context.industry} in {context.jurisdiction}",
            f"Clauses selected: {len(selected_clauses)}",  # quick overview
            f"Average importance: {fmean(clause.importance for clause in selected_clauses):.2f}",
        ]
        if risk_notes:
            summary_bits.append(f"High-risk alerts: {len(risk_notes)}")
        if context.is_time_sensitive:
            summary_bits.append("Time-sensitive negotiation window")
        if context.negotiation_focus:
            summary_bits.append(
                "Focus areas: " + ", ".join(sorted(context.negotiation_focus))
            )
        if extra_notes:
            summary_bits.append(f"Context notes: {len(extra_notes)} added")

        summary = "; ".join(summary_bits)

        metadata: dict[str, object] = {
            "context_notes": list(context.notes + extra_notes),
            "selected_categories": sorted({clause.category for clause in selected_clauses}),
            "required_tags": list(context.required_tags),
            "prohibited_tags": list(context.prohibited_tags),
        }

        effective = effective_date or _utcnow()

        return ContractDraft(
            title=title,
            effective_date=effective,
            clauses=tuple(selected_clauses),
            highlights=highlights,
            risk_notes=risk_notes,
            negotiation_actions=negotiation_actions,
            summary=summary,
            metadata=metadata,
        )
