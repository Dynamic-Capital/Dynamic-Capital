"""Curated knowledge payloads that seed Dynamic AGI training datasets."""

from __future__ import annotations

from typing import Iterable, Mapping, MutableMapping, Sequence

from .self_improvement import ImprovementSignal, LearningSnapshot

__all__ = [
    "DEFAULT_DOMAIN_KNOWLEDGE_PAYLOADS",
    "DEFAULT_DOMAIN_KNOWLEDGE",
    "build_snapshots_from_payloads",
    "resolve_domain_snapshots",
]


_DAI_FEEDBACK = (
    "Expand macro regimes to include energy, FX, and credit interplay for near-term catalysts.",
    "Document scenario templates that translate qualitative research into structured hedging actions.",
)

_DAGI_FEEDBACK = (
    "Strengthen causal reasoning with explicit reasoning traces for multi-horizon forecasts.",
    "Codify debate outcomes so agent collectives can reuse cross-domain synthesis patterns.",
)

_DAGS_FEEDBACK = (
    "Close the audit gap by mirroring decision trails and policy approvals within the governance ledger.",
    "Automate variance alerts so human reviewers receive paged context for policy drift moments.",
)


DEFAULT_DOMAIN_KNOWLEDGE_PAYLOADS: Mapping[str, tuple[Mapping[str, object], ...]] = {
    "DAI": (
        {
            "output": {
                "capability": "multi-asset market intelligence",
                "summary": "Synthesised commodity, rates, and FX flows to anchor market outlooks.",
            },
            "performance": {
                "coverage_ratio": 0.62,
                "accuracy_ratio": 0.91,
                "freshness_hours": 12.0,
            },
            "feedback": _DAI_FEEDBACK,
            "signals": (
                {
                    "metric": "coverage",
                    "direction": "negative",
                    "value": 0.62,
                    "weight": 1.2,
                    "notes": "Add structured oil supply, FX carry, and rate-volatility datasets.",
                },
                {
                    "metric": "accuracy",
                    "direction": "positive",
                    "value": 0.91,
                    "weight": 0.7,
                    "notes": "Preserve data quality checks when onboarding new asset feeds.",
                },
            ),
            "awareness_report": {
                "domain": "DAI",
                "insight": "Coverage gap is limiting scenario completeness",
                "recommended_experiments": [
                    "Blend energy shipping telemetry with macro volatility surfaces",
                    "Track regulatory calendars alongside policy transcripts",
                ],
            },
            "metacognition_report": {
                "prompt": "Which missing signals would change the thesis?",
                "reflection": "Need macro-to-micro links; source real-time policy chatter streams.",
            },
        },
        {
            "output": {
                "capability": "risk radar",
                "summary": "Identified liquidity crunch signatures ahead of treasury auctions.",
            },
            "performance": {
                "coverage_ratio": 0.68,
                "accuracy_ratio": 0.88,
                "freshness_hours": 20.0,
            },
            "feedback": _DAI_FEEDBACK,
            "signals": (
                {
                    "metric": "coverage",
                    "direction": "negative",
                    "value": 0.68,
                    "weight": 1.1,
                    "notes": "Integrate liquidity heatmaps for secondary markets and funding desks.",
                },
                {
                    "metric": "governance",
                    "direction": "neutral",
                    "value": 0.45,
                    "weight": 0.6,
                    "notes": "Enrich lineage metadata for desk-level overrides.",
                },
            ),
        },
    ),
    "DAGI": (
        {
            "output": {
                "capability": "generative strategy synthesis",
                "summary": "Composed three candidate playbooks with probabilistic guardrails.",
            },
            "performance": {
                "coverage_ratio": 0.58,
                "accuracy_ratio": 0.86,
                "freshness_hours": 16.0,
            },
            "feedback": _DAGI_FEEDBACK,
            "signals": (
                {
                    "metric": "coverage",
                    "direction": "negative",
                    "value": 0.58,
                    "weight": 1.3,
                    "notes": "Document research workflows for private credit and climate stress testing.",
                },
                {
                    "metric": "staleness",
                    "direction": "negative",
                    "value": 0.4,
                    "weight": 0.8,
                    "notes": "Refresh reinforcement runs after each quarterly macro review.",
                },
            ),
            "metacognition_report": {
                "prompt": "How do we expose hidden assumptions?",
                "reflection": "Require self-critique threads before publishing synthesis memos.",
            },
        },
        {
            "output": {
                "capability": "pattern library",
                "summary": "Captured multi-agent debate outcomes for reuse across quant frameworks.",
            },
            "performance": {
                "coverage_ratio": 0.61,
                "accuracy_ratio": 0.9,
                "freshness_hours": 28.0,
            },
            "feedback": _DAGI_FEEDBACK,
            "signals": (
                {
                    "metric": "governance",
                    "direction": "negative",
                    "value": 0.55,
                    "weight": 1.0,
                    "notes": "Ensure debate transcripts link to source data and reviewer sign-off.",
                },
                {
                    "metric": "accuracy",
                    "direction": "positive",
                    "value": 0.9,
                    "weight": 0.6,
                    "notes": "Maintain high-fidelity evaluation prompts for scenario backtests.",
                },
            ),
        },
    ),
    "DAGS": (
        {
            "output": {
                "capability": "policy observatory",
                "summary": "Detected discrepancies between policy handbook v2 and live automations.",
            },
            "performance": {
                "coverage_ratio": 0.54,
                "accuracy_ratio": 0.82,
                "freshness_hours": 30.0,
            },
            "feedback": _DAGS_FEEDBACK,
            "signals": (
                {
                    "metric": "governance",
                    "direction": "negative",
                    "value": 0.6,
                    "weight": 1.4,
                    "notes": "Mirror audit records into the OneDrive governance manifest nightly.",
                },
                {
                    "metric": "coverage",
                    "direction": "negative",
                    "value": 0.54,
                    "weight": 1.2,
                    "notes": "Index business continuity and compliance documents under DAGS namespace.",
                },
            ),
            "awareness_report": {
                "domain": "DAGS",
                "insight": "Policy lineage is partially untracked",
                "next_actions": [
                    "Backfill sign-off history for critical policies",
                    "Codify variance detection thresholds",
                ],
            },
        },
        {
            "output": {
                "capability": "governance telemetry",
                "summary": "Benchmarked AGS uptime, compliance, and audit closure rates.",
            },
            "performance": {
                "coverage_ratio": 0.59,
                "accuracy_ratio": 0.84,
                "freshness_hours": 26.0,
            },
            "feedback": _DAGS_FEEDBACK,
            "signals": (
                {
                    "metric": "staleness",
                    "direction": "negative",
                    "value": 0.5,
                    "weight": 1.1,
                    "notes": "Tighten SLAs for telemetry mirroring and escalation workflow resets.",
                },
                {
                    "metric": "accuracy",
                    "direction": "positive",
                    "value": 0.84,
                    "weight": 0.7,
                    "notes": "Keep human governance desk in the loop for exceptional approvals.",
                },
            ),
        },
    ),
}


