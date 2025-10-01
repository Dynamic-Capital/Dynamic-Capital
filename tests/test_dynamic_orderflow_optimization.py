from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_orderflow import DynamicOrderFlow, OrderEvent, OrderFlowWindow


@pytest.fixture(name="now")
def fixture_now() -> datetime:
    return datetime(2025, 1, 1, tzinfo=timezone.utc)


def _event(
    *,
    symbol: str = "BTC",
    side: str,
    size: float,
    price: float,
    offset_seconds: float,
    now: datetime,
) -> OrderEvent:
    return OrderEvent(
        symbol=symbol,
        side=side,
        size=size,
        price=price,
        timestamp=now - timedelta(seconds=offset_seconds),
    )


def test_orderflow_optimize_generates_directives(
    now: datetime, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("dynamic_orderflow.engine._utcnow", lambda: now)
    flow = DynamicOrderFlow(horizon=180, max_samples=10)
    events = [
        _event(side="sell", size=3, price=20050, offset_seconds=1, now=now),
        _event(side="sell", size=2.5, price=20040, offset_seconds=2, now=now),
        _event(side="buy", size=1.2, price=20060, offset_seconds=3, now=now),
        _event(side="sell", size=1.8, price=20030, offset_seconds=4, now=now),
    ]
    flow.ingest(events)

    plan = flow.optimize()

    assert plan.imbalance.dominant_side == "sell"
    assert any("sell" in directive for directive in plan.directives)
    assert 0.0 <= plan.efficiency <= 1.0
    assert plan.latency >= 0.0
    assert plan.as_dict()["imbalance"]["intensity"] == pytest.approx(plan.imbalance.intensity)


def test_orderflow_optimize_reflects_latency(
    now: datetime, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("dynamic_orderflow.engine._utcnow", lambda: now)
    flow = DynamicOrderFlow(horizon=60, max_samples=5)
    recent = _event(side="buy", size=1, price=20100, offset_seconds=0.2, now=now)
    stale = _event(side="buy", size=1.5, price=20110, offset_seconds=5, now=now)

    flow.record(stale)
    flow.record(recent)

    plan = flow.optimize()

    if plan.latency > 1.5:
        assert "low-latency" in " ".join(plan.directives)
    else:
        assert "latency" in " ".join(plan.notes)


def test_orderflow_window_tracks_running_notional(now: datetime) -> None:
    window = OrderFlowWindow(horizon=10)
    buy_event = _event(side="buy", size=1.2, price=20000, offset_seconds=2, now=now)
    sell_event = _event(side="sell", size=0.8, price=20010, offset_seconds=1, now=now)

    window.extend([buy_event, sell_event])

    assert window.event_count == 2
    assert window.buy_notional == pytest.approx(buy_event.notional)
    assert window.sell_notional == pytest.approx(sell_event.notional)
    assert window.total_notional == pytest.approx(buy_event.notional + sell_event.notional)

    window.prune(now=now + timedelta(seconds=20))

    assert window.event_count == 0
    assert window.total_notional == pytest.approx(0.0)


def test_dynamic_orderflow_pressure_prunes_stale_events(
    now: datetime, monkeypatch: pytest.MonkeyPatch
) -> None:
    flow = DynamicOrderFlow(horizon=30, max_samples=10)

    fake_now = now

    def _fake_utcnow() -> datetime:
        return fake_now

    monkeypatch.setattr("dynamic_orderflow.engine._utcnow", _fake_utcnow)

    stale_event = _event(
        side="buy",
        size=1.0,
        price=20050,
        offset_seconds=60,
        now=fake_now,
    )

    flow.record(stale_event)

    fake_now = fake_now + timedelta(seconds=60)
    imbalance = flow.pressure()

    assert imbalance.total_notional == pytest.approx(0.0)
    assert flow._window.event_count == 0
