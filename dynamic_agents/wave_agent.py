"""Dynamic wave orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_wave.wave import (
    DynamicWaveField,
    WaveListener,
    WaveMedium,
    WaveSnapshot,
    WaveSource,
)

__all__ = ["WaveAgentInsight", "DynamicWaveAgent"]


@dataclass(slots=True)
class WaveAgentInsight:
    raw: AgentInsight
    snapshot: WaveSnapshot


class DynamicWaveAgent:
    """Coordinate :class:`DynamicWaveField` measurements."""

    domain = "Dynamic Wave"

    def __init__(self, *, engine: DynamicWaveField | None = None) -> None:
        self._engine = engine or DynamicWaveField()

    @property
    def engine(self) -> DynamicWaveField:
        return self._engine

    # ------------------------------------------------------------------
    # configuration

    def register_medium(self, medium: WaveMedium | Mapping[str, object], *, default: bool = False) -> WaveMedium:
        return self._engine.register_medium(medium, default=default)

    def select_medium(self, name: str) -> WaveMedium:
        return self._engine.select_medium(name)

    def upsert_source(self, source: WaveSource | Mapping[str, object]) -> WaveSource:
        return self._engine.upsert_source(source)

    def attach_listener(self, listener: WaveListener | Mapping[str, object]) -> WaveListener:
        return self._engine.attach_listener(listener)

    def remove_source(self, name: str) -> None:
        self._engine.remove_source(name)

    def remove_listener(self, name: str) -> None:
        self._engine.remove_listener(name)

    # ------------------------------------------------------------------
    # insight synthesis

    def generate_insight(
        self,
        *,
        medium: str | None = None,
        timestamp: datetime | None = None,
    ) -> AgentInsight:
        snapshot = self._engine.measure(medium=medium, timestamp=timestamp)
        intensities = snapshot.listener_intensity
        metrics = {
            "listeners": float(len(intensities)),
            "dominant_frequency_hz": float(snapshot.dominant_frequency),
            "aggregate_energy": float(snapshot.aggregate_energy),
            "coherence_index": float(snapshot.coherence_index),
            "alerts": float(len(snapshot.alerts)),
        }
        highlights: list[str] = []
        if intensities:
            listener, value = max(intensities.items(), key=lambda item: item[1])
            highlights.append(f"Peak intensity at {listener}: {value:.3f}")
        highlights.extend(snapshot.alerts)
        details = {"snapshot": snapshot}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title=f"Wavefield Measurement via {snapshot.medium.name}",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self, **kwargs: object) -> WaveAgentInsight:
        raw = self.generate_insight(**kwargs)
        snapshot = raw.details.get("snapshot") if raw.details else None
        if not isinstance(snapshot, WaveSnapshot):
            snapshot = self._engine.history[-1]
        return WaveAgentInsight(raw=raw, snapshot=snapshot)
