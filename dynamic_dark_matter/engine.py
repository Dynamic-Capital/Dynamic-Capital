"""High level orchestration utilities for :mod:`dynamic_dark_matter`."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from .dark_matter import (
    DarkMatterAnomaly,
    DarkMatterHalo,
    DarkMatterSnapshot,
    DynamicDarkMatter,
)

__all__ = ["DarkMatterNetworkOverview", "DynamicDarkMatterEngine"]


def _clamp_threshold(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


@dataclass(frozen=True, slots=True)
class DarkMatterNetworkOverview:
    """Aggregated perspective of the current halo network."""

    average_stability: float
    total_mass_solar: float
    halos_requiring_attention: tuple[str, ...]
    snapshots: Mapping[str, DarkMatterSnapshot]


class DynamicDarkMatterEngine:
    """Coordinate halos, anomalies, and stabilisation heuristics."""

    def __init__(
        self,
        halos: Sequence[DarkMatterHalo | Mapping[str, object]] | None = None,
        *,
        max_events: int = 256,
        intervention_threshold: float = 0.55,
    ) -> None:
        self._dark_matter = DynamicDarkMatter(halos or (), max_events=max_events)
        self._intervention_threshold = _clamp_threshold(intervention_threshold)

    # ------------------------------------------------------------------ access
    @property
    def dark_matter(self) -> DynamicDarkMatter:
        return self._dark_matter

    @property
    def halos(self) -> tuple[DarkMatterHalo, ...]:
        return self._dark_matter.halos

    @property
    def events(self) -> tuple[DarkMatterAnomaly, ...]:
        return self._dark_matter.events

    @property
    def intervention_threshold(self) -> float:
        return self._intervention_threshold

    def configure_intervention_threshold(self, value: float) -> None:
        self._intervention_threshold = _clamp_threshold(value)

    # ----------------------------------------------------------------- mutation
    def upsert_halo(
        self, halo: DarkMatterHalo | Mapping[str, object]
    ) -> DarkMatterHalo:
        return self._dark_matter.register_halo(halo)

    def remove_halo(self, halo_name: str) -> None:
        self._dark_matter.remove_halo(halo_name)

    def rebalance_halo(
        self,
        halo_name: str,
        *,
        core_density: float | None = None,
        baryon_fraction: float | None = None,
        structure_coherence: float | None = None,
    ) -> DarkMatterHalo:
        return self._dark_matter.adjust_halo(
            halo_name,
            core_density=core_density,
            baryon_fraction=baryon_fraction,
            structure_coherence=structure_coherence,
        )

    def record_anomaly(
        self, anomaly: DarkMatterAnomaly | Mapping[str, object]
    ) -> DarkMatterAnomaly:
        return self._dark_matter.record_anomaly(anomaly)

    def ingest_anomalies(
        self, anomalies: Iterable[DarkMatterAnomaly | Mapping[str, object]]
    ) -> list[DarkMatterAnomaly]:
        return self._dark_matter.ingest_anomalies(anomalies)

    # ---------------------------------------------------------------- snapshots
    def snapshot(self, halo_name: str, *, horizon: int = 5) -> DarkMatterSnapshot:
        return self._dark_matter.snapshot(halo_name, horizon=horizon)

    def prioritise_interventions(
        self,
        *,
        limit: int = 3,
        horizon: int = 5,
    ) -> tuple[DarkMatterSnapshot, ...]:
        if limit <= 0:
            return ()
        overview = self.network_overview(horizon=horizon)
        ordered = sorted(
            overview.snapshots.values(),
            key=lambda snapshot: (
                snapshot.stability_score,
                snapshot.anomaly_pressure,
                snapshot.halo_name.lower(),
            ),
        )
        return tuple(ordered[:limit])

    def network_overview(self, *, horizon: int = 5) -> DarkMatterNetworkOverview:
        halos = self._dark_matter.halos
        snapshots: MutableMapping[str, DarkMatterSnapshot] = {}
        for halo in halos:
            snapshots[halo.name] = self._dark_matter.snapshot(halo.name, horizon=horizon)
        if snapshots:
            average_stability = sum(
                snapshot.stability_score for snapshot in snapshots.values()
            ) / len(snapshots)
        else:
            average_stability = 0.0
        total_mass = sum(halo.mass_solar for halo in halos)
        attention = tuple(
            name
            for name, snapshot in sorted(
                snapshots.items(),
                key=lambda item: (
                    item[1].stability_score,
                    item[1].anomaly_pressure,
                    item[0].lower(),
                ),
            )
            if snapshot.stability_score < self._intervention_threshold
            or snapshot.anomaly_pressure > self._intervention_threshold
        )
        return DarkMatterNetworkOverview(
            average_stability=average_stability,
            total_mass_solar=total_mass,
            halos_requiring_attention=attention,
            snapshots=snapshots,
        )

    def export_state(self, *, horizon: int = 5) -> dict[str, object]:
        overview = self.network_overview(horizon=horizon)
        payload = self._dark_matter.export_state(horizon=horizon)
        payload.update(
            {
                "average_stability": overview.average_stability,
                "total_mass_solar": overview.total_mass_solar,
                "halos_requiring_attention": overview.halos_requiring_attention,
            }
        )
        return payload
