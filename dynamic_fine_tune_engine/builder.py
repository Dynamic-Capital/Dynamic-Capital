"""Utilities for constructing :class:`~dynamic_fine_tune_engine.engine.FineTuneRecord` instances."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Mapping, MutableMapping, Sequence

from .engine import FineTuneRecord


def _parse_datetime(value: object | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive branch
            raise ValueError("created_at must be an ISO formatted string") from exc
    raise TypeError("created_at must be datetime or ISO string")


@dataclass(slots=True)
class FineTuneRecordBuilder:
    """Factory for :class:`FineTuneRecord` objects with sensible defaults."""

    default_quality: float = 0.6
    default_priority: float = 0.5

    def build(
        self,
        *,
        prompt: str,
        completion: str,
        source: str,
        quality: float | None = None,
        priority: float | None = None,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
        created_at: datetime | str | None = None,
        token_estimate: int | None = None,
    ) -> FineTuneRecord:
        """Return a fully formed :class:`FineTuneRecord`."""

        created_dt = _parse_datetime(created_at)
        quality_value = self.default_quality if quality is None else float(quality)
        priority_value = self.default_priority if priority is None else float(priority)
        estimate = token_estimate
        if estimate is None:
            estimate = self.estimate_tokens(prompt, completion)
        return FineTuneRecord(
            prompt=prompt,
            completion=completion,
            source=source,
            quality=quality_value,
            priority=priority_value,
            tags=tuple(tags or ()),
            metadata=dict(metadata) if metadata else None,
            created_at=created_dt or datetime.now(timezone.utc),
            token_estimate=estimate,
        )

    def from_payload(self, payload: Mapping[str, object]) -> FineTuneRecord:
        """Coerce an arbitrary mapping into a :class:`FineTuneRecord`."""

        data: MutableMapping[str, object] = dict(payload)
        created_at = _parse_datetime(data.get("created_at"))
        return self.build(
            prompt=str(data.get("prompt", "")),
            completion=str(data.get("completion", "")),
            source=str(data.get("source", "")),
            quality=float(data.get("quality")) if "quality" in data else None,
            priority=float(data.get("priority")) if "priority" in data else None,
            tags=tuple(data.get("tags", ()) or ()),
            metadata=data.get("metadata"),
            created_at=created_at,
            token_estimate=int(data.get("token_estimate")) if data.get("token_estimate") is not None else None,
        )

    def estimate_tokens(self, prompt: str, completion: str) -> int:
        """Very small heuristic for estimating token counts."""

        prompt_tokens = len(prompt.split())
        completion_tokens = len(completion.split())
        # Account for punctuation by inflating word counts slightly.
        estimate = int((prompt_tokens + completion_tokens) * 1.25)
        return max(estimate, 1)

