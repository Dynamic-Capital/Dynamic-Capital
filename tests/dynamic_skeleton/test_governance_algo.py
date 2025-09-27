from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from dynamic_skeleton.governance import (  # noqa: E402
    PROPOSAL_STATUS_DRAFT,
    PROPOSAL_STATUS_EXECUTED,
    PROPOSAL_STATUS_REJECTED,
    AuditLogEntry,
    DynamicGovernanceAlgo,
    Vote,
)


@pytest.fixture()
def governance() -> DynamicGovernanceAlgo:
    return DynamicGovernanceAlgo()


def test_governance_happy_path(governance: DynamicGovernanceAlgo) -> None:
    proposal = governance.create_proposal(
        "upgrade-1",
        "Upgrade consensus",
        "Introduce zk-proof attestation",
        quorum=3.0,
        actor="alice",
    )

    assert proposal.status == PROPOSAL_STATUS_DRAFT

    governance.open_voting("upgrade-1", actor="bob")

    governance.cast_vote("upgrade-1", Vote(voter_id="alice", support=True, weight=2.0))
    governance.cast_vote("upgrade-1", Vote(voter_id="carol", support=True, weight=1.5))
    governance.cast_vote("upgrade-1", Vote(voter_id="dave", support=False, weight=0.5))

    finalized = governance.finalize("upgrade-1", actor="bob")

    assert finalized.status == PROPOSAL_STATUS_EXECUTED
    assert finalized.executed_at is not None

    totals = governance.tally_votes("upgrade-1")
    assert totals == {"support_weight": pytest.approx(3.5), "against_weight": pytest.approx(0.5), "total_weight": pytest.approx(4.0)}

    log_entries = governance.get_audit_log("upgrade-1")
    actions = [entry.action for entry in log_entries]
    assert actions == ["created", "opened_voting", "vote_cast", "vote_cast", "vote_cast", "finalized"]

    # audit entries should be immutable snapshots
    for entry in log_entries:
        assert isinstance(entry, AuditLogEntry)
        assert isinstance(entry.timestamp, datetime)


def test_governance_rejected_on_quorum(governance: DynamicGovernanceAlgo) -> None:
    governance.create_proposal(
        "policy-1",
        "Change fee policy",
        "Lower transaction fees",
        quorum=5.0,
        actor="alice",
    )

    governance.open_voting("policy-1", actor="alice")
    governance.cast_vote("policy-1", Vote(voter_id="eve", support=True, weight=2.0))

    finalized = governance.finalize("policy-1", actor="frank")

    assert finalized.status == PROPOSAL_STATUS_REJECTED
    assert finalized.rejection_reason == "quorum_not_met"
    assert finalized.executed_at is None

    totals = governance.tally_votes("policy-1")
    assert totals["total_weight"] == pytest.approx(2.0)

    with pytest.raises(KeyError):
        governance.get_audit_log("missing")

    all_entries = governance.get_audit_log()
    assert any(entry.proposal_id == "policy-1" for entry in all_entries)


def test_governance_prevents_invalid_transitions(governance: DynamicGovernanceAlgo) -> None:
    governance.create_proposal("ops-1", "Ops", "", quorum=1.0, actor="alice")

    with pytest.raises(ValueError):
        governance.finalize("ops-1", actor="alice")

    governance.open_voting("ops-1", actor="bob")
    governance.cast_vote("ops-1", Vote(voter_id="alice", support=False, weight=1.0))

    finalized = governance.finalize("ops-1", actor="bob")

    assert finalized.status == PROPOSAL_STATUS_REJECTED
    assert finalized.rejection_reason == "vote_failed"

    with pytest.raises(ValueError):
        governance.open_voting("ops-1", actor="bob")
