"""High-level orchestration utilities for :mod:`dynamic_space`."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from .space import (
    DynamicSpace,
    SpaceEvent,
    SpaceSector,
    SpaceSnapshot,
)

__all__ = ["SpaceNetworkOverview", "DynamicSpaceEngine"]


def _clamp_threshold(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _coerce_sector(value: SpaceSector | Mapping[str, object]) -> SpaceSector:
    if isinstance(value, SpaceSector):
        return value
    if isinstance(value, Mapping):
        return SpaceSector(**value)
    raise TypeError("sector must be a SpaceSector instance or a mapping")


def _coerce_event(value: SpaceEvent | Mapping[str, object]) -> SpaceEvent:
    if isinstance(value, SpaceEvent):
        return value
    if isinstance(value, Mapping):
        return SpaceEvent(**value)
    raise TypeError("event must be a SpaceEvent instance or a mapping")


@dataclass(frozen=True, slots=True)
class SpaceNetworkOverview:
    """Aggregated perspective of the current space network posture."""

    average_stability: float
    total_energy_output_gw: float
    sectors_requiring_attention: tuple[str, ...]
    snapshots: Mapping[str, SpaceSnapshot]


class DynamicSpaceEngine:
    """Co-ordinate space sectors, events and interventions across a network."""

    def __init__(
        self,
        sectors: Sequence[SpaceSector | Mapping[str, object]] | None = None,
        *,
        max_events: int = 256,
        intervention_threshold: float = 0.5,
    ) -> None:
        self._space = DynamicSpace(sectors or (), max_events=max_events)
        self._intervention_threshold = _clamp_threshold(intervention_threshold)

    # --------------------------------------------------------------------- basic
    @property
    def space(self) -> DynamicSpace:
        """Expose the underlying :class:`DynamicSpace` instance."""

        return self._space

    @property
    def sectors(self) -> tuple[SpaceSector, ...]:
        return self._space.sectors

    @property
    def intervention_threshold(self) -> float:
        return self._intervention_threshold

    def configure_intervention_threshold(self, value: float) -> None:
        self._intervention_threshold = _clamp_threshold(value)

    # ------------------------------------------------------------------ register
    def upsert_sector(self, sector: SpaceSector | Mapping[str, object]) -> SpaceSector:
        resolved = _coerce_sector(sector)
        self._space.register_sector(resolved)
        return resolved

    # ------------------------------------------------------------------- dynamics
    def record_event(self, event: SpaceEvent | Mapping[str, object]) -> SpaceEvent:
        return self._space.record_event(_coerce_event(event))

    def ingest_events(self, events: Iterable[SpaceEvent | Mapping[str, object]]) -> list[SpaceEvent]:
        resolved = [_coerce_event(event) for event in events]
        return self._space.ingest_events(resolved)

    def stabilise(
        self,
        sector_name: str,
        *,
        congestion_threshold: float = 0.65,
        damping_factor: float = 0.85,
    ) -> SpaceSector:
        return self._space.rebalance_routes(
            sector_name,
            congestion_threshold=congestion_threshold,
            damping_factor=damping_factor,
        )

    # ---------------------------------------------------------------- snapshots
    def snapshot(self, sector_name: str, *, horizon: int = 5) -> SpaceSnapshot:
        return self._space.snapshot(sector_name, horizon=horizon)

    def prioritise_interventions(
        self,
        *,
        limit: int = 3,
        horizon: int = 5,
    ) -> tuple[SpaceSnapshot, ...]:
        if limit <= 0:
            return ()
        overview = self.network_overview(horizon=horizon)
        ordered = sorted(
            overview.snapshots.values(),
            key=lambda snapshot: (snapshot.stability_score, snapshot.sector_name.lower()),
        )
        return tuple(ordered[:limit])

    def network_overview(self, *, horizon: int = 5) -> SpaceNetworkOverview:
        sectors = self._space.sectors
        snapshots: MutableMapping[str, SpaceSnapshot] = {}
        for sector in sectors:
            snapshots[sector.name] = self._space.snapshot(sector.name, horizon=horizon)
        if snapshots:
            average_stability = sum(snapshot.stability_score for snapshot in snapshots.values()) / len(snapshots)
        else:
            average_stability = 0.0
        total_energy_output = sum(sector.energy_output_gw for sector in sectors)
        attention = tuple(
            name
            for name, snapshot in sorted(
                snapshots.items(),
                key=lambda item: (item[1].stability_score, item[0].lower()),
            )
            if snapshot.stability_score < self._intervention_threshold
        )
        return SpaceNetworkOverview(
            average_stability=average_stability,
            total_energy_output_gw=total_energy_output,
            sectors_requiring_attention=attention,
            snapshots=snapshots,
        )

    def export_state(self, *, horizon: int = 5) -> dict[str, object]:
        overview = self.network_overview(horizon=horizon)
        return {
            "average_stability": overview.average_stability,
            "total_energy_output_gw": overview.total_energy_output_gw,
            "sectors_requiring_attention": overview.sectors_requiring_attention,
            "snapshots": {name: snapshot.as_dict() for name, snapshot in overview.snapshots.items()},
        }
