"""Human resources and compensation playbooks.

This module packages the operational cadence for the people organisation so
team orchestration services can deliver consistent enablement across the desk.
Each playbook documents why the function exists, how the work happens, and what
value signals leaders should monitor.  The intent is to mirror the structure of
``DynamicTeamRoleSyncAlgorithm`` integrations already available for the executive team
while focusing on workforce health and compensation governance.
"""

from __future__ import annotations

from typing import Dict

from .desk_sync import DynamicTeamRoleSyncAlgorithm, TeamRolePlaybook

__all__ = [
    "PEOPLE_OPERATIONS_PLAYBOOK",
    "TALENT_ACQUISITION_PLAYBOOK",
    "TOTAL_REWARDS_PLAYBOOK",
    "PEOPLE_DEVELOPMENT_PLAYBOOK",
    "HUMAN_RESOURCES_PLAYBOOKS",
    "build_human_resources_playbooks",
    "build_human_resources_sync_algorithm",
]


PEOPLE_OPERATIONS_PLAYBOOK = TeamRolePlaybook(
    name="People Operations",
    objectives=(
        "Maintain accurate workforce data and employment compliance across jurisdictions",
        "Deliver responsive employee support channels with measurable satisfaction",
        "Operationalise onboarding, offboarding, and policy management for the trading desk",
    ),
    workflow=(
        "Daily: reconcile HRIS, payroll, and access management changes then resolve open support tickets",
        "Weekly: review onboarding / offboarding checklists with desk leads and remediate any policy gaps",
        "Monthly: publish workforce health metrics and compliance attestations to leadership",
        "Quarterly: audit vendor performance, update policies, and rehearse business continuity plans",
    ),
    outputs=(
        "Unified employee master dataset with change history",
        "Service desk performance report including SLA adherence",
        "Policy and compliance update digest distributed to leadership",
    ),
    kpis=(
        "Employee support satisfaction score",
        "Time to onboard / offboard",
        "Policy acknowledgement completion rate",
    ),
)


TALENT_ACQUISITION_PLAYBOOK = TeamRolePlaybook(
    name="Talent Acquisition",
    objectives=(
        "Source, assess, and hire talent aligned with Dynamic Capital's trading strategy",
        "Maintain a predictable recruiting funnel with measurable conversion milestones",
        "Partner with leadership on workforce planning and capability mapping",
    ),
    workflow=(
        "Daily: engage priority candidates and advance interviews through structured scorecards",
        "Weekly: sync with hiring managers on pipeline health, diversity metrics, and upcoming needs",
        "Monthly: refresh role marketing collateral and talent community programming",
        "Quarterly: recalibrate workforce plans using trading desk capacity models",
    ),
    outputs=(
        "Recruiting pipeline dashboard with stage conversion data",
        "Role profiles and competency matrices for open positions",
        "Quarterly workforce plan with hiring and sourcing recommendations",
    ),
    kpis=(
        "Time to fill critical roles",
        "Offer acceptance rate",
        "Pipeline diversity representation",
    ),
)


TOTAL_REWARDS_PLAYBOOK = TeamRolePlaybook(
    name="Total Rewards",
    objectives=(
        "Design equitable cash, token, and incentive structures tied to firm performance",
        "Maintain compensation compliance across jurisdictions and trading entities",
        "Provide scenario modelling that links compensation spend to treasury health",
    ),
    workflow=(
        "Weekly: reconcile payroll, token vesting, and incentive accruals with finance",
        "Monthly: benchmark roles against market data and adjust band guidance where required",
        "Quarterly: run compensation governance forums to approve adjustments and grants",
        "Annually: deliver compensation statements, tax documentation, and total rewards narratives",
    ),
    outputs=(
        "Compensation band library including fiat and token elements",
        "Scenario models mapping rewards decisions to budget impact",
        "Governance minutes with approved compensation actions",
    ),
    kpis=(
        "Budget variance of compensation spend",
        "Internal pay equity ratio",
        "Completion of compliance and reporting obligations",
    ),
)


PEOPLE_DEVELOPMENT_PLAYBOOK = TeamRolePlaybook(
    name="People Development",
    objectives=(
        "Equip leaders and contributors with growth frameworks tied to desk objectives",
        "Facilitate performance enablement rituals that reinforce accountability",
        "Measure engagement and retention signals to inform proactive interventions",
    ),
    workflow=(
        "Weekly: curate enablement resources and track participation across squads",
        "Monthly: coordinate performance conversations and pulse surveys with actionable follow-up",
        "Quarterly: synthesise engagement trends and recommend retention initiatives",
        "Annually: align development roadmaps with compensation and promotion cycles",
    ),
    outputs=(
        "Enablement calendar with learning assets and ownership",
        "Performance enablement tracker capturing commitments and outcomes",
        "Engagement intelligence report with retention risk signals",
    ),
    kpis=(
        "Programme participation rate",
        "Performance cycle completion on time",
        "Retention rate of critical talent",
    ),
)


HUMAN_RESOURCES_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (
        PEOPLE_OPERATIONS_PLAYBOOK,
        TALENT_ACQUISITION_PLAYBOOK,
        TOTAL_REWARDS_PLAYBOOK,
        PEOPLE_DEVELOPMENT_PLAYBOOK,
    )
}


def build_human_resources_playbooks() -> Dict[str, TeamRolePlaybook]:
    """Return a copy of the human resources playbooks keyed by role name."""

    return dict(HUMAN_RESOURCES_PLAYBOOKS)


def build_human_resources_sync_algorithm() -> DynamicTeamRoleSyncAlgorithm:
    """Return a ``DynamicTeamRoleSyncAlgorithm`` configured with HR playbooks."""

    return DynamicTeamRoleSyncAlgorithm(HUMAN_RESOURCES_PLAYBOOKS.values())
