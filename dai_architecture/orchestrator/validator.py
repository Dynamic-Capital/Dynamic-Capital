"""Baseline validators for Build Phase 1 orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from ..io_bus.schema import ConstraintSet, ResultEnvelope, TaskEnvelope


class TaskValidationError(ValueError):
    """Raised when a payload violates baseline policies."""


@dataclass(slots=True)
class BaselineValidator:
    """Schema and policy checks shared by Phase 1 components."""

    allowed_intents: Sequence[str] | None = None
    min_reason_length: int = 16
    allowed_actions: Sequence[str] = ("BUY", "SELL", "HOLD")

    def validate_task(self, envelope: TaskEnvelope) -> None:
        if self.allowed_intents and envelope.intent not in self.allowed_intents:
            raise TaskValidationError(f"Intent '{envelope.intent}' not permitted")
        if not envelope.task_id:
            raise TaskValidationError("Task requires an identifier")
        if not envelope.context:
            raise TaskValidationError("Task requires context payload")
        market = envelope.context.get("market")
        if not isinstance(market, Mapping):
            raise TaskValidationError("Task context requires 'market' mapping")
        if "direction" not in market:
            raise TaskValidationError("Market context requires 'direction'")

    def validate_result(self, result: ResultEnvelope, constraints: ConstraintSet) -> None:
        if result.status not in {"completed", "rejected"}:
            raise TaskValidationError("Result status must be 'completed' or 'rejected'")
        payload = result.payload
        action = str(payload.get("action", "")).upper()
        if action not in self.allowed_actions:
            raise TaskValidationError(f"Action '{action}' outside allowed set")
        try:
            confidence = float(payload.get("confidence", 0.0))
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
            raise TaskValidationError("Confidence must be numeric") from exc
        if confidence < constraints.min_confidence:
            raise TaskValidationError(
                f"Confidence {confidence:.2f} below minimum {constraints.min_confidence:.2f}"
            )
        rationale = str(payload.get("rationale", "")).strip()
        if len(rationale) < self.min_reason_length:
            raise TaskValidationError("Rationale too short for auditability")

    def validate_audit_trail(self, entries: Iterable[MutableMapping[str, object]]) -> None:
        for entry in entries:
            if "task_id" not in entry or "decision" not in entry:
                raise TaskValidationError("Audit entry missing required keys")
