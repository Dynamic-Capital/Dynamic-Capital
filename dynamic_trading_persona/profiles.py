"""Trading personas aligned with Dynamic Capital's TON product surface."""

from __future__ import annotations

from typing import Sequence

from dynamic_persona import (
    BackToBackChecklist,
    PersonaDimension,
    PersonaProfile,
    build_back_to_back_checklist,
    build_persona_profile,
    register_persona,
)

__all__ = [
    "build_retail_trader_persona",
    "build_algorithmic_developer_persona",
    "build_institutional_investor_persona",
    "build_retail_trader_back_to_back_checklist",
    "build_algorithmic_developer_back_to_back_checklist",
    "build_institutional_investor_back_to_back_checklist",
    "RETAIL_TRADER_PERSONA",
    "ALGORITHMIC_DEVELOPER_PERSONA",
    "INSTITUTIONAL_INVESTOR_PERSONA",
    "RETAIL_TRADER_BACK_TO_BACK_CHECKLIST",
    "ALGORITHMIC_DEVELOPER_BACK_TO_BACK_CHECKLIST",
    "INSTITUTIONAL_INVESTOR_BACK_TO_BACK_CHECKLIST",
]


def _build_trading_back_to_back_checklist(
    *,
    suffix: str,
    review: Sequence[str],
    verify: Sequence[str],
    optimize: Sequence[str],
    future_proof: Sequence[str],
    cadence: str,
    focus: str,
) -> BackToBackChecklist:
    """Normalise trading checklists into consistent review ➜ optimise loops."""

    return build_back_to_back_checklist(
        identifier=f"trading.{suffix}.back_to_back",
        review=tuple(review),
        verify=tuple(verify),
        optimize=tuple(optimize),
        future_proof=tuple(future_proof),
        metadata={"cadence": cadence, "focus": focus},
    )


def build_retail_trader_persona() -> PersonaProfile:
    """Persona for emerging-market retail traders automating TON strategies."""

    dimensions = (
        PersonaDimension(
            name="Accessible Automation",
            description="Packages vetted TON strategies into guided bot setups that fit"
            " around a busy schedule.",
            weight=1.2,
            tags=("automation", "ux"),
        ),
        PersonaDimension(
            name="Trustworthy Guidance",
            description="Builds confidence through transparent risk framing and human"
            " tone education loops.",
            weight=1.1,
            tags=("education", "trust"),
        ),
        PersonaDimension(
            name="Responsive Opportunity Capture",
            description="Keeps alerts and guardrails tuned so small accounts can react"
            " to market shifts without manual monitoring.",
            weight=1.15,
            tags=("alerts", "risk"),
        ),
    )

    return build_persona_profile(
        identifier="trading.retail",
        display_name="Dynamic Retail Trader Persona",
        mission="Empower working professionals to automate TON trades safely and"
        " confidently while they focus on their day jobs",
        tone=("encouraging", "clear", "reassuring"),
        expertise=(
            "Intermediate crypto trading",
            "Telegram and signal community literacy",
            "Hands-on experience with custodial exchanges",
        ),
        dimensions=dimensions,
        rituals=(
            "Present pre-built bots with contextual risk notes before activation.",
            "Send mobile-friendly summaries after each trading session closes.",
            "Surface a weekly learning bite tying performance to strategy logic.",
        ),
        conversation_starters=(
            "Which market windows are you currently missing while at work?",
            "How comfortable are you tweaking stop-loss or position sizing settings?",
            "What would make you trust an automated signal more than a Telegram tip?",
        ),
        success_metrics=(
            "Time-to-first-automation stays under ten minutes from sign-up.",
            "Weekly active usage exceeds three sessions with positive feedback.",
            "Risk dashboards are referenced before any strategy parameter change.",
        ),
        failure_modes=(
            "Trader feels overwhelmed by configuration steps and abandons setup.",
            "Alerts are missed due to noisy or ill-timed notifications.",
            "Unclear risk guardrails lead to outsized drawdowns on small capital.",
        ),
        resources={
            "starter_bot_playlist": "Sequenced walkthrough of beginner-friendly TON bots.",
            "mobile_alerts_guide": "Best practices for scheduling actionable push alerts.",
            "risk_one_pager": "Simple framework for sizing positions on limited capital.",
        },
    )


RETAIL_TRADER_PERSONA = register_persona(build_retail_trader_persona())


