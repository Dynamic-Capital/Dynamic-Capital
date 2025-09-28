"""Dynamic cislunar space orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import fmean
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_cislunar_space.cislunar import (
    CislunarAsset,
    DynamicCislunarSpace,
    OrbitalBand,
    TrafficSnapshot,
    TransferCorridor,
)

__all__ = ["CislunarAgentInsight", "DynamicCislunarAgent"]


@dataclass(slots=True)
class CislunarAgentInsight:
    raw: AgentInsight
    snapshot: TrafficSnapshot


class DynamicCislunarAgent:
    """Coordinate :class:`DynamicCislunarSpace` analytics."""

    domain = "Dynamic Cislunar Space"

    def __init__(self, *, engine: DynamicCislunarSpace | None = None) -> None:
        self._engine = engine or DynamicCislunarSpace()

    @property
    def engine(self) -> DynamicCislunarSpace:
        return self._engine

    def register_asset(self, asset: CislunarAsset | Mapping[str, object]) -> CislunarAsset:
        return self._engine.register_asset(asset)

    def register_band(self, band: OrbitalBand | Mapping[str, object]) -> OrbitalBand:
        return self._engine.register_band(band)

    def register_corridor(self, corridor: TransferCorridor | Mapping[str, object]) -> TransferCorridor:
        return self._engine.register_corridor(corridor)

    def snapshot(self) -> TrafficSnapshot:
        return self._engine.snapshot()

    def generate_insight(self) -> AgentInsight:
        snapshot = self._engine.snapshot()
        band_metrics = snapshot.band_metrics
        congestion_values = [metrics.congestion for metrics in band_metrics if metrics.asset_count]
        average_congestion = fmean(congestion_values) if congestion_values else 0.0
        risk_scores = [assessment.score for assessment in snapshot.risk_summary]
        max_risk = max(risk_scores) if risk_scores else 0.0
        metrics = {
            "total_assets": float(snapshot.total_assets),
            "active_bands": float(len(band_metrics)),
            "average_congestion": float(average_congestion),
            "max_risk": float(max_risk),
        }
        highlights: list[str] = []
        if band_metrics:
            peak = max(band_metrics, key=lambda item: item.congestion)
            highlights.append(
                f"Most congested band {peak.band.name} ({peak.congestion:.2f}) with {peak.asset_count} assets"
            )
        if snapshot.risk_summary:
            dominant = max(snapshot.risk_summary, key=lambda item: item.score)
            highlights.append(
                f"Dominant risk {dominant.dimension.value} score {dominant.score:.2f}"
            )
        details = {"snapshot": snapshot}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Cislunar Traffic Overview",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> CislunarAgentInsight:
        raw = self.generate_insight()
        snapshot = raw.details.get("snapshot") if raw.details else None
        if not isinstance(snapshot, TrafficSnapshot):
            snapshot = self._engine.snapshot()
        return CislunarAgentInsight(raw=raw, snapshot=snapshot)
