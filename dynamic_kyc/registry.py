"""Dynamic KYC lifecycle management primitives."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "KYC_STATUSES",
    "DOCUMENT_STATUSES",
    "RISK_LEVELS",
    "KycDocument",
    "ScreeningResult",
    "ParticipantProfile",
    "DynamicKycRegistry",
]


KYC_STATUSES = {"pending", "in_review", "approved", "rejected", "suspended"}
DOCUMENT_STATUSES = {"pending", "received", "verified", "rejected", "expired"}
RISK_LEVELS = ("low", "medium", "high", "prohibited")
WATCHLIST_TAGS = {"pep", "sanctions", "watchlist", "adverse-media"}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str, *, field: str = "value") -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field} must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_country(value: str) -> str:
    cleaned = _normalise_text(value, field="residency_country")
    return cleaned.upper()


def _normalise_status(value: str) -> str:
    cleaned = _normalise_text(value, field="status").lower()
    if cleaned not in KYC_STATUSES:
        raise ValueError(f"Unsupported KYC status '{value}'")
    return cleaned


def _normalise_document_status(value: str) -> str:
    cleaned = _normalise_text(value, field="document status").lower()
    if cleaned not in DOCUMENT_STATUSES:
        raise ValueError(f"Unsupported document status '{value}'")
    return cleaned


def _normalise_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


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


def _normalise_flag(flag: str) -> str:
    return _normalise_text(flag, field="flag").lower()


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class KycDocument:
    """Proof document submitted as part of KYC."""

    doc_type: str
    identifier: str
    status: str = "pending"
    expires_at: datetime | None = None
    issued_at: datetime | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.doc_type = _normalise_text(self.doc_type, field="doc_type").lower()
        self.identifier = _normalise_text(self.identifier, field="identifier")
        self.status = _normalise_document_status(self.status)
        if self.expires_at is not None:
            self.expires_at = _normalise_datetime(self.expires_at)
        if self.issued_at is not None:
            self.issued_at = _normalise_datetime(self.issued_at)
        self.metadata = _coerce_mapping(self.metadata)

    def update_status(self, status: str) -> None:
        self.status = _normalise_document_status(status)

    def mark_verified(self) -> None:
        self.status = "verified"

    def mark_rejected(self) -> None:
        self.status = "rejected"

    def is_expired(self, *, within_days: int = 0, reference_time: datetime | None = None) -> bool:
        if self.expires_at is None:
            return False
        reference = reference_time or _utcnow()
        reference = _normalise_datetime(reference)
        if within_days > 0:
            reference = reference + timedelta(days=within_days)
        return self.expires_at <= reference

    @property
    def needs_review(self) -> bool:
        return self.status in {"pending", "received", "rejected", "expired"} or self.is_expired()


@dataclass(slots=True)
class ScreeningResult:
    """Outcome of an AML / sanctions screening."""

    provider: str
    description: str
    severity: float
    tags: tuple[str, ...] = field(default_factory=tuple)
    timestamp: datetime = field(default_factory=_utcnow)
    reference_id: str | None = None

    def __post_init__(self) -> None:
        self.provider = _normalise_text(self.provider, field="provider")
        self.description = _normalise_text(self.description, field="description")
        self.severity = _clamp(float(self.severity))
        self.tags = _normalise_tags(self.tags)
        self.timestamp = _normalise_datetime(self.timestamp)
        self.reference_id = _normalise_optional_text(self.reference_id)

    @property
    def is_positive(self) -> bool:
        return self.severity >= 0.5 or any(tag in WATCHLIST_TAGS for tag in self.tags)


@dataclass(slots=True)
class ParticipantProfile:
    """State container for a participant progressing through KYC."""

    participant_id: str
    legal_name: str
    residency_country: str
    status: str = "pending"
    risk_score: float = 0.0
    documents: list[KycDocument] = field(default_factory=list)
    screenings: list[ScreeningResult] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    flags: set[str] = field(default_factory=set)
    assigned_officer: str | None = None
    last_updated: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.participant_id = _normalise_text(self.participant_id, field="participant_id")
        self.legal_name = _normalise_text(self.legal_name, field="legal_name")
        self.residency_country = _normalise_country(self.residency_country)
        self.status = _normalise_status(self.status)
        self.risk_score = _clamp(float(self.risk_score))
        self.assigned_officer = _normalise_optional_text(self.assigned_officer)
        self.last_updated = _normalise_datetime(self.last_updated)

    @property
    def risk_level(self) -> str:
        score = self.risk_score
        if score >= 0.9:
            return "prohibited"
        if score >= 0.7:
            return "high"
        if score >= 0.35:
            return "medium"
        return "low"

    @property
    def has_positive_hit(self) -> bool:
        return any(result.is_positive for result in self.screenings)

    @property
    def documents_needing_review(self) -> list[KycDocument]:
        return [document for document in self.documents if document.needs_review]

    @property
    def positive_screening_count(self) -> int:
        return sum(1 for result in self.screenings if result.is_positive)

    @property
    def latest_screening(self) -> ScreeningResult | None:
        if not self.screenings:
            return None
        return self.screenings[-1]

    def update_status(self, status: str) -> None:
        self.status = _normalise_status(status)
        self.last_updated = _utcnow()

    def update_risk(self, score: float) -> None:
        self.risk_score = _clamp(score)
        self.last_updated = _utcnow()

    def add_document(self, document: KycDocument) -> None:
        self.documents.append(document)
        self.last_updated = _utcnow()

    def add_screening(self, result: ScreeningResult) -> None:
        self.screenings.append(result)
        self.last_updated = _utcnow()

    def add_note(self, note: str) -> None:
        cleaned = _normalise_text(note, field="note")
        self.notes.append(cleaned)
        self.last_updated = _utcnow()

    def add_flag(self, flag: str) -> None:
        self.flags.add(_normalise_flag(flag))
        self.last_updated = _utcnow()

    def clear_flag(self, flag: str) -> None:
        self.flags.discard(_normalise_flag(flag))
        self.last_updated = _utcnow()

    def requires_manual_review(self) -> bool:
        return (
            self.has_positive_hit
            or self.risk_level in {"high", "prohibited"}
            or bool(self.documents_needing_review)
            or "manual-review" in self.flags
        )


class DynamicKycRegistry:
    """Registry that orchestrates KYC onboarding across participants."""

    def __init__(self) -> None:
        self._participants: Dict[str, ParticipantProfile] = {}

    # ------------------------------------------------------------------
    # participant lifecycle

    def register_participant(
        self,
        participant_id: str,
        legal_name: str,
        residency_country: str,
        *,
        status: str = "pending",
        risk_score: float = 0.0,
        assigned_officer: str | None = None,
    ) -> ParticipantProfile:
        key = _normalise_text(participant_id, field="participant_id")
        if key in self._participants:
            raise ValueError(f"Participant '{key}' already registered")
        profile = ParticipantProfile(
            participant_id=key,
            legal_name=legal_name,
            residency_country=residency_country,
            status=status,
            risk_score=risk_score,
            assigned_officer=assigned_officer,
        )
        self._participants[key] = profile
        return profile

    def get_participant(self, participant_id: str) -> ParticipantProfile:
        key = _normalise_text(participant_id, field="participant_id")
        try:
            return self._participants[key]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"Unknown participant '{participant_id}'") from exc

    # ------------------------------------------------------------------
    # document handling

    def submit_document(
        self,
        participant_id: str,
        doc_type: str,
        identifier: str,
        *,
        status: str = "pending",
        expires_at: datetime | None = None,
        issued_at: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> KycDocument:
        profile = self.get_participant(participant_id)
        document = KycDocument(
            doc_type=doc_type,
            identifier=identifier,
            status=status,
            expires_at=expires_at,
            issued_at=issued_at,
            metadata=metadata,
        )
        profile.add_document(document)
        if document.needs_review:
            profile.add_flag("document-review")
        else:
            profile.clear_flag("document-review")
        return document

    def mark_document_verified(self, participant_id: str, identifier: str) -> KycDocument:
        profile = self.get_participant(participant_id)
        for document in profile.documents:
            if document.identifier == identifier:
                document.mark_verified()
                if not profile.documents_needing_review:
                    profile.clear_flag("document-review")
                return document
        raise KeyError(f"Document '{identifier}' not found for participant '{participant_id}'")

    def documents_needing_refresh(self, *, within_days: int = 0) -> list[tuple[str, KycDocument]]:
        due: list[tuple[str, KycDocument]] = []
        for profile in self._participants.values():
            for document in profile.documents:
                if document.is_expired(within_days=within_days) or document.needs_review:
                    due.append((profile.participant_id, document))
        return due

    # ------------------------------------------------------------------
    # screening & risk management

    def record_screening_hit(
        self,
        participant_id: str,
        provider: str,
        severity: float,
        description: str,
        *,
        tags: Sequence[str] | None = None,
        reference_id: str | None = None,
    ) -> ScreeningResult:
        profile = self.get_participant(participant_id)
        previous_score = profile.risk_score
        result = ScreeningResult(
            provider=provider,
            description=description,
            severity=severity,
            tags=tags or (),
            reference_id=reference_id,
        )
        profile.add_screening(result)
        updated_score = self._calculate_risk(previous_score, profile.screenings, result)
        profile.update_risk(updated_score)
        if result.is_positive:
            profile.add_flag("watchlist-hit")
            if profile.status == "pending":
                profile.update_status("in_review")
        return result

    def _calculate_risk(
        self,
        previous_score: float,
        screenings: Sequence[ScreeningResult],
        latest: ScreeningResult,
    ) -> float:
        historical_positive = sum(1 for result in screenings if result.is_positive)
        watchlist_tags = {
            tag for result in screenings for tag in result.tags if tag in WATCHLIST_TAGS
        }
        base_component = previous_score * 0.5
        severity_component = latest.severity * (0.9 if latest.is_positive else 0.4)
        history_component = min(historical_positive * 0.08, 0.24)
        tag_component = min(len(watchlist_tags) * 0.05, 0.2)
        score = base_component + severity_component + history_component + tag_component
        return _clamp(score)

    # ------------------------------------------------------------------
    # analytics

    def participants(self) -> Iterable[ParticipantProfile]:
        return tuple(self._participants.values())

    def participants_by_status(self, status: str) -> list[ParticipantProfile]:
        normalised = _normalise_status(status)
        return [profile for profile in self._participants.values() if profile.status == normalised]

    def flagged_participants(self) -> list[ParticipantProfile]:
        return [
            profile
            for profile in self._participants.values()
            if profile.has_positive_hit
            or profile.risk_level in {"high", "prohibited"}
            or bool(profile.documents_needing_review)
            or "manual-review" in profile.flags
        ]

    def generate_dashboard(self) -> MutableMapping[str, object]:
        status_counts = {status: 0 for status in KYC_STATUSES}
        risk_counts = {level: 0 for level in RISK_LEVELS}
        watchlist_hits = 0
        documents_pending = 0
        for profile in self._participants.values():
            status_counts[profile.status] += 1
            risk_counts[profile.risk_level] += 1
            watchlist_hits += profile.positive_screening_count
            documents_pending += len(profile.documents_needing_review)
        return {
            "total_participants": len(self._participants),
            "status_counts": status_counts,
            "risk_levels": risk_counts,
            "watchlist_hits": watchlist_hits,
            "documents_pending_review": documents_pending,
            "flagged_participants": len(self.flagged_participants()),
        }

    def reset(self) -> None:
        self._participants.clear()