def build_retail_trader_back_to_back_checklist() -> BackToBackChecklist:
    """Checklist guiding the retail loop from review to optimisation."""

    return _build_trading_back_to_back_checklist(
        suffix="retail",
        review=(
            "Audit active bots for drawdown, win-rate, and notification accuracy.",
            "Confirm educational nudges were delivered alongside performance summaries.",
            "Collect user sentiment on interface clarity and onboarding steps.",
        ),
        verify=(
            "Ensure stop-loss, take-profit, and capital allocation match stated risk bands.",
            "Re-run wallet connectivity and exchange credential health checks.",
        ),
        optimize=(
            "Calibrate alert cadences using the engagement and missed-trade data surfaced during review.",
            "Promote top-performing community strategies with explicit guardrail notes for small accounts.",
            "Sequence onboarding polish tickets by the highest-friction feedback captured in review interviews.",
        ),
        future_proof=(
            "Log market changes that would warrant new conservative bot templates.",
            "Schedule follow-up interviews with traders reporting churn risks.",
        ),
        cadence="bi-weekly",
        focus="retail enablement",
    )


RETAIL_TRADER_BACK_TO_BACK_CHECKLIST = build_retail_trader_back_to_back_checklist()


def build_algorithmic_developer_persona() -> PersonaProfile:
    """Persona for TON-native algorithmic developers monetising strategies."""

    dimensions = (
        PersonaDimension(
            name="Low-Latency Infrastructure",
            description="Provides reliable access to order flow, execution venues, and"
            " simulation environments tuned for TON.",
            weight=1.25,
            tags=("infrastructure", "data"),
        ),
        PersonaDimension(
            name="Programmable Strategy Fabric",
            description="Enables custom logic via SDKs, APIs, and smart-contract hooks"
            " with robust documentation.",
            weight=1.2,
            tags=("developer", "sdk"),
        ),
        PersonaDimension(
            name="Monetisation & Governance",
            description="Supports packaging, licensing, and managing risk parameters for"
            " third-party capital.",
            weight=1.1,
            tags=("marketplace", "risk"),
        ),
    )

    return build_persona_profile(
        identifier="trading.algorithmic_developer",
        display_name="Dynamic Algorithmic Developer Persona",
        mission="Give TON builders the programmable stack to prototype, test, and"
        " monetise institutional-grade trading logic",
        tone=("precise", "collaborative", "forward-looking"),
        expertise=(
            "DeFi smart contract engineering",
            "Quantitative research and backtesting",
            "API and SDK orchestration",
        ),
        dimensions=dimensions,
        rituals=(
            "Publish changelog notes for SDK and endpoint updates with migration tips.",
            "Host code labs or office hours for new protocol integrations.",
            "Highlight community-built modules that meet quality and testing benchmarks.",
        ),
        conversation_starters=(
            "What latency or data gaps slow down your current TON deployment pipeline?",
            "Which risk controls do you need exposed for external capital partners?",
            "How would you prefer to monetise or license your trading logic?",
        ),
        success_metrics=(
            "API integration time from sandbox to production stays under two hours.",
            "Backtests are reproducible with shared datasets and parameter snapshots.",
            "Strategy marketplace listings achieve code review sign-off on first submission.",
        ),
        failure_modes=(
            "Developers fork away due to missing TON-specific documentation.",
            "Backtesting results diverge from live execution because of data drift.",
            "Revenue-sharing or licensing terms feel opaque, limiting marketplace usage.",
        ),
        resources={
            "sdk_reference": "Versioned docs with TypeScript and Python examples.",
            "latency_dashboards": "Real-time visibility into TON node and API performance.",
            "risk_parameter_playbook": "Guidelines for exposing configurable safeguards.",
        },
    )


ALGORITHMIC_DEVELOPER_PERSONA = register_persona(build_algorithmic_developer_persona())


def build_algorithmic_developer_back_to_back_checklist() -> BackToBackChecklist:
    """Checklist for keeping the developer experience tight and auditable."""

    return _build_trading_back_to_back_checklist(
        suffix="algorithmic_developer",
        review=(
            "Inspect SDK releases for breaking changes and update migration guides.",
            "Validate data coverage for TON markets, including latency and completeness.",
            "Survey builders on marketplace monetisation clarity and tooling gaps.",
        ),
        verify=(
            "Re-run automated regression suites on sandbox and production endpoints.",
            "Confirm backtesting engines mirror live exchange fee and slippage models.",
        ),
        optimize=(
            "Convert review gaps into roadmap issues with owners and delivery checkpoints.",
            "Open-source reusable modules surfaced during office hours and tag them for peer reuse.",
            "Iterate licensing templates with legal review to unblock the marketplace deals flagged in review surveys.",
        ),
        future_proof=(
            "Track TON roadmap updates that demand new primitives or contract libraries.",
            "Maintain a contributor ladder that rewards peer-reviewed pull requests.",
        ),
        cadence="weekly",
        focus="developer velocity",
    )


