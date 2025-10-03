"""Team operations playbooks and multi-LLM alignment utilities."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .desk_sync import DynamicTeamRoleSyncAlgorithm, TeamRolePlaybook
from .multi_llm import (
    LLMConfig,
    LLMRun,
    collect_strings,
    parse_json_response,
    serialise_runs,
)
from .playbook_training import (
    PlaybookTrainingExample,
    build_playbook_training_dataset,
    optimise_playbook,
)

__all__ = [
    "MARKETING_PLAYBOOKS",
    "COMMUNITY_PLAYBOOKS",
    "DEVELOPMENT_PLAYBOOKS",
    "OPERATIONS_PLAYBOOKS",
    "OPTIONAL_PLAYBOOKS",
    "TEAM_OPERATIONS_PLAYBOOKS",
    "build_team_operations_playbooks",
    "build_team_operations_sync_algorithm",
    "build_team_workflows",
    "TeamOperationsAlignmentReport",
    "TeamOperationsLLMPlanner",
]


# ---------------------------------------------------------------------------
# Marketing team
# ---------------------------------------------------------------------------

MARKETING_STRATEGIST_PLAYBOOK = TeamRolePlaybook(
    name="Marketing Strategist",
    objectives=(
        "Align channel squads on revenue, growth, and capital allocation targets.",
        "Translate leadership directives and pipeline forecasts into actionable priorities.",
        "Maintain an evolving opportunity and risk register tied to KPI movements.",
    ),
    workflow=(
        "Pull the latest KPI dashboard and compute week-over-week deltas; flag deviations exceeding ±10%.",
        "Review leadership directives and pipeline forecasts, annotating must-win initiatives and constraints.",
        "Rank flagged opportunities and risks using impact × confidence scoring to focus weekly execution.",
        "Draft and circulate the strategy brief covering focus areas, channel targets, budget envelopes, and success metrics.",
        "Chase acknowledgements within 12 hours and escalate overdue confirmations to the VP Growth.",
        "Refresh KPI deltas mid-cycle; issue course-correction memos when deviations persist beyond tolerance.",
        "Archive hypothesis → result → decision logs and tag the Data Analyst for validation each cycle.",
    ),
    outputs=(
        "Weekly strategy brief",
        "Updated OKR status",
        "Budget allocation log",
        "Opportunity and risk register",
    ),
    kpis=(
        "Pipeline velocity",
        "Customer acquisition cost",
        "Budget burn versus plan",
        "Campaign return on investment",
    ),
)


CONTENT_CREATOR_PLAYBOOK = TeamRolePlaybook(
    name="Content Creator / Copywriter",
    objectives=(
        "Deliver compliant, on-brand assets mapped to funnel stages and personas.",
        "Move assets through the approval pipeline rapidly while capturing reviewer feedback.",
        "Log performance annotations and learnings that inform future creative work.",
    ),
    workflow=(
        "Parse strategist briefs and map requested assets to funnel stages and target personas.",
        "Draft outlines covering headline, hook, CTA, SEO keywords, and visual direction for each asset.",
        "Run brand voice and legal compliance checks prior to submission; revise immediately if gaps emerge.",
        "Submit drafts to the CMS with metadata and route through the approval workflow from Draft to Scheduled.",
        "Incorporate reviewer feedback the same day; document iteration history alongside approvals.",
        "Within 48 hours of publish, log performance snapshots and annotate learnings in the knowledge base.",
    ),
    outputs=(
        "Approved copy and assets",
        "CMS metadata tags",
        "Performance annotations",
    ),
    kpis=(
        "Asset velocity",
        "Approval cycle time",
        "Click-through rate",
        "Conversion rate per asset",
    ),
)


SOCIAL_MEDIA_MANAGER_PLAYBOOK = TeamRolePlaybook(
    name="Social Media Manager",
    objectives=(
        "Maximise reach, engagement, and attributable conversions across social channels.",
        "Maintain responsive escalation handling aligned with sentiment thresholds.",
        "Continuously iterate posting windows and experiments alongside marketing leadership.",
    ),
    workflow=(
        "Import approved assets and craft channel-specific variants including copy length and creative crops.",
        "Schedule batches of posts during optimal send windows determined by engagement analytics.",
        "Attach tracked URLs ensuring attribution parameters remain accurate across channels.",
        "Monitor dashboards in two-hour intervals; respond to sentiment drops or escalations per the matrix.",
        "Capture anomalies or viral spikes with context notes in the daily engagement log.",
        "Publish the weekly performance digest summarising reach, engagement, and experiments.",
    ),
    outputs=(
        "Scheduled content calendar",
        "Daily engagement log",
        "Weekly performance summary",
    ),
    kpis=(
        "Engagement rate",
        "Share of voice",
        "Follower growth",
        "Conversion-attributed clicks",
    ),
)


PARTNERSHIPS_MANAGER_PLAYBOOK = TeamRolePlaybook(
    name="Influencer and Partnerships Manager",
    objectives=(
        "Source, activate, and scale high ROI partnerships aligned with campaign goals.",
        "Maintain rigorous negotiation, delivery, and performance tracking workflows.",
        "Lead retrospectives that inform renewals, nurtures, or exits per partner tier.",
    ),
    workflow=(
        "Filter partner CRM entries by campaign fit, historical ROI, and audience overlap to produce a ranked shortlist.",
        "Personalise outreach sequences with value propositions and launch cadences inside the CRM platform.",
        "Negotiate deliverables and compensation, logging all terms, deadlines, and stakeholders in the CRM.",
        "Coordinate asset delivery, approvals, and tracking link distribution for every partner activation.",
        "During campaigns collect performance metrics, updating partner scorecards with reach, conversions, and CPA.",
        "Host retrospectives post-campaign to decide whether to renew, nurture, or sunset each partnership.",
    ),
    outputs=(
        "Ranked partner shortlist",
        "Outreach sequences",
        "Signed agreements and compliance documentation",
        "Performance recap deck",
    ),
    kpis=(
        "Partner activation rate",
        "Cost per acquisition",
        "Retention of top-tier partners",
        "Campaign ROI",
    ),
)


SEO_SPECIALIST_PLAYBOOK = TeamRolePlaybook(
    name="SEO and Paid Ads Specialist",
    objectives=(
        "Drive qualified traffic and conversions at an efficient blended cost.",
        "Maintain experimentation pipelines with clear guardrails and reporting.",
        "Document optimisation decisions with traceable change logs and hypotheses.",
    ),
    workflow=(
        "Synchronise keyword and paid media dashboards; flag anomalies beyond ±15% variance from targets.",
        "Prioritise optimisation actions using impact versus effort scoring and update backlog entries with owners.",
        "Execute technical fixes, bid adjustments, or creative refreshes while logging each change and rationale.",
        "Launch experiments with defined success metrics, guardrails, and monitoring windows; auto-pause on breach.",
        "Review spend daily and reallocate budget from under-performing campaigns to top performers.",
        "Compile the weekly optimisation report for strategist and data analyst stakeholders.",
    ),
    outputs=(
        "Optimisation backlog",
        "Change log updates",
        "A/B test reports",
        "Budget reallocation notes",
    ),
    kpis=(
        "Organic traffic growth",
        "Quality score",
        "Cost per acquisition / ROAS",
        "Experiment win rate",
    ),
)


MARKETING_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (
        MARKETING_STRATEGIST_PLAYBOOK,
        CONTENT_CREATOR_PLAYBOOK,
        SOCIAL_MEDIA_MANAGER_PLAYBOOK,
        PARTNERSHIPS_MANAGER_PLAYBOOK,
        SEO_SPECIALIST_PLAYBOOK,
    )
}


# ---------------------------------------------------------------------------
# Community management team
# ---------------------------------------------------------------------------

COMMUNITY_MANAGER_PLAYBOOK = TeamRolePlaybook(
    name="Community Manager",
    objectives=(
        "Maintain healthy community sentiment and membership growth across channels.",
        "Coordinate events, announcements, and feedback loops with marketing and product.",
        "Run incident escalation workflows that protect brand reputation and responsiveness.",
    ),
    workflow=(
        "Update the community calendar with launches, AMAs, and events while assigning owners and deadlines.",
        "Preload FAQ packets and asset folders for each scheduled announcement and verify readiness.",
        "Monitor sentiment dashboards daily; activate incident playbooks when negative sentiment rises over 10% in 24 hours.",
        "Host weekly syncs with moderators and support specialists to resolve escalations and share insights.",
        "Route community feedback into product or marketing backlogs with documented follow-up owners.",
        "Publish a weekly health digest covering growth metrics, top discussions, escalations, and next actions.",
    ),
    outputs=(
        "Community calendar",
        "Incident reports",
        "Weekly health digest",
        "Advocacy opportunities list",
    ),
    kpis=(
        "Sentiment index",
        "Community growth rate",
        "Escalation resolution time",
        "Advocacy conversion",
    ),
)


MODERATOR_PLAYBOOK = TeamRolePlaybook(
    name="Moderator",
    objectives=(
        "Enforce community guidelines consistently and within SLA commitments.",
        "Document incidents with evidence for auditability and pattern recognition.",
        "Collaborate on policy improvements with community management leadership.",
    ),
    workflow=(
        "Sweep the flagged content queue every 30 minutes prioritising highest severity first.",
        "Review each item against policy matrices; escalate ambiguous cases to the community manager within 10 minutes.",
        "Capture evidence such as screenshots and links, attaching them to the incident log before resolution.",
        "Verify pending reversals, appeals, or unmutes before closing each shift's queue.",
        "Submit a shift summary detailing incident counts, repeat offenders, and policy improvement suggestions.",
    ),
    outputs=(
        "Cleared flag queue",
        "Incident log",
        "Policy improvement suggestions",
    ),
    kpis=(
        "Queue response time",
        "Recurrence rate",
        "Policy breach frequency",
        "Appeal turnaround",
    ),
)


CUSTOMER_SUPPORT_PLAYBOOK = TeamRolePlaybook(
    name="Customer Support Specialist",
    objectives=(
        "Resolve user issues rapidly while protecting SLAs and satisfaction benchmarks.",
        "Surface actionable product feedback drawn from ticket and escalation trends.",
        "Maintain an evolving knowledge base with accurate macros and FAQs.",
    ),
    workflow=(
        "Auto-triage incoming tickets by severity and category; claim assignments within SLA windows.",
        "Respond using macros or tailored replies referencing knowledge base articles and context.",
        "Escalate P0 and P1 tickets immediately to the DevOps or Product channel and record the timestamp.",
        "After resolution, confirm with the user, capture satisfaction ratings, and close tickets with feedback tags.",
        "Review closed tickets weekly to identify FAQ gaps and propose knowledge base updates for approval.",
        "Publish a weekly trends report summarising top issues, product feedback, and SLA adherence.",
    ),
    outputs=(
        "Resolved tickets",
        "Escalations log",
        "Weekly trends report",
        "Updated FAQs",
    ),
    kpis=(
        "First response time",
        "Resolution time",
        "Customer satisfaction",
        "Escalation rate",
    ),
)


COMMUNITY_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (
        COMMUNITY_MANAGER_PLAYBOOK,
        MODERATOR_PLAYBOOK,
        CUSTOMER_SUPPORT_PLAYBOOK,
    )
}


# ---------------------------------------------------------------------------
# Development team
# ---------------------------------------------------------------------------

FRONTEND_DEVELOPER_PLAYBOOK = TeamRolePlaybook(
    name="Front-End Developer",
    objectives=(
        "Ship accessible, performant user experiences backed by automated tests.",
        "Collaborate closely with design and product to clarify acceptance criteria.",
        "Maintain documentation and changelog artefacts for released features.",
    ),
    workflow=(
        "Select the highest priority ticket and clarify acceptance criteria with product and design counterparts.",
        "Break work into sub-tasks and track progress via issue checklist entries.",
        "Implement UI using shared components and design tokens, running accessibility linting as changes land.",
        "Author unit and integration tests covering new logic alongside failure paths.",
        "Execute lint, typecheck, and test suites locally; remediate failures prior to pushing commits.",
        "Capture before/after screenshots or demo clips to attach to the pull request description.",
        "Submit the pull request with rollout notes and respond to review feedback within 24 hours.",
        "Verify staging deployment post-merge and update the changelog with user-facing notes.",
    ),
    outputs=(
        "Merged pull requests",
        "Test artefacts",
        "Changelog entries",
        "Demo notes",
    ),
    kpis=(
        "Lead time for changes",
        "PR review turnaround",
        "Test coverage",
        "Accessibility compliance",
    ),
)


BACKEND_DEVELOPER_PLAYBOOK = TeamRolePlaybook(
    name="Back-End Developer",
    objectives=(
        "Deliver reliable services with observability, testing, and rollback plans.",
        "Protect performance budgets and service level objectives across releases.",
        "Maintain up-to-date documentation and runbooks for each service change.",
    ),
    workflow=(
        "Assess proposed changes for schema or contract impact and document plans including rollback steps.",
        "Implement code alongside comprehensive unit and integration tests covering negative paths.",
        "Add instrumentation aligned to service level objectives capturing metrics, logs, and traces.",
        "Run load or performance tests on critical endpoints, addressing regressions exceeding five percent.",
        "Deploy through progressive rollout stages (canary → staged → full) while monitoring telemetry dashboards.",
        "Update API documentation, communicate breaking changes, and log runbook revisions after release.",
    ),
    outputs=(
        "Service updates",
        "Migration scripts",
        "API documentation",
        "Runbook revisions",
    ),
    kpis=(
        "Error rate",
        "Latency",
        "Deployment frequency",
        "Change failure rate",
    ),
)


BLOCKCHAIN_DEVELOPER_PLAYBOOK = TeamRolePlaybook(
    name="Blockchain Developer",
    objectives=(
        "Produce secure, auditable smart contracts with efficient gas usage.",
        "Codify invariants, testing, and audit workflows for every deployment.",
        "Coordinate monitoring and incident readiness post-launch.",
    ),
    workflow=(
        "Draft contract architecture with explicit invariants and upgrade strategy for security review.",
        "Implement smart contracts using defensive patterns, inline documentation, and version tracking.",
        "Develop unit, property-based, and invariant tests covering critical behaviours.",
        "Run static analysis, linting, and fuzzing; remediate findings before progressing to testnet deployment.",
        "Deploy to testnet with scripts, executing scenario simulations and halting on invariant failures.",
        "Coordinate audits, track findings through closure, and prepare deployment scripts for mainnet release.",
        "Launch with multisig approval and configure real-time monitoring for gas usage and anomalous activity.",
        "Maintain post-deployment response plans and incident playbooks.",
    ),
    outputs=(
        "Contract codebase",
        "Unit and property tests",
        "Audit reports",
        "Deployment scripts and monitoring alerts",
    ),
    kpis=(
        "Audit finding closure rate",
        "Gas efficiency",
        "Incident response time",
        "Contract uptime",
    ),
)


DYNAMIC_LANGUAGES_EXPERT_PLAYBOOK = TeamRolePlaybook(
    name="Dynamic Languages Expert",
    objectives=(
        "Bridge product requirements across TypeScript, Python, JavaScript, HTML, PL/pgSQL, CSS, Pine Script, and MQL5 stacks.",
        "Codify reusable patterns, linting, and testing strategies that maintain parity across dynamic runtimes.",
        "Coach teams on interoperability, deployment readiness, and documentation for multi-language features.",
    ),
    workflow=(
        "Review upcoming initiatives for cross-language touchpoints and draft implementation plans covering each runtime and datastore.",
        "Prototype shared utilities or bindings that harmonise data contracts between browser clients, Python services, and PL/pgSQL procedures.",
        "Pair with front-end contributors to align TypeScript, JavaScript, HTML, and CSS changes with accessibility and performance budgets.",
        "Audit algorithmic updates for Python, Pine Script, and MQL5 to ensure indicator parity, risk controls, and backtest reproducibility.",
        "Run automated lint, type, and unit suites across all affected codebases; raise defects and patch gaps before review.",
        "Document interoperability guidelines, deployment runbooks, and language-specific caveats for the knowledge base.",
    ),
    outputs=(
        "Cross-language implementation plans",
        "Shared utility modules and templates",
        "Test and lint reports spanning dynamic runtimes",
        "Knowledge base updates on interoperability patterns",
    ),
    kpis=(
        "Cross-language feature cycle time",
        "Defect rate across coordinated releases",
        "Automation coverage for dynamic language stacks",
        "Adoption of shared utilities and playbooks",
    ),
)


UI_UX_DESIGNER_PLAYBOOK = TeamRolePlaybook(
    name="UI/UX Designer",
    objectives=(
        "Produce user-validated designs anchored in design system tokens.",
        "Facilitate rapid iteration loops between research, design, and engineering.",
        "Document handoff artefacts and knowledge base updates for future reuse.",
    ),
    workflow=(
        "Translate product briefs into user flows and low-fidelity wireframes for stakeholder alignment.",
        "Elevate approved flows into high-fidelity prototypes using design system tokens and accessibility checklists.",
        "Conduct usability tests with target personas, iterating when scores fall below benchmark thresholds.",
        "Package design specifications covering layouts, tokens, and interaction notes for development handoff.",
        "Pair with front-end developers during implementation reviews to ensure fidelity.",
        "Archive final assets and document research learnings inside the design knowledge base.",
    ),
    outputs=(
        "Wireframes and prototypes",
        "Design specifications",
        "Usability reports",
        "Token updates",
    ),
    kpis=(
        "Usability score",
        "Design cycle time",
        "Handoff quality",
        "Component reuse rate",
    ),
)


DEVOPS_ENGINEER_PLAYBOOK = TeamRolePlaybook(
    name="DevOps Engineer",
    objectives=(
        "Ensure resilient infrastructure, rapid incident response, and frictionless releases.",
        "Automate monitoring, security scanning, and compliance evidence capture.",
        "Lead operational readiness reviews and cost optimisation initiatives.",
    ),
    workflow=(
        "Review real-time alerts and incident backlogs daily, prioritising remediation by severity and SLA.",
        "Audit upcoming releases for infrastructure dependencies and update infrastructure-as-code modules as needed.",
        "Run security and compliance scans, logging findings with owners and due dates.",
        "Monitor SLO dashboards during release windows; trigger rollback protocols if error budgets degrade.",
        "Document release outcomes, update runbooks, and schedule resilience tests when gaps surface.",
        "Conduct weekly capacity and cost reviews, recommending optimisation actions to leadership.",
    ),
    outputs=(
        "Deployment runbooks",
        "Updated pipelines",
        "Incident postmortems",
        "Compliance reports",
    ),
    kpis=(
        "System uptime",
        "Deployment success rate",
        "Mean time to recovery",
        "Infrastructure cost efficiency",
    ),
)


QUALITY_ASSURANCE_PLAYBOOK = TeamRolePlaybook(
    name="Quality Assurance",
    objectives=(
        "Safeguard product quality with risk-based testing aligned to release goals.",
        "Maintain fast feedback loops by automating high-value regression suites.",
        "Provide actionable insights on defects, coverage, and readiness to ship.",
    ),
    workflow=(
        "Review iteration goals, critical user journeys, and recent incidents to refine the test strategy.",
        "Update automation suites and exploratory charters focusing on high-risk areas and new capabilities.",
        "Execute smoke and regression suites on every build; file defects with reproducible steps and severity.",
        "Pair with developers to reproduce and isolate issues, validating fixes within the same cycle.",
        "Track coverage, defect trends, and flake rates; escalate blocking quality risks immediately.",
        "Publish release readiness summaries including open defects, test evidence, and sign-off status.",
    ),
    outputs=(
        "Risk-based test plan",
        "Automated and exploratory test results",
        "Defect log with remediation status",
        "Release readiness summary",
    ),
    kpis=(
        "Defect escape rate",
        "Automation pass rate",
        "Mean time to validate fixes",
        "Critical defect closure time",
    ),
)


GENERAL_DEVELOPMENT_PLAYBOOK = TeamRolePlaybook(
    name="General Development",
    objectives=(
        "Deliver cross-functional iteration work that accelerates product outcomes.",
        "Support teammates by filling gaps across stack, process, and documentation needs.",
        "Continuously reduce tech debt while maintaining shipping momentum.",
    ),
    workflow=(
        "Clarify objectives and unblockers across squads; pull the highest impact tasks lacking an owner.",
        "Pair with specialists to progress stories outside their primary domains and capture key learnings.",
        "Implement changes with tests, docs, and telemetry ensuring standards remain consistent.",
        "Proactively tackle tech debt tickets when cycle slack appears, documenting rationale and outcomes.",
        "Facilitate async status updates highlighting progress, blockers, and support provided to peers.",
        "Log retrospectives on cross-functional work and propose improvements to tooling or process.",
    ),
    outputs=(
        "Multi-domain implementation notes",
        "Pull request summaries with linked evidence",
        "Updated documentation or runbooks",
        "Tech debt remediation log",
    ),
    kpis=(
        "Cross-team blocker resolution time",
        "Cycle time for generalist tickets",
        "Documentation completeness",
        "Tech debt reduction velocity",
    ),
)


DEVELOPMENT_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (
        FRONTEND_DEVELOPER_PLAYBOOK,
        BACKEND_DEVELOPER_PLAYBOOK,
        BLOCKCHAIN_DEVELOPER_PLAYBOOK,
        DYNAMIC_LANGUAGES_EXPERT_PLAYBOOK,
        UI_UX_DESIGNER_PLAYBOOK,
        DEVOPS_ENGINEER_PLAYBOOK,
    )
}


# ---------------------------------------------------------------------------
# Administrative and support team
# ---------------------------------------------------------------------------

PROJECT_MANAGER_PLAYBOOK = TeamRolePlaybook(
    name="Project Manager",
    objectives=(
        "Coordinate roadmap execution, resource alignment, and risk mitigation across squads.",
        "Provide transparent status communication and stakeholder updates.",
        "Continuously improve retrospectives and dependency management.",
    ),
    workflow=(
        "Consolidate roadmap and backlog items, ranking initiatives by impact, effort, and strategic alignment.",
        "Validate resource availability, adjusting scope or negotiating trade-offs when conflicts arise.",
        "Run kickoff ceremonies that define milestones, owners, and communication cadences.",
        "Maintain real-time status dashboards; trigger unblock sessions when progress slips beyond 10% of plan.",
        "Facilitate weekly stakeholder updates summarising wins, blockers, decisions, and next steps.",
        "Lead retrospectives capturing action items, assign owners with due dates, and track to completion.",
    ),
    outputs=(
        "Sprint plan",
        "Dependency tracker",
        "Status updates",
        "Retrospective notes",
        "Risk register updates",
    ),
    kpis=(
        "On-time delivery rate",
        "Blocker resolution time",
        "Stakeholder satisfaction",
        "Action item completion rate",
    ),
)


DATA_ANALYST_PLAYBOOK = TeamRolePlaybook(
    name="Data Analyst",
    objectives=(
        "Deliver trustworthy insights and automated reporting for stakeholders.",
        "Guard data quality through monitoring, audits, and remediation workflows.",
        "Translate analytics learnings into action with well-documented briefs.",
    ),
    workflow=(
        "Intake analytics requests via ticket form, clarifying business questions, required metrics, and deadlines.",
        "Audit source data for freshness and quality; pause work and open remediation tasks when thresholds fail.",
        "Develop or update data models with version control and automated schema or logic tests.",
        "Build dashboards or analyses that document metric definitions and ownership.",
        "Review insights with stakeholders, capturing decisions and follow-up actions for accountability.",
        "Automate recurring analyses via scheduled jobs and update the data dictionary accordingly.",
    ),
    outputs=(
        "Validated datasets",
        "Dashboards",
        "Insight briefs",
        "Data dictionary updates",
        "Automation scripts",
    ),
    kpis=(
        "Dashboard adoption",
        "Data freshness SLA",
        "Defect rate",
        "Insight-to-action conversion",
    ),
)


LEGAL_ADVISOR_PLAYBOOK = TeamRolePlaybook(
    name="Legal Advisor",
    objectives=(
        "Safeguard compliance and mitigate legal risks across initiatives.",
        "Deliver timely contract reviews and regulatory guidance.",
        "Maintain training materials and risk matrices aligned with leadership expectations.",
    ),
    workflow=(
        "Monitor regulatory feeds, logging relevant changes in the compliance tracker with affected teams.",
        "Prioritise contract reviews by risk and urgency, applying the standardised risk checklist and escalating edge cases.",
        "Issue mitigation guidance with required disclosures, approvals, and implementation steps.",
        "Track implementation of legal recommendations, confirming completion prior to launches.",
        "Maintain the compliance repository and deliver quarterly training or updates to stakeholders.",
        "Review incident reports or escalations, updating the risk matrix and playbooks with lessons learned.",
    ),
    outputs=(
        "Reviewed contracts",
        "Compliance guidance",
        "Risk mitigation plans",
        "Training materials",
    ),
    kpis=(
        "Review turnaround time",
        "Compliance incident rate",
        "Training completion",
        "Risk mitigation adherence",
    ),
)


OPERATIONS_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (
        PROJECT_MANAGER_PLAYBOOK,
        DATA_ANALYST_PLAYBOOK,
        LEGAL_ADVISOR_PLAYBOOK,
    )
}


# ---------------------------------------------------------------------------
# Optional and scaling roles
# ---------------------------------------------------------------------------

GROWTH_HACKER_PLAYBOOK = TeamRolePlaybook(
    name="Growth Hacker",
    objectives=(
        "Validate high-leverage growth experiments rapidly and systematically.",
        "Maintain a prioritised backlog that balances velocity with guardrail protection.",
        "Document experiment learnings into reusable playbooks for the wider team.",
    ),
    workflow=(
        "Score the experiment backlog weekly using ICE or RICE models plus strategic alignment tags.",
        "Draft experiment briefs detailing hypothesis, metrics, guardrails, and resource needs for top candidates.",
        "Secure approvals and resources, logging decision history before launching tests.",
        "Launch experiments with tracking plans and monitor guardrails daily, auto-stopping when breached.",
        "At decision windows, run statistical analysis to determine ship, iterate, or kill outcomes.",
        "Archive results with documentation that feeds validated tactics into the roadmap and knowledge base.",
    ),
    outputs=(
        "Prioritised experiment queue",
        "Experiment briefs",
        "Win/loss documentation",
        "Integrated playbooks",
    ),
    kpis=(
        "Experiment velocity",
        "Win rate",
        "Incremental growth impact",
        "Time to decision",
    ),
)


SECURITY_SPECIALIST_PLAYBOOK = TeamRolePlaybook(
    name="Security Specialist",
    objectives=(
        "Maintain a strong security posture and rapid incident response capability.",
        "Coordinate remediation efforts across teams with clear SLAs and reporting.",
        "Lead preparedness drills, penetration testing, and training programmes.",
    ),
    workflow=(
        "Review vulnerability feeds and scan outputs daily, prioritising items by severity and exploitability.",
        "Assign remediation tasks to owning teams and enforce SLA tracking with automated reminders.",
        "Conduct penetration tests or tabletop exercises quarterly, logging findings and action items.",
        "Update incident response playbooks and coordinate drills with DevOps and Legal counterparts.",
        "During incidents, lead triage, containment, and communications while documenting the timeline.",
        "Publish monthly security posture reports alongside training updates for stakeholders.",
    ),
    outputs=(
        "Remediation plans",
        "Incident reports",
        "Security posture dashboard",
        "Training updates",
    ),
    kpis=(
        "Mean time to remediate",
        "Incident frequency",
        "Compliance score",
        "Training completion",
    ),
)


LOCAL_COMMUNITY_LEAD_PLAYBOOK = TeamRolePlaybook(
    name="Translator / Local Community Lead",
    objectives=(
        "Localise growth and community engagement for priority regions.",
        "Coordinate regional events, partnerships, and cultural context validation.",
        "Feed regional insights back to central marketing, product, and community squads.",
    ),
    workflow=(
        "Rank regions and languages by adoption potential and strategic priority for localisation.",
        "Assign translation and localisation tasks from the backlog based on expertise and deadlines.",
        "Translate and adapt assets for culture and compliance, iterating with native reviewers until approved.",
        "Coordinate regional events or partnerships, aligning logistics with central teams and partners.",
        "Collect regional insights on user feedback and market trends, sharing summaries with core teams.",
        "Update the shared glossary and translation memory with approved terminology and learnings.",
    ),
    outputs=(
        "Localised assets",
        "Regional event plans",
        "Feedback reports",
        "Glossary updates",
    ),
    kpis=(
        "Localization cycle time",
        "Regional engagement growth",
        "Translation quality score",
        "Partner activation rate",
    ),
)


OPTIONAL_PLAYBOOKS = {
    playbook.name: playbook
    for playbook in (
        GROWTH_HACKER_PLAYBOOK,
        SECURITY_SPECIALIST_PLAYBOOK,
        LOCAL_COMMUNITY_LEAD_PLAYBOOK,
        QUALITY_ASSURANCE_PLAYBOOK,
        GENERAL_DEVELOPMENT_PLAYBOOK,
    )
}


# ---------------------------------------------------------------------------
# Aggregation utilities
# ---------------------------------------------------------------------------

def _aggregate_playbooks(include_optional: bool = True) -> Dict[str, TeamRolePlaybook]:
    playbooks: Dict[str, TeamRolePlaybook] = {}
    for catalogue in (
        MARKETING_PLAYBOOKS,
        COMMUNITY_PLAYBOOKS,
        DEVELOPMENT_PLAYBOOKS,
        OPERATIONS_PLAYBOOKS,
    ):
        for name, playbook in catalogue.items():
            playbooks[name] = optimise_playbook(playbook)
    if include_optional:
        for name, playbook in OPTIONAL_PLAYBOOKS.items():
            playbooks[name] = optimise_playbook(playbook)
    return playbooks


TEAM_OPERATIONS_PLAYBOOKS = _aggregate_playbooks(include_optional=True)


def build_team_operations_playbooks(*, include_optional: bool = True) -> Dict[str, TeamRolePlaybook]:
    """Return copies of the team operation playbooks keyed by role name."""

    return dict(_aggregate_playbooks(include_optional=include_optional))


def build_team_operations_sync_algorithm(*, include_optional: bool = True) -> DynamicTeamRoleSyncAlgorithm:
    """Construct a ``DynamicTeamRoleSyncAlgorithm`` for team operations playbooks."""

    return DynamicTeamRoleSyncAlgorithm(
        build_team_operations_playbooks(include_optional=include_optional).values()
    )


def build_team_workflows(
    *,
    focus: Optional[Iterable[str]] = None,
    include_optional: bool = True,
) -> Dict[str, tuple[str, ...]]:
    """Return workflow steps for the selected playbooks keyed by role name."""

    catalogue = build_team_operations_playbooks(include_optional=include_optional)
    focus_names = tuple(focus or ())
    if focus_names:
        missing = [name for name in focus_names if name not in catalogue]
        if missing:
            missing_names = ", ".join(sorted(missing))
            raise KeyError(f"Unknown playbook(s): {missing_names}")
        selected = {name: catalogue[name] for name in focus_names}
    else:
        selected = catalogue
    return {
        name: tuple(playbook.workflow)
        for name, playbook in selected.items()
    }


# ---------------------------------------------------------------------------
# Multi-LLM alignment utilities
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class TeamOperationsAlignmentReport:
    """Structured output describing cross-team alignment recommendations."""

    summary: str
    priorities: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    next_actions: list[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    runs: Sequence[LLMRun] = field(default_factory=tuple)
    raw_response: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary,
            "priorities": list(self.priorities),
            "dependencies": list(self.dependencies),
            "risks": list(self.risks),
            "next_actions": list(self.next_actions),
            "metadata": dict(self.metadata),
            "raw_response": self.raw_response,
        }


class TeamOperationsLLMPlanner:
    """Coordinates multiple LLM perspectives to align team playbooks."""

    def __init__(
        self,
        *,
        strategy: LLMConfig,
        operations: Optional[LLMConfig] = None,
        risk: Optional[LLMConfig] = None,
    ) -> None:
        self._strategy = strategy
        self._operations = operations
        self._risk = risk

    def generate(
        self,
        playbooks: Mapping[str, TeamRolePlaybook],
        *,
        focus: Optional[Iterable[str]] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> TeamOperationsAlignmentReport:
        """Return a cross-team alignment summary for the supplied playbooks."""

        focus_tuple: tuple[str, ...] = tuple(focus or ())
        if focus_tuple:
            missing = [name for name in focus_tuple if name not in playbooks]
            if missing:
                raise KeyError(f"Unknown playbook(s): {', '.join(sorted(missing))}")
            selected = {name: playbooks[name] for name in focus_tuple}
        else:
            selected = dict(sorted(playbooks.items()))

        context_payload: Dict[str, Any] = dict(context or {})
        context_payload.setdefault("role_count", len(selected))
        context_payload.setdefault("roles", list(selected))

        playbook_payload = [
            {
                "name": playbook.name,
                "objectives": list(playbook.objectives),
                "workflow": list(playbook.workflow),
                "outputs": list(playbook.outputs),
                "kpis": list(playbook.kpis),
            }
            for playbook in selected.values()
        ]

        runs: list[LLMRun] = []

        strategy_prompt = self._build_strategy_prompt(
            playbook_payload, context_payload
        )
        strategy_run = self._strategy.run(strategy_prompt)
        runs.append(strategy_run)
        strategy_payload = parse_json_response(
            strategy_run.response, fallback_key="summary"
        ) or {}

        operations_payload: Dict[str, Any] = {}
        if self._operations is not None:
            operations_prompt = self._build_operations_prompt(
                playbook_payload,
                context_payload,
                strategy_payload,
            )
            operations_run = self._operations.run(operations_prompt)
            runs.append(operations_run)
            operations_payload = parse_json_response(
                operations_run.response, fallback_key="operations"
            ) or {}

        risk_payload: Dict[str, Any] = {}
        if self._risk is not None:
            risk_prompt = self._build_risk_prompt(
                playbook_payload,
                context_payload,
                strategy_payload,
                operations_payload,
            )
            risk_run = self._risk.run(risk_prompt)
            runs.append(risk_run)
            risk_payload = parse_json_response(
                risk_run.response, fallback_key="risks"
            ) or {}

        summary = self._resolve_summary(strategy_payload)
        priorities = collect_strings(
            strategy_payload.get("priorities"),
            strategy_payload.get("focus"),
            strategy_payload.get("initiatives"),
        )
        dependencies = collect_strings(
            strategy_payload.get("dependencies"),
            operations_payload.get("handoffs"),
            operations_payload.get("dependencies"),
        )
        risks = collect_strings(
            strategy_payload.get("risks"),
            risk_payload.get("risks"),
            risk_payload.get("watchlist"),
        )
        next_actions = collect_strings(
            strategy_payload.get("next_actions"),
            operations_payload.get("next_actions"),
            operations_payload.get("actions"),
            risk_payload.get("mitigations"),
        )

        metadata = {
            "focus": list(focus_tuple),
            "context": context_payload,
            "strategy_payload": strategy_payload,
            "operations_payload": operations_payload,
            "risk_payload": risk_payload,
        }

        return TeamOperationsAlignmentReport(
            summary=summary,
            priorities=list(priorities),
            dependencies=list(dependencies),
            risks=list(risks),
            next_actions=list(next_actions),
            metadata=metadata,
            runs=runs,
            raw_response=serialise_runs(runs),
        )

    def prepare_training_dataset(
        self,
        playbooks: Mapping[str, TeamRolePlaybook],
        *,
        focus: Optional[Iterable[str]] = None,
        context: Optional[Mapping[str, Any]] = None,
        instructions: Optional[str] = None,
        include_cohort_example: bool = True,
    ) -> list[PlaybookTrainingExample]:
        """Return optimised training samples annotated with planner metadata."""

        dataset = build_playbook_training_dataset(
            playbooks,
            focus=focus,
            instructions=instructions,
            include_cohort_example=include_cohort_example,
        )

        model_names = collect_strings(
            self._strategy.name,
            getattr(self._operations, "name", None),
            getattr(self._risk, "name", None),
        )
        context_payload = dict(context or {})

        focus_list = list(focus) if focus is not None else []

        for example in dataset:
            metadata = dict(example.metadata)
            metadata.setdefault("models", model_names)
            if context_payload:
                existing_context = dict(metadata.get("context", {}))
                existing_context.update(context_payload)
                metadata["context"] = existing_context
            if focus_list:
                metadata.setdefault("focus", focus_list)
            example.metadata = metadata

        return dataset

    def _build_strategy_prompt(
        self,
        playbooks: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
    ) -> str:
        instructions = {
            "instruction": "Summarise the coordinated priorities for Dynamic Capital's team operations.",
            "return_format": {
                "summary": "one paragraph overview",
                "priorities": ["ordered list of 3-6 focus areas"],
                "dependencies": ["critical cross-team handoffs"],
                "risks": ["notable risks or capacity constraints"],
                "next_actions": ["immediate actions for the coming sprint"],
            },
            "context": context,
            "playbooks": playbooks,
        }
        return (
            "You are the strategy coordinator for Dynamic Capital. "
            "Use the supplied playbooks to outline how teams should collaborate. "
            "Respond with a compact JSON object.\n" + json.dumps(instructions, indent=2)
        )

    def _build_operations_prompt(
        self,
        playbooks: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
        strategy_payload: Mapping[str, Any],
    ) -> str:
        payload = {
            "instruction": "Derive operational handoffs and immediate tasks based on the strategy payload.",
            "context": context,
            "playbooks": playbooks,
            "strategy": strategy_payload,
            "return_format": {
                "next_actions": ["detailed task statements"],
                "handoffs": ["pairs of teams or roles that must coordinate"],
                "dependencies": ["supporting systems or artefacts to watch"],
            },
        }
        return (
            "You orchestrate operations enablement for Dynamic Capital. "
            "Translate the strategy summary into concrete tasks and handoffs. "
            "Reply strictly with JSON.\n" + json.dumps(payload, indent=2)
        )

    def _build_risk_prompt(
        self,
        playbooks: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
        strategy_payload: Mapping[str, Any],
        operations_payload: Mapping[str, Any],
    ) -> str:
        payload = {
            "instruction": "Highlight risks, mitigations, and monitoring cues across the selected playbooks.",
            "context": context,
            "playbooks": playbooks,
            "strategy": strategy_payload,
            "operations": operations_payload,
            "return_format": {
                "risks": ["statements of risk with owner"],
                "mitigations": ["actions that reduce exposure"],
                "watchlist": ["metrics or triggers to monitor"],
            },
        }
        return (
            "You are the risk and compliance reviewer. "
            "Assess the proposed plan and provide JSON with risks, mitigations, and monitoring cues.\n"
            + json.dumps(payload, indent=2)
        )

    @staticmethod
    def _resolve_summary(payload: Mapping[str, Any]) -> str:
        summary = payload.get("summary")
        if isinstance(summary, str) and summary.strip():
            return summary.strip()
        priorities = collect_strings(payload.get("priorities"), payload.get("focus"))
        if priorities:
            return "Priorities: " + "; ".join(priorities)
        return "No summary available"
