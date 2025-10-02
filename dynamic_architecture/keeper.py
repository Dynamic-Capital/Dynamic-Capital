"""Keeper utilities tracking architecture document revisions."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from .helper import DynamicArchitectureHelper
from .model import ArchitectureDocument, _normalise_text

__all__ = ["ArchitectureSnapshot", "DynamicArchitectureKeeper"]


@dataclass(slots=True)
class ArchitectureSnapshot:
    """Historical record captured by :class:`DynamicArchitectureKeeper`."""

    label: str
    document: ArchitectureDocument

    def summary(self, helper: DynamicArchitectureHelper | None = None) -> str:
        helper = helper or DynamicArchitectureHelper()
        return helper.summarise(self.document)


class DynamicArchitectureKeeper:
    """Maintain a catalogue of architecture documents and their metrics."""

    def __init__(self, helper: DynamicArchitectureHelper | None = None) -> None:
        self._helper = helper or DynamicArchitectureHelper()
        self._snapshots: list[ArchitectureSnapshot] = []

    # ------------------------------------------------------------------- records
    def record(self, label: str, document: ArchitectureDocument) -> ArchitectureSnapshot:
        snapshot = ArchitectureSnapshot(label=_normalise_text(label), document=document)
        self._snapshots.append(snapshot)
        return snapshot

    def extend(self, items: Iterable[tuple[str, ArchitectureDocument]]) -> None:
        for label, document in items:
            self.record(label, document)

    # ------------------------------------------------------------------- retrieval
    def latest(self) -> ArchitectureSnapshot | None:
        return self._snapshots[-1] if self._snapshots else None

    def get(self, label: str) -> ArchitectureSnapshot | None:
        normalised = _normalise_text(label)
        for snapshot in reversed(self._snapshots):
            if snapshot.label == normalised:
                return snapshot
        return None

    def history(self) -> tuple[ArchitectureSnapshot, ...]:
        return tuple(self._snapshots)

    # --------------------------------------------------------------------- metrics
    def metrics_trend(self, metric: str) -> tuple[float, ...]:
        key = metric.lower().replace(" ", "_")
        trend: list[float] = []
        for snapshot in self._snapshots:
            value = snapshot.document.metrics.get(key)
            if isinstance(value, (int, float)):
                trend.append(float(value))
            else:
                trend.append(0.0)
        return tuple(trend)

    def aggregate_metrics(self) -> Mapping[str, float]:
        totals: dict[str, float] = {}
        for snapshot in self._snapshots:
            for key, value in snapshot.document.metrics.items():
                if isinstance(value, (int, float)):
                    totals[key] = totals.get(key, 0.0) + float(value)
        return totals

    # --------------------------------------------------------------------- helpers
    def summarise_latest(self) -> str:
        latest = self.latest()
        if latest is None:
            return ""
        return latest.summary(self._helper)

