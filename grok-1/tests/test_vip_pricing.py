from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from vip_pricing import (
    VipPackage,
    build_pricing_blueprint,
    describe_packages,
    generate_mentorship_packages,
    generate_promo_incentives,
    generate_vip_packages,
)


def test_generate_vip_packages_deterministic() -> None:
    packages = generate_vip_packages(
        base_price=1200.0,
        tiers=3,
        demand_index=0.6,
        loyalty_score=0.4,
        churn_risk=0.2,
        seed=42,
    )

    assert [pkg.name for pkg in packages] == ["Insider", "Elite", "Premier"]
    assert [pkg.price for pkg in packages] == [1404.29, 1961.49, 2518.42]
    assert [pkg.discount_pct for pkg in packages] == [0.076, 0.096, 0.116]
    assert len({pkg.promo_code for pkg in packages}) == len(packages)


def test_generate_vip_packages_validation() -> None:
    with pytest.raises(ValueError, match="tiers"):
        generate_vip_packages(
            base_price=100.0,
            tiers=0,
            demand_index=0.0,
            loyalty_score=0.5,
            churn_risk=0.5,
        )

    with pytest.raises(ValueError, match="base_price"):
        generate_vip_packages(
            base_price=0,
            tiers=1,
            demand_index=0.0,
            loyalty_score=0.5,
            churn_risk=0.5,
        )


def test_describe_packages_formats_output() -> None:
    packages = [
        VipPackage(
            name="Elite",
            price=2500.0,
            perks=("Custom analytics dashboard", "Priority customer support"),
            promo_code="VIP-ELI-123",
            discount_pct=0.1,
        )
    ]

    summary = describe_packages(packages)
    assert "Elite" in summary
    assert "$2500.00" in summary
    assert "10%" in summary
    assert "VIP-ELI-123" in summary


def test_generate_mentorship_packages_deterministic() -> None:
    packages = generate_mentorship_packages(
        base_session_rate=180.0,
        program_weeks=4,
        sessions_per_week=2,
        mentor_experience=0.65,
        mentee_intensity=0.55,
        loyalty_score=0.25,
        tiers=3,
        seed=21,
    )

    assert [pkg.name for pkg in packages] == [
        "Focus Sprint",
        "Growth Pod",
        "Transformation Studio",
    ]
    assert [pkg.sessions for pkg in packages] == [8, 11, 14]
    assert [pkg.price for pkg in packages] == [1980.61, 3162.09, 4562.92]
    assert all(pkg.promo_code.startswith(("MNT", "COH", "GDL")) for pkg in packages)
    assert packages[0].discount_pct < packages[-1].discount_pct


def test_generate_promo_incentives_balances_inputs() -> None:
    offers = generate_promo_incentives(
        base_price=1200.0,
        urgency_index=0.7,
        loyalty_score=0.4,
        inventory_pressure=0.3,
        count=3,
        seed=5,
    )

    assert [offer.name for offer in offers] == [
        "Launch Surge",
        "Loyalty Boost",
        "Win-back Revival",
    ]
    assert [offer.price for offer in offers] == [1071.6, 1068.0, 1064.4]
    assert [offer.duration_days for offer in offers] == [7, 6, 5]
    assert len({offer.promo_code for offer in offers}) == len(offers)


def test_build_pricing_blueprint_compiles_sections() -> None:
    blueprint = build_pricing_blueprint(
        vip_config={
            "base_price": 1300.0,
            "tiers": 2,
            "demand_index": 0.5,
            "loyalty_score": 0.3,
            "churn_risk": 0.2,
        },
        mentorship_config={
            "base_session_rate": 200.0,
            "program_weeks": 3,
            "sessions_per_week": 2,
            "mentor_experience": 0.6,
            "mentee_intensity": 0.5,
            "loyalty_score": 0.2,
            "tiers": 2,
        },
        promo_config={
            "base_price": 1300.0,
            "urgency_index": 0.4,
            "loyalty_score": 0.35,
            "inventory_pressure": 0.2,
            "count": 2,
        },
        seed=99,
    )

    vip_section = blueprint["vip_packages"]
    mentorship_section = blueprint["mentorship_packages"]
    promo_section = blueprint["promo_offers"]

    assert len(vip_section) == 2
    assert len(mentorship_section) == 2
    assert len(promo_section) == 2
    assert "vip" in blueprint["summary"]
    assert blueprint["analytics"]["strongest_promo_discount"] >= 0.05
