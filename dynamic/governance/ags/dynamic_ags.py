"""Dynamic AGS governance playbook implementation."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Mapping, MutableMapping, Sequence

from .engine import PlaybookContext, PlaybookEntry
from .sync import PlaybookSynchronizer

__all__ = [
    "DEFAULT_DYNAMIC_AGS_ENTRIES",
    "build_dynamic_ags_playbook",
]


_DEFAULT_CONTEXT: Mapping[str, object] = {
    "mission": "Dynamic AGS Multi-Agent Governance Launch",
    "cadence": "Weekly governance sync + daily ops stand-up",
    "risk_tolerance": 0.45,
    "automation_expectation": 0.6,
    "readiness_pressure": 0.62,
    "oversight_level": 0.7,
    "escalation_channels": (
        "Owner escalation channel",
        "Operator incident line",
    ),
    "scenario_focus": (
        "governance",
        "synchronization",
        "memory",
        "observability",
        "reliability",
    ),
    "highlight_limit": 5,
}


_BASE_TIMESTAMP = datetime(2024, 5, 1, tzinfo=timezone.utc)


_ENTRY_SPECS: tuple[Mapping[str, object], ...] = (
    {
        "title": "Establish AGS Governance Council",
        "objective": "Assign owner, operator, reviewer accountability and formalise escalation routes.",
        "stage": "Governance",
        "readiness": 0.58,
        "automation": 0.35,
        "risk": 0.42,
        "weight": 1.2,
        "tags": ("roles", "policy", "oversight"),
        "owners": ("owner", "operator", "reviewer"),
        "metadata": {
            "section": "2.1 Roles",
            "cadence": "Quarterly charter review",
            "deliverables": (
                "council charter",
                "escalation rota",
                "role registry",
            ),
        },
    },
    {
        "title": "Codify Risk & Approval Policies",
        "objective": "Translate tiered action classes into YAML policy with critic thresholds and dual approvals.",
        "stage": "Governance",
        "readiness": 0.5,
        "automation": 0.45,
        "risk": 0.52,
        "weight": 1.1,
        "tags": ("policy", "risk", "approvals"),
        "dependencies": ("Establish AGS Governance Council",),
        "owners": ("owner", "operator"),
        "metadata": {
            "section": "2.2 Policies",
            "risk_tiers": {
                "T0": ["READ", "RESEARCH", "RETRIEVE"],
                "T1": ["WRITE_DB", "SUMMARIZE", "DRAFT_REPLY"],
                "T2": ["PUBLISH", "SOCIAL_POST"],
                "T3": ["TRADE", "PAYMENT", "WITHDRAWAL"],
            },
            "approvals": {
                "T2": ["critic>=0.8", "operator_approval"],
                "T3": [
                    "critic>=0.9",
                    "operator_approval",
                    "owner_approval",
                    "dry_run_required",
                ],
            },
        },
    },
    {
        "title": "Provision Control Plane & Secrets",
        "objective": "Deploy configuration service for policies, feature flags, and scoped secrets management.",
        "stage": "Infrastructure",
        "readiness": 0.48,
        "automation": 0.52,
        "risk": 0.46,
        "weight": 1.0,
        "tags": ("control-plane", "secrets", "supabase"),
        "dependencies": ("Codify Risk & Approval Policies",),
        "owners": ("operator", "backend"),
        "metadata": {
            "section": "1 Architecture / Control Plane",
            "platform": "Supabase config + KV",
            "controls": ("feature flags", "policy registry", "secret rotation"),
        },
    },
    {
        "title": "Deploy Shared Memory Layer",
        "objective": "Stand up Redis STM, Postgres MTM, and vector knowledge base with lifecycle policies.",
        "stage": "Memory",
        "readiness": 0.45,
        "automation": 0.55,
        "risk": 0.5,
        "weight": 1.25,
        "tags": ("memory", "redis", "vector"),
        "dependencies": ("Provision Control Plane & Secrets",),
        "owners": ("backend", "data"),
        "metadata": {
            "section": "3.3 Shared Memory",
            "retention": {
                "redis_ttl_hours": 48,
                "postgres_retention_days": 90,
            },
            "vector_store": "pgvector",
        },
    },
    {
        "title": "Implement Event Bus Contracts",
        "objective": "Define versioned event schemas and idempotency enforcement across orchestrator channels.",
        "stage": "Synchronization",
        "readiness": 0.44,
        "automation": 0.58,
        "risk": 0.54,
        "weight": 1.2,
        "tags": ("events", "schema", "idempotency"),
        "dependencies": ("Provision Control Plane & Secrets",),
        "owners": ("backend", "operator"),
        "metadata": {
            "section": "3.2 Message Passing",
            "event_types": (
                "TASK_CREATED",
                "STEP_READY",
                "STEP_DONE",
                "NEED_APPROVAL",
                "PUBLISH_OK",
                "INCIDENT_RAISED",
            ),
            "idempotency_key": "task_id:step:hash",
        },
    },
    {
        "title": "Wire Task DAG Orchestrator",
        "objective": "Implement DAG planner with risk-tagged steps, approvals, and archive flow integrations.",
        "stage": "Orchestration",
        "readiness": 0.42,
        "automation": 0.6,
        "risk": 0.56,
        "weight": 1.3,
        "tags": ("planner", "dag", "workflow"),
        "dependencies": (
            "Deploy Shared Memory Layer",
            "Implement Event Bus Contracts",
        ),
        "owners": ("backend", "planner"),
        "metadata": {
            "section": "4 Task Lifecycle",
            "risk_tags": ("T0", "T1", "T2", "T3"),
            "archive_outputs": True,
        },
    },
    {
        "title": "Configure Critic & Evaluation Harness",
        "objective": "Deploy LLM-as-judge rubric, regression suites, and artifact scoring automation.",
        "stage": "Quality",
        "readiness": 0.4,
        "automation": 0.62,
        "risk": 0.53,
        "weight": 1.15,
        "tags": ("critic", "evaluation", "rubric"),
        "dependencies": (
            "Wire Task DAG Orchestrator",
            "Deploy Shared Memory Layer",
        ),
        "owners": ("reviewer", "data"),
        "metadata": {
            "section": "5 Quality & Safety Evaluation",
            "rubric": {
                "policy_compliance": 1,
                "evidence": 2,
                "factuality": 3,
                "clarity": 2,
                "risk_flags": 1,
            },
            "threshold": 0.8,
        },
    },
    {
        "title": "Roll Out Reliability Safeguards",
        "objective": "Enable retries, circuit breakers, and fallback paths with monitoring hooks.",
        "stage": "Reliability",
        "readiness": 0.38,
        "automation": 0.64,
        "risk": 0.57,
        "weight": 1.18,
        "tags": ("retries", "circuit-breaker", "fallbacks"),
        "dependencies": (
            "Implement Event Bus Contracts",
            "Wire Task DAG Orchestrator",
        ),
        "owners": ("operator", "backend"),
        "metadata": {
            "section": "6 Reliability Patterns",
            "retries": {
                "strategy": "exponential_backoff",
                "max_attempts": 3,
            },
            "circuit_breaker": {
                "open_failures": 5,
                "window_seconds": 60,
                "half_open_after_seconds": 120,
            },
        },
    },
    {
        "title": "Install Observability Stack",
        "objective": "Wire OpenTelemetry traces, structured logs, and KPI dashboards across agents.",
        "stage": "Observability",
        "readiness": 0.41,
        "automation": 0.58,
        "risk": 0.48,
        "weight": 1.1,
        "tags": ("logging", "metrics", "tracing"),
        "dependencies": (
            "Provision Control Plane & Secrets",
            "Implement Event Bus Contracts",
        ),
        "owners": ("operator", "data"),
        "metadata": {
            "section": "7 Observability & Audit",
            "metrics": (
                "latency_p50",
                "latency_p95",
                "critic_pass_rate",
                "duplicate_rate",
            ),
            "tooling": ("OpenTelemetry", "Supabase", "Grafana"),
        },
    },
    {
        "title": "Enable Audit Trails & Approvals",
        "objective": "Create immutable approval logs with artifact links for all T2/T3 actions.",
        "stage": "Compliance",
        "readiness": 0.37,
        "automation": 0.52,
        "risk": 0.6,
        "weight": 1.25,
        "tags": ("audit", "approvals", "compliance"),
        "dependencies": (
            "Codify Risk & Approval Policies",
            "Configure Critic & Evaluation Harness",
            "Install Observability Stack",
        ),
        "owners": ("reviewer", "operator"),
        "metadata": {
            "section": "7 Observability & Audit",
            "tables": (
                "approvals",
                "audit_logs",
                "events",
            ),
            "evidence": ("artifact links", "approver signature"),
        },
    },
    {
        "title": "Activate Security Guardrails",
        "objective": "Apply PII masking, prompt-injection filters, trade limits, and payment gates.",
        "stage": "Security",
        "readiness": 0.4,
        "automation": 0.5,
        "risk": 0.55,
        "weight": 1.05,
        "tags": ("security", "guardrails", "limits"),
        "dependencies": (
            "Provision Control Plane & Secrets",
        ),
        "owners": ("operator", "owner"),
        "metadata": {
            "section": "2.3 Guardrails",
            "trade_limits": {
                "daily_loss_cap_pct": 5,
                "max_positions": 3,
            },
            "payment_gates": {
                "max_single_tx_usdt": 500,
                "cool_down_minutes": 30,
            },
        },
    },
    {
        "title": "Launch Sync Runbooks",
        "objective": "Publish SOPs for desync recovery, tool failure handling, and memory drift remediation.",
        "stage": "Operations",
        "readiness": 0.36,
        "automation": 0.48,
        "risk": 0.5,
        "weight": 1.0,
        "tags": ("runbooks", "operations", "sop"),
        "dependencies": (
            "Roll Out Reliability Safeguards",
            "Install Observability Stack",
        ),
        "owners": ("operator", "reviewer"),
        "metadata": {
            "section": "10 Sync Runbooks",
            "runbooks": (
                "desync_duplicate_execution",
                "tool_failure",
                "memory_drift",
            ),
            "review_cadence": "Quarterly drills",
        },
    },
    {
        "title": "Calibrate KPIs & Alerts",
        "objective": "Implement success rate, approval latency, and critic pass alerts with thresholds.",
        "stage": "Operations",
        "readiness": 0.34,
        "automation": 0.56,
        "risk": 0.49,
        "weight": 0.95,
        "tags": ("kpi", "alerts", "metrics"),
        "dependencies": (
            "Install Observability Stack",
        ),
        "owners": ("operator", "data"),
        "metadata": {
            "section": "12 KPIs & Alerts",
            "kpis": (
                "success_rate>=0.99",
                "critic_pass>=0.95",
                "dup_exec<0.003",
                "t3_approval_time<5m",
            ),
            "alerts": (
                "dup_rate>0.01",
                "critic_pass<0.85",
                "circuit_open>5m",
            ),
        },
    },
    {
        "title": "Conduct Integrated Simulation",
        "objective": "Run end-to-end drill covering trading, payment, and communication flows with approvals.",
        "stage": "Go-Live",
        "readiness": 0.32,
        "automation": 0.6,
        "risk": 0.58,
        "weight": 1.35,
        "tags": ("simulation", "go-live", "drill"),
        "dependencies": (
            "Wire Task DAG Orchestrator",
            "Roll Out Reliability Safeguards",
            "Install Observability Stack",
            "Enable Audit Trails & Approvals",
            "Launch Sync Runbooks",
        ),
        "owners": ("owner", "operator", "reviewer"),
        "metadata": {
            "section": "15 Implementation Checklist",
            "checkpoints": (
                "supabase_tables_ready",
                "redis_idempotency",
                "policy_yaml_loaded",
                "dashboards_live",
            ),
            "evidence": "Simulation report with artifacts",
        },
    },
)


def _build_default_entries() -> tuple[PlaybookEntry, ...]:
    entries: list[PlaybookEntry] = []
    for index, spec in enumerate(_ENTRY_SPECS):
        payload = dict(spec)
        payload.setdefault("timestamp", _BASE_TIMESTAMP + timedelta(minutes=index))
        entries.append(PlaybookEntry(**payload))
    return tuple(entries)


DEFAULT_DYNAMIC_AGS_ENTRIES: tuple[PlaybookEntry, ...] = _build_default_entries()


def build_dynamic_ags_playbook(
    *,
    synchronizer: PlaybookSynchronizer | None = None,
    context_overrides: Mapping[str, object] | None = None,
    additional_entries: Sequence[Mapping[str, object] | PlaybookEntry] | None = None,
) -> Mapping[str, object]:
    """Build the Dynamic AGS governance playbook payload."""

    sync = synchronizer or PlaybookSynchronizer()
    sync.implement_many(DEFAULT_DYNAMIC_AGS_ENTRIES)

    if additional_entries:
        sync.implement_many(additional_entries)

    context_kwargs: MutableMapping[str, object] = dict(_DEFAULT_CONTEXT)
    if context_overrides:
        context_kwargs.update(context_overrides)

    context = PlaybookContext(**context_kwargs)
    return sync.sync_payload(context)

