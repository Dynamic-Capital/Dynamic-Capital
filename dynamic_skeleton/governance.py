"""Governance primitives for the Dynamic Skeleton layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Dict, Iterable, List, Optional


PROPOSAL_STATUS_DRAFT = "draft"
PROPOSAL_STATUS_VOTING = "voting"
PROPOSAL_STATUS_EXECUTED = "executed"
PROPOSAL_STATUS_REJECTED = "rejected"


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class Vote:
    """A weighted vote cast by a stakeholder."""

    voter_id: str
    support: bool
    weight: float = 1.0
    reason: Optional[str] = None
    timestamp: datetime = field(default_factory=_utcnow)


@dataclass
class Proposal:
    """Governance proposal tracked through its lifecycle."""

    proposal_id: str
    title: str
    description: str
    quorum: float = 0.0
    status: str = PROPOSAL_STATUS_DRAFT
    created_at: datetime = field(default_factory=_utcnow)
    votes: List[Vote] = field(default_factory=list)
    executed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    def record_vote(self, vote: Vote) -> None:
        self.votes.append(vote)


@dataclass
class AuditLogEntry:
    """Immutable log entry for governance actions."""

    proposal_id: str
    action: str
    actor: str
    timestamp: datetime = field(default_factory=_utcnow)
    details: Optional[Dict[str, object]] = None


class DynamicGovernanceAlgo:
    """Manage proposals, votes, and immutable audit records."""

    def __init__(self) -> None:
        self._proposals: Dict[str, Proposal] = {}
        self._audit_log: List[AuditLogEntry] = []

    def create_proposal(
        self,
        proposal_id: str,
        title: str,
        description: str,
        *,
        quorum: float = 0.0,
        actor: str = "system",
    ) -> Proposal:
        if proposal_id in self._proposals:
            raise ValueError(f"Proposal '{proposal_id}' already exists")

        proposal = Proposal(
            proposal_id=proposal_id,
            title=title,
            description=description,
            quorum=quorum,
        )
        self._proposals[proposal_id] = proposal
        self._record_audit(proposal_id, "created", actor, {"quorum": quorum})
        return proposal

    def open_voting(self, proposal_id: str, *, actor: str) -> Proposal:
        proposal = self._get_proposal_or_raise(proposal_id)
        if proposal.status != PROPOSAL_STATUS_DRAFT:
            raise ValueError("Only draft proposals can enter voting")

        proposal.status = PROPOSAL_STATUS_VOTING
        self._record_audit(proposal_id, "opened_voting", actor)
        return proposal

    def cast_vote(self, proposal_id: str, vote: Vote) -> Proposal:
        proposal = self._get_proposal_or_raise(proposal_id)
        if proposal.status != PROPOSAL_STATUS_VOTING:
            raise ValueError("Voting is not open for this proposal")

        proposal.record_vote(vote)
        self._record_audit(
            proposal_id,
            "vote_cast",
            vote.voter_id,
            {
                "support": vote.support,
                "weight": vote.weight,
            },
        )
        return proposal

    def tally_votes(self, proposal_id: str) -> Dict[str, float]:
        proposal = self._get_proposal_or_raise(proposal_id)
        support_weight = sum(v.weight for v in proposal.votes if v.support)
        against_weight = sum(v.weight for v in proposal.votes if not v.support)
        total_weight = support_weight + against_weight
        return {
            "support_weight": support_weight,
            "against_weight": against_weight,
            "total_weight": total_weight,
        }

    def finalize(self, proposal_id: str, *, actor: str) -> Proposal:
        proposal = self._get_proposal_or_raise(proposal_id)
        if proposal.status != PROPOSAL_STATUS_VOTING:
            raise ValueError("Only proposals in voting can be finalized")

        totals = self.tally_votes(proposal_id)
        if totals["total_weight"] < proposal.quorum:
            proposal.status = PROPOSAL_STATUS_REJECTED
            proposal.rejection_reason = "quorum_not_met"
        elif totals["support_weight"] > totals["against_weight"]:
            proposal.status = PROPOSAL_STATUS_EXECUTED
            proposal.executed_at = _utcnow()
        else:
            proposal.status = PROPOSAL_STATUS_REJECTED
            proposal.rejection_reason = "vote_failed"

        self._record_audit(
            proposal_id,
            "finalized",
            actor,
            {
                "status": proposal.status,
                "totals": totals,
                "rejection_reason": proposal.rejection_reason,
            },
        )
        return proposal

    def list_proposals(self) -> Iterable[Proposal]:
        return self._proposals.values()

    def get_audit_log(self, proposal_id: Optional[str] = None) -> List[AuditLogEntry]:
        if proposal_id is None:
            return list(self._audit_log)
        self._get_proposal_or_raise(proposal_id)
        return [entry for entry in self._audit_log if entry.proposal_id == proposal_id]

    def _get_proposal_or_raise(self, proposal_id: str) -> Proposal:
        if proposal_id not in self._proposals:
            raise KeyError(f"Unknown proposal '{proposal_id}'")
        return self._proposals[proposal_id]

    def _record_audit(
        self,
        proposal_id: str,
        action: str,
        actor: str,
        details: Optional[Dict[str, object]] = None,
    ) -> None:
        entry = AuditLogEntry(
            proposal_id=proposal_id,
            action=action,
            actor=actor,
            details=details,
        )
        self._audit_log.append(entry)
