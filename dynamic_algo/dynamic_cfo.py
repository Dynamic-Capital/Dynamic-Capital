"""Financial control analytics tailored for Dynamic Capital's CFO pod."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableMapping, Tuple

__all__ = [
    "FinancialEntry",
    "FinancialPeriodSummary",
    "CFOSnapshot",
    "DynamicCFOAlgo",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    if value is None:
        return _now()
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    raise TypeError("timestamp must be datetime, ISO-8601 string, or None")


def _coerce_float(value: object, *, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_non_negative(value: object, *, default: float = 0.0) -> float:
    return max(0.0, _coerce_float(value, default=default))


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_period(value: str) -> str:
    period = str(value).strip()
    if not period:
        raise ValueError("period identifier is required")
    return period.lower()


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class FinancialEntry:
    """Normalised financial telemetry captured from FP&A sources."""

    period: str
    revenue: float = 0.0
    cogs: float = 0.0
    operating_expenses: float = 0.0
    cash: float = 0.0
    receivables: float = 0.0
    payables: float = 0.0
    debt: float = 0.0
    equity: float = 0.0
    timestamp: datetime = field(default_factory=_now)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.period = _normalise_period(self.period)
        self.revenue = _coerce_non_negative(self.revenue)
        self.cogs = _coerce_non_negative(self.cogs)
        self.operating_expenses = _coerce_non_negative(self.operating_expenses)
        self.cash = _coerce_non_negative(self.cash)
        self.receivables = _coerce_non_negative(self.receivables)
        self.payables = _coerce_non_negative(self.payables)
        self.debt = _coerce_non_negative(self.debt)
        self.equity = _coerce_non_negative(self.equity)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def total_expenses(self) -> float:
        return self.cogs + self.operating_expenses

    @property
    def gross_profit(self) -> float:
        return max(0.0, self.revenue - self.cogs)

    @property
    def operating_income(self) -> float:
        return self.revenue - self.total_expenses

    @property
    def burn_rate(self) -> float:
        return max(0.0, self.total_expenses - self.revenue)


@dataclass(slots=True)
class FinancialPeriodSummary:
    """Aggregated financial metrics for a reporting period."""

    period: str
    sample_count: int
    revenue: float
    cogs: float
    operating_expenses: float
    cash: float
    receivables: float
    payables: float
    debt: float
    equity: float
    gross_profit: float
    operating_income: float
    burn_rate: float
    liquidity_ratio: float | None
    debt_to_equity: float | None
    runway_months: float | None
    last_updated: datetime | None

    @property
    def gross_margin(self) -> float:
        if self.revenue <= 0:
            return 0.0
        return self.gross_profit / self.revenue

    @property
    def operating_margin(self) -> float:
        if self.revenue <= 0:
            return 0.0
        return self.operating_income / self.revenue

    @property
    def health_score(self) -> float:
        liquidity = _clamp((self.liquidity_ratio or 0.0) / 2.0)
        solvency = _clamp(1.0 / (1.0 + (self.debt_to_equity or 0.0)))
        margin = _clamp((self.operating_margin + 1.0) / 2.0)
        burn_penalty = _clamp(self.burn_rate / max(self.revenue, 1.0))
        return _clamp((liquidity + solvency + margin) / 3.0 - burn_penalty / 2.0)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "period": self.period,
            "sample_count": self.sample_count,
            "revenue": self.revenue,
            "cogs": self.cogs,
            "operating_expenses": self.operating_expenses,
            "cash": self.cash,
            "receivables": self.receivables,
            "payables": self.payables,
            "debt": self.debt,
            "equity": self.equity,
            "gross_profit": self.gross_profit,
            "operating_income": self.operating_income,
            "burn_rate": self.burn_rate,
            "gross_margin": self.gross_margin,
            "operating_margin": self.operating_margin,
            "liquidity_ratio": self.liquidity_ratio,
            "debt_to_equity": self.debt_to_equity,
            "runway_months": self.runway_months,
            "health_score": self.health_score,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }


@dataclass(slots=True)
class CFOSnapshot:
    """Organisation-wide financial stability snapshot."""

    total_periods: int
    total_samples: int
    total_revenue: float
    total_expenses: float
    overall_gross_margin: float
    overall_operating_margin: float
    average_burn_rate: float
    liquidity_score: float
    solvency_score: float
    risk_level: str
    last_updated: datetime | None
    periods: Tuple[FinancialPeriodSummary, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total_periods": self.total_periods,
            "total_samples": self.total_samples,
            "total_revenue": self.total_revenue,
            "total_expenses": self.total_expenses,
            "overall_gross_margin": self.overall_gross_margin,
            "overall_operating_margin": self.overall_operating_margin,
            "average_burn_rate": self.average_burn_rate,
            "liquidity_score": self.liquidity_score,
            "solvency_score": self.solvency_score,
            "risk_level": self.risk_level,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "periods": [summary.as_dict() for summary in self.periods],
        }


class DynamicCFOAlgo:
    """Maintain rolling FP&A telemetry and compute treasury insights."""

    def __init__(
        self,
        *,
        window_size: int | None = 24,
        window_duration: timedelta | None = timedelta(days=540),
    ) -> None:
        self.window_size = window_size if window_size and window_size > 0 else None
        self.window_duration = window_duration
        self._entries: Dict[str, Deque[FinancialEntry]] = {}

    # ---------------------------------------------------------------- recording
    def record_entry(self, entry: FinancialEntry | Mapping[str, object]) -> FinancialEntry:
        if not isinstance(entry, FinancialEntry):
            entry = FinancialEntry(**entry)
        queue = self._entries.setdefault(entry.period, self._make_queue())
        queue.append(entry)
        self._purge_old(queue)
        return entry

    def ingest(self, entries: Iterable[FinancialEntry | Mapping[str, object]]) -> None:
        for entry in entries:
            self.record_entry(entry)

    # ---------------------------------------------------------------- snapshots
    def build_snapshot(self, *, now: datetime | None = None) -> CFOSnapshot:
        now_ts = _coerce_timestamp(now) if now is not None else _now()
        summaries: list[FinancialPeriodSummary] = []
        total_revenue = 0.0
        total_expenses = 0.0
        total_gross_profit = 0.0
        total_operating_income = 0.0
        total_burn = 0.0
        total_samples = 0
        liquidity_scores: list[float] = []
        solvency_scores: list[float] = []
        last_updated: datetime | None = None

        for period, queue in list(self._entries.items()):
            self._purge_old(queue, reference=now_ts)
            if not queue:
                continue
            summary = self._summarise_period(period, queue)
            summaries.append(summary)
            total_revenue += summary.revenue
            total_expenses += summary.cogs + summary.operating_expenses
            total_gross_profit += summary.gross_profit
            total_operating_income += summary.operating_income
            total_burn += summary.burn_rate
            total_samples += summary.sample_count
            liquidity_scores.append(_clamp((summary.liquidity_ratio or 0.0) / 2.0))
            solvency_scores.append(_clamp(1.0 / (1.0 + (summary.debt_to_equity or 0.0))))
            if summary.last_updated and (last_updated is None or summary.last_updated > last_updated):
                last_updated = summary.last_updated

        overall_gross_margin = total_gross_profit / total_revenue if total_revenue else 0.0
        overall_operating_margin = total_operating_income / total_revenue if total_revenue else 0.0
        average_burn_rate = total_burn / len(summaries) if summaries else 0.0
        liquidity_score = sum(liquidity_scores) / len(liquidity_scores) if liquidity_scores else 0.0
        solvency_score = sum(solvency_scores) / len(solvency_scores) if solvency_scores else 0.0

        if liquidity_score >= 0.75 and solvency_score >= 0.75 and average_burn_rate <= 0.05 * max(total_revenue, 1.0):
            risk_level = "LOW"
        elif liquidity_score >= 0.5 and solvency_score >= 0.5:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        summaries.sort(key=lambda item: item.period)

        return CFOSnapshot(
            total_periods=len(summaries),
            total_samples=total_samples,
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            overall_gross_margin=overall_gross_margin,
            overall_operating_margin=overall_operating_margin,
            average_burn_rate=average_burn_rate,
            liquidity_score=liquidity_score,
            solvency_score=solvency_score,
            risk_level=risk_level,
            last_updated=last_updated,
            periods=tuple(summaries),
        )

    # ----------------------------------------------------------------- helpers
    def _make_queue(self) -> Deque[FinancialEntry]:
        return deque(maxlen=self.window_size)

    def _purge_old(self, queue: Deque[FinancialEntry], *, reference: datetime | None = None) -> None:
        if self.window_duration is None:
            return
        reference_ts = reference or _now()
        threshold = reference_ts - self.window_duration
        while queue and queue[0].timestamp < threshold:
            queue.popleft()

    def _summarise_period(self, period: str, queue: Deque[FinancialEntry]) -> FinancialPeriodSummary:
        entries = list(queue)
        sample_count = len(entries)
        total_revenue = sum(entry.revenue for entry in entries)
        total_cogs = sum(entry.cogs for entry in entries)
        total_operating = sum(entry.operating_expenses for entry in entries)
        cash = sum(entry.cash for entry in entries) / sample_count if sample_count else 0.0
        receivables = sum(entry.receivables for entry in entries) / sample_count if sample_count else 0.0
        payables = sum(entry.payables for entry in entries) / sample_count if sample_count else 0.0
        debt = sum(entry.debt for entry in entries) / sample_count if sample_count else 0.0
        equity = sum(entry.equity for entry in entries) / sample_count if sample_count else 0.0
        gross_profit = max(0.0, total_revenue - total_cogs)
        operating_income = total_revenue - (total_cogs + total_operating)
        burn_rate = max(0.0, (total_cogs + total_operating) - total_revenue)
        liquidity_ratio = ((cash + receivables) / payables) if payables > 0 else None
        debt_to_equity = (debt / equity) if equity > 0 else None
        runway_months = (cash / burn_rate) if burn_rate > 0 else None
        last_updated = entries[-1].timestamp if entries else None

        return FinancialPeriodSummary(
            period=period,
            sample_count=sample_count,
            revenue=total_revenue,
            cogs=total_cogs,
            operating_expenses=total_operating,
            cash=cash,
            receivables=receivables,
            payables=payables,
            debt=debt,
            equity=equity,
            gross_profit=gross_profit,
            operating_income=operating_income,
            burn_rate=burn_rate,
            liquidity_ratio=liquidity_ratio,
            debt_to_equity=debt_to_equity,
            runway_months=runway_months,
            last_updated=last_updated,
        )
