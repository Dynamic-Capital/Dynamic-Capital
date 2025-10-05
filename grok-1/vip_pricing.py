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
from statistics import fmean
from typing import Iterable, List, Mapping, Sequence
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


@dataclass(frozen=True)
class MentorshipPackage:
    """Represents a mentorship focused bundle with pricing details."""

    name: str
    sessions: int
    price: float
    mentor_hours: float
    async_support: str
    resources: Sequence[str]
    promo_code: str
    discount_pct: float


@dataclass(frozen=True)
class PromoIncentive:
    """Represents a promotional offer with dynamic pricing."""

    name: str
    price: float
    promo_code: str
    discount_pct: float
    duration_days: int
    target_segment: str


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

_MENTORSHIP_TIERS: Sequence[str] = (
    "Focus Sprint",
    "Growth Pod",
    "Transformation Studio",
    "Mentor Council",
)

_MENTORSHIP_SUPPORT_LEVELS: Sequence[str] = (
    "48h turnaround",
    "Next-day strategist",
    "Same-day strategist",
    "Embedded operator",
)

_MENTORSHIP_RESOURCES: Sequence[str] = (
    "Accountability dashboard",
    "Weekly office hours",
    "Voice note reviews",
    "Trade journal audits",
    "Systems blueprint library",
    "Personalised roadmap",
    "Live cohort workshops",
)

_PROMO_NAMES: Sequence[str] = (
    "Launch Surge",
    "Loyalty Boost",
    "Win-back Revival",
    "Seasonal Spotlight",
)

_PROMO_SEGMENTS: Sequence[str] = (
    "New signups",
    "VIP alumni",
    "Dormant accounts",
    "Community advocates",
)


def _clamp(value: float, *, low: float, high: float) -> float:
    return max(low, min(high, value))


def _pick_name(index: int) -> str:
    if index < len(_TIER_NAMES):
        return _TIER_NAMES[index]
    return f"Tier {index + 1}"


def _generate_code(
    name: str,
    *,
    rng: random.Random,
    discount_pct: float,
    token_pool: Sequence[str] = ("VIP", "GROK", "XAI"),
    unique_hint: int | str | None = None,
) -> str:
    # Encode a short checksum so promo codes stay deterministic yet unique per
    # tier.  The checksum uses a low collision 3 digit space derived from the
    # tier name and discount.  Including ``unique_hint`` allows callers to
    # guarantee tier-specific uniqueness when names and discounts repeat.
    checksum_source = name if unique_hint is None else f"{name}:{unique_hint}"
    checksum = int((sum(map(ord, checksum_source)) * (discount_pct + 1)) % 997)
    suffix = f"{checksum:03d}"
    token = rng.choice(tuple(token_pool))
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


def _normalise_int(value: int, *, minimum: int = 1) -> int:
    result = int(value)
    if result < minimum:
        raise ValueError(f"value must be at least {minimum}")
    return result


def _mentorship_sessions(
    *,
    program_weeks: int,
    sessions_per_week: int,
    tier_index: int,
) -> int:
    base_sessions = program_weeks * sessions_per_week
    multiplier = 1.0 + tier_index * 0.35
    return max(1, math.ceil(base_sessions * multiplier))


def _mentorship_discount(
    *, tier_index: int, loyalty_score: float, mentor_experience: float
) -> float:
    base_discount = 0.04 + tier_index * 0.015
    loyalty_bonus = _clamp(loyalty_score, low=0.0, high=1.0) * 0.04
    experience_bonus = _clamp(mentor_experience, low=0.0, high=1.0) * 0.02
    return round(
        _clamp(base_discount + loyalty_bonus + experience_bonus, low=0.0, high=0.25),
        3,
    )


def generate_mentorship_packages(
    *,
    base_session_rate: float,
    program_weeks: int,
    sessions_per_week: int,
    mentor_experience: float,
    mentee_intensity: float,
    loyalty_score: float,
    tiers: int = 3,
    seed: int | None = None,
) -> List[MentorshipPackage]:
    """Generate dynamic mentorship pricing recommendations."""

    if base_session_rate <= 0:
        raise ValueError("`base_session_rate` must be positive")
    tiers = _normalise_int(tiers)
    program_weeks = _normalise_int(program_weeks)
    sessions_per_week = _normalise_int(sessions_per_week)

    rng = random.Random(seed)
    packages: List[MentorshipPackage] = []

    mentor_multiplier = 1.0 + _clamp(mentor_experience, low=0.0, high=1.0) * 0.4
    intensity_multiplier = 1.0 + _clamp(mentee_intensity, low=0.0, high=1.0) * 0.3

    for tier_index in range(tiers):
        name = (
            _MENTORSHIP_TIERS[tier_index]
            if tier_index < len(_MENTORSHIP_TIERS)
            else f"Mentorship Tier {tier_index + 1}"
        )
        sessions = _mentorship_sessions(
            program_weeks=program_weeks,
            sessions_per_week=sessions_per_week,
            tier_index=tier_index,
        )
        mentor_hours = round(sessions * mentor_multiplier * 1.2, 1)

        gross_price = (
            base_session_rate
            * sessions
            * mentor_multiplier
            * intensity_multiplier
            * (1.0 + tier_index * 0.18)
        )

        discount = _mentorship_discount(
            tier_index=tier_index,
            loyalty_score=loyalty_score,
            mentor_experience=mentor_experience,
        )
        net_price = round(gross_price * (1.0 - discount), 2)

        support_level = _MENTORSHIP_SUPPORT_LEVELS[
            min(tier_index, len(_MENTORSHIP_SUPPORT_LEVELS) - 1)
        ]

        resources = list(_MENTORSHIP_RESOURCES)
        rng.shuffle(resources)
        selected_resources = tuple(sorted(resources[: min(3 + tier_index, len(resources))]))

        promo_code = _generate_code(
            name,
            rng=rng,
            discount_pct=discount,
            token_pool=("MNT", "COH", "GDL"),
            unique_hint=tier_index,
        )

        packages.append(
            MentorshipPackage(
                name=name,
                sessions=sessions,
                price=net_price,
                mentor_hours=mentor_hours,
                async_support=support_level,
                resources=selected_resources,
                promo_code=promo_code,
                discount_pct=discount,
            )
        )

    return packages


