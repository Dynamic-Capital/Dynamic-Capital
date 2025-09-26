"""Dynamic multi-LLM orchestrator for auto-synchronisation workflows."""

from __future__ import annotations

import json
import math
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import (
    LLMConfig,
    LLMRun,
    collect_strings,
    parse_json_response,
    serialise_runs,
)

__all__ = [
    "SyncSnapshot",
    "AutoSyncAction",
    "AutoSyncPlan",
    "DynamicAutoSyncOrchestrator",
]


def _as_dict(mapping: Mapping[str, Any] | None) -> Dict[str, Any]:
    if not mapping:
        return {}
    return {key: value for key, value in mapping.items()}


def _normalise_confidence(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return max(0.0, min(1.0, number))


def _normalise_tags(*candidates: Any) -> tuple[str, ...]:
    tags: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        if candidate is None:
            continue
        if isinstance(candidate, (str, bytes)):
            values: Iterable[Any] = (candidate,)
        elif isinstance(candidate, Iterable):
            values = candidate
        else:
            values = (candidate,)
        for value in values:
            tag = str(value).strip()
            if not tag or tag in seen:
                continue
            seen.add(tag)
            tags.append(tag)
    return tuple(tags)


@dataclass(slots=True)
class SyncSnapshot:
    """State snapshot for an entity that participates in auto-sync."""

    entity_id: str
    current_state: Mapping[str, Any]
    desired_state: Mapping[str, Any] = field(default_factory=dict)
    history: Sequence[Mapping[str, Any] | str] = field(default_factory=tuple)
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_payload(self) -> Dict[str, Any]:
        """Return a JSON-friendly representation of the snapshot."""

        events: list[Dict[str, Any]] = []
        for entry in self.history:
            if isinstance(entry, Mapping):
                events.append({key: value for key, value in entry.items()})
            else:
                text = str(entry).strip()
                if text:
                    events.append({"event": text})

        payload: Dict[str, Any] = {
            "entity_id": self.entity_id,
            "current_state": _as_dict(self.current_state),
            "desired_state": _as_dict(self.desired_state),
            "metadata": _as_dict(self.metadata),
        }
        if events:
            payload["history"] = events
        return payload


@dataclass(slots=True)
class AutoSyncAction:
    """Proposed synchronisation action produced by the orchestration pipeline."""

    entity_id: str
    action: str
    reasons: tuple[str, ...] = field(default_factory=tuple)
    confidence: float | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def merge(self, other: "AutoSyncAction") -> "AutoSyncAction":
        """Combine two actions that target the same entity/action pair."""

        if self.entity_id != other.entity_id or self.action != other.action:
            raise ValueError("actions can only be merged when entity and action match")

        reasons = tuple(collect_strings(self.reasons, other.reasons))
        tags = _normalise_tags(self.tags, other.tags)

        confidence: float | None
        if self.confidence is None:
            confidence = other.confidence
        elif other.confidence is None:
            confidence = self.confidence
        else:
            confidence = max(self.confidence, other.confidence)

        metadata: Dict[str, Any] = {}
        metadata.update(_as_dict(self.metadata))
        metadata.update(_as_dict(other.metadata))

        return AutoSyncAction(
            entity_id=self.entity_id,
            action=self.action,
            reasons=reasons,
            confidence=confidence,
            tags=tags,
            metadata=metadata,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the action for logging or downstream services."""

        payload: Dict[str, Any] = {
            "entity_id": self.entity_id,
            "action": self.action,
            "reasons": list(self.reasons),
        }
        if self.confidence is not None:
            payload["confidence"] = self.confidence
        if self.tags:
            payload["tags"] = list(self.tags)
        if self.metadata:
            payload["metadata"] = {key: value for key, value in self.metadata.items()}
        return payload


@dataclass(slots=True)
class AutoSyncPlan:
    """Aggregated plan returned by :class:`DynamicAutoSyncOrchestrator`."""

    actions: tuple[AutoSyncAction, ...]
    anomalies: tuple[str, ...]
    escalations: tuple[str, ...]
    summary: str
    metadata: Mapping[str, Any]
    runs: tuple[LLMRun, ...]
    raw_runs: str | None = None

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-safe representation of the plan."""

        return {
            "actions": [action.to_dict() for action in self.actions],
            "anomalies": list(self.anomalies),
            "escalations": list(self.escalations),
            "summary": self.summary,
            "metadata": {key: value for key, value in self.metadata.items()},
            "runs": [run.to_dict() for run in self.runs],
            "raw_runs": self.raw_runs,
        }


class DynamicAutoSyncOrchestrator:
    """Coordinates multiple LLMs to design an auto-synchronisation plan."""

    def __init__(
        self,
        *,
        detector: LLMConfig,
        resolver: LLMConfig | None = None,
        auditor: LLMConfig | None = None,
    ) -> None:
        self.detector = detector
        self.resolver = resolver
        self.auditor = auditor

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def build_plan(
        self,
        snapshots: Sequence[SyncSnapshot],
        *,
        context: Mapping[str, Any] | None = None,
        guardrails: Mapping[str, Any] | None = None,
        goal: str | None = None,
    ) -> AutoSyncPlan:
        if not snapshots:
            raise ValueError("snapshots cannot be empty")

        serialised_snapshots = [snapshot.to_payload() for snapshot in snapshots]
        context_payload = _as_dict(context)
        guardrail_payload = _as_dict(guardrails)
        orchestrator_goal = goal or "Synchronise treasury and membership state consistently across systems."

        runs: list[LLMRun] = []
        metadata: Dict[str, Any] = {
            "context": context_payload,
            "guardrails": guardrail_payload,
            "goal": orchestrator_goal,
        }

        detector_prompt = self._build_detector_prompt(
            orchestrator_goal,
            serialised_snapshots,
            context_payload,
            guardrail_payload,
        )
        detector_run = self.detector.run(detector_prompt)
        runs.append(detector_run)
        detector_payload = parse_json_response(detector_run.response, fallback_key="narrative") or {}
        metadata["detector"] = detector_payload

        actions = self._extract_actions(detector_payload)
        anomalies = tuple(collect_strings(detector_payload.get("anomalies")))
        escalations = collect_strings(detector_payload.get("escalations"))

        resolver_payload: Dict[str, Any] | None = None
        if self.resolver is not None:
            resolver_prompt = self._build_resolver_prompt(
                orchestrator_goal,
                serialised_snapshots,
                context_payload,
                guardrail_payload,
                detector_payload,
                actions,
            )
            resolver_run = self.resolver.run(resolver_prompt)
            runs.append(resolver_run)
            resolver_payload = parse_json_response(resolver_run.response, fallback_key="narrative") or {}
            metadata["resolver"] = resolver_payload
            extra_actions = self._extract_actions(resolver_payload)
            if extra_actions:
                actions = self._merge_actions(actions, extra_actions)
            escalations = collect_strings(escalations, resolver_payload.get("escalations"))
            anomalies = tuple(collect_strings(anomalies, resolver_payload.get("anomalies")))

        auditor_payload: Dict[str, Any] | None = None
        if self.auditor is not None:
            auditor_prompt = self._build_auditor_prompt(
                orchestrator_goal,
                serialised_snapshots,
                context_payload,
                guardrail_payload,
                actions,
                anomalies,
                escalations,
            )
            auditor_run = self.auditor.run(auditor_prompt)
            runs.append(auditor_run)
            auditor_payload = parse_json_response(auditor_run.response, fallback_key="narrative") or {}
            metadata["auditor"] = auditor_payload
            escalations = collect_strings(escalations, auditor_payload.get("escalations"))
            anomalies = tuple(collect_strings(anomalies, auditor_payload.get("anomalies")))

        escalations_tuple = tuple(escalations)
        summary = (
            f"{len(actions)} sync actions, {len(escalations_tuple)} escalations, "
            f"{len(anomalies)} anomalies detected"
        )

        raw_runs = serialise_runs(runs)

        return AutoSyncPlan(
            actions=tuple(actions),
            anomalies=anomalies,
            escalations=escalations_tuple,
            summary=summary,
            metadata=metadata,
            runs=tuple(runs),
            raw_runs=raw_runs,
        )

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------
    def _build_detector_prompt(
        self,
        goal: str,
        snapshots: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
        guardrails: Mapping[str, Any],
    ) -> str:
        payload = {
            "goal": goal,
            "context": context,
            "guardrails": guardrails,
            "snapshots": snapshots,
        }
        return textwrap.dedent(
            f"""
            You are the anomaly detection model in a dynamic multi-LLM auto synchronisation workflow.
            Review the provided entity snapshots, highlight anomalies, and draft remediation actions
            that respect the supplied guardrails.

            Respond strictly in JSON with the shape:
            {{
              "anomalies": ["str"...],
              "actions": [
                {{
                  "entity_id": "...",
                  "action": "...",
                  "reason": "...",
                  "confidence": 0-1,
                  "tags": ["..."]
                }}
              ],
              "escalations": ["str"...]
            }}

            Input payload:
            {json.dumps(payload, indent=2, sort_keys=True, default=str)}
            """
        ).strip()

    def _build_resolver_prompt(
        self,
        goal: str,
        snapshots: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
        guardrails: Mapping[str, Any],
        detector_payload: Mapping[str, Any],
        actions: Sequence[AutoSyncAction],
    ) -> str:
        plan_preview = {
            "goal": goal,
            "actions": [action.to_dict() for action in actions],
            "anomalies": detector_payload.get("anomalies", []),
            "escalations": detector_payload.get("escalations", []),
        }
        payload = {
            "snapshots": snapshots,
            "context": context,
            "guardrails": guardrails,
            "detector": detector_payload,
            "plan_preview": plan_preview,
        }
        return textwrap.dedent(
            f"""
            You are the reconciliation model in a dynamic multi-LLM auto synchronisation workflow.
            Validate the detector's proposed actions, adjust confidences, add missing steps, and
            note any cases that should escalate to humans. Respect guardrails and ensure changes align with the goal.

            Respond strictly in JSON with keys: "actions", "anomalies", "escalations".

            Input payload:
            {json.dumps(payload, indent=2, sort_keys=True, default=str)}
            """
        ).strip()

    def _build_auditor_prompt(
        self,
        goal: str,
        snapshots: Sequence[Mapping[str, Any]],
        context: Mapping[str, Any],
        guardrails: Mapping[str, Any],
        actions: Sequence[AutoSyncAction],
        anomalies: Sequence[str],
        escalations: Sequence[str],
    ) -> str:
        payload = {
            "goal": goal,
            "snapshots": snapshots,
            "context": context,
            "guardrails": guardrails,
            "actions": [action.to_dict() for action in actions],
            "anomalies": list(anomalies),
            "escalations": list(escalations),
        }
        return textwrap.dedent(
            f"""
            You are the compliance auditor model in a dynamic multi-LLM auto synchronisation workflow.
            Review the draft plan, ensure all guardrails are honoured, and surface any outstanding
            escalations or policy violations. Provide actionable escalations if human review is required.

            Respond strictly in JSON with keys: "escalations" and optionally "anomalies" or "notes".

            Input payload:
            {json.dumps(payload, indent=2, sort_keys=True, default=str)}
            """
        ).strip()

    # ------------------------------------------------------------------
    # Normalisation helpers
    # ------------------------------------------------------------------
    def _extract_actions(self, payload: Mapping[str, Any]) -> list[AutoSyncAction]:
        candidates: list[Any] = []
        for key in ("actions", "proposed_actions", "sync_actions"):
            value = payload.get(key)
            if value is not None:
                candidates.append(value)

        actions: list[AutoSyncAction] = []
        for candidate in candidates:
            actions.extend(self._normalise_action_candidate(candidate))
        return actions

    def _normalise_action_candidate(self, candidate: Any) -> list[AutoSyncAction]:
        actions: list[AutoSyncAction] = []
        if candidate is None:
            return actions

        if isinstance(candidate, Mapping):
            for entity, details in candidate.items():
                entity_id = str(entity)
                if isinstance(details, Mapping):
                    actions.append(self._action_from_mapping(entity_id, details))
                elif isinstance(details, Sequence) and not isinstance(details, (str, bytes)):
                    for item in details:
                        if isinstance(item, Mapping):
                            actions.append(self._action_from_mapping(entity_id, item))
                        else:
                            actions.append(
                                AutoSyncAction(entity_id=entity_id, action=str(item), reasons=tuple())
                            )
                else:
                    actions.append(
                        AutoSyncAction(entity_id=entity_id, action=str(details), reasons=tuple())
                    )
            return actions

        if isinstance(candidate, Sequence) and not isinstance(candidate, (str, bytes)):
            for item in candidate:
                if isinstance(item, Mapping):
                    entity_id = self._resolve_entity_id(item)
                    actions.append(self._action_from_mapping(entity_id, item))
                else:
                    actions.append(
                        AutoSyncAction(entity_id="unknown", action=str(item), reasons=tuple())
                    )
            return actions

        return [AutoSyncAction(entity_id="unknown", action=str(candidate), reasons=tuple())]

    def _resolve_entity_id(self, mapping: Mapping[str, Any]) -> str:
        for key in ("entity_id", "entity", "member_id", "member", "user", "target", "id"):
            if key in mapping and mapping[key] is not None:
                return str(mapping[key])
        return "unknown"

    def _action_from_mapping(self, fallback_entity: str, mapping: Mapping[str, Any]) -> AutoSyncAction:
        entity_id = self._resolve_entity_id(mapping) or fallback_entity
        action = str(
            mapping.get("action")
            or mapping.get("operation")
            or mapping.get("task")
            or mapping.get("status")
            or "review"
        )
        reasons = tuple(collect_strings(mapping.get("reason"), mapping.get("reasons"), mapping.get("rationale")))
        confidence = _normalise_confidence(mapping.get("confidence") or mapping.get("score"))
        tags = _normalise_tags(mapping.get("tags"), mapping.get("labels"))

        metadata: Dict[str, Any] = {}
        for key in ("metadata", "details", "extra"):
            candidate = mapping.get(key)
            if isinstance(candidate, Mapping):
                metadata.update(candidate)

        for key, value in mapping.items():
            if key in {
                "entity_id",
                "entity",
                "member_id",
                "member",
                "user",
                "target",
                "id",
                "action",
                "operation",
                "task",
                "status",
                "reason",
                "reasons",
                "rationale",
                "confidence",
                "score",
                "tags",
                "labels",
                "metadata",
                "details",
                "extra",
            }:
                continue
            metadata.setdefault(key, value)

        return AutoSyncAction(
            entity_id=entity_id or fallback_entity,
            action=action,
            reasons=reasons,
            confidence=confidence,
            tags=tags,
            metadata=metadata,
        )

    def _merge_actions(
        self,
        current: Sequence[AutoSyncAction],
        additions: Sequence[AutoSyncAction],
    ) -> list[AutoSyncAction]:
        merged: Dict[tuple[str, str], AutoSyncAction] = {
            (action.entity_id, action.action): action for action in current
        }
        for action in additions:
            key = (action.entity_id, action.action)
            if key in merged:
                merged[key] = merged[key].merge(action)
            else:
                merged[key] = action
        return list(merged.values())

