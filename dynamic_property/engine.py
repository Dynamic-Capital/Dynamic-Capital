"""Dynamic property engine for orchestrating real-estate portfolios."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from statistics import fmean
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "PropertyAsset",
    "MarketInsight",
    "PropertySignal",
    "PortfolioSnapshot",
    "DynamicPropertyEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` between ``lower`` and ``upper`` inclusive."""

    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, float(value)))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_key(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class PropertyAsset:
    """Representation of a property within a portfolio."""

    identifier: str
    kind: str
    location: str
    purchase_price: float
    current_value: float
    occupancy_rate: float
    lease_term_months: int
    monthly_cashflow: float
    maintenance_reserve: float
    risk_score: float = 0.5
    liquidity_profile: float = 0.5
    appreciation_potential: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_key(self.identifier)
        self.kind = _normalise_text(self.kind)
        self.location = _normalise_key(self.location)
        self.purchase_price = max(float(self.purchase_price), 0.0)
        self.current_value = max(float(self.current_value), 0.0)
        self.occupancy_rate = _clamp(float(self.occupancy_rate))
        self.lease_term_months = max(int(self.lease_term_months), 0)
        self.monthly_cashflow = float(self.monthly_cashflow)
        self.maintenance_reserve = max(float(self.maintenance_reserve), 0.0)
        self.risk_score = _clamp(float(self.risk_score))
        self.liquidity_profile = _clamp(float(self.liquidity_profile))
        self.appreciation_potential = _clamp(float(self.appreciation_potential))
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def net_operating_income(self) -> float:
        """Return the annualised net operating income (NOI)."""

        effective_cashflow = self.monthly_cashflow - self.maintenance_reserve
        noi = max(effective_cashflow, 0.0) * 12 * self.occupancy_rate
        return noi

    @property
    def cap_rate(self) -> float:
        """Return the capitalisation rate based on the current value."""

        if self.current_value <= 0:
            return 0.0
        return self.net_operating_income / self.current_value

    @property
    def equity_multiple(self) -> float:
        """Return the ratio between current value and purchase price."""

        if self.purchase_price <= 0:
            return 1.0
        return self.current_value / self.purchase_price


@dataclass(slots=True)
class MarketInsight:
    """Insight describing market conditions affecting a group of assets."""

    area: str
    demand_strength: float
    supply_pressure: float
    growth_outlook: float
    regulation_risk: float = 0.4
    liquidity_access: float = 0.5
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.area = _normalise_key(self.area)
        self.demand_strength = _clamp(float(self.demand_strength))
        self.supply_pressure = _clamp(float(self.supply_pressure))
        self.growth_outlook = _clamp(float(self.growth_outlook))
        self.regulation_risk = _clamp(float(self.regulation_risk))
        self.liquidity_access = _clamp(float(self.liquidity_access))
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def resilience_score(self) -> float:
        upside = (self.demand_strength * 0.4) + (self.growth_outlook * 0.4)
        downside = (1.0 - self.supply_pressure) * 0.2
        return _clamp(upside + downside)


@dataclass(slots=True)
class PropertySignal:
    """Actionable signal for a property."""

    asset_id: str
    action: str
    confidence: float
    rationale: str
    expected_return: float

    def __post_init__(self) -> None:
        self.asset_id = _normalise_key(self.asset_id)
        self.action = _normalise_text(self.action)
        self.confidence = _clamp(float(self.confidence))
        self.expected_return = float(self.expected_return)
        self.rationale = self.rationale.strip()
        if not self.rationale:
            raise ValueError("rationale must not be empty")


@dataclass(slots=True)
class PortfolioSnapshot:
    """Aggregated view of the current portfolio state."""

    total_value: float
    total_cost_basis: float
    annual_noi: float
    gross_yield: float
    average_occupancy: float
    average_risk: float
    liquidity_health: float
    signals: tuple[PropertySignal, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.total_value = max(float(self.total_value), 0.0)
        self.total_cost_basis = max(float(self.total_cost_basis), 0.0)
        self.annual_noi = max(float(self.annual_noi), 0.0)
        self.gross_yield = max(float(self.gross_yield), 0.0)
        self.average_occupancy = _clamp(float(self.average_occupancy))
        self.average_risk = _clamp(float(self.average_risk))
        self.liquidity_health = _clamp(float(self.liquidity_health))
        self.signals = tuple(self.signals)


# ---------------------------------------------------------------------------
# engine implementation


class DynamicPropertyEngine:
    """Coordinator that synthesises property and market intelligence."""

    def __init__(
        self,
        *,
        required_return: float = 0.07,
        risk_tolerance: float = 0.5,
        liquidity_preference: float = 0.5,
    ) -> None:
        self.required_return = _clamp(required_return, lower=0.0, upper=0.25)
        self.risk_tolerance = _clamp(risk_tolerance)
        self.liquidity_preference = _clamp(liquidity_preference)
        self._assets: MutableMapping[str, PropertyAsset] = {}
        self._insights: MutableMapping[str, MarketInsight] = {}

    # -- lifecycle ---------------------------------------------------------

    def register_asset(self, asset: PropertyAsset) -> None:
        """Register or update a property asset."""

        self._assets[asset.identifier] = asset

    def remove_asset(self, asset_id: str) -> None:
        """Remove an asset by identifier if it exists."""

        self._assets.pop(_normalise_key(asset_id), None)

    def upsert_market_insight(self, insight: MarketInsight) -> None:
        """Register or update a market insight keyed by ``area``."""

        self._insights[insight.area] = insight

    # -- derived metrics ---------------------------------------------------

    def _iter_assets(self) -> Iterable[PropertyAsset]:
        return self._assets.values()

    def _resolve_insight(self, asset: PropertyAsset) -> MarketInsight | None:
        return self._insights.get(asset.location)

    def _score_asset(
        self, asset: PropertyAsset, insight: MarketInsight | None
    ) -> tuple[float, float, float]:
        performance = (asset.cap_rate / (self.required_return or 0.0001)) * 0.6
        performance += asset.equity_multiple * 0.2
        performance += asset.appreciation_potential * 0.2
        market_modifier = 0.0
        market_risk = asset.risk_score
        liquidity_score = asset.liquidity_profile

        if insight is not None:
            market_modifier = (insight.resilience_score * 0.5) + (insight.growth_outlook * 0.3)
            market_modifier += (insight.demand_strength - insight.supply_pressure) * 0.2
            market_risk = (market_risk * 0.6) + (insight.regulation_risk * 0.4)
            liquidity_score = (liquidity_score * 0.5) + (insight.liquidity_access * 0.5)

        lease_term_score = _clamp(asset.lease_term_months / 120)
        stability = (asset.occupancy_rate * 0.5) + (market_modifier * 0.3) + (lease_term_score * 0.2)
        opportunity = _clamp(performance + stability)
        return opportunity, _clamp(market_risk), _clamp(liquidity_score)

    def _build_signal(
        self, asset: PropertyAsset, opportunity: float, risk: float, liquidity: float
    ) -> PropertySignal:

        # expected return is estimated using NOI relative to value adjusted by opportunity
        expected_return = asset.cap_rate * opportunity

        if risk > self.risk_tolerance + 0.2:
            action = "Reduce Exposure"
            rationale = "Risk profile exceeds tolerance; prioritise de-leveraging."
            confidence = _clamp(risk)
        elif expected_return < self.required_return * 0.8:
            action = "Stabilise"
            rationale = "Underperforming yield; focus on operational optimisation."
            confidence = _clamp(1.0 - expected_return)
        elif liquidity < self.liquidity_preference * 0.8:
            action = "Refinance"
            rationale = "Liquidity access below preference; explore refinancing options."
            confidence = _clamp(1.0 - liquidity)
        elif opportunity >= 0.75 and risk <= self.risk_tolerance:
            action = "Acquire More"
            rationale = "Strong upside with manageable risk; consider expansion."
            confidence = opportunity
        else:
            action = "Hold"
            rationale = "Performance aligns with expectations; maintain current strategy."
            confidence = _clamp(0.5 + opportunity * 0.5)

        return PropertySignal(
            asset_id=asset.identifier,
            action=action,
            confidence=confidence,
            rationale=rationale,
            expected_return=expected_return,
        )

    # -- public orchestration ---------------------------------------------

    def evaluate_portfolio(self) -> PortfolioSnapshot:
        """Aggregate assets and generate portfolio level insights."""

        assets = tuple(self._iter_assets())
        if not assets:
            return PortfolioSnapshot(
                total_value=0.0,
                total_cost_basis=0.0,
                annual_noi=0.0,
                gross_yield=0.0,
                average_occupancy=0.0,
                average_risk=0.0,
                liquidity_health=0.0,
                signals=(),
            )

        total_value = sum(asset.current_value for asset in assets)
        total_cost_basis = sum(asset.purchase_price for asset in assets)
        annual_noi = sum(asset.net_operating_income for asset in assets)
        gross_yield = annual_noi / total_value if total_value else 0.0

        risks: list[float] = []
        occupancies: list[float] = []
        liquidities: list[float] = []
        signals: list[PropertySignal] = []

        for asset in assets:
            insight = self._resolve_insight(asset)
            opportunity, risk, liquidity = self._score_asset(asset, insight)
            signal = self._build_signal(asset, opportunity, risk, liquidity)
            signals.append(signal)
            occupancies.append(asset.occupancy_rate)
            risks.append(risk)
            liquidities.append(liquidity)

        average_occupancy = fmean(occupancies) if occupancies else 0.0
        average_risk = fmean(risks) if risks else 0.0
        liquidity_health = fmean(liquidities) if liquidities else 0.0

        return PortfolioSnapshot(
            total_value=total_value,
            total_cost_basis=total_cost_basis,
            annual_noi=annual_noi,
            gross_yield=gross_yield,
            average_occupancy=average_occupancy,
            average_risk=average_risk,
            liquidity_health=liquidity_health,
            signals=tuple(signals),
        )

    # -- diagnostics -------------------------------------------------------

    def export_state(self) -> Dict[str, object]:
        """Return a serialisable snapshot of the engine state."""

        return {
            "required_return": self.required_return,
            "risk_tolerance": self.risk_tolerance,
            "liquidity_preference": self.liquidity_preference,
            "assets": [asdict(asset) for asset in self._iter_assets()],
            "insights": [asdict(insight) for insight in self._insights.values()],
        }
