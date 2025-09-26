"""Tonstarter public sale planning utilities for the Dynamic Capital Token (DCT)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "SaleTierInput",
    "SaleTierPlan",
    "LiquidityDeployment",
    "MarketingSprint",
    "SaleMilestone",
    "DCTTonstarterSaleInputs",
    "DCTTonstarterSalePlan",
    "DCTTonstarterSalePlanner",
]


def _ensure_positive(value: float, *, name: str) -> float:
    """Return *value* ensuring that it is strictly positive."""

    if value <= 0:
        raise ValueError(f"{name} must be positive")
    return value


def _normalised_weights(tiers: Sequence["SaleTierInput"]) -> Tuple[float, ...]:
    """Return normalised weights for the provided tiers."""

    total = sum(max(0.0, tier.weight) for tier in tiers)
    if total <= 0:
        raise ValueError("At least one tier must define a positive weight")
    return tuple(max(0.0, tier.weight) / total for tier in tiers)


@dataclass(slots=True)
class SaleTierInput:
    """Configuration describing a Tonstarter sale tier."""

    name: str
    weight: float
    price_ton: float
    vesting_months: int
    cliff_months: int

    def validate(self) -> None:
        _ensure_positive(self.weight, name="weight")
        _ensure_positive(self.price_ton, name="price_ton")
        if self.vesting_months < 0:
            raise ValueError("vesting_months cannot be negative")
        if self.cliff_months < 0:
            raise ValueError("cliff_months cannot be negative")


@dataclass(slots=True)
class SaleTierPlan:
    """Calculated sale output for a tier."""

    name: str
    tokens: float
    price_ton: float
    expected_raise_ton: float
    expected_raise_usd: float
    vesting_months: int
    cliff_months: int
    notes: Tuple[str, ...] = field(default_factory=tuple)


@dataclass(slots=True)
class LiquidityDeployment:
    """Plan for seeding on-chain liquidity once the sale concludes."""

    ton_contribution: float
    dct_contribution: float
    pool: str
    notes: Tuple[str, ...] = field(default_factory=tuple)


@dataclass(slots=True)
class MarketingSprint:
    """Structured marketing sprint leading into the sale."""

    name: str
    start_at: datetime
    end_at: datetime
    focus: str
    channels: Tuple[str, ...]
    kpis: Tuple[str, ...]


@dataclass(slots=True)
class SaleMilestone:
    """Key milestone required for the Tonstarter submission."""

    name: str
    due_at: datetime
    owner: str
    description: str


@dataclass(slots=True)
class DCTTonstarterSaleInputs:
    """Inputs describing the desired Tonstarter sale."""

    sale_date: datetime
    ton_price_usd: float
    target_raise_usd: float
    public_sale_share: float
    community_sale_share: float
    treasury_sale_share: float
    liquidity_budget_usd: float
    tonstarter_fee_rate: float = 0.07
    sale_tiers: Sequence[SaleTierInput] = field(default_factory=tuple)
    marketing_channels: Sequence[str] = field(default_factory=tuple)

    def validate(self) -> None:
        _ensure_positive(self.ton_price_usd, name="ton_price_usd")
        _ensure_positive(self.target_raise_usd, name="target_raise_usd")
        if not 0.0 <= self.public_sale_share <= 1.0:
            raise ValueError("public_sale_share must be within [0, 1]")
        if not 0.0 <= self.community_sale_share <= 1.0:
            raise ValueError("community_sale_share must be within [0, 1]")
        if not 0.0 <= self.treasury_sale_share <= 1.0:
            raise ValueError("treasury_sale_share must be within [0, 1]")
        if self.tonstarter_fee_rate < 0.0:
            raise ValueError("tonstarter_fee_rate cannot be negative")
        if self.liquidity_budget_usd < 0.0:
            raise ValueError("liquidity_budget_usd cannot be negative")
        if not self.sale_tiers:
            raise ValueError("sale_tiers must contain at least one tier")
        for tier in self.sale_tiers:
            tier.validate()


@dataclass(slots=True)
class DCTTonstarterSalePlan:
    """Comprehensive view of the Tonstarter sale outputs."""

    sale_date: datetime
    tiers: Tuple[SaleTierPlan, ...]
    total_tokens_for_sale: float
    expected_raise_ton: float
    expected_raise_usd: float
    average_price_ton: float
    tonstarter_fee_ton: float
    treasury_net_ton: float
    liquidity_plan: LiquidityDeployment
    marketing_sprints: Tuple[MarketingSprint, ...]
    milestones: Tuple[SaleMilestone, ...]
    share_breakdown: Mapping[str, float]

    def summary(self) -> str:
        """Return a concise description of the sale."""

        tier_names = ", ".join(tier.name for tier in self.tiers)
        return (
            f"{self.expected_raise_usd:,.0f} USD target (~{self.expected_raise_ton:,.0f} TON) "
            f"across {len(self.tiers)} tiers ({tier_names})."
        )

    def to_dict(self) -> MutableMapping[str, object]:
        """Return a serialisable representation of the plan."""

        return {
            "saleDate": self.sale_date.isoformat(),
            "tiers": [
                {
                    "name": tier.name,
                    "tokens": round(tier.tokens, 6),
                    "priceTon": round(tier.price_ton, 6),
                    "expectedRaiseTon": round(tier.expected_raise_ton, 6),
                    "expectedRaiseUsd": round(tier.expected_raise_usd, 2),
                    "vestingMonths": tier.vesting_months,
                    "cliffMonths": tier.cliff_months,
                    "notes": list(tier.notes),
                }
                for tier in self.tiers
            ],
            "totalTokensForSale": round(self.total_tokens_for_sale, 6),
            "expectedRaiseTon": round(self.expected_raise_ton, 6),
            "expectedRaiseUsd": round(self.expected_raise_usd, 2),
            "averagePriceTon": round(self.average_price_ton, 6),
            "tonstarterFeeTon": round(self.tonstarter_fee_ton, 6),
            "treasuryNetTon": round(self.treasury_net_ton, 6),
            "liquidityPlan": {
                "tonContribution": round(self.liquidity_plan.ton_contribution, 6),
                "dctContribution": round(self.liquidity_plan.dct_contribution, 6),
                "pool": self.liquidity_plan.pool,
                "notes": list(self.liquidity_plan.notes),
            },
            "marketingSprints": [
                {
                    "name": sprint.name,
                    "startAt": sprint.start_at.isoformat(),
                    "endAt": sprint.end_at.isoformat(),
                    "focus": sprint.focus,
                    "channels": list(sprint.channels),
                    "kpis": list(sprint.kpis),
                }
                for sprint in self.marketing_sprints
            ],
            "milestones": [
                {
                    "name": milestone.name,
                    "dueAt": milestone.due_at.isoformat(),
                    "owner": milestone.owner,
                    "description": milestone.description,
                }
                for milestone in self.milestones
            ],
            "shareBreakdown": dict(self.share_breakdown),
        }


class DCTTonstarterSalePlanner:
    """Generate a structured Tonstarter sale plan for DCT."""

    liquidity_pool: str = "STON.fi DCT/TON"

    def build_plan(self, inputs: DCTTonstarterSaleInputs) -> DCTTonstarterSalePlan:
        """Return a :class:`DCTTonstarterSalePlan` for the provided inputs."""

        inputs.validate()

        weights = _normalised_weights(inputs.sale_tiers)
        tiers: list[SaleTierPlan] = []
        total_tokens = 0.0
        total_raise_ton = 0.0

        for tier, weight in zip(inputs.sale_tiers, weights):
            tier_raise_usd = inputs.target_raise_usd * weight
            tier_raise_ton = tier_raise_usd / inputs.ton_price_usd
            tokens = tier_raise_ton / tier.price_ton
            total_tokens += tokens
            total_raise_ton += tier_raise_ton

            notes: list[str] = []
            if tier.vesting_months == 0:
                notes.append("Immediate unlock")
            else:
                notes.append(
                    f"{tier.cliff_months}-month cliff, {tier.vesting_months}-month vesting",
                )
            if tier.weight < 0.1:
                notes.append("Smaller allocation focused on strategic partners")

            tiers.append(
                SaleTierPlan(
                    name=tier.name,
                    tokens=tokens,
                    price_ton=tier.price_ton,
                    expected_raise_ton=tier_raise_ton,
                    expected_raise_usd=tier_raise_usd,
                    vesting_months=tier.vesting_months,
                    cliff_months=tier.cliff_months,
                    notes=tuple(notes),
                )
            )

        average_price_ton = total_raise_ton / total_tokens if total_tokens else 0.0
        tonstarter_fee_ton = total_raise_ton * inputs.tonstarter_fee_rate
        treasury_net_ton = total_raise_ton - tonstarter_fee_ton

        liquidity_ton = (
            inputs.liquidity_budget_usd / inputs.ton_price_usd if inputs.liquidity_budget_usd else 0.0
        )
        liquidity_dct = liquidity_ton / average_price_ton if average_price_ton else 0.0

        liquidity_plan = LiquidityDeployment(
            ton_contribution=liquidity_ton,
            dct_contribution=liquidity_dct,
            pool=self.liquidity_pool,
            notes=(
                "Deploy 50/50 liquidity at weighted-average sale price",
                "Schedule vault top-up 7 days post-sale",
            ),
        )

        marketing_sprints = self._build_marketing_sprints(
            sale_date=inputs.sale_date,
            channels=tuple(inputs.marketing_channels) or (
                "Telegram", "X (Twitter)", "Tonstarter Spotlight", "Community AMAs"
            ),
            target_raise_usd=inputs.target_raise_usd,
        )
        milestones = self._build_milestones(inputs.sale_date)

        share_breakdown = {
            "public": round(inputs.public_sale_share, 4),
            "community": round(inputs.community_sale_share, 4),
            "treasury": round(inputs.treasury_sale_share, 4),
            "other": round(
                max(
                    0.0,
                    1.0
                    - inputs.public_sale_share
                    - inputs.community_sale_share
                    - inputs.treasury_sale_share,
                ),
                4,
            ),
        }

        return DCTTonstarterSalePlan(
            sale_date=inputs.sale_date,
            tiers=tuple(tiers),
            total_tokens_for_sale=total_tokens,
            expected_raise_ton=total_raise_ton,
            expected_raise_usd=inputs.target_raise_usd,
            average_price_ton=average_price_ton,
            tonstarter_fee_ton=tonstarter_fee_ton,
            treasury_net_ton=treasury_net_ton,
            liquidity_plan=liquidity_plan,
            marketing_sprints=marketing_sprints,
            milestones=milestones,
            share_breakdown=share_breakdown,
        )

    @staticmethod
    def _build_marketing_sprints(
        *, sale_date: datetime, channels: Tuple[str, ...], target_raise_usd: float
    ) -> Tuple[MarketingSprint, ...]:
        """Return the staged marketing sprints leading into the sale."""

        discovery_start = sale_date - timedelta(days=21)
        warmup_start = sale_date - timedelta(days=14)
        countdown_start = sale_date - timedelta(days=7)

        base_kpis = (
            f"Registrations target: {int(target_raise_usd // 2500):,}",
            "Growth-qualified leads",  # emphasise pipeline quality
        )

        return (
            MarketingSprint(
                name="Discovery push",
                start_at=discovery_start,
                end_at=warmup_start,
                focus="Publish Tonstarter teaser content and capture allowlist sign-ups.",
                channels=channels,
                kpis=base_kpis + ("Allowlist conversions",),
            ),
            MarketingSprint(
                name="Community warm-up",
                start_at=warmup_start,
                end_at=countdown_start,
                focus="Deepen education with validators, partners, and community calls.",
                channels=channels,
                kpis=base_kpis + ("Validator outreach completed",),
            ),
            MarketingSprint(
                name="Final countdown",
                start_at=countdown_start,
                end_at=sale_date,
                focus="Daily CTAs, influencer syndication, and Tonstarter cross-promo.",
                channels=channels,
                kpis=base_kpis + ("Countdown AMA attendance",),
            ),
        )

    @staticmethod
    def _build_milestones(sale_date: datetime) -> Tuple[SaleMilestone, ...]:
        """Return the governance and operational milestones for the sale."""

        return (
            SaleMilestone(
                name="Audit handoff",
                due_at=sale_date - timedelta(days=28),
                owner="Security & Smart Contracts",
                description="Finalize sale + claim contract audit and publish summary.",
            ),
            SaleMilestone(
                name="Tonstarter submission",
                due_at=sale_date - timedelta(days=21),
                owner="Founding Team",
                description="Submit Tonstarter builder dossier with collateral links.",
            ),
            SaleMilestone(
                name="Liquidity committee sign-off",
                due_at=sale_date - timedelta(days=10),
                owner="Treasury Ops",
                description="Approve liquidity pairing, custody routing, and vault flows.",
            ),
            SaleMilestone(
                name="Sale go-live",
                due_at=sale_date,
                owner="Tonstarter",
                description="Open DCT Tonstarter public sale and monitor inflows.",
            ),
            SaleMilestone(
                name="Claim activation",
                due_at=sale_date + timedelta(days=7),
                owner="Product & Engineering",
                description="Enable vesting portal with Tonstarter claim integration.",
            ),
        )
