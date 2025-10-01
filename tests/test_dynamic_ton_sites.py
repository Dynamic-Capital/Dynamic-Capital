"""Tests for the TON Site optimisation tooling."""

from __future__ import annotations

import pytest

from dynamic_ton import (
    TonSiteOptimizationAction,
    TonSiteOptimizationPlan,
    TonSiteOptimizer,
    TonSitePortfolioReport,
    TonSiteProfile,
)


def test_site_optimizer_identifies_blockers() -> None:
    profile = TonSiteProfile(
        domain="alpha.dynamic.ton",
        average_latency_ms=720.0,
        availability_30d=0.982,
        ton_storage_ratio=0.42,
        https_score=0.58,
        dns_ttl_hours=0.5,
        certificate_days_remaining=5,
        asset_weight_kb=2200.0,
        edge_cache_hit_rate=0.55,
        ipfs_pin_health=0.47,
        ton_dns_verified=False,
    )

    optimizer = TonSiteOptimizer()
    plan = optimizer.evaluate_site(profile)

    assert isinstance(plan, TonSiteOptimizationPlan)
    assert plan.domain == "alpha.dynamic.ton"
    assert plan.score < 60.0
    assert plan.has_blockers
    assert plan.high_priority_actions >= 3

    categories = {action.category for action in plan.actions}
    assert {"performance", "security", "compliance"}.issubset(categories)


def test_site_optimizer_handles_healthy_site() -> None:
    profile = TonSiteProfile(
        domain="stable.dynamic.ton",
        average_latency_ms=180.0,
        availability_30d=0.999,
        ton_storage_ratio=0.85,
        https_score=0.92,
        dns_ttl_hours=12.0,
        certificate_days_remaining=90,
        asset_weight_kb=680.0,
        edge_cache_hit_rate=0.84,
        ipfs_pin_health=0.97,
    )

    optimizer = TonSiteOptimizer()
    plan = optimizer.evaluate_site(profile)

    assert isinstance(plan, TonSiteOptimizationPlan)
    assert plan.actions == ()
    assert pytest.approx(plan.score, rel=1e-3) == 100.0
    assert plan.focus_areas == ()
    assert not plan.has_blockers


def test_portfolio_report_aggregates_plans() -> None:
    optimizer = TonSiteOptimizer()
    degraded = TonSiteProfile(
        domain="beta.dynamic.ton",
        average_latency_ms=560.0,
        availability_30d=0.988,
        ton_storage_ratio=0.55,
        https_score=0.78,
        dns_ttl_hours=0.25,
        certificate_days_remaining=2,
        asset_weight_kb=1650.0,
        edge_cache_hit_rate=0.62,
        ipfs_pin_health=0.82,
    )
    healthy = TonSiteProfile(
        domain="gamma.dynamic.ton",
        average_latency_ms=220.0,
        availability_30d=0.998,
        ton_storage_ratio=0.7,
        https_score=0.94,
        dns_ttl_hours=6.0,
        certificate_days_remaining=60,
        asset_weight_kb=900.0,
        edge_cache_hit_rate=0.78,
        ipfs_pin_health=0.95,
    )

    report = optimizer.evaluate_portfolio([degraded, healthy])

    assert isinstance(report, TonSitePortfolioReport)
    assert len(report.plans) == 2
    assert report.average_score < 100.0
    assert report.high_priority_actions >= 1
    assert "delivery" in report.focus_area_counts

    # Ensure plans themselves are returned for downstream processing.
    assert all(isinstance(plan, TonSiteOptimizationPlan) for plan in report.plans)
    assert any(isinstance(action, TonSiteOptimizationAction) for plan in report.plans for action in plan.actions)
