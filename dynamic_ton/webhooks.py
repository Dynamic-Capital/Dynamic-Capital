"""Webhook helpers for Dynamic Capital's TON automation stack."""

from __future__ import annotations

import base64
import hmac
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Mapping, MutableMapping

from .api import build_execution_plan
from .engine import DynamicTonEngine, TonExecutionPlan

__all__ = [
    "TonWebhookEnvelope",
    "build_plan_from_webhook",
    "compute_webhook_signature",
    "compute_webhook_signature_hex",
    "parse_ton_webhook",
    "verify_webhook_signature",
]


def _ensure_text(value: Any, *, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    text = value.strip()
    if not text:
        raise ValueError(f"{field} must not be empty")
    return text


def _decode_signature(signature: str) -> bytes:
    try:
        return bytes.fromhex(signature)
    except ValueError:
        try:
            return base64.b64decode(signature, validate=True)
        except Exception as exc:  # pragma: no cover - defensive guard
            raise ValueError("signature must be hex or base64 encoded") from exc


def compute_webhook_signature(secret: str, payload: str) -> bytes:
    """Return the HMAC SHA-256 signature for *payload* using *secret*."""

    key = _ensure_text(secret, field="secret").encode("utf-8")
    message = payload.encode("utf-8")
    return hmac.new(key, message, sha256).digest()


def compute_webhook_signature_hex(secret: str, payload: str) -> str:
    """Return the webhook signature as a lowercase hexadecimal string."""

    return compute_webhook_signature(secret, payload).hex()


def verify_webhook_signature(secret: str, payload: str, signature: str) -> bool:
    """Validate that *signature* matches the expected HMAC for *payload*."""

    try:
        expected = compute_webhook_signature(secret, payload)
        supplied = _decode_signature(_ensure_text(signature, field="signature"))
    except ValueError:
        return False
    return hmac.compare_digest(expected, supplied)


def _normalise_timestamp(value: Any) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(text).astimezone(timezone.utc)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError("timestamp must be ISO 8601 formatted") from exc
    raise ValueError("timestamp must be a datetime, ISO string, or epoch seconds")


def _normalise_payload(mapping: Mapping[str, Any]) -> Mapping[str, Any]:
    for key in ("data", "payload"):
        candidate = mapping.get(key)
        if isinstance(candidate, Mapping):
            return candidate
    return mapping


@dataclass(slots=True)
class TonWebhookEnvelope:
    """Structured representation of a Dynamic TON webhook envelope."""

    event_id: str
    event_type: str
    delivered_at: datetime
    attempts: int
    payload: Mapping[str, Any]
    raw: Mapping[str, Any]

    def build_plan(self, *, engine: DynamicTonEngine | None = None) -> TonExecutionPlan:
        """Construct a :class:`TonExecutionPlan` from the webhook payload."""

        return build_execution_plan(self.payload, engine=engine)


def parse_ton_webhook(body: Mapping[str, Any]) -> TonWebhookEnvelope:
    """Convert a JSON-style mapping into a :class:`TonWebhookEnvelope`."""

    if not isinstance(body, Mapping):
        raise ValueError("webhook body must be a mapping")

    event_id = _ensure_text(body.get("id") or body.get("eventId"), field="event id")
    event_type = _ensure_text(
        body.get("type") or body.get("eventType"), field="event type"
    )
    attempts_raw = body.get("attempts") or body.get("deliveryAttempt") or 1
    try:
        attempts = max(1, int(attempts_raw))
    except (TypeError, ValueError) as exc:
        raise ValueError("attempts must be an integer") from exc

    delivered_at = _normalise_timestamp(
        body.get("timestamp")
        or body.get("deliveredAt")
        or body.get("createdAt")
        or body.get("sentAt")
    )

    payload_raw = _normalise_payload(body)
    if not isinstance(payload_raw, Mapping):  # pragma: no cover - defensive guard
        raise ValueError("webhook payload must be a mapping")

    required_keys = {"liquidity", "telemetry", "treasury"}
    payload_mapping: MutableMapping[str, Any] = dict(payload_raw)
    if not required_keys.issubset(payload_mapping):
        missing = ", ".join(sorted(required_keys - payload_mapping.keys()))
        raise ValueError(f"webhook payload missing required sections: {missing}")

    return TonWebhookEnvelope(
        event_id=event_id,
        event_type=event_type,
        delivered_at=delivered_at,
        attempts=attempts,
        payload=payload_mapping,
        raw=dict(body),
    )


def build_plan_from_webhook(
    body: Mapping[str, Any], *, engine: DynamicTonEngine | None = None
) -> TonExecutionPlan:
    """Convenience wrapper to parse *body* and build an execution plan."""

    envelope = parse_ton_webhook(body)
    return envelope.build_plan(engine=engine)
