"""Dynamic intergalactic space orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_intergalactic_space.intergalactic_space import (
    DynamicIntergalacticSpace,
    IntergalacticSector,
)

__all__ = ["IntergalacticAgentInsight", "DynamicIntergalacticAgent"]


@dataclass(slots=True)
class IntergalacticAgentInsight:
    raw: AgentInsight
    sectors: tuple[IntergalacticSector, ...]


class DynamicIntergalacticAgent:
    """Coordinate :class:`DynamicIntergalacticSpace` sectors and routes."""

    domain = "Dynamic Intergalactic Space"

    def __init__(self, *, engine: DynamicIntergalacticSpace | None = None) -> None:
        self._engine = engine or DynamicIntergalacticSpace()

    @property
    def engine(self) -> DynamicIntergalacticSpace:
        return self._engine

    def upsert_sector(self, sector: IntergalacticSector | Mapping[str, object]) -> IntergalacticSector:
        return self._engine.upsert_sector(sector)

    def remove_sector(self, identifier: str) -> None:
        self._engine.remove_sector(identifier)

    def connect(self, *args, **kwargs) -> None:
        self._engine.connect(*args, **kwargs)

    def generate_insight(self) -> AgentInsight:
        summary = self._engine.summarise()
        sectors = self._engine.sectors()
        metrics = {
            "sectors": float(summary.get("sectors", 0.0)),
            "mean_risk": float(summary.get("mean_risk", 0.0)),
            "corridors": float(summary.get("corridors", 0.0)),
        }
        highlights: list[str] = []
        if sectors:
            riskiest = max(sectors, key=lambda sector: sector.risk_index())
            highlights.append(
                f"Riskiest sector {riskiest.identifier} index {riskiest.risk_index():.2f}"
            )
        details = {"sectors": sectors, "summary": summary}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Intergalactic Network Overview",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> IntergalacticAgentInsight:
        raw = self.generate_insight()
        sectors = raw.details.get("sectors") if raw.details else ()
        return IntergalacticAgentInsight(raw=raw, sectors=tuple(sectors))
