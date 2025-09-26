"""Executive leadership coordination playbooks.

This module captures the operating rhythm for the executive team so the
``TeamRoleSyncAlgorithm`` can expose consistent guidance to upstream
orchestrators.  Each playbook is intentionally verbose: the objectives focus on
why the role exists, the workflow documents how each leader executes, and the
outputs/KPIs provide tangible checkpoints for governance and automation.
"""

from __future__ import annotations

from typing import Dict

from .desk_sync import TeamRolePlaybook, TeamRoleSyncAlgorithm

__all__ = [
    "CEO_PLAYBOOK",
    "CFO_PLAYBOOK",
    "COO_PLAYBOOK",
    "EXECUTIVE_PLAYBOOKS",
    "build_executive_playbooks",
    "build_executive_sync_algorithm",
]


CEO_PLAYBOOK = TeamRolePlaybook(
    name="CEO",
    objectives=(
        "Set the firm's strategic direction with measurable investment theses",
        "Align cross-desk initiatives with the macro capital allocation plan",
        "Maintain stakeholder confidence through transparent communication",
    ),
    workflow=(
        "Weekly: synthesise macro, regulatory, and protocol intelligence to update the strategic backlog",
        "Bi-weekly: facilitate alignment reviews with desk leads and prioritise dependencies",
        "Monthly: communicate roadmap outcomes to investors, partners, and internal leadership",
        "Quarterly: evaluate portfolio performance and adjust multi-horizon objectives",
    ),
    outputs=(
        "Executive strategy briefings distributed to all desks",
        "Updated OKR tracker with decision rationale",
        "Investor communications pack highlighting progress and risks",
    ),
    kpis=(
        "Strategic initiative completion rate",
        "Stakeholder satisfaction scores",
        "Portfolio risk-adjusted return versus benchmarks",
    ),
)


CFO_PLAYBOOK = TeamRolePlaybook(
    name="CFO",
    objectives=(
        "Safeguard treasury health across fiat and digital asset exposures",
        "Optimise funding costs and liquidity runway for trading desks",
        "Deliver timely, audit-ready financial intelligence",
    ),
    workflow=(
        "Daily: reconcile cash, stablecoin, and token balances against custody platforms",
        "Weekly: analyse burn rate, protocol fee flows, and hedging coverage",
        "Monthly: prepare capital allocation guidance with scenario stress tests",
        "Quarterly: coordinate audits and compliance filings with legal advisors",
    ),
    outputs=(
        "Treasury dashboard with variance alerts and liquidity ladders",
        "Capital allocation memo with funding recommendations",
        "Financial statements and compliance packages",
    ),
    kpis=(
        "Liquidity coverage ratio",
        "Funding cost versus target",
        "Timeliness of reporting and audit readiness",
    ),
)


COO_PLAYBOOK = TeamRolePlaybook(
    name="COO",
    objectives=(
        "Operationalise the strategic roadmap into executable programmes",
        "Ensure desks adhere to risk, compliance, and automation standards",
        "Drive continuous improvement across workflows and tooling",
    ),
    workflow=(
        "Daily: monitor execution pipelines, incident queues, and automation health",
        "Weekly: run sprint reviews with operations, data, and engineering squads",
        "Monthly: update process playbooks and coordinate cross-desk enablement",
        "Quarterly: assess vendor performance and negotiate service improvements",
    ),
    outputs=(
        "Operations control centre dashboard with SLA compliance",
        "Sprint retrospectives and process improvement backlog",
        "Updated runbooks and automation change logs",
    ),
    kpis=(
        "Operational incident resolution time",
        "Automation reliability and SLA adherence",
        "Implementation velocity for process improvements",
    ),
)


EXECUTIVE_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (CEO_PLAYBOOK, CFO_PLAYBOOK, COO_PLAYBOOK)
}


def build_executive_playbooks() -> Dict[str, TeamRolePlaybook]:
    """Return a copy of the executive playbooks keyed by role name."""

    return dict(EXECUTIVE_PLAYBOOKS)


def build_executive_sync_algorithm() -> TeamRoleSyncAlgorithm:
    """Return a ``TeamRoleSyncAlgorithm`` configured with executive playbooks."""

    return TeamRoleSyncAlgorithm(EXECUTIVE_PLAYBOOKS.values())
