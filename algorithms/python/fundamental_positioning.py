"""Algorithmic generation of fundamental positioning highlights."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, List, Mapping, Sequence

from .supabase_sync import SupabaseTableWriter

__all__ = [
    "FundamentalSnapshot",
    "FundamentalHighlight",
    "FundamentalHighlightsGenerator",
    "FundamentalHighlightsSyncJob",
]


@dataclass(slots=True)
class FundamentalSnapshot:
    """Input fundamentals used to derive positioning."""

    asset: str
    sector: str
    growth_score: float
    value_score: float
    quality_score: float
    catalysts: Sequence[str]
    risk_notes: Sequence[str]
    metrics: Mapping[str, str]
    base_narrative: str | None = None


@dataclass(slots=True)
class FundamentalHighlight:
    """Structured representation ready to persist to Supabase."""

    asset: str
    sector: str
    positioning: str
    summary: str
    catalysts: List[str]
    risk_controls: str
    metrics: List[dict[str, str]]


class FundamentalHighlightsGenerator:
    """Convert quantitative fundamentals into desk-ready positioning blurbs."""

    overweight_threshold: float = 65.0
    underweight_threshold: float = 45.0

    def generate(self, snapshots: Iterable[FundamentalSnapshot]) -> List[FundamentalHighlight]:
        highlights: List[tuple[float, FundamentalHighlight]] = []
        for snapshot in snapshots:
            composite = self._composite_score(snapshot)
            positioning = self._positioning(composite)
            summary = self._build_summary(snapshot, composite, positioning)
            risk_controls = self._build_risk_controls(snapshot)
            metrics = self._format_metrics(snapshot)
            highlight = FundamentalHighlight(
                asset=snapshot.asset,
                sector=snapshot.sector,
                positioning=positioning,
                summary=summary,
                catalysts=list(snapshot.catalysts),
                risk_controls=risk_controls,
                metrics=metrics,
            )
            highlights.append((composite, highlight))
        highlights.sort(key=lambda entry: entry[0], reverse=True)
        return [item for _, item in highlights]

    def _composite_score(self, snapshot: FundamentalSnapshot) -> float:
        return (
            0.45 * snapshot.growth_score
            + 0.3 * snapshot.quality_score
            + 0.25 * snapshot.value_score
        )

    def _positioning(self, composite: float) -> str:
        if composite >= self.overweight_threshold:
            return "Overweight"
        if composite <= self.underweight_threshold:
            return "Underweight"
        return "Market weight"

    def _build_summary(
        self,
        snapshot: FundamentalSnapshot,
        composite: float,
        positioning: str,
    ) -> str:
        narrative = snapshot.base_narrative or (
            f"{snapshot.asset} fundamental composite at {composite:.1f} ({positioning.lower()})"
        )
        growth = snapshot.growth_score
        value = snapshot.value_score
        quality = snapshot.quality_score
        return (
            f"{narrative}. Growth {growth:.1f}, value {value:.1f}, quality {quality:.1f} scores underpin the call."
        )

    def _build_risk_controls(self, snapshot: FundamentalSnapshot) -> str:
        if not snapshot.risk_notes:
            return "Monitor macro and company-specific catalysts; reassess on material guidance changes."
        return " ".join(note.strip() for note in snapshot.risk_notes if note.strip())

    def _format_metrics(self, snapshot: FundamentalSnapshot) -> List[dict[str, str]]:
        metrics: List[dict[str, str]] = []
        for label, value in snapshot.metrics.items():
            metrics.append({"label": label, "value": value})
        metrics.append({"label": "Growth score", "value": f"{snapshot.growth_score:.1f}"})
        metrics.append({"label": "Value score", "value": f"{snapshot.value_score:.1f}"})
        metrics.append({"label": "Quality score", "value": f"{snapshot.quality_score:.1f}"})
        return metrics


@dataclass(slots=True)
class FundamentalHighlightsSyncJob:
    """Persist generated highlights into Supabase."""

    writer: SupabaseTableWriter

    def run(self, highlights: Iterable[FundamentalHighlight]) -> int:
        records = []
        timestamp = datetime.now(tz=timezone.utc)
        for highlight in highlights:
            record = {
                "asset": highlight.asset,
                "sector": highlight.sector,
                "positioning": highlight.positioning,
                "summary": highlight.summary,
                "catalysts": list(highlight.catalysts),
                "risk_controls": highlight.risk_controls,
                "metrics": list(highlight.metrics),
                "updated_at": timestamp,
            }
            records.append(record)
        return self.writer.upsert(records)
