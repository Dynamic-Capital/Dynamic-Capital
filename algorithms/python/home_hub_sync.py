"""Home automation sync orchestrator leveraging Grok-1 and DeepSeek-V3."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Protocol, Sequence


def _normalize(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {key: _normalize(value[key]) for key in sorted(value)}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [_normalize(item) for item in value]
    return value


@dataclass(slots=True)
class DeviceState:
    """Represents the latest known state of a device managed by the hub."""

    status: str
    attributes: MutableMapping[str, Any] = field(default_factory=dict)
    availability: str = "online"
    updated_at: Optional[datetime] = None

    def as_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"status": self.status, "availability": self.availability}
        for key, value in self.attributes.items():
            payload[key] = value
        return payload


@dataclass(slots=True)
class HomeHubSnapshot:
    """Snapshot of the hub's understanding of every connected device."""

    timestamp: datetime
    devices: Dict[str, DeviceState] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "devices": {device_id: state.as_payload() for device_id, state in sorted(self.devices.items())},
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class AttributeDelta:
    """Difference in a single attribute between hub and realtime feeds."""

    attribute: str
    hub_value: Any
    realtime_value: Any

    def to_payload(self) -> Dict[str, Any]:
        return {"attribute": self.attribute, "hub": self.hub_value, "realtime": self.realtime_value}


@dataclass(slots=True)
class DeviceDelta:
    """Aggregated differences for a specific device."""

    device_id: str
    missing_in_hub: bool = False
    missing_in_realtime: bool = False
    attribute_deltas: List[AttributeDelta] = field(default_factory=list)
    staleness_seconds: Optional[float] = None

    def to_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"device_id": self.device_id}
        if self.missing_in_hub:
            payload["missing_in_hub"] = True
        if self.missing_in_realtime:
            payload["missing_in_realtime"] = True
        if self.attribute_deltas:
            payload["attribute_deltas"] = [delta.to_payload() for delta in self.attribute_deltas]
        if self.staleness_seconds is not None:
            payload["staleness_seconds"] = self.staleness_seconds
        return payload

    @property
    def has_changes(self) -> bool:
        return (
            self.missing_in_hub
            or self.missing_in_realtime
            or bool(self.attribute_deltas)
            or self.staleness_seconds is not None
        )


@dataclass(slots=True)
class SyncDelta:
    """Summary of the differences between hub state and realtime telemetry."""

    hub_snapshot: HomeHubSnapshot
    realtime_snapshot: HomeHubSnapshot
    devices: List[DeviceDelta] = field(default_factory=list)

    def to_payload(self) -> Dict[str, Any]:
        return {
            "hub_snapshot": self.hub_snapshot.to_payload(),
            "realtime_snapshot": self.realtime_snapshot.to_payload(),
            "devices": [device.to_payload() for device in self.devices if device.has_changes],
        }

    @property
    def has_changes(self) -> bool:
        return any(device.has_changes for device in self.devices)


def build_sync_delta(
    hub_snapshot: HomeHubSnapshot,
    realtime_snapshot: HomeHubSnapshot,
    *,
    staleness_tolerance: float = 60.0,
) -> SyncDelta:
    """Compute the delta required to align the hub with realtime telemetry."""

    delta = SyncDelta(hub_snapshot=hub_snapshot, realtime_snapshot=realtime_snapshot)
    device_ids = sorted(set(hub_snapshot.devices) | set(realtime_snapshot.devices))

    for device_id in device_ids:
        hub_state = hub_snapshot.devices.get(device_id)
        realtime_state = realtime_snapshot.devices.get(device_id)
        device_delta = DeviceDelta(device_id=device_id)

        if hub_state is None:
            device_delta.missing_in_hub = True
        if realtime_state is None:
            device_delta.missing_in_realtime = True

        if hub_state and realtime_state:
            hub_payload = _normalize(hub_state.as_payload())
            realtime_payload = _normalize(realtime_state.as_payload())
            attributes = sorted(set(hub_payload) | set(realtime_payload))
            for attribute in attributes:
                hub_value = hub_payload.get(attribute)
                realtime_value = realtime_payload.get(attribute)
                if hub_value != realtime_value:
                    device_delta.attribute_deltas.append(
                        AttributeDelta(attribute=attribute, hub_value=hub_value, realtime_value=realtime_value)
                    )
            if hub_state.updated_at and realtime_state.updated_at:
                staleness = abs((realtime_state.updated_at - hub_state.updated_at).total_seconds())
                if staleness > staleness_tolerance:
                    device_delta.staleness_seconds = staleness

        if device_delta.has_changes:
            delta.devices.append(device_delta)

    return delta


