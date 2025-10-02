"""Business orchestration agent bundling revenue, finance, marketing, and culture."""

from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from typing import Callable, Deque, Mapping, MutableMapping, TypeVar

from dynamic_agents._insight import AgentInsight, Number, utcnow

__all__ = [
    "SalesSnapshot",
    "AccountingSnapshot",
    "MarketingSnapshot",
    "PsychologySnapshot",
    "BusinessEngineInsight",
    "DynamicBusinessAgent",
]


SnapshotT = TypeVar("SnapshotT")


@dataclass(slots=True, frozen=True)
class SalesSnapshot:
    """Point-in-time sales performance measurements."""

    quarterly_revenue: float
    pipeline_value: float
    win_rate: float
    sales_cycle_days: float

    def validate(self) -> None:
        if self.quarterly_revenue < 0:
            raise ValueError("quarterly_revenue must be non-negative")
        if self.pipeline_value < 0:
            raise ValueError("pipeline_value must be non-negative")
        if not 0 <= self.win_rate <= 1:
            raise ValueError("win_rate must be within [0, 1]")
        if self.sales_cycle_days <= 0:
            raise ValueError("sales_cycle_days must be positive")


@dataclass(slots=True, frozen=True)
class AccountingSnapshot:
    """Accounting view of cash position and profitability."""

    cash_on_hand: float
    operating_expenses: float
    profit_margin: float
    runway_months: float

    def validate(self) -> None:
        if self.cash_on_hand < 0:
            raise ValueError("cash_on_hand must be non-negative")
        if self.operating_expenses <= 0:
            raise ValueError("operating_expenses must be positive")
        if self.runway_months <= 0:
            raise ValueError("runway_months must be positive")


@dataclass(slots=True, frozen=True)
class MarketingSnapshot:
    """Marketing demand generation and engagement metrics."""

    lead_velocity: float
    campaign_roi: float
    engagement_rate: float

    def validate(self) -> None:
        if self.lead_velocity < 0:
            raise ValueError("lead_velocity must be non-negative")
        if self.campaign_roi < 0:
            raise ValueError("campaign_roi must be non-negative")
        if not 0 <= self.engagement_rate <= 1:
            raise ValueError("engagement_rate must be within [0, 1]")


@dataclass(slots=True, frozen=True)
class PsychologySnapshot:
    """Team wellbeing and organisational psychology signals."""

    wellbeing_index: float
    burnout_risk: float
    retention_risk: float
    learning_hours: float

    def validate(self) -> None:
        if not 0 <= self.wellbeing_index <= 100:
            raise ValueError("wellbeing_index must be within [0, 100]")
        if not 0 <= self.burnout_risk <= 1:
            raise ValueError("burnout_risk must be within [0, 1]")
        if not 0 <= self.retention_risk <= 1:
            raise ValueError("retention_risk must be within [0, 1]")
        if self.learning_hours < 0:
            raise ValueError("learning_hours must be non-negative")


@dataclass(slots=True)
class BusinessEngineInsight:
    """Rich payload produced by :class:`DynamicBusinessAgent`."""

    raw: AgentInsight
    sales: SalesSnapshot
    accounting: AccountingSnapshot
    marketing: MarketingSnapshot
    psychology: PsychologySnapshot
    sales_history: tuple[SalesSnapshot, ...]
    accounting_history: tuple[AccountingSnapshot, ...]
    marketing_history: tuple[MarketingSnapshot, ...]
    psychology_history: tuple[PsychologySnapshot, ...]

    @property
    def overall_health(self) -> float:
        """Return the composite health index."""

        return float(self.raw.metrics.get("overall_health_index", 0.0))


@dataclass(slots=True, frozen=True)
class _SalesGrowthRates:
    revenue_pct: float
    pipeline_pct: float


@dataclass(slots=True, frozen=True)
class _AccountingGrowthRates:
    cash_on_hand_pct: float
    profit_margin_pct: float


@dataclass(slots=True, frozen=True)
class _MarketingGrowthRates:
    lead_velocity_pct: float
    engagement_rate_pct: float


