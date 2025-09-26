from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.alert_notifications import (
    AlertEngine,
    AlertEvent,
    AlertRule,
    AlertSyncService,
    MarketDatum,
    NotificationPlanner,
)


class FeedStub:
    def __init__(self, datum: MarketDatum):
        self.datum = datum

    def fetch(self, symbols):
        # Return the current datum if requested symbol matches, case insensitive.
        return [self.datum] if self.datum.symbol.upper() in {s.upper() for s in symbols} else []


class WriterStub:
    def __init__(self):
        self.rows: list[dict[str, object]] = []

    def upsert(self, rows):
        self.rows.extend(rows)
        return len(rows)


def _ts(hour: int, minute: int = 0) -> datetime:
    return datetime(2025, 1, 1, hour=hour, minute=minute, tzinfo=timezone.utc)


def test_alert_engine_triggers_and_deduplicates():
    datum = MarketDatum(symbol="XAUUSD", price=2370.5, change_percent=6.2, updated_at=_ts(9, 30))
    feed = FeedStub(datum)
    engine = AlertEngine(feed=feed, clock=lambda: _ts(9, 0), dedupe_ttl=timedelta(minutes=5))
    rule = AlertRule(
        id="gold-surge",
        symbol="XAUUSD",
        threshold_percent=5.0,
        direction="above",
        severity="warning",
        title="Gold breakout",
        message_template="{symbol} is {direction} {change_percent:+.2f}% at ${price:.1f}",
    )

    events = engine.evaluate([rule])

    assert len(events) == 1
    event = events[0]
    assert event.rule_id == "gold-surge"
    assert event.symbol == "XAUUSD"
    assert event.price == pytest.approx(2370.5)
    assert event.change_percent == pytest.approx(6.2)
    assert event.severity == "warning"
    assert event.title == "Gold breakout"
    assert "Gold breakout" in event.title
    assert "up" == event.metadata["direction"]

    # Re-evaluating without enough time passing should dedupe the alert
    repeat = engine.evaluate([rule])
    assert repeat == []

    # Once the dedupe window expires we should see a new alert
    feed.datum = MarketDatum(
        symbol="XAUUSD",
        price=2380.1,
        change_percent=5.5,
        updated_at=_ts(9, 40),
    )
    follow_up = engine.evaluate([rule])
    assert len(follow_up) == 1
    assert follow_up[0].triggered_at == _ts(9, 40)


def test_alert_engine_handles_bearish_direction():
    feed = FeedStub(MarketDatum(symbol="EURUSD", price=1.075, change_percent=-2.4, updated_at=_ts(10)))
    engine = AlertEngine(feed=feed, dedupe_ttl=None, clock=lambda: _ts(10))
    rule = AlertRule(
        id="eur-drop",
        symbol="EURUSD",
        threshold_percent=1.5,
        direction="below",
        severity="critical",
        message_template="{symbol} moved {change_percent:.1f}% {direction}",
    )

    events = engine.evaluate([rule])

    assert len(events) == 1
    assert events[0].severity == "critical"
    assert "down" in events[0].message


def test_notification_planning_and_sync():
    alert = AlertEvent(
        id="gold-surge:2025-01-01T09:30:00+00:00",
        rule_id="gold-surge",
        symbol="XAUUSD",
        price=2370.5,
        change_percent=6.2,
        severity="warning",
        title="Gold breakout",
        message="Gold is up",
        triggered_at=_ts(9, 30),
        metadata={"direction": "up"},
    )
    planner = NotificationPlanner(clock=lambda: _ts(9, 45))
    notifications = planner.plan(alert, ["alice", "bob"])

    assert len(notifications) == 2
    assert notifications[0].id.endswith(":alice")
    assert notifications[0].sent_at == _ts(9, 45)
    assert notifications[1].metadata["recipient"] == "bob"
    assert notifications[1].metadata["direction"] == "up"

    alerts_writer = WriterStub()
    notifications_writer = WriterStub()
    sync = AlertSyncService(
        alerts_writer=alerts_writer,
        notifications_writer=notifications_writer,
        clock=lambda: _ts(9, 50),
    )

    alert_count = sync.sync_alerts([alert])
    notification_count = sync.sync_notifications(notifications)

    assert alert_count == 1
    assert notification_count == 2
    assert alerts_writer.rows[0]["alert_id"] == alert.id
    assert alerts_writer.rows[0]["synced_at"] == _ts(9, 50)
    assert notifications_writer.rows[0]["notification_id"].endswith(":alice")
    assert notifications_writer.rows[1]["recipient"] == "bob"