def generate_promo_incentives(
    *,
    base_price: float,
    urgency_index: float,
    loyalty_score: float,
    inventory_pressure: float,
    count: int = 3,
    seed: int | None = None,
) -> List[PromoIncentive]:
    """Generate promo offers that balance urgency and loyalty goals."""

    if base_price <= 0:
        raise ValueError("`base_price` must be positive")
    count = _normalise_int(count)

    rng = random.Random(seed)
    offers: List[PromoIncentive] = []

    urgency = _clamp(urgency_index, low=0.0, high=1.0)
    loyalty = _clamp(loyalty_score, low=0.0, high=1.0)
    pressure = _clamp(inventory_pressure, low=0.0, high=1.0)

    for tier_index in range(count):
        name = _PROMO_NAMES[tier_index % len(_PROMO_NAMES)]
        pace = 1.0 + tier_index * 0.1
        discount = 0.05 + loyalty * 0.05
        discount += urgency * 0.04 * pace
        discount += pressure * 0.03
        discount = round(_clamp(discount, low=0.02, high=0.4), 3)

        price = round(base_price * (1.0 - discount), 2)
        duration_days = max(1, int(round(5 - tier_index + urgency * 3)))
        target_segment = _PROMO_SEGMENTS[tier_index % len(_PROMO_SEGMENTS)]

        promo_code = _generate_code(
            name,
            rng=rng,
            discount_pct=discount,
            token_pool=("PRM", "BND", "VIP"),
            unique_hint=tier_index,
        )

        offers.append(
            PromoIncentive(
                name=name,
                price=price,
                promo_code=promo_code,
                discount_pct=discount,
                duration_days=duration_days,
                target_segment=target_segment,
            )
        )

    return offers


def build_pricing_blueprint(
    *,
    vip_config: Mapping[str, float],
    mentorship_config: Mapping[str, float],
    promo_config: Mapping[str, float],
    seed: int | None = None,
) -> Mapping[str, object]:
    """Compose a holistic pricing snapshot across VIP, mentorship, and promos."""

    rng = random.Random(seed)

    def _derive_seed() -> int | None:
        return rng.randint(0, 2**32 - 1) if seed is not None else None

    vip_packages = generate_vip_packages(
        base_price=float(vip_config["base_price"]),
        tiers=int(vip_config.get("tiers", 3)),
        demand_index=float(vip_config.get("demand_index", 0.0)),
        loyalty_score=float(vip_config.get("loyalty_score", 0.0)),
        churn_risk=float(vip_config.get("churn_risk", 0.0)),
        seed=_derive_seed(),
    )

    mentorship_packages = generate_mentorship_packages(
        base_session_rate=float(mentorship_config["base_session_rate"]),
        program_weeks=int(mentorship_config.get("program_weeks", 4)),
        sessions_per_week=int(mentorship_config.get("sessions_per_week", 2)),
        mentor_experience=float(mentorship_config.get("mentor_experience", 0.5)),
        mentee_intensity=float(mentorship_config.get("mentee_intensity", 0.5)),
        loyalty_score=float(mentorship_config.get("loyalty_score", 0.0)),
        tiers=int(mentorship_config.get("tiers", 3)),
        seed=_derive_seed(),
    )

    promo_offers = generate_promo_incentives(
        base_price=float(promo_config["base_price"]),
        urgency_index=float(promo_config.get("urgency_index", 0.5)),
        loyalty_score=float(promo_config.get("loyalty_score", 0.0)),
        inventory_pressure=float(promo_config.get("inventory_pressure", 0.3)),
        count=int(promo_config.get("count", 3)),
        seed=_derive_seed(),
    )

    analytics = {
        "vip_average_price": round(fmean(pkg.price for pkg in vip_packages), 2)
        if vip_packages
        else 0.0,
        "mentorship_average_price": round(
            fmean(pkg.price for pkg in mentorship_packages), 2
        )
        if mentorship_packages
        else 0.0,
        "strongest_promo_code": min(
            promo_offers, key=lambda offer: offer.price
        ).promo_code
        if promo_offers
        else "",
        "strongest_promo_discount": min(
            promo_offers, key=lambda offer: offer.price
        ).discount_pct
        if promo_offers
        else 0.0,
    }

    summary = {
        "vip": describe_packages(vip_packages),
        "mentorship": [
            f"{package.name}: ${package.price:.2f} | {package.sessions} sessions | {package.async_support}"
            for package in mentorship_packages
        ],
        "promos": [
            f"{offer.name}: ${offer.price:.2f} | {int(round(offer.discount_pct * 100))}% off | {offer.duration_days}d"
            for offer in promo_offers
        ],
    }

    return {
        "vip_packages": vip_packages,
        "mentorship_packages": mentorship_packages,
        "promo_offers": promo_offers,
        "analytics": analytics,
        "summary": summary,
    }


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
        promo_code = _generate_code(
            name,
            rng=rng,
            discount_pct=discount,
            unique_hint=tier_index,
        )
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
