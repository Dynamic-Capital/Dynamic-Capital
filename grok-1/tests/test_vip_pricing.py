from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from vip_pricing import VipPackage, describe_packages, generate_vip_packages


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
