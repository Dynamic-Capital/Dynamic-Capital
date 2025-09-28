"""Dynamic dimension orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_dimensions.engine import DimensionAxis, DimensionProfile, DynamicDimensionEngine

__all__ = ["DimensionAgentInsight", "DynamicDimensionAgent"]


@dataclass(slots=True)
class DimensionAgentInsight:
    raw: AgentInsight
    profile: DimensionProfile


class DynamicDimensionAgent:
    """Coordinate :class:`DynamicDimensionEngine` profiles."""

    domain = "Dynamic Dimensions"

    def __init__(
        self,
        axes: Iterable[DimensionAxis] | None = None,
        *,
        engine: DynamicDimensionEngine | None = None,
    ) -> None:
        if engine is not None:
            self._engine = engine
        else:
            if axes is None:
                raise ValueError("axes must be supplied when engine is not provided")
            self._engine = DynamicDimensionEngine(tuple(axes))

    @property
    def engine(self) -> DynamicDimensionEngine:
        return self._engine

    def ingest(self, snapshot, *, timestamp=None, note=None, metadata=None) -> DimensionProfile:
        return self._engine.ingest(snapshot, timestamp=timestamp, note=note, metadata=metadata)

    def reset(self) -> None:
        self._engine.reset()

    def generate_insight(self) -> AgentInsight:
        profile = self._engine.profile()
        metrics = {
            "composite": float(profile.composite),
            "momentum": float(profile.momentum),
            "volatility": float(profile.volatility),
            "samples": float(profile.sample_size),
        }
        lowest_axis = min(profile.axis_scores.items(), key=lambda item: item[1]) if profile.axis_scores else None
        highlights: list[str] = []
        if lowest_axis is not None:
            highlights.append(f"Axis {lowest_axis[0]} at {lowest_axis[1]:.2f}")
        details = {"profile": profile}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Dimension Intelligence Profile",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> DimensionAgentInsight:
        raw = self.generate_insight()
        profile = raw.details.get("profile") if raw.details else None
        if not isinstance(profile, DimensionProfile):
            profile = self._engine.profile()
        return DimensionAgentInsight(raw=raw, profile=profile)
