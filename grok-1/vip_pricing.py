"""Utilities for synthesising VIP pricing packages and promo codes.

The real Grok-1 model is far too large to run inside the unit test suite.
Instead of invoking the weights directly, we implement a small deterministic
algorithm that mirrors the type of reasoning a pricing copilot could perform
when guided by Grok.  The helper exposes a `generate_vip_packages` function
that accepts a few high level business signals and returns structured
recommendations for tiered VIP bundles together with unique promo codes.

The module intentionally keeps the logic self-contained so that it can be unit
tested without any heavyweight dependencies.  The algorithm focuses on three
aspects:

* Price discovery – progressively scale the baseline price according to
  demand and loyalty signals.
* Feature bundling – pick a deterministic but varied set of perks so each tier
  feels distinct.
* Promotion design – emit unique promo codes with discounts that reward loyal
  cohorts while staying within configurable guard rails.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence
import math
import random


@dataclass(frozen=True)
class VipPackage:
    """Represents a generated VIP bundle.

    Attributes:
        name: Human readable tier label.
        price: Final package price in the business' currency.
        perks: Tuple of included perks.
        promo_code: Unique uppercase promo code.
        discount_pct: Discount percentage expressed as a float between
            ``0`` and ``1``.
    """

    name: str
    price: float
    perks: Sequence[str]
    promo_code: str
    discount_pct: float


_BASE_PERKS: Sequence[str] = (
    "Concierge onboarding",
    "Priority customer support",
    "Dedicated account strategist",
    "Quarterly business reviews",
    "Early access to features",
    "Exclusive event invitations",
    "White-glove migration",
    "Custom analytics dashboard",
    "Advanced security reporting",
    "Flexible contract terms",
    "Service-level guarantee upgrade",
)

_TIER_NAMES: Sequence[str] = (
    "Insider",
    "Elite",
    "Premier",
    "Executive",
    "Signature",
    "Legend",
)


def _clamp(value: float, *, low: float, high: float) -> float:
    return max(low, min(high, value))


def _pick_name(index: int) -> str:
    if index < len(_TIER_NAMES):
        return _TIER_NAMES[index]
    return f"Tier {index + 1}"


def _generate_code(name: str, *, rng: random.Random, discount_pct: float) -> str:
    # Encode a short checksum so promo codes stay deterministic yet unique per
    # tier.  The checksum uses a low collision 3 digit space derived from the
    # tier name and discount.
    checksum = int((sum(map(ord, name)) * (discount_pct + 1)) % 997)
    suffix = f"{checksum:03d}"
    token = rng.choice(("VIP", "GROK", "XAI"))
    return f"{token}-{name[:3].upper()}-{suffix}"


def _scale_price(
    base_price: float,
    tier_index: int,
    *,
    demand_index: float,
    loyalty_score: float,
    churn_risk: float,
) -> float:
    """Calculate a tier price using interpretable heuristics."""

    ladder = 1.0 + tier_index * 0.35
    demand_factor = 1.0 + _clamp(demand_index, low=-1.0, high=2.0) * 0.25
    loyalty_boost = 1.0 + _clamp(loyalty_score, low=0.0, high=1.0) * 0.15
    churn_modifier = 1.0 - _clamp(churn_risk, low=0.0, high=1.0) * 0.2

    exploratory_markup = 1.0 + math.log1p(tier_index) * 0.05
    price = base_price * ladder * demand_factor * loyalty_boost * churn_modifier
    price *= exploratory_markup
    return round(price, 2)


def _pick_perks(rng: random.Random, *, tier_index: int) -> Sequence[str]:
    perk_count = min(len(_BASE_PERKS), 3 + tier_index)
    # Deterministic selection by shuffling a copy seeded via RNG.
    choices = list(_BASE_PERKS)
    rng.shuffle(choices)
    return tuple(sorted(choices[:perk_count]))


def _discount_for_tier(
    *, tier_index: int, loyalty_score: float, churn_risk: float
) -> float:
    base_discount = 0.05 + tier_index * 0.02
    loyalty_bonus = loyalty_score * 0.05
    churn_bonus = churn_risk * 0.03
    discount = _clamp(base_discount + loyalty_bonus + churn_bonus, low=0.0, high=0.35)
    return round(discount, 3)


def generate_vip_packages(
    *,
    base_price: float,
    tiers: int,
    demand_index: float,
    loyalty_score: float,
    churn_risk: float,
    seed: int | None = None,
) -> List[VipPackage]:
    """Generate a structured set of VIP pricing recommendations.

    Args:
        base_price: Baseline non-discounted price of the core offer.
        tiers: Number of VIP tiers to generate.  Must be positive.
        demand_index: Normalised signal (roughly -1 – 2) describing market
            demand. Higher values lead to stronger markups.
        loyalty_score: Value between ``0`` and ``1`` capturing how receptive the
            segment is to upsells.
        churn_risk: Value between ``0`` and ``1`` used to temper price hikes and
            increase incentives.
        seed: Optional random seed to keep promo codes and perk bundles
            deterministic across runs.

    Returns:
        A list of :class:`VipPackage` objects ordered from entry level to most
        premium.

    Raises:
        ValueError: If ``tiers`` is less than ``1`` or ``base_price`` is not
            positive.
    """

    if tiers < 1:
        raise ValueError("`tiers` must be at least 1")
    if base_price <= 0:
        raise ValueError("`base_price` must be positive")

    rng = random.Random(seed)
    packages: List[VipPackage] = []

    for tier_index in range(tiers):
        name = _pick_name(tier_index)
        price = _scale_price(
            base_price,
            tier_index,
            demand_index=demand_index,
            loyalty_score=loyalty_score,
            churn_risk=churn_risk,
        )
        discount = _discount_for_tier(
            tier_index=tier_index,
            loyalty_score=loyalty_score,
            churn_risk=churn_risk,
        )
        promo_code = _generate_code(name, rng=rng, discount_pct=discount)
        perks = _pick_perks(rng, tier_index=tier_index)

        packages.append(
            VipPackage(
                name=name,
                price=price,
                perks=perks,
                promo_code=promo_code,
                discount_pct=discount,
            )
        )

    return packages


def describe_packages(packages: Iterable[VipPackage]) -> str:
    """Return a multi-line human readable summary of generated packages."""

    lines = []
    for package in packages:
        perk_list = ", ".join(package.perks)
        discount_percent = int(round(package.discount_pct * 100))
        lines.append(
            f"{package.name}: ${package.price:.2f} | {discount_percent}% off | "
            f"Promo {package.promo_code} | Perks: {perk_list}"
        )
    return "\n".join(lines)
