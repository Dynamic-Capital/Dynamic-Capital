"""Alert generation, notification planning, and Supabase sync helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, Iterable, Mapping, MutableMapping, Protocol, Sequence

__all__ = [
    "MarketDatum",
    "LiveDataFeed",
    "AlertRule",
    "AlertEvent",
    "AlertEngine",
    "Notification",
    "NotificationPlanner",
    "AlertSyncService",
]


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


@dataclass(slots=True)
class MarketDatum:
    """Represents a live market data snapshot for a tracked instrument."""

    symbol: str
    price: float
    change_percent: float
    updated_at: datetime | None = None


class LiveDataFeed(Protocol):  # pragma: no cover - interface definition
    """Protocol describing a source that can provide live market data."""

    def fetch(self, symbols: Sequence[str]) -> Sequence[MarketDatum]:
        ...


@dataclass(slots=True)
class AlertRule:
    """Configuration describing when an alert should be triggered."""

    id: str
    symbol: str
    threshold_percent: float
    direction: str = "above"
    severity: str = "info"
    title: str | None = None
    message_template: str = "{symbol} moved {change_percent:+.2f}% to {price:.2f}"
    metadata: Mapping[str, object] = field(default_factory=dict)


@dataclass(slots=True)
class AlertEvent:
    """Concrete alert generated from a rule evaluation."""

    id: str
    rule_id: str
    symbol: str
    price: float
    change_percent: float
    severity: str
    title: str
    message: str
    triggered_at: datetime
    metadata: MutableMapping[str, object] = field(default_factory=dict)


@dataclass(slots=True)
class Notification:
    """Notification instance targeted to a specific recipient."""

    id: str
    alert_id: str
    recipient: str
    category: str
    title: str
    body: str
    severity: str
    sent_at: datetime
    metadata: MutableMapping[str, object] = field(default_factory=dict)


class _Writer(Protocol):  # pragma: no cover - behaviour defined by SupabaseTableWriter
    def upsert(self, rows: Iterable[Mapping[str, object]]) -> int:
        ...


@dataclass(slots=True)
class AlertEngine:
    """Evaluates live data against rules and produces alert events."""

    feed: LiveDataFeed
    dedupe_ttl: timedelta | None = timedelta(minutes=5)
    clock: Callable[[], datetime] = _utcnow
    _last_triggered: Dict[str, datetime] = field(init=False, default_factory=dict)

    def evaluate(self, rules: Sequence[AlertRule]) -> list[AlertEvent]:
        if not rules:
            return []
        symbols = sorted({rule.symbol.upper() for rule in rules})
        snapshots = {datum.symbol.upper(): datum for datum in self.feed.fetch(symbols)}
        events: list[AlertEvent] = []
        for rule in rules:
            datum = snapshots.get(rule.symbol.upper())
            if not datum:
                continue
            threshold = abs(rule.threshold_percent)
            change = float(datum.change_percent)
            if not self._should_trigger(rule.direction, change, threshold):
                continue
            triggered_at = datum.updated_at or self.clock()
            if self._is_duplicate(rule.id, triggered_at):
                continue
            severity = rule.severity
            title = rule.title or f"{rule.symbol.upper()} Alert"
            context = {
                "symbol": datum.symbol,
                "price": float(datum.price),
                "change_percent": change,
                "threshold": threshold,
                "direction": "up" if change >= 0 else "down",
                "severity": severity,
            }
            message = self._format_message(rule.message_template, context)
            metadata: MutableMapping[str, object] = {
                "symbol": datum.symbol,
                "price": float(datum.price),
                "change_percent": change,
                "threshold_percent": threshold,
                "direction": context["direction"],
            }
            if rule.metadata:
                metadata.update(dict(rule.metadata))
            event_id = f"{rule.id}:{triggered_at.isoformat()}"
            events.append(
                AlertEvent(
                    id=event_id,
                    rule_id=rule.id,
                    symbol=datum.symbol,
                    price=float(datum.price),
                    change_percent=change,
                    severity=severity,
                    title=title,
                    message=message,
                    triggered_at=triggered_at,
                    metadata=metadata,
                )
            )
            self._last_triggered[rule.id] = triggered_at
        return events

    def _should_trigger(self, direction: str, change: float, threshold: float) -> bool:
        if direction == "above":
            return change >= threshold
        if direction == "below":
            return change <= -threshold
        if direction == "absolute":
            return abs(change) >= threshold
        raise ValueError(f"Unsupported alert direction: {direction}")

    def _is_duplicate(self, rule_id: str, triggered_at: datetime) -> bool:
        last = self._last_triggered.get(rule_id)
        if last is None or self.dedupe_ttl is None:
            return False
        # Treat out-of-order events that are not newer than the last fired timestamp as duplicates.
        if triggered_at <= last:
            return True
        return triggered_at - last <= self.dedupe_ttl

    @staticmethod
    def _format_message(template: str, context: Mapping[str, object]) -> str:
        try:
            return template.format(**context)
        except KeyError:
            # Fall back to leaving unknown placeholders untouched.
            class _DefaultDict(dict):
                def __missing__(self, key: str) -> str:  # type: ignore[override]
                    return "{" + key + "}"

            return template.format_map(_DefaultDict(context))
        except Exception:
            return template


@dataclass(slots=True)
class NotificationPlanner:
    """Expands alert events into targeted notification payloads."""

    clock: Callable[[], datetime] = _utcnow
    category: str = "market-alert"

    def plan(self, alert: AlertEvent, recipients: Sequence[str]) -> list[Notification]:
        planned: list[Notification] = []
        sent_at = self.clock()
        for recipient in recipients:
            metadata = dict(alert.metadata)
            metadata["recipient"] = recipient
            planned.append(
                Notification(
                    id=f"{alert.id}:{recipient}",
                    alert_id=alert.id,
                    recipient=recipient,
                    category=self.category,
                    title=alert.title,
                    body=alert.message,
                    severity=alert.severity,
                    sent_at=sent_at,
                    metadata=metadata,
                )
            )
        return planned


@dataclass(slots=True)
class AlertSyncService:
    """Persists alert events and notifications into Supabase tables."""

    alerts_writer: _Writer
    notifications_writer: _Writer | None = None
    clock: Callable[[], datetime] = _utcnow

    def sync_alerts(self, alerts: Sequence[AlertEvent]) -> int:
        if not alerts:
            return 0
        synced_at = self.clock()
        rows = [
            {
                "alert_id": alert.id,
                "rule_id": alert.rule_id,
                "symbol": alert.symbol,
                "price": alert.price,
                "change_percent": alert.change_percent,
                "severity": alert.severity,
                "title": alert.title,
                "message": alert.message,
                "triggered_at": alert.triggered_at,
                "metadata": dict(alert.metadata),
                "synced_at": synced_at,
            }
            for alert in alerts
        ]
        return self.alerts_writer.upsert(rows)

    def sync_notifications(self, notifications: Sequence[Notification]) -> int:
        if not notifications:
            return 0
        if not self.notifications_writer:
            raise RuntimeError("notifications_writer is not configured")
        rows = [
            {
                "notification_id": notification.id,
                "alert_id": notification.alert_id,
                "recipient": notification.recipient,
                "category": notification.category,
                "title": notification.title,
                "body": notification.body,
                "severity": notification.severity,
                "sent_at": notification.sent_at,
                "metadata": dict(notification.metadata),
            }
            for notification in notifications
        ]
        return self.notifications_writer.upsert(rows)