class CompletionClient(Protocol):  # pragma: no cover - shared interface definition
    """Subset of the completion client contract used by the planner."""

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        ...


@dataclass(slots=True)
class SyncAction:
    """A mutation that should be applied to the hub to match realtime telemetry."""

    device_id: str
    operation: str
    parameters: Dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> Dict[str, Any]:
        payload = {"device_id": self.device_id, "operation": self.operation}
        if self.parameters:
            payload["parameters"] = self.parameters
        return payload


@dataclass(slots=True)
class SyncPlan:
    """Final orchestration plan derived from Grok-1 and DeepSeek-V3."""

    actions: List[SyncAction] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    confidence: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "actions": [action.to_payload() for action in self.actions],
            "notes": list(self.notes),
            "metadata": dict(self.metadata),
        }
        if self.confidence is not None:
            payload["confidence"] = self.confidence
        return payload


class HubStateProvider(Protocol):  # pragma: no cover - interface definition
    """Abstracts hub state persistence for the sync engine."""

    def load_snapshot(self) -> HomeHubSnapshot:
        ...

    def apply_actions(self, actions: Sequence[SyncAction]) -> None:
        ...


class RealtimeProvider(Protocol):  # pragma: no cover - interface definition
    """Abstracts realtime telemetry access for the sync engine."""

    def fetch_snapshot(self) -> HomeHubSnapshot:
        ...


