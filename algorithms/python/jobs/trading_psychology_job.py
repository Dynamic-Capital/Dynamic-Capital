"""Supabase sync job for trading psychology scores."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

from ..supabase_sync import SupabaseTableWriter
from ..trading_psychology import TradingPsychologyInsights, TradingPsychologyModel

__all__ = ["TradingPsychologySyncJob"]


@dataclass(slots=True)
class TradingPsychologySyncJob:
    """Persist the latest trading psychology score into Supabase."""

    model: TradingPsychologyModel
    writer: SupabaseTableWriter
    insights: TradingPsychologyInsights | None = None
    source_model: Optional[str] = None
    source_run: Optional[str] = None

    def run(self) -> int:
        score = self.model.evaluate()
        latest_timestamp = self._resolve_timestamp()

        narrative: Optional[str] = None
        if self.insights is not None:
            insight_payload = self.insights.generate(score)
            narrative = insight_payload.get("narrative") or None

        row: Dict[str, Any] = {
            "capturedAt": latest_timestamp,
            "composite": round(score.composite, 4),
            "discipline": round(score.discipline, 4),
            "resilience": round(score.resilience, 4),
            "focus": round(score.focus, 4),
            "consistency": round(score.consistency, 4),
            "state": score.state,
        }
        if narrative:
            row["narrative"] = narrative
        if self.source_model:
            row["sourceModel"] = self.source_model
        if self.source_run:
            row["sourceRun"] = self.source_run

        return self.writer.upsert([row])

    def _resolve_timestamp(self) -> datetime:
        inputs = self.model.get_inputs()
        if not inputs:
            raise ValueError("model has no observations to persist")
        return inputs[-1].timestamp
