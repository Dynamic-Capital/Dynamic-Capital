from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic.trading.algo.dynamic_marketing import DynamicMarketingAlgo  # noqa: E402


def _dt(hours: int = 0) -> datetime:
    base = datetime(2025, 2, 1, tzinfo=timezone.utc)
    return base + timedelta(hours=hours)


def test_snapshot_aggregates_marketing_metrics() -> None:
    algo = DynamicMarketingAlgo()

    algo.record(
        "launch",
        channel="Telegram",
        impressions=1200,
        clicks=180,
        conversions=40,
        spend=520.75,
        revenue=1890.0,
        sentiment=0.6,
        timestamp=_dt(),
    )
    algo.record(
        "launch",
        channel="YouTube",
        impressions=600,
        clicks=90,
        conversions=15,
        spend=210.0,
        revenue=760.5,
        sentiment=0.1,
        timestamp=_dt(6),
    )

    snapshot = algo.snapshot("launch")

    assert snapshot.campaign_id == "LAUNCH"
    assert snapshot.touchpoint_count == 2
    assert snapshot.total_impressions == 1800
    assert snapshot.total_clicks == 270
    assert snapshot.total_conversions == 55
    assert snapshot.total_spend == pytest.approx(730.75, rel=1e-4)
    assert snapshot.total_revenue == pytest.approx(2650.5, rel=1e-4)
    assert snapshot.net_revenue == pytest.approx(1919.75, rel=1e-4)
    assert snapshot.roas == pytest.approx(3.6284, rel=1e-3)
    assert snapshot.cost_per_acquisition == pytest.approx(13.2864, rel=1e-3)
    assert 0.5 <= snapshot.momentum <= 1.0
    assert snapshot.status in {"scale", "optimize", "monitor"}
    assert snapshot.top_channel in {"telegram", "youtube"}
    assert snapshot.last_touch_at == _dt(6)

    state = algo.campaign_state("launch")
    assert state["campaign_id"] == "LAUNCH"
    assert state["touchpoint_count"] == 2
    assert state["top_channel"] in {"telegram", "youtube"}
    assert state["channels"][0]["channel"] in {"telegram", "youtube"}


def test_windowing_controls_history_and_momentum_fallback() -> None:
    algo = DynamicMarketingAlgo(window_size=2, window_duration=timedelta(hours=3))

    algo.record(
        "growth",
        channel="email",
        impressions=200,
        clicks=20,
        conversions=5,
        spend=80.0,
        revenue=0.0,
        sentiment=-0.8,
        timestamp=_dt(-5),
    )

    algo.record(
        "growth",
        channel="email",
        impressions=180,
        clicks=30,
        conversions=6,
        spend=60.0,
        revenue=120.0,
        sentiment=-0.2,
        timestamp=_dt(-2),
    )

    algo.record(
        "growth",
        channel="community",
        impressions=100,
        clicks=25,
        conversions=10,
        spend=40.0,
        revenue=400.0,
        sentiment=0.7,
        timestamp=_dt(),
    )

    history = algo.history("growth")
    assert len(history) == 2

    snapshot = algo.snapshot("growth")
    assert snapshot.touchpoint_count == 2
    assert snapshot.total_conversions == 16
    assert snapshot.total_spend == pytest.approx(100.0, rel=1e-4)
    assert snapshot.momentum == pytest.approx(1.0, rel=1e-3)
    assert snapshot.status in {"scale", "optimize", "monitor", "stabilize"}

    algo.clear("growth")
    algo.record(
        "growth",
        channel="email",
        impressions=150,
        clicks=0,
        conversions=0,
        spend=25.0,
        revenue=0.0,
        sentiment=-0.3,
        timestamp=_dt(),
    )

    fallback_snapshot = algo.snapshot("growth")
    assert fallback_snapshot.momentum == pytest.approx(0.35, rel=1e-3)


def test_ingest_handles_sparse_payloads() -> None:
    algo = DynamicMarketingAlgo()

    accepted = algo.ingest(
        {
            "campaign": "referrals",
            "medium": "telegram",
            "impressions": 400,
            "signups": 30,
            "cost": 55.5,
            "attributed_revenue": 240.0,
            "timestamp": _dt().isoformat(),
        }
    )

    assert accepted is True

    snapshot = algo.snapshot("referrals")
    assert snapshot.total_conversions == 30
    assert snapshot.total_spend == pytest.approx(55.5, rel=1e-4)
    assert snapshot.total_revenue == pytest.approx(240.0, rel=1e-4)

    portfolio = algo.portfolio_summary()
    assert portfolio["campaigns"] == 1
    assert portfolio["active_campaigns"] == 1
    assert portfolio["total_spend"] == pytest.approx(55.5, rel=1e-4)
