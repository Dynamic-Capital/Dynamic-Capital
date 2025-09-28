"""Demand intelligence engine for Dynamic Capital."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, Sequence

__all__ = [
    "DemandProjection",
    "DemandSignal",
    "DemandSnapshot",
    "DemandSummary",
    "DynamicDemandEngine",
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
        raise ValueError("value must be non-negative")
    return integer


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _clamp_trend(value: float) -> float:
    return max(-1.0, min(1.0, float(value)))


@dataclass(slots=True)
class DemandSignal:
    """Telemetry describing a pulse of demand."""

    sku: str
    region: str
    orders: int
    conversion_rate: float
    average_order_value: float
    churn_rate: float = 0.1
    confidence: float = 0.5
    trend_score: float = 0.0
    timestamp: datetime = field(default_factory=_utcnow)
    notes: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.sku = _normalise_lower(self.sku)
        self.region = _normalise_lower(self.region)
        self.orders = _coerce_int(self.orders)
        self.conversion_rate = _clamp(float(self.conversion_rate))
        self.average_order_value = max(float(self.average_order_value), 0.0)
        self.churn_rate = _clamp(float(self.churn_rate))
        self.confidence = _clamp(float(self.confidence))
        self.trend_score = _clamp_trend(self.trend_score)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        if self.notes is not None:
            self.notes = _normalise_text(self.notes)
        self.tags = _coerce_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def revenue(self) -> float:
        return self.orders * self.average_order_value

    @property
    def net_orders(self) -> float:
        return max(0.0, self.orders * (1 - self.churn_rate))


@dataclass(slots=True)
class DemandSummary:
    """Aggregated demand picture for a SKU-region cell."""

    sku: str
    region: str
    orders: int
    net_orders: float
    conversion_rate: float
    average_order_value: float
    churn_rate: float
    trend_score: float
    confidence: float
    revenue: float
    alerts: tuple[str, ...]


@dataclass(slots=True)
class DemandSnapshot:
    """Network demand snapshot synthesised from telemetry pulses."""

    total_orders: int
    net_orders: float
    run_rate_revenue: float
    weighted_conversion_rate: float
    weighted_churn_rate: float
    volatility_index: float
    weighted_confidence: float
    alerts: tuple[str, ...]
    breakdown: tuple[DemandSummary, ...]


@dataclass(slots=True)
class DemandProjection:
    """Projected demand posture over an upcoming horizon."""

    horizon_days: int
    projected_orders: float
    projected_revenue: float
    growth_rate: float
    seasonality_factor: float
    assumptions: tuple[str, ...]


class DynamicDemandEngine:
    """Aggregates demand telemetry and projects forward-looking scenarios."""

    def __init__(self, *, window: int = 180) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._signals: Deque[DemandSignal] = deque(maxlen=window)
        self._summaries_cache: tuple[DemandSummary, ...] | None = None
        self._snapshot_cache: DemandSnapshot | None = None

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._signals)

    def clear(self) -> None:
        if self._signals:
            self._signals.clear()
            self._invalidate_cache()

    def record(self, signal: DemandSignal | Mapping[str, object]) -> DemandSignal:
        normalised = self._coerce_signal(signal)
        self._signals.append(normalised)
        self._invalidate_cache()
        return normalised

    def extend(self, signals: Iterable[DemandSignal | Mapping[str, object]]) -> tuple[DemandSignal, ...]:
        buffered = [self._coerce_signal(signal) for signal in signals]
        if buffered:
            self._signals.extend(buffered)
            self._invalidate_cache()
        return tuple(buffered)

    def summarise(self) -> DemandSnapshot:
        summaries = self._ensure_summaries()
        if not summaries:
            if self._snapshot_cache is None:
                self._snapshot_cache = DemandSnapshot(
                    total_orders=0,
                    net_orders=0.0,
                    run_rate_revenue=0.0,
                    weighted_conversion_rate=0.0,
                    weighted_churn_rate=0.0,
                    volatility_index=0.0,
                    weighted_confidence=0.0,
                    alerts=(),
                    breakdown=(),
                )
            return self._snapshot_cache

        if self._snapshot_cache is not None:
            return self._snapshot_cache

        total_orders = sum(item.orders for item in summaries)
        net_orders = sum(item.net_orders for item in summaries)
        run_rate_revenue = sum(item.revenue for item in summaries)
        weighted_conversion = (
            sum(item.conversion_rate * item.orders for item in summaries) / total_orders
            if total_orders
            else fmean(item.conversion_rate for item in summaries)
        )
        weighted_churn = (
            sum(item.churn_rate * item.orders for item in summaries) / total_orders
            if total_orders
            else fmean(item.churn_rate for item in summaries)
        )
        weighted_confidence = (
            sum(item.confidence * item.orders for item in summaries) / total_orders
            if total_orders
            else fmean(item.confidence for item in summaries)
        )
        volatility_index = self._compute_volatility()

        alerts: list[str] = []
        if weighted_conversion < 0.025:
            alerts.append("Conversion rate trending below 2.5%")
        if weighted_churn > 0.35:
            alerts.append("Network churn pressure above 35%")
        if weighted_confidence < 0.45:
            alerts.append("Demand telemetry confidence is fragile")
        if volatility_index > 0.6:
            alerts.append("Demand volatility elevated")
        for summary in summaries:
            alerts.extend(summary.alerts)

        snapshot = DemandSnapshot(
            total_orders=total_orders,
            net_orders=net_orders,
            run_rate_revenue=run_rate_revenue,
            weighted_conversion_rate=weighted_conversion,
            weighted_churn_rate=weighted_churn,
            volatility_index=volatility_index,
            weighted_confidence=weighted_confidence,
            alerts=tuple(dict.fromkeys(alerts)),
            breakdown=tuple(summaries),
        )
        self._snapshot_cache = snapshot
        return snapshot

    def project_demand(
        self,
        *,
        horizon_days: int,
        growth_rate: float = 0.0,
        seasonality_factor: float = 1.0,
    ) -> DemandProjection:
        if horizon_days <= 0:
            raise ValueError("horizon_days must be positive")
        if seasonality_factor <= 0:
            raise ValueError("seasonality_factor must be positive")
        if not self._signals:
            return DemandProjection(
                horizon_days=horizon_days,
                projected_orders=0.0,
                projected_revenue=0.0,
                growth_rate=growth_rate,
                seasonality_factor=seasonality_factor,
                assumptions=("No demand telemetry available; projection defaults to zero.",),
            )

        observations = len(self._signals)
        total_orders = sum(signal.orders for signal in self._signals)
        total_revenue = sum(signal.revenue for signal in self._signals)
        daily_orders = total_orders / observations
        daily_revenue = total_revenue / observations

        adjusted_daily_orders = daily_orders * seasonality_factor
        adjusted_daily_revenue = daily_revenue * seasonality_factor
        growth_multiplier = 1 + max(-0.95, growth_rate)
        projected_orders = adjusted_daily_orders * horizon_days * growth_multiplier
        projected_revenue = adjusted_daily_revenue * horizon_days * growth_multiplier

        assumptions: list[str] = [
            f"Baseline derived from {observations} telemetry pulses",
            f"Linear growth rate applied: {growth_rate:+.2%}",
            f"Seasonality factor applied: {seasonality_factor:.2f}",
        ]
        if seasonality_factor > 1:
            assumptions.append("Upside bias from positive seasonality")
        elif seasonality_factor < 1:
            assumptions.append("Downside bias from negative seasonality")
        if growth_rate > 0.05:
            assumptions.append("Growth rate exceeds 5%; validate marketing support")
        if growth_rate < -0.05:
            assumptions.append("Negative growth scenario; align with retention playbooks")

        return DemandProjection(
            horizon_days=horizon_days,
            projected_orders=projected_orders,
            projected_revenue=projected_revenue,
            growth_rate=growth_rate,
            seasonality_factor=seasonality_factor,
            assumptions=tuple(assumptions),
        )

    # Internal helpers -------------------------------------------------

    def _compute_volatility(self) -> float:
        if len(self._signals) < 2:
            return 0.0
        scores = [signal.trend_score for signal in self._signals]
        baseline = fmean(scores)
        deviations = [abs(score - baseline) for score in scores]
        return min(1.0, fmean(deviations))

    def _build_summaries(self) -> list[DemandSummary]:
        grouped: dict[tuple[str, str], list[DemandSignal]] = defaultdict(list)
        for signal in self._signals:
            grouped[(signal.sku, signal.region)].append(signal)

        summaries: list[DemandSummary] = []
        for (sku, region), signals in grouped.items():
            orders = sum(item.orders for item in signals)
            net_orders = sum(item.net_orders for item in signals)
            revenue = sum(item.revenue for item in signals)
            conversion_rate = (
                sum(item.conversion_rate * item.orders for item in signals) / orders
                if orders
                else fmean(item.conversion_rate for item in signals)
            )
            churn_rate = (
                sum(item.churn_rate * item.orders for item in signals) / orders
                if orders
                else fmean(item.churn_rate for item in signals)
            )
            trend_score = fmean(item.trend_score for item in signals)
            confidence = fmean(item.confidence for item in signals)
            average_order_value = revenue / orders if orders else 0.0

            alerts: list[str] = []
            if conversion_rate < 0.02:
                alerts.append(f"{sku}@{region}: conversion drifting below 2%")
            if churn_rate > 0.4:
                alerts.append(f"{sku}@{region}: churn pressure above 40%")
            if trend_score < -0.3:
                alerts.append(f"{sku}@{region}: momentum declining")
            if confidence < 0.4:
                alerts.append(f"{sku}@{region}: telemetry confidence is fragile")

            summaries.append(
                DemandSummary(
                    sku=sku,
                    region=region,
                    orders=orders,
                    net_orders=net_orders,
                    conversion_rate=conversion_rate,
                    average_order_value=average_order_value,
                    churn_rate=churn_rate,
                    trend_score=trend_score,
                    confidence=confidence,
                    revenue=revenue,
                    alerts=tuple(alerts),
                )
            )
        summaries.sort(key=lambda item: (item.sku, item.region))
        return summaries

    def _invalidate_cache(self) -> None:
        self._summaries_cache = None
        self._snapshot_cache = None

    def _coerce_signal(self, signal: DemandSignal | Mapping[str, object]) -> DemandSignal:
        if isinstance(signal, Mapping):
            signal = DemandSignal(**signal)
        elif not isinstance(signal, DemandSignal):  # pragma: no cover - defensive
            raise TypeError("signal must be a DemandSignal or mapping")
        return signal

    def _ensure_summaries(self) -> tuple[DemandSummary, ...]:
        if self._summaries_cache is None:
            self._summaries_cache = tuple(self._build_summaries())
        return self._summaries_cache
