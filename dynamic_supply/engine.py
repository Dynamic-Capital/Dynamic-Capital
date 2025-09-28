"""Supply orchestration engine for Dynamic Capital operations."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableSequence, Sequence

__all__ = [
    "DynamicSupplyEngine",
    "SupplyAdjustment",
    "SupplySignal",
    "SupplySnapshot",
    "SupplySummary",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _coerce_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    for tag in tags:
        stripped = tag.strip()
        if stripped:
            cleaned.append(stripped.lower())
    return tuple(dict.fromkeys(cleaned))


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _coerce_int(value: int | float) -> int:
    integer = int(value)
    if integer < 0:
        raise ValueError("numeric values must be non-negative")
    return integer


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


@dataclass(slots=True)
class SupplySignal:
    """Snapshot describing the health of a local supply pool."""

    sku: str
    region: str
    available_units: int
    production_capacity: int
    lead_time_days: float
    confidence: float = 0.5
    backlog_units: int = 0
    timestamp: datetime = field(default_factory=_utcnow)
    notes: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.sku = _normalise_lower(self.sku)
        self.region = _normalise_lower(self.region)
        self.available_units = _coerce_int(self.available_units)
        self.production_capacity = _coerce_int(self.production_capacity)
        self.backlog_units = _coerce_int(self.backlog_units)
        self.lead_time_days = max(float(self.lead_time_days), 0.0)
        self.confidence = _clamp(float(self.confidence))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        if self.notes is not None:
            self.notes = _normalise_text(self.notes)
        self.tags = _coerce_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def buffer_units(self) -> int:
        """Return the immediately available units after accounting for backlog."""

        return max(0, self.available_units - self.backlog_units)

    @property
    def fill_rate(self) -> float:
        if self.production_capacity == 0:
            return 1.0 if self.available_units == 0 else 0.0
        return min(self.available_units / self.production_capacity, 1.0)


@dataclass(slots=True)
class SupplySummary:
    """Aggregated view of supply posture for a SKU-region pair."""

    sku: str
    region: str
    available_units: int
    production_capacity: int
    backlog_units: int
    lead_time_days: float
    fill_rate: float
    backlog_ratio: float
    confidence: float
    buffer_units: int
    alerts: tuple[str, ...]

    @property
    def utilisation(self) -> float:
        if self.production_capacity == 0:
            return 0.0
        return min(self.available_units / self.production_capacity, 1.0)


@dataclass(slots=True)
class SupplySnapshot:
    """Network-wide supply snapshot derived from the aggregated signals."""

    total_available_units: int
    total_production_capacity: int
    total_backlog_units: int
    mean_lead_time_days: float
    weighted_confidence: float
    capacity_fill_rate: float
    backlog_ratio: float
    risk_alerts: tuple[str, ...]
    breakdown: tuple[SupplySummary, ...]


@dataclass(slots=True)
class SupplyAdjustment:
    """Recommended replenishment action for a SKU-region cell."""

    sku: str
    region: str
    recommended_order: int
    expedite: bool
    target_buffer_days: float
    projected_coverage_days: float
    rationale: str


class DynamicSupplyEngine:
    """Aggregates supply signals and surfaces replenishment guidance."""

    def __init__(self, *, window: int = 180) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._signals: Deque[SupplySignal] = deque(maxlen=window)
        self._summaries_cache: tuple[SupplySummary, ...] | None = None
        self._snapshot_cache: SupplySnapshot | None = None

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._signals)

    def clear(self) -> None:
        if self._signals:
            self._signals.clear()
            self._invalidate_cache()

    def record(self, signal: SupplySignal | Mapping[str, object]) -> SupplySignal:
        normalised = self._coerce_signal(signal)
        self._signals.append(normalised)
        self._invalidate_cache()
        return normalised

    def extend(self, signals: Iterable[SupplySignal | Mapping[str, object]]) -> tuple[SupplySignal, ...]:
        buffered = [self._coerce_signal(signal) for signal in signals]
        if buffered:
            self._signals.extend(buffered)
            self._invalidate_cache()
        return tuple(buffered)

    def summarise(self) -> SupplySnapshot:
        summaries = self._ensure_summaries()
        if not summaries:
            if self._snapshot_cache is None:
                self._snapshot_cache = SupplySnapshot(
                    total_available_units=0,
                    total_production_capacity=0,
                    total_backlog_units=0,
                    mean_lead_time_days=0.0,
                    weighted_confidence=0.0,
                    capacity_fill_rate=0.0,
                    backlog_ratio=0.0,
                    risk_alerts=(),
                    breakdown=(),
                )
            return self._snapshot_cache

        if self._snapshot_cache is not None:
            return self._snapshot_cache

        total_available = sum(item.available_units for item in summaries)
        total_capacity = sum(item.production_capacity for item in summaries)
        total_backlog = sum(item.backlog_units for item in summaries)
        weighted_lead_time_basis = total_capacity or len(summaries)
        mean_lead_time = (
            sum(item.lead_time_days * (item.production_capacity or 1) for item in summaries)
            / weighted_lead_time_basis
        )
        weighted_confidence = (
            sum(item.confidence * item.available_units for item in summaries)
            / total_available
            if total_available
            else sum(item.confidence for item in summaries) / len(summaries)
        )
        capacity_fill_rate = (
            total_available / total_capacity if total_capacity else (1.0 if total_available == 0 else 0.0)
        )
        backlog_ratio = (
            total_backlog / (total_backlog + total_available)
            if (total_backlog + total_available)
            else 0.0
        )

        alerts: list[str] = []
        if capacity_fill_rate < 0.8:
            alerts.append("Network fill rate below 80%")
        if backlog_ratio > 0.4:
            alerts.append("Backlog ratio above 40%")
        if mean_lead_time > 12:
            alerts.append("Average lead time exceeds 12 days")
        if weighted_confidence < 0.45:
            alerts.append("Confidence in supply telemetry is fragile")
        for summary in summaries:
            alerts.extend(summary.alerts)

        deduped_alerts = tuple(dict.fromkeys(alerts))
        snapshot = SupplySnapshot(
            total_available_units=total_available,
            total_production_capacity=total_capacity,
            total_backlog_units=total_backlog,
            mean_lead_time_days=mean_lead_time,
            weighted_confidence=weighted_confidence,
            capacity_fill_rate=capacity_fill_rate,
            backlog_ratio=backlog_ratio,
            risk_alerts=deduped_alerts,
            breakdown=tuple(summaries),
        )
        self._snapshot_cache = snapshot
        return snapshot

    def plan_replenishment(
        self,
        *,
        target_buffer_days: float,
        demand_forecast: Mapping[str, float],
    ) -> tuple[SupplyAdjustment, ...]:
        if target_buffer_days <= 0:
            raise ValueError("target_buffer_days must be positive")
        if not demand_forecast:
            raise ValueError("demand_forecast must not be empty")

        summaries = self._ensure_summaries()
        adjustments: list[SupplyAdjustment] = []
        for summary in summaries:
            forecast = float(demand_forecast.get(summary.sku, 0.0))
            if forecast <= 0:
                continue
            buffer_units = max(0.0, summary.available_units - summary.backlog_units)
            coverage_days = buffer_units / forecast if forecast else float("inf")
            deficit_days = max(0.0, target_buffer_days - coverage_days)
            recommended_order = int(round(deficit_days * forecast))
            expedite = summary.lead_time_days > target_buffer_days or summary.backlog_ratio > 0.45
            rationale_parts: MutableSequence[str] = []
            if deficit_days > 0:
                rationale_parts.append(
                    f"Buffer shortfall of {deficit_days:.1f} days against target {target_buffer_days:.1f}"
                )
            else:
                rationale_parts.append("Buffer target satisfied; maintain monitoring cadence")
            if summary.backlog_ratio > 0.35:
                rationale_parts.append("Elevated backlog pressure")
            if summary.fill_rate < 0.8:
                rationale_parts.append("Suboptimal fill rate")
            if expedite:
                rationale_parts.append("Expedite suggested due to lead time or backlog risk")
            adjustments.append(
                SupplyAdjustment(
                    sku=summary.sku,
                    region=summary.region,
                    recommended_order=recommended_order,
                    expedite=expedite,
                    target_buffer_days=target_buffer_days,
                    projected_coverage_days=coverage_days,
                    rationale="; ".join(rationale_parts),
                )
            )
        return tuple(adjustments)

    # Internal helpers -------------------------------------------------

    def _invalidate_cache(self) -> None:
        self._summaries_cache = None
        self._snapshot_cache = None

    def _coerce_signal(self, signal: SupplySignal | Mapping[str, object]) -> SupplySignal:
        if isinstance(signal, Mapping):
            signal = SupplySignal(**signal)
        elif not isinstance(signal, SupplySignal):  # pragma: no cover - defensive
            raise TypeError("signal must be a SupplySignal or mapping")
        return signal

    def _ensure_summaries(self) -> tuple[SupplySummary, ...]:
        if self._summaries_cache is None:
            self._summaries_cache = tuple(self._build_summaries())
        return self._summaries_cache

    def _build_summaries(self) -> list[SupplySummary]:
        grouped: dict[tuple[str, str], list[SupplySignal]] = defaultdict(list)
        for signal in self._signals:
            grouped[(signal.sku, signal.region)].append(signal)

        summaries: list[SupplySummary] = []
        for (sku, region), signals in grouped.items():
            available_units = sum(item.available_units for item in signals)
            production_capacity = sum(item.production_capacity for item in signals)
            backlog_units = sum(item.backlog_units for item in signals)
            confidence = sum(item.confidence for item in signals) / len(signals)
            lead_time_basis = production_capacity or len(signals)
            lead_time_days = (
                sum(item.lead_time_days * (item.production_capacity or 1) for item in signals)
                / lead_time_basis
            )
            fill_rate = (
                available_units / production_capacity
                if production_capacity
                else (1.0 if available_units == 0 else 0.0)
            )
            backlog_ratio = (
                backlog_units / (backlog_units + available_units)
                if (backlog_units + available_units)
                else 0.0
            )
            buffer_units = max(0, available_units - backlog_units)

            alerts: list[str] = []
            if fill_rate < 0.75:
                alerts.append(f"{sku}@{region}: fill rate below 75%")
            if backlog_ratio > 0.35:
                alerts.append(f"{sku}@{region}: backlog pressure exceeds 35%")
            if lead_time_days > 10:
                alerts.append(f"{sku}@{region}: lead time above 10 days")
            if confidence < 0.45:
                alerts.append(f"{sku}@{region}: telemetry confidence is fragile")

            summaries.append(
                SupplySummary(
                    sku=sku,
                    region=region,
                    available_units=available_units,
                    production_capacity=production_capacity,
                    backlog_units=backlog_units,
                    lead_time_days=lead_time_days,
                    fill_rate=fill_rate,
                    backlog_ratio=backlog_ratio,
                    confidence=confidence,
                    buffer_units=buffer_units,
                    alerts=tuple(alerts),
                )
            )
        summaries.sort(key=lambda item: (item.sku, item.region))
        return summaries