def _to_signal(payload: Mapping[str, object]) -> ImprovementSignal:
    if isinstance(payload, ImprovementSignal):
        return payload
    return ImprovementSignal(**dict(payload))  # type: ignore[arg-type]


def _to_snapshot(payload: Mapping[str, object]) -> LearningSnapshot:
    output = dict(payload.get("output", {}))
    performance = {
        key: float(value)
        for key, value in dict(payload.get("performance", {})).items()
    }
    feedback = tuple(str(item) for item in payload.get("feedback", ()))
    signals_payload = payload.get("signals", ())
    signals = tuple(_to_signal(signal) for signal in signals_payload)
    awareness_report = payload.get("awareness_report")
    metacognition_report = payload.get("metacognition_report")
    return LearningSnapshot(
        output=output,
        performance=performance,
        feedback=feedback,
        signals=signals,
        awareness_report=awareness_report,
        metacognition_report=metacognition_report,
    )


def build_snapshots_from_payloads(
    payloads: Iterable[Mapping[str, object]]
) -> tuple[LearningSnapshot, ...]:
    """Convert mapping payloads into ``LearningSnapshot`` instances."""

    return tuple(_to_snapshot(payload) for payload in payloads)


DEFAULT_DOMAIN_KNOWLEDGE = {
    domain: build_snapshots_from_payloads(payloads)
    for domain, payloads in DEFAULT_DOMAIN_KNOWLEDGE_PAYLOADS.items()
}


def resolve_domain_snapshots(
    domains: Iterable[str],
    *,
    knowledge_base: Mapping[str, Sequence[Mapping[str, object]]] | None = None,
) -> dict[str, tuple[LearningSnapshot, ...]]:
    """Return snapshots for each domain, falling back to curated defaults."""

    resolved: MutableMapping[str, tuple[LearningSnapshot, ...]] = {}
    custom_base = knowledge_base or {}

    for domain in domains:
        domain_key = str(domain)
        payloads: Sequence[Mapping[str, object]] | None = None
        if domain_key in custom_base:
            payloads = tuple(custom_base[domain_key])
        elif domain_key.upper() in custom_base:
            payloads = tuple(custom_base[domain_key.upper()])

        if payloads is not None:
            snapshots = build_snapshots_from_payloads(payloads)
        else:
            snapshots = DEFAULT_DOMAIN_KNOWLEDGE.get(domain_key)
            if snapshots is None:
                fallback_payload = {
                    "output": {
                        "capability": "knowledge bootstrap",
                        "summary": f"Seed training data for {domain_key} domain.",
                    },
                    "performance": {
                        "coverage_ratio": 0.5,
                        "accuracy_ratio": 0.5,
                        "freshness_hours": 48.0,
                    },
                    "feedback": (
                        f"Define explicit knowledge datasets for {domain_key}.",
                    ),
                    "signals": (
                        {
                            "metric": "coverage",
                            "direction": "negative",
                            "value": 0.5,
                            "weight": 1.0,
                            "notes": f"Bootstrap knowledge for {domain_key} immediately.",
                        },
                    ),
                }
                snapshots = build_snapshots_from_payloads((fallback_payload,))

        resolved[domain_key] = snapshots

    return dict(resolved)

