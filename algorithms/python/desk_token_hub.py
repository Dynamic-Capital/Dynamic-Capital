"""Desk Hub token hub orchestration powered by dynamic multi-LLM synthesis."""

from __future__ import annotations

import json
import textwrap
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence

from .multi_llm import (
    CompletionClient,
    LLMConfig,
    collect_strings,
    parse_json_response,
    serialise_runs,
)

CHECKLIST_REFERENCE: Dict[str, Dict[str, Any]] = {
    "foundation_architecture": {
        "title": "Foundation & Architecture",
        "items": (
            "Confirm user journeys for accessing Intelligence, Execution, and Liquidity layers within the mini app.",
            "Map DCT staking flows that gate access to tiered tooling and AI copilots.",
            "Integrate TON wallet authentication and transaction signing for all on-chain actions.",
            "Implement modular smart contract interactions to support future cross-chain extensions.",
        ),
        "aliases": (
            "foundation",
            "architecture",
            "foundation & architecture",
            "foundation and architecture",
        ),
    },
    "token_supply_emissions": {
        "title": "Token Supply & Emissions",
        "items": (
            "Mirror genesis supply and allocation tables in on-chain and off-chain documentation.",
            "Codify emission halving logic (12-month cadence) inside the emissions scheduler.",
            "Enforce multi-signature and timelock controls on treasury mint functions.",
            "Surface vesting status for contributors, partners, grants, and public sale tranches.",
        ),
        "aliases": (
            "supply",
            "emissions",
            "token supply",
            "token supply & emissions",
        ),
    },
    "utility_incentives": {
        "title": "Utility & Incentive Mechanisms",
        "items": (
            "Build staking tier management with dynamic parameter configuration via governance.",
            "Implement fee rebate calculations for execution, vault, and data subscriptions.",
            "Enable liquidity mining dashboards tracking depth, uptime, and risk-adjusted returns.",
            "Meter protocol services (backtesting, APIs, bots) as DCT credit consumption.",
        ),
        "aliases": (
            "utility",
            "incentives",
            "utility & incentive mechanisms",
        ),
    },
    "governance_experience": {
        "title": "Governance Experience",
        "items": (
            "Ship proposal lifecycle UI covering ideation, temperature check, and on-chain voting.",
            "Support delegation workflows for Token Assembly representatives.",
            "Integrate Contributor Council review checkpoints before escalation to token votes.",
            "Visualize quorum thresholds relative to total DCT staked.",
        ),
        "aliases": (
            "governance",
            "governance experience",
        ),
    },
    "treasury_management": {
        "title": "Treasury Management",
        "items": (
            "Display treasury asset allocation across stable assets, yield vaults, and liquidity positions.",
            "Add approval workflows requiring dual sign-off from Contributor Council and Token Assembly.",
            "Generate monthly transparency reports detailing inflows, outflows, and performance.",
            "Monitor treasury risk limits and alert operators when thresholds are breached.",
        ),
        "aliases": (
            "treasury",
            "treasury management",
        ),
    },
    "compliance_risk_controls": {
        "title": "Compliance & Risk Controls",
        "items": (
            "Embed programmatic KYC/KYB checks for institutional participants.",
            "Integrate audit reports and continuous monitoring feeds for smart contracts.",
            "Enforce leverage caps, vault concentration limits, and circuit breaker toggles via UI controls.",
            "Log compliance decisions and provide exportable reports for regulators.",
        ),
        "aliases": (
            "compliance",
            "risk",
            "compliance & risk controls",
            "compliance and risk controls",
        ),
    },
    "roadmap_alignment": {
        "title": "Roadmap Alignment",
        "items": (
            "Track Phase 1 deliverables (staking tiers, governance portal, market-making incentives).",
            "Track Phase 2 deliverables (AI copilots, cross-venue routing, risk dashboards).",
            "Track Phase 3 deliverables (custodial integrations, structured products, compliance tooling).",
            "Track Phase 4 deliverables (cross-chain staking, fee credits, bridge integrations).",
        ),
        "aliases": (
            "roadmap",
            "roadmap alignment",
        ),
    },
    "adoption_analytics": {
        "title": "Adoption & Analytics",
        "items": (
            "Instrument activation metrics for traders across the Intelligence, Execution, and Liquidity layers.",
            "Capture staking retention, delegation participation, and proposal completion rates.",
            "Monitor liquidity depth, vault performance, and emissions distribution effectiveness.",
            "Provide exportable analytics snapshots for strategy contributors and treasury stewards.",
        ),
        "aliases": (
            "adoption",
            "analytics",
            "adoption & analytics",
        ),
    },
    "operational_readiness": {
        "title": "Operational Readiness",
        "items": (
            "Define incident response playbooks for on-chain anomalies and compliance breaches.",
            "Establish monitoring alerts for governance inactivity or quorum risk.",
            "Train support teams on user journeys, staking requirements, and compliance workflows.",
            "Document rollout plan for phased roadmap delivery within Desk Hub.",
        ),
        "aliases": (
            "operations",
            "operational readiness",
            "operational",
        ),
    },
}


