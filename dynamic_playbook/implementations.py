"""Preset dynamic playbook implementations for Dynamic Capital."""

from __future__ import annotations

from itertools import chain
from typing import Iterable, Mapping, Sequence

from .engine import PlaybookBlueprint, PlaybookContext, PlaybookEntry
from .sync import PlaybookSynchronizer

__all__ = [
    "dynamic_capital_context",
    "dynamic_capital_entries",
    "build_dynamic_capital_blueprint",
    "dynamic_capital_payload",
]


def dynamic_capital_context() -> PlaybookContext:
    """Return the default context for the Dynamic Capital orchestration stack."""

    return PlaybookContext(
        mission="Dynamic Capital governance and execution loop",
        cadence="Weekly ops, monthly council, quarterly assembly",
        risk_tolerance=0.45,
        automation_expectation=0.55,
        readiness_pressure=0.62,
        oversight_level=0.7,
        escalation_channels=("Steward Council", "Operations Committee", "Treasury Committee"),
        scenario_focus=("governance", "risk", "alliances", "legacy"),
        highlight_limit=4,
    )


def _entries_from(payloads: Iterable[Mapping[str, object]]) -> tuple[PlaybookEntry, ...]:
    return tuple(PlaybookEntry(**payload) for payload in payloads)


def dynamic_capital_entries() -> tuple[PlaybookEntry, ...]:
    """Return the optimised Dynamic Capital playbook entries."""

    operating_stack = (
        {
            "title": "Build an Unbreakable Network",
            "objective": "Place trusted allies across legal, finance, intel, and ops to remove single points of failure.",
            "stage": "alliances",
            "readiness": 0.58,
            "automation": 0.35,
            "risk": 0.48,
            "weight": 1.1,
            "tags": ("network", "resilience"),
            "owners": ("Steward Council", "Operations Committee"),
            "notes": "Add strategic collaborations quarterly; maintain active contact intelligence map.",
        },
        {
            "title": "Guard Your Reputation Like Gold",
            "objective": "Codify promise standards, run monthly audits, and maintain trust metrics without escalations beyond 72 hours.",
            "stage": "reputation",
            "readiness": 0.52,
            "automation": 0.42,
            "risk": 0.55,
            "weight": 1.0,
            "tags": ("brand", "audit"),
            "owners": ("Operations Committee", "Community Assembly"),
            "notes": "Keep integrity dashboards live; publish audit summaries to decision log.",
        },
        {
            "title": "Control the Flow of Information",
            "objective": "Maintain intelligence stack, share twice-daily briefings, and log major decisions in knowledge base.",
            "stage": "intelligence",
            "readiness": 0.6,
            "automation": 0.58,
            "risk": 0.46,
            "weight": 0.9,
            "tags": ("intel", "knowledge"),
            "owners": ("Operations Committee",),
            "notes": "Automate briefing delivery and archive transcripts for auditability.",
        },
        {
            "title": "Diversify Across Borders & Assets",
            "objective": "Layer portfolios across liquidity, growth, and legacy horizons with multi-jurisdiction exposure.",
            "stage": "portfolio",
            "readiness": 0.47,
            "automation": 0.4,
            "risk": 0.62,
            "weight": 1.2,
            "tags": ("treasury", "diversification"),
            "owners": ("Treasury Committee",),
            "notes": "Quarterly rebalancing reviews; stress test jurisdictional constraints.",
        },
        {
            "title": "Master the Art of Discretion",
            "objective": "Separate public narratives from private operations with NDA councils and secure communications.",
            "stage": "opsec",
            "readiness": 0.55,
            "automation": 0.45,
            "risk": 0.57,
            "weight": 1.0,
            "tags": ("security", "privacy"),
            "owners": ("Steward Council",),
            "notes": "Run quarterly OPSEC reviews; rotate keys every 90 days.",
        },
        {
            "title": "Turn Risk into Power",
            "objective": "Enforce position sizing rules, run pre-mortems, and track VaR, conviction, and compliance dashboards.",
            "stage": "risk",
            "readiness": 0.49,
            "automation": 0.52,
            "risk": 0.64,
            "weight": 1.15,
            "tags": ("risk", "controls"),
            "owners": ("Risk Council", "Treasury Committee"),
            "notes": "Ensure dashboards alert on breaches; post-trade reviews logged within 24 hours.",
        },
        {
            "title": "Think in Centuries, Act in Moments",
            "objective": "Align 100-year vision with weekly sprints and daily micro-retrospectives.",
            "stage": "strategy",
            "readiness": 0.57,
            "automation": 0.38,
            "risk": 0.44,
            "weight": 0.85,
            "tags": ("strategy", "cadence"),
            "owners": ("Steward Council", "Operations Committee"),
            "notes": "Keep sprint objectives linked to legacy milestones; review alignment monthly.",
        },
        {
            "title": "Use Wealth for Influence & Legacy",
            "objective": "Reinvest defined profits into community initiatives and maintain influence balance sheet and succession plans.",
            "stage": "legacy",
            "readiness": 0.45,
            "automation": 0.32,
            "risk": 0.51,
            "weight": 0.9,
            "tags": ("legacy", "impact"),
            "owners": ("Community Assembly", "Treasury Committee"),
            "notes": "Track influence metrics quarterly; publish stewardship notes for stakeholders.",
        },
        {
            "title": "Execution Infrastructure",
            "objective": "Leverage execution matrix, leadership cadences, risk governance rules, and dashboards to keep principles actionable.",
            "stage": "execution",
            "readiness": 0.61,
            "automation": 0.56,
            "risk": 0.49,
            "weight": 1.05,
            "tags": ("enablement", "ops"),
            "owners": ("Operations Committee",),
            "notes": "Integrate governance rules with weekly standups; automate dashboard refresh cadence.",
        },
    )

    principle_stack = (
        {
            "title": "Faith & Mindset Practice",
            "objective": "Sustain trust, patience, and gratitude while framing hardship as elevation.",
            "stage": "principles",
            "readiness": 0.63,
            "automation": 0.2,
            "risk": 0.38,
            "weight": 0.7,
            "tags": ("mindset", "discipline"),
            "owners": ("Leadership Circle",),
            "notes": "Embed daily reflection prompts in leadership cadences.",
        },
        {
            "title": "Character & Leadership Standards",
            "objective": "Enforce truth, mercy, humility, justice, consultation, and accountability across decisions.",
            "stage": "principles",
            "readiness": 0.58,
            "automation": 0.28,
            "risk": 0.42,
            "weight": 0.8,
            "tags": ("ethics", "leadership"),
            "owners": ("Steward Council",),
            "notes": "Codify standards into governance onboarding materials.",
        },
        {
            "title": "Relationships & Community Stewardship",
            "objective": "Honor women, protect vulnerable members, and treat conflict as last resort.",
            "stage": "community",
            "readiness": 0.5,
            "automation": 0.25,
            "risk": 0.47,
            "weight": 0.75,
            "tags": ("community", "care"),
            "owners": ("Community Assembly",),
            "notes": "Implement mediation protocols and support pathways.",
        },
        {
            "title": "Integrated Work & Spiritual Rhythm",
            "objective": "Balance trade, life domains, diplomacy, and daily worship without sacrificing principles.",
            "stage": "rhythms",
            "readiness": 0.54,
            "automation": 0.22,
            "risk": 0.41,
            "weight": 0.7,
            "tags": ("balance", "discipline"),
            "owners": ("Leadership Circle", "Operations Committee"),
            "notes": "Publish weekly retrospectives capturing spiritual and operational lessons.",
        },
        {
            "title": "Legacy & Vision Doctrine",
            "objective": "Uphold equality, live the Farewell Sermon, and inspire through compassion.",
            "stage": "legacy",
            "readiness": 0.48,
            "automation": 0.18,
            "risk": 0.39,
            "weight": 0.65,
            "tags": ("legacy", "values"),
            "owners": ("Steward Council", "Community Assembly"),
            "notes": "Circulate quarterly legacy reflections and equality benchmarks.",
        },
    )

    pillar_stack = (
        {
            "title": "Faith-Rooted Purpose",
            "objective": "Anchor mission statements and strategic bets in faith-rooted intent.",
            "stage": "pillars",
            "readiness": 0.62,
            "automation": 0.3,
            "risk": 0.4,
            "weight": 0.8,
            "tags": ("purpose", "mission"),
            "owners": ("Steward Council",),
            "notes": "Review purpose alignment during strategic offsites.",
        },
        {
            "title": "Integrity of Capital",
            "objective": "Maintain clean custody, transparent flows, and ethical allocation of capital.",
            "stage": "pillars",
            "readiness": 0.53,
            "automation": 0.46,
            "risk": 0.58,
            "weight": 0.95,
            "tags": ("treasury", "compliance"),
            "owners": ("Treasury Committee", "Compliance"),
            "notes": "Map variances monthly; ensure audit-ready controls.",
        },
        {
            "title": "Strategic Intelligence",
            "objective": "Continuously gather market, geopolitical, and technical signals to inform decisions.",
            "stage": "intelligence",
            "readiness": 0.57,
            "automation": 0.55,
            "risk": 0.48,
            "weight": 0.85,
            "tags": ("intel", "signals"),
            "owners": ("Operations Committee", "Intel Desk"),
            "notes": "Integrate indicators into twice-daily briefings.",
        },
        {
            "title": "Entrepreneurial Empowerment",
            "objective": "Provide playcards, capital, and mentorship for builders.",
            "stage": "enablement",
            "readiness": 0.45,
            "automation": 0.33,
            "risk": 0.52,
            "weight": 0.9,
            "tags": ("builders", "support"),
            "owners": ("Operations Committee", "Mentorship Guild"),
            "notes": "Track builder health signals; refresh playcards quarterly.",
        },
        {
            "title": "Community Wealth & Justice",
            "objective": "Ensure wealth distribution uplifts community standards and justice outcomes.",
            "stage": "community",
            "readiness": 0.42,
            "automation": 0.28,
            "risk": 0.6,
            "weight": 0.95,
            "tags": ("justice", "impact"),
            "owners": ("Community Assembly", "Treasury Committee"),
            "notes": "Publish wealth impact scorecards and respond to variance alerts.",
        },
        {
            "title": "Operational Excellence",
            "objective": "Keep execution runbooks current and ensure cadence adherence.",
            "stage": "execution",
            "readiness": 0.6,
            "automation": 0.5,
            "risk": 0.45,
            "weight": 1.0,
            "tags": ("ops", "cadence"),
            "owners": ("Operations Committee",),
            "notes": "Audit execution matrix quarterly; close gaps within two sprints.",
        },
        {
            "title": "Adaptive Resilience",
            "objective": "Stress-test for volatility and maintain continuity plans.",
            "stage": "resilience",
            "readiness": 0.44,
            "automation": 0.4,
            "risk": 0.63,
            "weight": 0.9,
            "tags": ("resilience", "contingency"),
            "owners": ("Risk Council", "Operations Committee"),
            "notes": "Run resilience drills twice per quarter; update continuity playcards.",
        },
        {
            "title": "Legacy Stewardship",
            "objective": "Codify long-term commitments, guardianship roles, and archival practices.",
            "stage": "legacy",
            "readiness": 0.41,
            "automation": 0.27,
            "risk": 0.49,
            "weight": 0.8,
            "tags": ("legacy", "archives"),
            "owners": ("Steward Council", "Heritage Desk"),
            "notes": "Maintain heritage ledger and succession artifacts.",
        },
    )

    wisdom_stack = (
        {
            "title": "See the Pattern in Chaos",
            "objective": "Distill signals from complexity using Fibonacci-inspired rhythms.",
            "stage": "wisdom",
            "readiness": 0.56,
            "automation": 0.37,
            "risk": 0.43,
            "weight": 0.7,
            "tags": ("analysis", "pattern"),
            "owners": ("Intel Desk", "Strategy Lab"),
            "notes": "Embed pattern reviews in bi-weekly retrospectives.",
        },
        {
            "title": "Adopt Better Tools",
            "objective": "Continuously upgrade tool stack to maintain leverage and harmony.",
            "stage": "wisdom",
            "readiness": 0.48,
            "automation": 0.6,
            "risk": 0.5,
            "weight": 0.75,
            "tags": ("tooling", "enablement"),
            "owners": ("Operations Committee", "Engineering"),
            "notes": "Track tooling adoption metrics and retire friction-heavy systems.",
        },
        {
            "title": "Small Beginnings, Exponential Growth",
            "objective": "Prototype small, scale proven experiments deliberately.",
            "stage": "innovation",
            "readiness": 0.53,
            "automation": 0.45,
            "risk": 0.46,
            "weight": 0.72,
            "tags": ("experiments", "growth"),
            "owners": ("Innovation Guild", "Operations Committee"),
            "notes": "Maintain pilot backlog with kill-switch criteria.",
        },
        {
            "title": "Balance Efficiency with Harmony",
            "objective": "Balance throughput with cultural and spiritual wellbeing.",
            "stage": "wisdom",
            "readiness": 0.5,
            "automation": 0.33,
            "risk": 0.44,
            "weight": 0.68,
            "tags": ("balance", "culture"),
            "owners": ("Leadership Circle", "People Ops"),
            "notes": "Include harmony metrics in monthly council review.",
        },
        {
            "title": "Be Practical, Not Just Theoretical",
            "objective": "Translate insights into executable sequences and dashboards.",
            "stage": "execution",
            "readiness": 0.58,
            "automation": 0.52,
            "risk": 0.47,
            "weight": 0.8,
            "tags": ("ops", "insight"),
            "owners": ("Operations Committee", "Strategy Lab"),
            "notes": "Check adoption of insights in change reviews.",
        },
        {
            "title": "Learn Across Cultures",
            "objective": "Integrate diverse perspectives to prevent echo chambers.",
            "stage": "learning",
            "readiness": 0.46,
            "automation": 0.31,
            "risk": 0.4,
            "weight": 0.66,
            "tags": ("learning", "diversity"),
            "owners": ("Community Assembly", "People Ops"),
            "notes": "Schedule cross-cultural exchanges; capture insights in knowledge base.",
        },
        {
            "title": "Harmony Is the Law of Nature",
            "objective": "Ensure cadences stay in sync with natural energy cycles and team capacity.",
            "stage": "rhythms",
            "readiness": 0.52,
            "automation": 0.29,
            "risk": 0.39,
            "weight": 0.64,
            "tags": ("cadence", "health"),
            "owners": ("Leadership Circle", "Operations Committee"),
            "notes": "Review energy maps monthly; adjust sprint load accordingly.",
        },
    )

    success_stack = (
        {
            "title": "Success Blueprint: Vision & Mastery",
            "objective": "Reinforce definiteness of purpose, applied faith, and specialized knowledge through daily practice.",
            "stage": "success",
            "readiness": 0.55,
            "automation": 0.34,
            "risk": 0.42,
            "weight": 0.74,
            "tags": ("vision", "mastery"),
            "owners": ("Leadership Circle",),
            "notes": "Daily goal repetition and mastery journal checkpoints.",
        },
        {
            "title": "Success Blueprint: Alliance & Influence",
            "objective": "Maintain mastermind alliances, leverage applied imagination, and extend influence intentionally.",
            "stage": "alliances",
            "readiness": 0.49,
            "automation": 0.36,
            "risk": 0.45,
            "weight": 0.72,
            "tags": ("network", "influence"),
            "owners": ("Steward Council", "Leadership Circle"),
            "notes": "Log alliance outcomes in influence balance sheet.",
        },
        {
            "title": "Success Blueprint: Execution Discipline",
            "objective": "Embed accurate thought, persistence, organized planning, and decision routines.",
            "stage": "execution",
            "readiness": 0.6,
            "automation": 0.44,
            "risk": 0.48,
            "weight": 0.82,
            "tags": ("discipline", "planning"),
            "owners": ("Operations Committee", "Leadership Circle"),
            "notes": "Weekly scorecard covering persistence and planning adherence.",
        },
        {
            "title": "Success Blueprint: Vitality & Balance",
            "objective": "Protect health, maintain balanced habits, and transmute energy productively.",
            "stage": "health",
            "readiness": 0.51,
            "automation": 0.3,
            "risk": 0.41,
            "weight": 0.69,
            "tags": ("health", "habits"),
            "owners": ("People Ops", "Leadership Circle"),
            "notes": "Monthly vitality reviews; track habit adherence trends.",
        },
    )

    governance_stack = (
        {
            "title": "Governance First Principles",
            "objective": "Embed clarity, inclusion, evidence, accountability, and learning in every proposal.",
            "stage": "governance",
            "readiness": 0.52,
            "automation": 0.37,
            "risk": 0.46,
            "weight": 1.0,
            "tags": ("principles", "governance"),
            "owners": ("Steward Council", "Community Assembly"),
            "notes": "Use principle checklist during proposal intake.",
        },
        {
            "title": "Governance Role Architecture",
            "objective": "Maintain sponsor, author, reviewer, implementer, and auditor clarity with RACI mapping.",
            "stage": "governance",
            "readiness": 0.49,
            "automation": 0.4,
            "risk": 0.5,
            "weight": 0.95,
            "tags": ("roles", "raci"),
            "owners": ("Steward Council", "Operations Committee"),
            "notes": "Refresh RACI each quarter; publish updates in decision log.",
        },
        {
            "title": "Proposal Lifecycle Implementation",
            "objective": "Run concept-to-review gates with SLA adherence for classes A, B, and C.",
            "stage": "governance",
            "readiness": 0.46,
            "automation": 0.55,
            "risk": 0.57,
            "weight": 1.05,
            "tags": ("lifecycle", "workflow"),
            "owners": ("Operations Committee", "Steward Council"),
            "notes": "Automate stage notifications; monitor SLA dashboard.",
        },
        {
            "title": "Voting & Quorum Controls",
            "objective": "Configure quorum, thresholds, and voter weighting for proposal classes with abstain policy documented.",
            "stage": "governance",
            "readiness": 0.43,
            "automation": 0.48,
            "risk": 0.6,
            "weight": 1.1,
            "tags": ("voting", "policy"),
            "owners": ("Community Assembly", "Steward Council"),
            "notes": "Implement governance module configuration and publish thresholds.",
        },
        {
            "title": "Treasury & Spend Controls",
            "objective": "Enforce spend thresholds, multisig approvals, segregation of wallets, and monthly reports.",
            "stage": "treasury",
            "readiness": 0.5,
            "automation": 0.53,
            "risk": 0.65,
            "weight": 1.2,
            "tags": ("treasury", "controls"),
            "owners": ("Treasury Committee", "Operations Committee"),
            "notes": "Implement disbursement runbook and reconciliation workflows.",
        },
        {
            "title": "Risk & Compliance Guardrails",
            "objective": "Apply financial, legal, security, brand, and operational risk checks before votes.",
            "stage": "risk",
            "readiness": 0.47,
            "automation": 0.45,
            "risk": 0.62,
            "weight": 1.05,
            "tags": ("risk", "compliance"),
            "owners": ("Risk Council", "Compliance"),
            "notes": "Run conflict-of-interest declarations and KYC/AML as required.",
        },
        {
            "title": "Change Management & Transparency",
            "objective": "Link proposals to change artifacts, maintain kill-switches, and keep public decision logs current.",
            "stage": "change",
            "readiness": 0.51,
            "automation": 0.5,
            "risk": 0.54,
            "weight": 1.0,
            "tags": ("transparency", "change"),
            "owners": ("Operations Committee", "Steward Council"),
            "notes": "Audit change tickets weekly; publish updates to community feeds.",
        },
        {
            "title": "Audit & Amendment Cadence",
            "objective": "Execute internal quarterly control tests, external reviews for major upgrades, and manage amendments.",
            "stage": "governance",
            "readiness": 0.44,
            "automation": 0.41,
            "risk": 0.59,
            "weight": 0.98,
            "tags": ("audit", "review"),
            "owners": ("Steward Council", "Audit Guild"),
            "notes": "Maintain audit calendar; ensure exception logs expire within 90 days.",
        },
    )

    all_payloads: Sequence[Mapping[str, object]] = tuple(
        chain(
            operating_stack,
            principle_stack,
            pillar_stack,
            wisdom_stack,
            success_stack,
            governance_stack,
        )
    )
    return _entries_from(all_payloads)


def _synchronizer_from_entries(entries: Sequence[PlaybookEntry]) -> PlaybookSynchronizer:
    synchronizer = PlaybookSynchronizer()
    synchronizer.implement_many(entries)
    return synchronizer


def build_dynamic_capital_blueprint(*, limit: int | None = None) -> PlaybookBlueprint:
    """Build a blueprint from the optimised Dynamic Capital playbook."""

    entries = dynamic_capital_entries()
    synchronizer = _synchronizer_from_entries(entries)
    context = dynamic_capital_context()
    return synchronizer.sync_blueprint(context, limit=limit)


def dynamic_capital_payload(*, limit: int | None = None) -> Mapping[str, object]:
    """Return serialised payload with blueprint and entries for Dynamic Capital."""

    entries = dynamic_capital_entries()
    synchronizer = _synchronizer_from_entries(entries)
    context = dynamic_capital_context()
    return synchronizer.sync_payload(context, limit=limit)