@dataclass(slots=True)
class GrokDeepSeekSyncPlanner:
    """Produces sync plans by pairing Grok-1 planning with DeepSeek-V3 risk review."""

    grok_client: CompletionClient
    deepseek_client: CompletionClient
    grok_temperature: float = 0.2
    grok_nucleus_p: float = 0.9
    grok_max_tokens: int = 512
    deepseek_temperature: float = 0.1
    deepseek_nucleus_p: float = 0.85
    deepseek_max_tokens: int = 384
    risk_threshold: float = 0.75

    def plan(self, delta: SyncDelta, *, context: Optional[Mapping[str, Any]] = None) -> SyncPlan:
        summary = self._summarise_delta(delta)
        context_payload = json.dumps(dict(context or {}), indent=2, default=str, sort_keys=True)
        grok_prompt = self._build_grok_prompt(summary=summary, context=context_payload, delta=delta)
        grok_response = self.grok_client.complete(
            grok_prompt,
            temperature=self.grok_temperature,
            max_tokens=self.grok_max_tokens,
            nucleus_p=self.grok_nucleus_p,
        )
        grok_payload = self._parse_payload(grok_response)
        actions = self._extract_actions(grok_payload.get("actions"))
        notes = self._string_list(grok_payload.get("notes"))
        plan = SyncPlan(actions=actions, notes=notes)
        plan.metadata["grok"] = {"prompt": grok_prompt, "payload": grok_payload, "raw": grok_response.strip() or None}

        deepseek_prompt = self._build_deepseek_prompt(
            summary=summary,
            context=context_payload,
            delta=delta,
            proposed_actions=plan.actions,
            grok_payload=grok_payload,
        )
        deepseek_response = self.deepseek_client.complete(
            deepseek_prompt,
            temperature=self.deepseek_temperature,
            max_tokens=self.deepseek_max_tokens,
            nucleus_p=self.deepseek_nucleus_p,
        )
        deepseek_payload = self._parse_payload(deepseek_response)
        plan.metadata["deepseek"] = {
            "prompt": deepseek_prompt,
            "payload": deepseek_payload,
            "raw": deepseek_response.strip() or None,
        }

        approval = deepseek_payload.get("approved")
        if approval is False:
            plan.actions = []
            plan.notes.append("DeepSeek-V3 rejected the sync request.")
        else:
            blocked = {item for item in self._string_list(deepseek_payload.get("blocked_devices"))}
            if blocked:
                plan.actions = [action for action in plan.actions if action.device_id not in blocked]
                if blocked:
                    plan.notes.append(f"DeepSeek-V3 blocked devices: {', '.join(sorted(blocked))}.")

            additional_actions = self._extract_actions(deepseek_payload.get("additional_actions"))
            if additional_actions:
                existing = {(action.device_id, action.operation) for action in plan.actions}
                for action in additional_actions:
                    key = (action.device_id, action.operation)
                    if key not in existing:
                        plan.actions.append(action)
                        existing.add(key)

        deepseek_notes = self._string_list(deepseek_payload.get("notes"))
        if deepseek_notes:
            plan.notes.extend(deepseek_notes)

        risk_score = self._coerce_float(deepseek_payload.get("risk_score"))
        if risk_score is not None:
            plan.metadata.setdefault("deepseek", {}).setdefault("risk_score", risk_score)
            if risk_score >= self.risk_threshold:
                plan.notes.append("DeepSeek-V3 flagged elevated risk; manual review recommended.")

        confidence = self._coerce_float(deepseek_payload.get("confidence"))
        if confidence is None:
            confidence = self._coerce_float(grok_payload.get("confidence"))
        if confidence is not None:
            plan.confidence = max(0.0, min(1.0, confidence))

        additional_notes = self._string_list(grok_payload.get("alerts")) + self._string_list(
            deepseek_payload.get("alerts")
        )
        if additional_notes:
            plan.notes.extend(additional_notes)

        return plan

    def _build_grok_prompt(self, *, summary: str, context: str, delta: SyncDelta) -> str:
        payload = json.dumps(delta.to_payload(), indent=2, default=str, sort_keys=True)
        return (
            "You are Grok-1 acting as the orchestration planner for a smart home hub.\n"
            "Review the current discrepancies between the hub state and realtime telemetry.\n"
            "Return a single JSON object with the fields: \n"
            "  - \"actions\": array of objects with keys `device_id`, `operation`, and optional `parameters`.\n"
            "  - \"notes\": optional array of short instructions for operators.\n"
            "  - \"confidence\": optional float between 0 and 1 describing the plan confidence.\n"
            "Avoid extra commentary beyond valid JSON.\n\n"
            f"Context: {context}\n"
            f"Discrepancies: {summary}\n"
            f"Detailed payload: {payload}\n"
        )

    def _build_deepseek_prompt(
        self,
        *,
        summary: str,
        context: str,
        delta: SyncDelta,
        proposed_actions: Sequence[SyncAction],
        grok_payload: Mapping[str, Any],
    ) -> str:
        actions_payload = json.dumps([action.to_payload() for action in proposed_actions], indent=2, sort_keys=True)
        grok_summary = json.dumps(grok_payload, indent=2, default=str, sort_keys=True)
        payload = json.dumps(delta.to_payload(), indent=2, default=str, sort_keys=True)
        return (
            "You are DeepSeek-V3 serving as the chief risk officer for home automation.\n"
            "Validate the Grok-1 sync plan for safety, privacy, and operational stability.\n"
            "Respond with minified JSON containing fields such as: \n"
            "  - \"approved\": boolean indicating if the plan should execute.\n"
            "  - \"blocked_devices\": optional array of device ids that must not be touched.\n"
            "  - \"additional_actions\": optional array of extra actions to append.\n"
            "  - \"notes\" or \"alerts\": optional arrays of operator callouts.\n"
            "  - \"risk_score\": optional float between 0 and 1 describing residual risk.\n"
            "  - \"confidence\": optional float between 0 and 1 summarising approval confidence.\n"
            "Do not include commentary outside the JSON object.\n\n"
            f"Context: {context}\n"
            f"Discrepancies: {summary}\n"
            f"Grok plan: {actions_payload}\n"
            f"Grok payload: {grok_summary}\n"
            f"Delta payload: {payload}\n"
        )

    def _summarise_delta(self, delta: SyncDelta) -> str:
        if not delta.has_changes:
            return "No discrepancies detected."
        lines: List[str] = []
        for device in delta.devices:
            if device.missing_in_hub and not device.missing_in_realtime:
                lines.append(f"Device {device.device_id} missing from hub state.")
            if device.missing_in_realtime and not device.missing_in_hub:
                lines.append(f"Device {device.device_id} missing from realtime telemetry.")
            if device.missing_in_hub and device.missing_in_realtime:
                lines.append(f"Device {device.device_id} absent in both sources.")
            if device.attribute_deltas:
                mismatches = ", ".join(
                    f"{delta.attribute}: hub={delta.hub_value!r}, realtime={delta.realtime_value!r}"
                    for delta in device.attribute_deltas
                )
                lines.append(f"Device {device.device_id} attribute mismatches: {mismatches}.")
            if device.staleness_seconds is not None:
                lines.append(f"Device {device.device_id} stale by {device.staleness_seconds:.0f}s.")
        return " ".join(lines)

    def _parse_payload(self, response: str) -> Dict[str, Any]:
        text = response.strip()
        if not text:
            return {}
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, flags=re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(0))
                except json.JSONDecodeError:
                    return {"raw": text}
            else:
                return {"raw": text}
        if isinstance(data, dict):
            return data
        return {"raw": text}

    def _extract_actions(self, payload: Any) -> List[SyncAction]:
        actions: List[SyncAction] = []
        if not isinstance(payload, Iterable) or isinstance(payload, (str, bytes, bytearray)):
            return actions
        for item in payload:
            if not isinstance(item, Mapping):
                continue
            device_id = item.get("device_id") or item.get("id") or item.get("entity")
            operation = item.get("operation") or item.get("action") or item.get("command")
            if not device_id or not operation:
                continue
            parameters = item.get("parameters") or item.get("args") or {}
            if not isinstance(parameters, Mapping):
                parameters = {"value": parameters}
            actions.append(
                SyncAction(
                    device_id=str(device_id),
                    operation=str(operation),
                    parameters={str(key): value for key, value in parameters.items()},
                )
            )
        return actions

    def _string_list(self, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, str):
            stripped = value.strip()
            return [stripped] if stripped else []
        if isinstance(value, Sequence):
            return [str(item).strip() for item in value if str(item).strip()]
        return [str(value).strip()]

    @staticmethod
    def _coerce_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None
        if numeric != numeric or numeric in (float("inf"), float("-inf")):
            return None
        return numeric


@dataclass(slots=True)
class HomeHubSyncEngine:
    """Coordinates snapshots, planner calls, and hub mutations."""

    hub: HubStateProvider
    realtime: RealtimeProvider
    planner: GrokDeepSeekSyncPlanner
    staleness_tolerance: float = 60.0

    def sync_once(self, *, context: Optional[Mapping[str, Any]] = None) -> SyncPlan:
        hub_snapshot = self.hub.load_snapshot()
        realtime_snapshot = self.realtime.fetch_snapshot()
        delta = build_sync_delta(
            hub_snapshot,
            realtime_snapshot,
            staleness_tolerance=self.staleness_tolerance,
        )
        plan = self.planner.plan(delta, context=context)
        if plan.actions:
            self.hub.apply_actions(plan.actions)
        plan.metadata.setdefault("delta", delta.to_payload())
        return plan


__all__ = [
    "AttributeDelta",
    "DeviceDelta",
    "DeviceState",
    "GrokDeepSeekSyncPlanner",
    "HomeHubSnapshot",
    "HomeHubSyncEngine",
    "RealtimeProvider",
    "SyncAction",
    "SyncDelta",
    "SyncPlan",
    "build_sync_delta",
]