@dataclass(slots=True, frozen=True)
class _PsychologyGrowthRates:
    wellbeing_pct: float
    burnout_pct: float


@dataclass(slots=True, frozen=True)
class _GrowthRates:
    sales: _SalesGrowthRates
    accounting: _AccountingGrowthRates
    marketing: _MarketingGrowthRates
    psychology: _PsychologyGrowthRates


class DynamicBusinessAgent:
    """Coordinate multi-domain business telemetry into actionable insights."""

    domain = "Dynamic Business Engine"

    def __init__(
        self,
        *,
        history_limit: int = 12,
        sales: SalesSnapshot | None = None,
        accounting: AccountingSnapshot | None = None,
        marketing: MarketingSnapshot | None = None,
        psychology: PsychologySnapshot | None = None,
    ) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._sales_history: Deque[SalesSnapshot] = deque(maxlen=history_limit)
        self._accounting_history: Deque[AccountingSnapshot] = deque(maxlen=history_limit)
        self._marketing_history: Deque[MarketingSnapshot] = deque(maxlen=history_limit)
        self._psychology_history: Deque[PsychologySnapshot] = deque(maxlen=history_limit)

        self.ingest(
            sales=sales or SalesSnapshot(
                quarterly_revenue=1_200_000.0,
                pipeline_value=850_000.0,
                win_rate=0.32,
                sales_cycle_days=45.0,
            ),
            accounting=accounting or AccountingSnapshot(
                cash_on_hand=2_500_000.0,
                operating_expenses=380_000.0,
                profit_margin=0.18,
                runway_months=9.0,
            ),
            marketing=marketing or MarketingSnapshot(
                lead_velocity=1_200.0,
                campaign_roi=2.4,
                engagement_rate=0.37,
            ),
            psychology=psychology or PsychologySnapshot(
                wellbeing_index=78.0,
                burnout_risk=0.18,
                retention_risk=0.12,
                learning_hours=4.5,
            ),
        )

    # ------------------------------------------------------------------
    # Ingestion helpers

    def ingest(
        self,
        *,
        sales: SalesSnapshot | None = None,
        accounting: AccountingSnapshot | None = None,
        marketing: MarketingSnapshot | None = None,
        psychology: PsychologySnapshot | None = None,
    ) -> None:
        """Record new telemetry snapshots for any supplied domain."""

        if sales is not None:
            sales.validate()
            self._sales_history.append(sales)
        if accounting is not None:
            accounting.validate()
            self._accounting_history.append(accounting)
        if marketing is not None:
            marketing.validate()
            self._marketing_history.append(marketing)
        if psychology is not None:
            psychology.validate()
            self._psychology_history.append(psychology)

    # ------------------------------------------------------------------
    # Accessors

    @property
    def sales_history(self) -> tuple[SalesSnapshot, ...]:
        return tuple(self._sales_history)

    @property
    def accounting_history(self) -> tuple[AccountingSnapshot, ...]:
        return tuple(self._accounting_history)

    @property
    def marketing_history(self) -> tuple[MarketingSnapshot, ...]:
        return tuple(self._marketing_history)

    @property
    def psychology_history(self) -> tuple[PsychologySnapshot, ...]:
        return tuple(self._psychology_history)

    def _latest_sales(self) -> SalesSnapshot:
        return self._sales_history[-1]

    def _latest_accounting(self) -> AccountingSnapshot:
        return self._accounting_history[-1]

    def _latest_marketing(self) -> MarketingSnapshot:
        return self._marketing_history[-1]

    def _latest_psychology(self) -> PsychologySnapshot:
        return self._psychology_history[-1]

    # ------------------------------------------------------------------
    # Insight generation

    def generate_insight(self) -> AgentInsight:
        """Summarise the current business state as an :class:`AgentInsight`."""

        sales = self._latest_sales()
        accounting = self._latest_accounting()
        marketing = self._latest_marketing()
        psychology = self._latest_psychology()

        metrics: MutableMapping[str, Number] = {
            "sales_quarterly_revenue": sales.quarterly_revenue,
            "sales_pipeline_value": sales.pipeline_value,
            "sales_win_rate": sales.win_rate,
            "sales_cycle_days": sales.sales_cycle_days,
            "accounting_cash_on_hand": accounting.cash_on_hand,
            "accounting_runway_months": accounting.runway_months,
            "accounting_profit_margin": accounting.profit_margin,
            "marketing_lead_velocity": marketing.lead_velocity,
            "marketing_campaign_roi": marketing.campaign_roi,
            "marketing_engagement_rate": marketing.engagement_rate,
            "psychology_wellbeing_index": psychology.wellbeing_index,
            "psychology_burnout_risk": psychology.burnout_risk,
            "psychology_retention_risk": psychology.retention_risk,
            "psychology_learning_hours": psychology.learning_hours,
        }

        metrics["overall_health_index"] = self._calculate_health_index(
            sales, accounting, marketing, psychology
        )
        growth = self._calculate_growth_rates()
        metrics.update(self._trend_metrics(growth))

        highlights = self._build_highlights(
            sales, accounting, marketing, psychology, growth
        )
        details: MutableMapping[str, object] = {
            "sales": asdict(sales),
            "accounting": asdict(accounting),
            "marketing": asdict(marketing),
            "psychology": asdict(psychology),
            "trends": self._build_trend_details(growth),
        }

        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Dynamic business operations outlook",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> BusinessEngineInsight:
        """Return the composite business engine insight bundle."""

        raw = self.generate_insight()
        return BusinessEngineInsight(
            raw=raw,
            sales=self._latest_sales(),
            accounting=self._latest_accounting(),
            marketing=self._latest_marketing(),
            psychology=self._latest_psychology(),
            sales_history=self.sales_history,
            accounting_history=self.accounting_history,
            marketing_history=self.marketing_history,
            psychology_history=self.psychology_history,
        )

    # ------------------------------------------------------------------
    # Internal helpers

    def _trend_metrics(self, growth: _GrowthRates) -> Mapping[str, float]:
        return {
            "sales_revenue_growth_pct": growth.sales.revenue_pct,
            "sales_pipeline_growth_pct": growth.sales.pipeline_pct,
            "marketing_lead_velocity_growth_pct": growth.marketing.lead_velocity_pct,
            "psychology_wellbeing_change_pct": growth.psychology.wellbeing_pct,
        }

    def _build_trend_details(self, growth: _GrowthRates) -> Mapping[str, Mapping[str, float]]:
        return {
            "sales": {
                "quarterly_revenue_pct": growth.sales.revenue_pct,
                "pipeline_value_pct": growth.sales.pipeline_pct,
            },
            "marketing": {
                "lead_velocity_pct": growth.marketing.lead_velocity_pct,
                "engagement_rate_pct": growth.marketing.engagement_rate_pct,
            },
            "psychology": {
                "wellbeing_pct": growth.psychology.wellbeing_pct,
                "burnout_pct": growth.psychology.burnout_pct,
            },
            "accounting": {
                "cash_on_hand_pct": growth.accounting.cash_on_hand_pct,
                "profit_margin_pct": growth.accounting.profit_margin_pct,
            },
        }

    def _build_highlights(
        self,
        sales: SalesSnapshot,
        accounting: AccountingSnapshot,
        marketing: MarketingSnapshot,
        psychology: PsychologySnapshot,
        growth: _GrowthRates,
    ) -> list[str]:
        highlights: list[str] = []

        revenue_change = growth.sales.revenue_pct
        if abs(revenue_change) >= 1.0:
            direction = "up" if revenue_change >= 0 else "down"
            highlights.append(
                f"Quarterly revenue {direction} {abs(revenue_change):.1f}% versus previous snapshot"
            )

        pipeline_change = growth.sales.pipeline_pct
        if pipeline_change > 3.0:
            highlights.append(
                f"Sales pipeline expanded by {pipeline_change:.1f}% with win rate at {sales.win_rate:.0%}"
            )

        if accounting.runway_months < 6:
            highlights.append(
                f"Finance alert: runway at {accounting.runway_months:.1f} months despite {accounting.profit_margin:.0%} margin"
            )
        elif accounting.profit_margin > 0.22:
            highlights.append(
                f"Profit margin healthy at {accounting.profit_margin:.0%} with {accounting.cash_on_hand:,.0f} cash on hand"
            )

        engagement_change = growth.marketing.engagement_rate_pct
        if engagement_change > 2.0:
            highlights.append(
                f"Marketing engagement climbed {engagement_change:.1f}% with ROI {marketing.campaign_roi:.2f}x"
            )

        wellbeing_change = growth.psychology.wellbeing_pct
        if wellbeing_change < -2.5 or psychology.burnout_risk > 0.25:
            highlights.append(
                "People ops watch: wellbeing dipping and burnout risk rising"
            )
        elif wellbeing_change > 2.5:
            highlights.append(
                f"Team wellbeing improved by {wellbeing_change:.1f}% with {psychology.learning_hours:.1f}h learning cadence"
            )

        if not highlights:
            highlights.append(
                "Stable operating conditions across revenue, finance, marketing, and culture"
            )
        return highlights

    def _calculate_health_index(
        self,
        sales: SalesSnapshot,
        accounting: AccountingSnapshot,
        marketing: MarketingSnapshot,
        psychology: PsychologySnapshot,
    ) -> float:
        components: list[float] = []
        components.append(_clamp(sales.win_rate, 0.0, 1.0))
        pipeline_ratio = sales.pipeline_value / (sales.quarterly_revenue or 1.0)
        components.append(_clamp(pipeline_ratio / 1.5, 0.0, 1.0))
        components.append(_clamp(accounting.runway_months / 12.0, 0.0, 1.0))
        components.append(_clamp(accounting.profit_margin / 0.3, 0.0, 1.0))
        components.append(_clamp(marketing.lead_velocity / 1500.0, 0.0, 1.0))
        components.append(_clamp(marketing.engagement_rate, 0.0, 1.0))
        components.append(_clamp(marketing.campaign_roi / 3.0, 0.0, 1.0))
        components.append(_clamp(psychology.wellbeing_index / 100.0, 0.0, 1.0))
        components.append(1.0 - _clamp(psychology.burnout_risk, 0.0, 1.0))
        components.append(1.0 - _clamp(psychology.retention_risk, 0.0, 1.0))

        if not components:
            return 0.0
        return sum(components) / len(components) * 100.0

    @staticmethod
    def _growth_rate(history: Deque[SnapshotT], accessor: Callable[[SnapshotT], float]) -> float:
        if len(history) < 2:
            return 0.0
        current = float(accessor(history[-1]))
        previous = float(accessor(history[-2]))
        if abs(previous) <= 1e-9:
            return 0.0
        return ((current - previous) / abs(previous)) * 100.0

    def _calculate_growth_rates(self) -> _GrowthRates:
        return _GrowthRates(
            sales=_SalesGrowthRates(
                revenue_pct=self._growth_rate(
                    self._sales_history, lambda s: s.quarterly_revenue
                ),
                pipeline_pct=self._growth_rate(
                    self._sales_history, lambda s: s.pipeline_value
                ),
            ),
            accounting=_AccountingGrowthRates(
                cash_on_hand_pct=self._growth_rate(
                    self._accounting_history, lambda s: s.cash_on_hand
                ),
                profit_margin_pct=self._growth_rate(
                    self._accounting_history, lambda s: s.profit_margin
                ),
            ),
            marketing=_MarketingGrowthRates(
                lead_velocity_pct=self._growth_rate(
                    self._marketing_history, lambda s: s.lead_velocity
                ),
                engagement_rate_pct=self._growth_rate(
                    self._marketing_history, lambda s: s.engagement_rate
                ),
            ),
            psychology=_PsychologyGrowthRates(
                wellbeing_pct=self._growth_rate(
                    self._psychology_history, lambda s: s.wellbeing_index
                ),
                burnout_pct=self._growth_rate(
                    self._psychology_history, lambda s: s.burnout_risk
                ),
            ),
        )


def _clamp(value: float, lower: float, upper: float) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value
