"""Tonkeeper synchronisation algorithms powered by dynamic multi-LLM orchestration."""

from __future__ import annotations

import json
import textwrap
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import (
    LLMConfig,
    LLMRun,
    collect_strings,
    parse_json_response,
    serialise_runs,
)

__all__ = [
    "TonkeeperAccountSnapshot",
    "TonkeeperNetworkStatus",
    "TonkeeperSyncContext",
    "TonkeeperSyncPlan",
    "TonkeeperLLMResolution",
    "TonkeeperLLMCoordinator",
    "TonkeeperSyncEngine",
]


@dataclass(slots=True)
class TonkeeperAccountSnapshot:
    """Describes the state of a Tonkeeper account that requires coordination."""

    address: str
    balance_ton: float
    balance_usd: float
    min_balance_ton: float = 1.0
    pending_transactions: Sequence[str] = field(default_factory=tuple)
    labels: Sequence[str] = field(default_factory=tuple)
    status: str = "active"

    def to_prompt_payload(self) -> Dict[str, Any]:
        """Return a compact payload suitable for LLM prompting."""

        return {
            "address": self.address,
            "balance_ton": round(float(self.balance_ton), 6),
            "balance_usd": round(float(self.balance_usd), 2),
            "min_balance_ton": round(float(self.min_balance_ton), 6),
            "pending_transactions": list(self.pending_transactions),
            "labels": list(self.labels),
            "status": self.status,
        }


@dataclass(slots=True)
class TonkeeperNetworkStatus:
    """Live TON network telemetry that influences Tonkeeper operations."""

    ton_price_usd: float
    network_load: float
    validators_online: int
    epoch: Optional[str] = None
    upgrades: Sequence[str] = field(default_factory=tuple)

    def to_prompt_payload(self) -> Dict[str, Any]:
        """Return serialisable network context for LLM coordination."""

        return {
            "ton_price_usd": round(float(self.ton_price_usd), 4),
            "network_load": max(0.0, min(1.0, float(self.network_load))),
            "validators_online": max(0, int(self.validators_online)),
            "epoch": self.epoch,
            "upgrades": list(self.upgrades),
        }


@dataclass(slots=True)
class TonkeeperSyncContext:
    """Aggregates the Tonkeeper state that needs to be kept in sync."""

    accounts: Sequence[TonkeeperAccountSnapshot]
    network: TonkeeperNetworkStatus
    agenda: Sequence[str] = field(default_factory=tuple)
    incidents: Sequence[str] = field(default_factory=tuple)
    last_sync: Optional[datetime] = None

    def to_prompt_payload(self) -> Dict[str, Any]:
        """Return the payload injected into the multi-LLM prompt."""

        return {
            "accounts": [account.to_prompt_payload() for account in self.accounts],
            "network": self.network.to_prompt_payload(),
            "agenda": list(self.agenda),
            "incidents": list(self.incidents),
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
        }


