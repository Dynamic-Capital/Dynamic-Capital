"""Utility helpers for analysing API watcher exit logs.

The helpers in this module translate raw log events into ``DynamicWatcher``
signals so existing monitoring automation can reuse the same alerting rules
locally.  It focuses on the ``context canceled`` exit pattern surfaced by the
API watcher and reports when consecutive exits on the same host happen too
quickly.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Iterable, Mapping, MutableMapping, Sequence

from .base import DynamicWatcher, WatcherReport, WatcherRule

__all__ = [
    "ApiWatcherResult",
    "run_api_watcher",
]


@dataclass(slots=True)
class ApiWatcherResult:
    """Container holding the watcher report and contextual metadata."""

    report: WatcherReport
    processed_events: int
    hosts: tuple[str, ...]


def run_api_watcher(
    events: Iterable[Mapping[str, object]],
    *,
    history: int = 288,
    min_gap_seconds: float = 300.0,
    severity: str = "critical",
    window: int | None = None,
) -> ApiWatcherResult:
    """Convert API watcher log events into a :class:`WatcherReport`.

    Parameters
    ----------
    events:
        Iterable of log payloads.  Each payload should contain the fields seen
        in the API watcher log (``metadata``, ``event_message``, ``timestamp``).
    history:
        Number of recent events to retain when calculating summaries.
    min_gap_seconds:
        Minimum allowable seconds between watcher exits on the same host before
        a critical alert is raised.
    severity:
        Severity attached to generated alerts when exits happen too quickly.
    window:
        Optional window override forwarded to :meth:`DynamicWatcher.report`.
    """

    watcher = DynamicWatcher(history=history)
    last_seen: MutableMapping[str, datetime] = {}
    registered_rules: set[str] = set()
    hosts: set[str] = set()

    processed = 0
    for raw in events:
        parsed = _parse_event(raw)
        if parsed is None:
            continue

        processed += 1
        host = parsed.host or "unknown"
        hosts.add(host)
        metric = f"api_watcher.exit_gap_seconds.{host}"

        if metric not in registered_rules:
            watcher.register_rule(
                WatcherRule(
                    metric=metric,
                    lower=float(min_gap_seconds),
                    severity=severity,
                    description=(
                        f"API watcher exits for host {host} happening too quickly"
                    ),
                )
            )
            registered_rules.add(metric)

        previous = last_seen.get(metric)
        if previous is None:
            gap_seconds = float(min_gap_seconds) + 1.0
        else:
            gap_seconds = max((parsed.timestamp - previous).total_seconds(), 0.0)
        last_seen[metric] = parsed.timestamp

        watcher.observe(
            {
                "metric": metric,
                "value": gap_seconds,
                "timestamp": parsed.timestamp,
                "tags": (host,),
                "metadata": {
                    "host": host,
                    "component": parsed.component,
                    "level": parsed.level,
                    "message": parsed.message,
                    "error": parsed.error,
                    "event_id": parsed.event_id,
                },
            }
        )

    if processed == 0:
        raise ValueError("no API watcher events supplied")

    if window is not None:
        report = watcher.report(window=window)
    else:
        report = watcher.report()
    return ApiWatcherResult(
        report=report,
        processed_events=processed,
        hosts=tuple(sorted(hosts)),
    )


@dataclass(slots=True)
class _ParsedEvent:
    timestamp: datetime
    host: str | None
    component: str | None
    level: str | None
    message: str | None
    error: str | None
    event_id: str | None


def _parse_event(payload: Mapping[str, object]) -> _ParsedEvent | None:
    timestamp = _parse_timestamp(payload)
    if timestamp is None:
        return None

    event_id = _coerce_str(payload.get("id"))

    metadata_entries = _metadata_entries(payload.get("metadata"))
    metadata_entry = metadata_entries[0] if metadata_entries else None

    event_message = _load_event_message(payload.get("event_message"))

    host = _coalesce(
        _coerce_str(payload.get("host")),
        _coerce_str(payload.get("hostname")),
        _metadata_lookup(metadata_entry, "host"),
        _metadata_lookup(event_message, "host"),
    )
    component = _coalesce(
        _coerce_str(payload.get("component")),
        _metadata_lookup(metadata_entry, "component"),
        _metadata_lookup(event_message, "component"),
    )
    level = _coalesce(
        _coerce_str(payload.get("level")),
        _metadata_lookup(metadata_entry, "level"),
        _metadata_lookup(event_message, "level"),
    )
    message = _coalesce(
        _coerce_str(payload.get("msg")),
        _metadata_lookup(metadata_entry, "msg"),
        _metadata_lookup(event_message, "msg"),
    )
    error = _coalesce(
        _coerce_str(payload.get("error")),
        _metadata_lookup(metadata_entry, "error"),
        _metadata_lookup(event_message, "error"),
    )

    return _ParsedEvent(
        timestamp=timestamp,
        host=host,
        component=component,
        level=level,
        message=message,
        error=error,
        event_id=event_id,
    )


def _metadata_entries(value: object) -> list[Mapping[str, object]]:
    if isinstance(value, Mapping):
        return [value]
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        resolved: list[Mapping[str, object]] = []
        for item in value:
            if isinstance(item, Mapping):
                resolved.append(item)
        return resolved
    return []


def _metadata_lookup(
    payload: Mapping[str, object] | None, key: str
) -> str | None:
    if not payload:
        return None
    value = payload.get(key)
    return _coerce_str(value)


def _load_event_message(value: object) -> Mapping[str, object] | None:
    if not isinstance(value, str):
        return None
    try:
        resolved = json.loads(value)
    except json.JSONDecodeError:
        return None
    if isinstance(resolved, Mapping):
        return resolved  # type: ignore[return-value]
    return None


def _parse_timestamp(payload: Mapping[str, object]) -> datetime | None:
    raw_timestamp = payload.get("timestamp")
    if isinstance(raw_timestamp, (int, float)):
        try:
            return datetime.fromtimestamp(float(raw_timestamp) / 1_000_000, tz=timezone.utc)
        except (OverflowError, ValueError):  # pragma: no cover - defensive
            pass

    event_message = _load_event_message(payload.get("event_message"))
    if event_message is not None:
        iso_time = _coerce_str(event_message.get("time"))
        if iso_time:
            try:
                return _parse_iso8601(iso_time)
            except ValueError:
                pass

    return None


def _parse_iso8601(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value).astimezone(timezone.utc)


def _coerce_str(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return str(value)


def _coalesce(*values: str | None) -> str | None:
    for value in values:
        if value:
            return value
    return None