ALGORITHMIC_DEVELOPER_BACK_TO_BACK_CHECKLIST = (
    build_algorithmic_developer_back_to_back_checklist()
)


def build_institutional_investor_persona() -> PersonaProfile:
    """Persona for institutional allocators seeking compliant TON exposure."""

    dimensions = (
        PersonaDimension(
            name="Institutional Risk Governance",
            description="Delivers audit trails, controls, and compliance workflows"
            " aligned with fund mandates.",
            weight=1.3,
            tags=("risk", "compliance"),
        ),
        PersonaDimension(
            name="Portfolio Intelligence",
            description="Surfaces cross-strategy analytics, attribution, and scenario"
            " planning for large allocations.",
            weight=1.2,
            tags=("analytics", "reporting"),
        ),
        PersonaDimension(
            name="Secure Infrastructure",
            description="Guarantees custody, permissions, and uptime that match"
            " institutional SLAs.",
            weight=1.15,
            tags=("security", "infrastructure"),
        ),
    )

    return build_persona_profile(
        identifier="trading.institutional_investor",
        display_name="Dynamic Institutional Investor Persona",
        mission="Equip professional allocators with compliant, insight-rich TON"
        " exposure backed by operational safeguards",
        tone=("authoritative", "measured", "reassuring"),
        expertise=(
            "Portfolio risk management",
            "Regulatory compliance for digital assets",
            "Institutional due diligence",
        ),
        dimensions=dimensions,
        rituals=(
            "Deliver weekly portfolio memos summarising performance and risk deltas.",
            "Provide audit-ready exports covering custody, approvals, and execution logs.",
            "Host quarterly governance briefings covering regulatory and security updates.",
        ),
        conversation_starters=(
            "Which regulatory frameworks shape your TON investment mandate?",
            "What reporting cadence does your investment committee require?",
            "Where do you see operational risk when onboarding new crypto venues?",
        ),
        success_metrics=(
            "Institutional onboarding completes with compliance sign-off in under four weeks.",
            "Risk dashboards capture portfolio VaR and stress tests for every strategy.",
            "Custody and multi-sig workflows pass external audit without findings.",
        ),
        failure_modes=(
            "Missing audit trails hinder regulator or LP reporting cycles.",
            "Portfolio analytics fail to contextualise performance versus benchmarks.",
            "Custody controls lag behind fund security requirements, blocking deployment.",
        ),
        resources={
            "compliance_pack": "Template bundle for KYC, AML, and regulatory disclosures.",
            "governance_runbook": "Operating procedures for approvals and incident response.",
            "portfolio_reporting_suite": "Dashboard library with attribution and risk modules.",
        },
    )


INSTITUTIONAL_INVESTOR_PERSONA = register_persona(build_institutional_investor_persona())


def build_institutional_investor_back_to_back_checklist() -> BackToBackChecklist:
    """Checklist ensuring institutional governance loops stay resilient."""

    return _build_trading_back_to_back_checklist(
        suffix="institutional_investor",
        review=(
            "Reconcile performance, exposure, and compliance reports with custodial records.",
            "Confirm governance rituals (memos, briefings) were delivered on schedule.",
            "Assess regulatory landscape changes impacting TON allocations.",
        ),
        verify=(
            "Run disaster-recovery drills for custody and multi-sig signers.",
            "Validate audit logs capture approvals, policy changes, and exception handling.",
        ),
        optimize=(
            "Ship analytics enhancements requested during review and instrument adoption metrics.",
            "Tighten access controls or segregation of duties highlighted by the governance review.",
            "Automate compliance evidence capture for regulatory shifts logged in the review stage.",
        ),
        future_proof=(
            "Map forthcoming regulatory regimes to required product changes.",
            "Schedule cross-team tabletop exercises for emerging operational risks.",
        ),
        cadence="monthly",
        focus="institutional governance",
    )


INSTITUTIONAL_INVESTOR_BACK_TO_BACK_CHECKLIST = (
    build_institutional_investor_back_to_back_checklist()
)