def _build_alias_index() -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for slug, payload in CHECKLIST_REFERENCE.items():
        mapping[slug] = slug
        mapping[slug.replace("_", " ")] = slug
        title = payload.get("title")
        if title:
            mapping[title.lower()] = slug
        for alias in payload.get("aliases", ()):  # type: ignore[arg-type]
            mapping[str(alias).lower()] = slug
    return mapping


CHECKLIST_NORMALISERS = _build_alias_index()


@dataclass(slots=True)
class TokenHubDevelopmentContext:
    """Operational telemetry consumed by :class:`TokenHubDevelopmentOrchestrator`."""

    release_phase: str = "Phase 1"
    product_updates: Sequence[str] = field(default_factory=tuple)
    treasury_snapshot: Mapping[str, Any] = field(default_factory=dict)
    governance_snapshot: Mapping[str, Any] = field(default_factory=dict)
    compliance_alerts: Sequence[str] = field(default_factory=tuple)
    analytics: Mapping[str, Any] = field(default_factory=dict)
    stakeholder_requests: Sequence[str] = field(default_factory=tuple)
    open_questions: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class TokenHubSyncReport:
    """Structured output produced by the token hub orchestrator."""

    generated_at: datetime
    summary: str
    priority_actions: list[str]
    risk_calls: list[str]
    roadmap_alignment: list[str]
    checklist: Dict[str, list[Dict[str, Any]]]
    metadata: Dict[str, Any]
    raw_response: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "generated_at": self.generated_at.isoformat(),
            "summary": self.summary,
            "priority_actions": list(self.priority_actions),
            "risk_calls": list(self.risk_calls),
            "roadmap_alignment": list(self.roadmap_alignment),
            "checklist": {
                area: [dict(item) for item in entries]
                for area, entries in self.checklist.items()
            },
            "metadata": dict(self.metadata),
            "raw_response": self.raw_response,
        }


