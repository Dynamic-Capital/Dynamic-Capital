from __future__ import annotations

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from dynamic_kyc.registry import (  # noqa: E402
    DOCUMENT_STATUSES,
    DynamicKycRegistry,
    KYC_STATUSES,
    KycDocument,
    ParticipantProfile,
    RISK_LEVELS,
    ScreeningResult,
)


@pytest.fixture()
def registry() -> DynamicKycRegistry:
    return DynamicKycRegistry()


def test_register_participant_and_documents(registry: DynamicKycRegistry) -> None:
    profile = registry.register_participant(" user-1 ", " Alice Smith ", "sg")

    assert isinstance(profile, ParticipantProfile)
    assert profile.participant_id == "user-1"
    assert profile.legal_name == "Alice Smith"
    assert profile.residency_country == "SG"
    assert profile.status == "pending"

    document = registry.submit_document(
        "user-1",
        " Passport ",
        "P1234567",
        status="received",
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )

    assert isinstance(document, KycDocument)
    assert document.doc_type == "passport"
    assert document.status == "received"
    assert profile.documents_needing_review == [document]
    assert "document-review" in profile.flags

    registry.mark_document_verified("user-1", "P1234567")
    assert document.status == "verified"
    assert profile.documents_needing_review == []
    assert "document-review" not in profile.flags

    with pytest.raises(ValueError):
        registry.register_participant("user-1", "Duplicate", "us")

    with pytest.raises(ValueError):
        registry.submit_document("user-1", "", "invalid")


def test_screening_updates_risk_and_flags(registry: DynamicKycRegistry) -> None:
    profile = registry.register_participant("cust-22", "Bob Treasury", "ie")

    assert profile.risk_level == "low"

    hit = registry.record_screening_hit(
        "cust-22",
        provider="ComplyAdvantage",
        severity=0.85,
        description="Possible sanctions exposure",
        tags=("Sanctions",),
    )

    assert isinstance(hit, ScreeningResult)
    assert hit.is_positive is True
    assert profile.risk_level in {"high", "prohibited"}
    assert "watchlist-hit" in profile.flags
    assert profile.status == "in_review"

    # Second hit should push score towards prohibited but remain clamped
    registry.record_screening_hit(
        "cust-22",
        provider="Chainalysis",
        severity=0.9,
        description="Confirmed watchlist match",
        tags=("watchlist", "pep"),
    )

    assert profile.risk_score <= 1.0
    assert profile.risk_level in {"high", "prohibited"}
    assert profile.positive_screening_count == 2

    dashboard = registry.generate_dashboard()
    assert dashboard["total_participants"] == 1
    assert dashboard["status_counts"][profile.status] == 1
    assert dashboard["watchlist_hits"] == 2
    assert dashboard["flagged_participants"] == 1


def test_documents_due_for_refresh_and_status_filters(registry: DynamicKycRegistry) -> None:
    profile = registry.register_participant("kyc-3", "Carla Ops", "ca", status="in_review")
    expired_doc = registry.submit_document(
        "kyc-3",
        "Utility Bill",
        "UB-1",
        status="received",
        expires_at=datetime.now(UTC) - timedelta(days=1),
    )

    upcoming_doc = registry.submit_document(
        "kyc-3",
        "Drivers License",
        "DL-9",
        status="verified",
        expires_at=datetime.now(UTC) + timedelta(days=3),
    )

    # The verified document is fine today but should flag within the 7-day window
    due_now = registry.documents_needing_refresh()
    assert (profile.participant_id, expired_doc) in due_now
    assert all(isinstance(item[1], KycDocument) for item in due_now)

    due_soon = registry.documents_needing_refresh(within_days=7)
    assert (profile.participant_id, upcoming_doc) in due_soon

    pending_status = registry.participants_by_status("in_review")
    assert pending_status == [profile]

    flagged = registry.flagged_participants()
    assert profile in flagged

    dashboard = registry.generate_dashboard()
    assert dashboard["documents_pending_review"] >= 1
    assert set(dashboard["status_counts"]) == KYC_STATUSES
    assert set(dashboard["risk_levels"]) == set(RISK_LEVELS)


def test_validation_guards(registry: DynamicKycRegistry) -> None:
    profile = registry.register_participant("val-1", "Donna Checks", "fr")

    with pytest.raises(ValueError):
        profile.update_status("unknown")

    with pytest.raises(ValueError):
        profile.add_note("   ")

    with pytest.raises(ValueError):
        KycDocument("", "id")

    with pytest.raises(ValueError):
        ScreeningResult("Provider", "", 0.1)

    with pytest.raises(ValueError):
        KycDocument("Passport", "ID", status="invalid")

    with pytest.raises(ValueError):
        registry.register_participant("unique", "Name", "us", status="invalid")

    assert DOCUMENT_STATUSES == {"pending", "received", "verified", "rejected", "expired"}
    assert KYC_STATUSES >= {"pending", "approved"}