@dataclass(slots=True)
class TonkeeperSyncPlan:
    """Concrete steps and alerts produced by the dynamic orchestration."""

    summary: str
    actions: list[str]
    alerts: list[str]
    checkpoints: list[str]
    next_sync_minutes: int
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the sync plan."""

        return {
            "summary": self.summary,
            "actions": list(self.actions),
            "alerts": list(self.alerts),
            "checkpoints": list(self.checkpoints),
            "next_sync_minutes": int(self.next_sync_minutes),
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class TonkeeperLLMResolution:
    """Captures the result of orchestrating multiple LLMs."""

    context: TonkeeperSyncContext
    plan: TonkeeperSyncPlan
    runs: Sequence[LLMRun]
    raw_payloads: Sequence[Mapping[str, Any]]
    serialised_runs: Optional[str]

    def to_dict(self, *, include_runs: bool = False) -> Dict[str, Any]:
        """Return a serialisable payload for downstream auditing."""

        payload: Dict[str, Any] = {
            "plan": self.plan.to_dict(),
            "raw_payloads": [dict(item) for item in self.raw_payloads],
            "context": self.context.to_prompt_payload(),
        }
        if include_runs and self.serialised_runs:
            payload["runs"] = self.serialised_runs
        return payload


DEFAULT_PROMPT = textwrap.dedent(
    """
    You are a coordination layer ensuring Tonkeeper stays synchronised across
    treasury, product, and infrastructure stakeholders. Review the current
    context and respond with strict JSON using the following schema:
    {{
      "summary": "Concise narrative",
      "actions": ["Ordered list of operational follow-ups"],
      "alerts": ["Urgent risks or anomalies"],
      "sync": {{
        "checkpoints": ["Key reconciliation checkpoints"],
        "next_run_minutes": 30,
        "notes": ["Additional commentary"]
      }}
    }}
    Focus on keeping account balances, TON network signals, and stakeholder
    agendas in sync. Merge overlapping workstreams and flag disagreements.
    Context:
    {context}
    """
)


@dataclass(slots=True)
class TonkeeperLLMCoordinator:
    """Runs the configured LLMs and merges their guidance into a single plan."""

    llms: Sequence[LLMConfig]
    prompt_template: str = DEFAULT_PROMPT

    def build_prompt(self, context: TonkeeperSyncContext) -> str:
        """Render the prompt injected into every LLM."""

        context_json = json.dumps(context.to_prompt_payload(), indent=2, default=str)
        return self.prompt_template.format(context=context_json)

    def generate_plan(self, context: TonkeeperSyncContext) -> TonkeeperLLMResolution:
        """Execute each LLM and merge the resulting payloads."""

        prompt = self.build_prompt(context)
        run_payloads: list[tuple[LLMRun, Mapping[str, Any]]] = []
        for config in self.llms:
            run = config.run(prompt)
            payload = parse_json_response(run.response) or {}
            run_payloads.append((run, payload))

        plan = self._merge_payloads(context, run_payloads)
        runs = [item[0] for item in run_payloads]
        payloads = [item[1] for item in run_payloads]
        serialised = serialise_runs(runs)
        return TonkeeperLLMResolution(
            context=context,
            plan=plan,
            runs=tuple(runs),
            raw_payloads=tuple(payloads),
            serialised_runs=serialised,
        )

    def _merge_payloads(
        self,
        context: TonkeeperSyncContext,
        run_payloads: Sequence[tuple[LLMRun, Mapping[str, Any]]],
    ) -> TonkeeperSyncPlan:
        payloads = [payload for _, payload in run_payloads]
        summary = next(
            (
                str(payload.get("summary", "")).strip()
                for payload in payloads
                if payload.get("summary")
            ),
            "",
        )

        actions = collect_strings(*(payload.get("actions") for payload in payloads))
        alerts = collect_strings(
            *(payload.get("alerts") for payload in payloads),
            context.incidents,
        )
        checkpoints = collect_strings(
            *(self._extract_checkpoints(payload) for payload in payloads),
            (f"Reconcile balance for {account.address}" for account in context.accounts),
        )
        next_sync_minutes = self._determine_next_sync(payloads)

        disagreements = self._detect_disagreements(actions, run_payloads)
        metadata: Dict[str, Any] = {
            "model_count": len(run_payloads),
            "agenda": collect_strings(context.agenda),
        }
        if disagreements:
            metadata["disagreements"] = disagreements

        return TonkeeperSyncPlan(
            summary=summary,
            actions=list(actions),
            alerts=list(alerts),
            checkpoints=list(checkpoints),
            next_sync_minutes=next_sync_minutes,
            metadata=metadata,
        )

    @staticmethod
    def _extract_checkpoints(payload: Mapping[str, Any]) -> Iterable[str]:
        sync_block = payload.get("sync", {}) if isinstance(payload, Mapping) else {}
        if isinstance(sync_block, Mapping):
            return collect_strings(
                sync_block.get("checkpoints"),
                sync_block.get("notes"),
            )
        return []

    @staticmethod
    def _determine_next_sync(payloads: Sequence[Mapping[str, Any]]) -> int:
        candidates: list[int] = []
        for payload in payloads:
            sync_block = payload.get("sync", {}) if isinstance(payload, Mapping) else {}
            values = [payload.get("next_sync_minutes"), payload.get("next_run_minutes")]
            if isinstance(sync_block, Mapping):
                values.extend(
                    [
                        sync_block.get("next_run_minutes"),
                        sync_block.get("next_sync_minutes"),
                    ]
                )
            for value in values:
                if isinstance(value, (int, float)) and value:
                    candidates.append(max(1, int(round(float(value)))))
        if not candidates:
            return 30
        return min(candidates)

    @staticmethod
    def _detect_disagreements(
        canonical_actions: Sequence[str],
        run_payloads: Sequence[tuple[LLMRun, Mapping[str, Any]]],
    ) -> list[Dict[str, Any]]:
        if not canonical_actions:
            return []
        consensus = set(canonical_actions)
        disagreements: list[Dict[str, Any]] = []
        for run, payload in run_payloads:
            model_actions = set(collect_strings(payload.get("actions")))
            missing = sorted(consensus - model_actions)
            extras = sorted(model_actions - consensus)
            if missing or extras:
                disagreements.append(
                    {
                        "model": run.name,
                        "missing": missing,
                        "extras": extras,
                    }
                )
        return disagreements


@dataclass(slots=True)
class TonkeeperSyncEngine:
    """Applies guard rails and fallbacks on top of LLM guidance."""

    coordinator: TonkeeperLLMCoordinator

    def plan_sync(self, context: TonkeeperSyncContext) -> TonkeeperLLMResolution:
        """Return a synchronisation plan enriched with safety fallbacks."""

        resolution = self.coordinator.generate_plan(context)
        plan = resolution.plan

        fallback_actions = self._fallback_actions(context)
        if fallback_actions and not plan.actions:
            plan.actions.extend(fallback_actions)
            plan.metadata["fallback_actions"] = True
            if not plan.summary:
                plan.summary = "Fallback Tonkeeper sync actions applied."

        balance_alerts = self._balance_alerts(context)
        new_alerts = [alert for alert in balance_alerts if alert not in plan.alerts]
        if new_alerts:
            plan.alerts.extend(new_alerts)
            plan.metadata["balance_alerts"] = True

        if not plan.summary:
            plan.summary = "Tonkeeper sync plan generated without model summary."

        return resolution

    @staticmethod
    def _fallback_actions(context: TonkeeperSyncContext) -> list[str]:
        actions: list[str] = []
        for account in context.accounts:
            short_address = account.address[:8] + "…" if len(account.address) > 8 else account.address
            if account.pending_transactions:
                actions.append(
                    f"Review {len(account.pending_transactions)} pending transfers for {short_address}."
                )
            if account.balance_ton < account.min_balance_ton:
                deficit = account.min_balance_ton - account.balance_ton
                actions.append(
                    f"Top up {short_address} by {deficit:.2f} TON to meet the safety buffer."
                )
        if context.incidents:
            actions.append("Follow up on outstanding incidents: " + ", ".join(context.incidents))
        return actions

    @staticmethod
    def _balance_alerts(context: TonkeeperSyncContext) -> list[str]:
        alerts: list[str] = []
        for account in context.accounts:
            if account.balance_ton < account.min_balance_ton * 0.75:
                alerts.append(
                    f"Critical TON balance for {account.address}: {account.balance_ton:.2f} TON"
                )
        if context.network.network_load > 0.85:
            alerts.append(
                f"TON network load elevated at {context.network.network_load:.2%}"
            )
        return alerts