@dataclass(slots=True)
class TokenHubDevelopmentOrchestrator:
    """Coordinates Grok-1 and DeepSeek-V3 planning for the Desk Hub token hub."""

    grok_client: CompletionClient
    deepseek_client: CompletionClient
    grok_temperature: float = 0.18
    grok_nucleus_p: float = 0.92
    grok_max_tokens: int = 640
    deepseek_temperature: float = 0.15
    deepseek_nucleus_p: float = 0.9
    deepseek_max_tokens: int = 640

    def synchronise(self, context: TokenHubDevelopmentContext) -> TokenHubSyncReport:
        """Return a consolidated development sync for the token hub."""

        payload = self._build_payload(context)
        grok_prompt = self._build_grok_prompt(payload)
        grok_run = LLMConfig(
            name="grok-1",
            client=self.grok_client,
            temperature=self.grok_temperature,
            nucleus_p=self.grok_nucleus_p,
            max_tokens=self.grok_max_tokens,
        ).run(grok_prompt)
        grok_payload = parse_json_response(grok_run.response, fallback_key="summary") or {}

        deepseek_prompt = self._build_deepseek_prompt(payload, grok_payload)
        deepseek_run = LLMConfig(
            name="deepseek-v3",
            client=self.deepseek_client,
            temperature=self.deepseek_temperature,
            nucleus_p=self.deepseek_nucleus_p,
            max_tokens=self.deepseek_max_tokens,
        ).run(deepseek_prompt)
        deepseek_payload = parse_json_response(deepseek_run.response, fallback_key="analysis") or {}

        checklist = self._merge_checklist(
            grok_payload.get("checklist_updates"),
            deepseek_payload.get("checklist_adjustments"),
        )

        summary = self._resolve_summary(grok_payload, deepseek_payload)
        priority_actions = collect_strings(
            grok_payload.get("priority_actions"),
            grok_payload.get("actions"),
            deepseek_payload.get("priority_refinements"),
            deepseek_payload.get("actions"),
        )
        risk_calls = collect_strings(
            grok_payload.get("risks"),
            deepseek_payload.get("challenges"),
            deepseek_payload.get("risks"),
        )
        roadmap_alignment = collect_strings(
            grok_payload.get("roadmap_alignment"),
            deepseek_payload.get("roadmap_notes"),
        )

        metadata: Dict[str, Any] = {
            "context": payload,
            "grok": grok_payload,
            "deepseek": deepseek_payload,
        }
        raw_response = serialise_runs((grok_run, deepseek_run))

        return TokenHubSyncReport(
            generated_at=datetime.now(tz=UTC),
            summary=summary,
            priority_actions=priority_actions,
            risk_calls=risk_calls,
            roadmap_alignment=roadmap_alignment,
            checklist=checklist,
            metadata=metadata,
            raw_response=raw_response,
        )

    def _build_payload(self, context: TokenHubDevelopmentContext) -> Dict[str, Any]:
        return {
            "release_phase": context.release_phase,
            "product_updates": list(context.product_updates),
            "treasury_snapshot": dict(context.treasury_snapshot),
            "governance_snapshot": dict(context.governance_snapshot),
            "compliance_alerts": list(context.compliance_alerts),
            "analytics": dict(context.analytics),
            "stakeholder_requests": list(context.stakeholder_requests),
            "open_questions": list(context.open_questions),
            "checklist_reference": {
                slug: {"title": payload["title"], "items": list(payload["items"])}
                for slug, payload in CHECKLIST_REFERENCE.items()
            },
        }

    def _build_grok_prompt(self, payload: Mapping[str, Any]) -> str:
        payload_json = json.dumps(payload, indent=2, default=str, sort_keys=True)
        checklist_keys = ", ".join(CHECKLIST_REFERENCE)
        return textwrap.dedent(
            f"""
            You are Grok-1 acting as Dynamic Capital's Desk Hub orchestrator. Review the
            payload and produce a single JSON object with the keys:
              - "summary": concise synthesis of current focus.
              - "priority_actions": ordered array of next actions for the upcoming sprint.
              - "risks": array calling out delivery, governance, or compliance risks.
              - "roadmap_alignment": array linking work to roadmap phases.
              - "checklist_updates": object keyed by checklist area slug where each value is an
                array of objects matching this shape:
                  {{
                    "task": "<exact task text from checklist_reference>",
                    "status": "pending" | "in_progress" | "blocked" | "complete" | "needs_review",
                    "owner": "<optional responsible role>",
                    "notes": "<optional rationale or dependency>"
                  }}
            Use only the area slugs from this set: {checklist_keys}. If a task is not mentioned
            assume it stays "pending". Do not return markdown or commentary outside JSON.

            Payload:
            {payload_json}
            """
        ).strip()

    def _build_deepseek_prompt(
        self,
        payload: Mapping[str, Any],
        grok_payload: Mapping[str, Any],
    ) -> str:
        base_json = json.dumps(payload, indent=2, default=str, sort_keys=True)
        grok_json = json.dumps(grok_payload, indent=2, default=str, sort_keys=True)
        return textwrap.dedent(
            """
            You are DeepSeek-V3 acting as the risk and governance arbiter for Dynamic Capital's
            Desk Hub token hub. Review the context and Grok's proposal. Respond with a single JSON
            object containing:
              - "summary": optional refined synthesis if Grok missed a critical nuance.
              - "priority_refinements": optional array of adjustments or new actions.
              - "challenges": optional array of delivery or risk blockers that require follow-up.
              - "roadmap_notes": optional array referencing roadmap phases or milestones at risk.
              - "checklist_adjustments": optional object mirroring Grok's schema to override or add
                statuses where additional controls are needed.
            Focus on stress-testing compliance, treasury safeguards, and governance readiness.
            Do not output explanations outside the JSON object.

            Base payload:
            {base_json}

            Grok payload:
            {grok_json}
            """
        ).strip()

    def _merge_checklist(
        self,
        grok_updates: Any,
        deepseek_updates: Any,
    ) -> Dict[str, list[Dict[str, Any]]]:
        checklist = {
            slug: [
                {"task": item, "status": "pending"}
                for item in payload["items"]
            ]
            for slug, payload in CHECKLIST_REFERENCE.items()
        }
        self._apply_checklist_updates(checklist, grok_updates)
        self._apply_checklist_updates(checklist, deepseek_updates)
        return checklist

    def _apply_checklist_updates(
        self,
        checklist: MutableMapping[str, list[Dict[str, Any]]],
        updates: Any,
    ) -> None:
        if not isinstance(updates, Mapping):
            return
        for area, entries in updates.items():
            slug = self._normalise_area(area)
            if slug is None:
                slug = self._fallback_slug(area)
            existing = checklist.setdefault(slug, [])
            if not isinstance(entries, Iterable):
                continue
            task_lookup: Dict[str, Dict[str, Any]] = {item.get("task"): item for item in existing if item.get("task")}
            for entry in entries:  # type: ignore[assignment]
                if not isinstance(entry, Mapping):
                    continue
                task = str(entry.get("task", "")).strip()
                if not task:
                    continue
                record = task_lookup.get(task)
                if record is None:
                    record = {"task": task, "status": entry.get("status", "pending") or "pending"}
                    existing.append(record)
                    task_lookup[task] = record
                status = entry.get("status")
                if isinstance(status, str) and status:
                    record["status"] = status
                for key in ("owner", "notes", "due_date"):
                    value = entry.get(key)
                    if value:
                        record[key] = value

    def _normalise_area(self, area: Any) -> Optional[str]:
        if not area:
            return None
        key = str(area).strip().lower()
        return CHECKLIST_NORMALISERS.get(key)

    def _fallback_slug(self, area: Any) -> str:
        key = str(area or "misc").strip().lower()
        slug = key.replace("&", "and").replace(" ", "_") or "misc"
        return slug

    def _resolve_summary(
        self,
        grok_payload: Mapping[str, Any],
        deepseek_payload: Mapping[str, Any],
    ) -> str:
        for source in (
            grok_payload.get("summary"),
            grok_payload.get("narrative"),
            deepseek_payload.get("summary"),
            deepseek_payload.get("analysis"),
        ):
            if isinstance(source, str) and source.strip():
                return source.strip()
        return "Desk Hub token hub synchronisation completed."


__all__ = [
    "CHECKLIST_REFERENCE",
    "TokenHubDevelopmentContext",
    "TokenHubDevelopmentOrchestrator",
    "TokenHubSyncReport",
]
