"""Dynamic Capital governance principle scaffolding."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Tuple

__all__ = ["GovernancePrinciple", "dynamic_governance_creation_principles", "summarise_principles"]


@dataclass(frozen=True, slots=True)
class GovernancePrinciple:
    """Single governance principle with judgement criteria.

    Attributes:
        name: Short name used in governance materials.
        mandate: The actionable intent that frames the principle.
        practices: Concrete practices or examples that demonstrate the principle.
        evaluations: Prompts or checks used when judging a proposal against the principle.
    """

    name: str
    mandate: str
    practices: Tuple[str, ...]
    evaluations: Tuple[str, ...]


def dynamic_governance_creation_principles() -> Tuple[GovernancePrinciple, ...]:
    """Return the Creation-Lens governance principles for Dynamic Capital."""

    return (
        GovernancePrinciple(
            name="Clarity",
            mandate="Define the problem, desired outcome, and what success looks like before drafting proposals.",
            practices=(
                "Write a one-page concept outlining problem, outcome, and options.",
                "Quantify success metrics that will anchor later reviews.",
                "Highlight affected committees and the governance class at intake.",
            ),
            evaluations=(
                "Is the problem statement explicit and grounded in facts?",
                "Are desired outcomes measurable and time bound?",
                "Do reviewers understand the scope, class, and guardrails before providing feedback?",
            ),
        ),
        GovernancePrinciple(
            name="Inclusion",
            mandate="Invite the right perspectives early to ideate widely and de-risk blind spots.",
            practices=(
                "Surface stakeholders and reviewers in the concept template before the draft stage.",
                "Collect written and async feedback during the 48–120 hour draft window.",
                "Document dissenting views in the proposal archive to inform future iterations.",
            ),
            evaluations=(
                "Were domain experts and impacted teams consulted before the vote?",
                "Does the record show how feedback shaped the proposal?",
                "Are community channels informed when proposals touch member-facing systems?",
            ),
        ),
        GovernancePrinciple(
            name="Evidence",
            mandate="Prototype small, test quickly, and base approvals on tangible experiments.",
            practices=(
                "Include pilot or rollout plans with explicit kill-switch criteria.",
                "Attach risk, finance, legal, and security checklists in the feasibility gate.",
                "Share dashboards or metrics from previous pilots during deliberation.",
            ),
            evaluations=(
                "Is there a pilot or proof-of-concept plan before committing to scale?",
                "Have risk, compliance, and treasury implications been reviewed?",
                "Does the team have data from tests or analogous initiatives to justify the decision?",
            ),
        ),
        GovernancePrinciple(
            name="Accountability",
            mandate="Document the decision path, assign owners, and clarify the execution runway.",
            practices=(
                "Freeze final motion text at the snapshot stage and capture it in the decision log.",
                "Record owners for execution, comms, and post-change reviews inside the RACI table.",
                "Set change tickets, runbooks, and treasury disbursement controls before the vote closes.",
            ),
            evaluations=(
                "Are responsibilities clear for implementation, comms, and audit follow-up?",
                "Is there a version-controlled artifact linking to the approvals and budgets?",
                "Do escalation paths exist if the proposal drifts off-scope or misses targets?",
            ),
        ),
        GovernancePrinciple(
            name="Learning",
            mandate="Measure outcomes, publish reviews, and adapt or roll back quickly when results miss targets.",
            practices=(
                "Schedule post-implementation reviews within seven days of execution.",
                "Track success metrics in the monthly council dashboard and townhall updates.",
                "Log lessons and archive outcomes alongside decision IDs for future proposals.",
            ),
            evaluations=(
                "Is there a defined review date with metrics to evaluate success?",
                "Are lessons learned captured and shared with governing bodies?",
                "Does the plan specify rollback criteria or iteration steps if metrics underperform?",
            ),
        ),
    )


def summarise_principles(principles: Iterable[GovernancePrinciple]) -> Tuple[str, ...]:
    """Return human readable summaries for principle digests."""

    return tuple(
        f"{principle.name}: {principle.mandate}"
        for principle in principles
    )
