"""Persistence helpers for Dynamic AGI self-improvement telemetry."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Mapping, MutableMapping, Optional, Protocol
from uuid import uuid4

from .self_improvement import ImprovementPlan, LearningSnapshot

__all__ = ["AGIImprovementRepository", "ImprovementTelemetryWriter"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ImprovementTelemetryWriter(Protocol):
    """Protocol describing the Supabase writer dependency."""

    def upsert(self, rows: Iterable[Mapping[str, Any]]) -> int:  # pragma: no cover - interface
        ...


@dataclass(slots=True)
class AGIImprovementRepository:
    """Persist Dynamic AGI self-improvement telemetry to Supabase."""

    writer: ImprovementTelemetryWriter
    clock: Callable[[], datetime] = _utcnow

    def persist(
        self,
        *,
        snapshot: LearningSnapshot,
        plan: ImprovementPlan,
        model_version: Optional[str] = None,
        version_info: Optional[Mapping[str, Any]] = None,
    ) -> str:
        """Store the snapshot and generated plan, returning the inserted row id."""

        record_id = str(uuid4())
        snapshot_timestamp = snapshot.timestamp
        if snapshot_timestamp.tzinfo is None:
            snapshot_timestamp = snapshot_timestamp.replace(tzinfo=timezone.utc)
        else:
            snapshot_timestamp = snapshot_timestamp.astimezone(timezone.utc)

        generated_at = self.clock()
        if generated_at.tzinfo is None:
            generated_at = generated_at.replace(tzinfo=timezone.utc)
        else:
            generated_at = generated_at.astimezone(timezone.utc)

        payload: MutableMapping[str, Any] = {
            "id": record_id,
            "snapshot_timestamp": snapshot_timestamp,
            "plan_generated_at": generated_at,
            "snapshot": snapshot.to_dict(),
            "improvement_plan": plan.to_dict(),
        }
        if model_version:
            payload["model_version"] = model_version
        if version_info:
            payload["model_version_info"] = dict(version_info)
        self.writer.upsert([payload])
        return record_id

    @staticmethod
    def history_payload(rows: Iterable[Mapping[str, Any]]) -> Mapping[str, Any]:
        """Convert persisted rows back into a payload for ``DynamicSelfImprovement``."""

        history = [row["snapshot"] for row in rows if "snapshot" in row]
        return {"history": history}
