from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic.platform.engines import DynamicLoggingEngine as LegacyLoggingEngine
from dynamic_logging import DynamicLoggingEngine, LogEvent, LogSeverity, LoggingSnapshot


def test_log_event_normalisation() -> None:
    event = LogEvent(
        source="API",
        message="  Request processed  ",
        severity="INFO",
        category="OPERATIONS",
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        tags=[" ingress ", "", "INGRESS"],
        metadata={"status": "ok"},
    )

    assert event.source == "api"
    assert event.category == "operations"
    assert event.severity is LogSeverity.INFO
    assert event.tags == ("ingress",)
    assert event.metadata == {"status": "ok"}
    assert not event.is_error
    assert "REQUEST PROCESSED" not in event.describe()


def test_dynamic_logging_engine_tracks_state() -> None:
    engine = DynamicLoggingEngine(history_limit=3)
    captured: list[str] = []

    def sink(event: LogEvent, snapshot: LoggingSnapshot) -> None:
        captured.append(f"{event.severity.value}:{snapshot.total_events}")

    engine.register_sink("observer", sink)

    first = engine.log(source="api", message="Request received", severity="info", tags=["ingress"])
    assert first.total_events == 1
    assert first.severity_counts[LogSeverity.INFO] == 1
    assert pytest.approx(first.error_rate, abs=1e-6) == 0.0

    second = engine.log(source="scheduler", message="Latency high", severity=LogSeverity.WARNING, tags=["latency"])
    assert second.total_events == 2
    assert second.severity_counts[LogSeverity.WARNING] == 1
    assert second.error_rate > 0.0

    third = engine.log(source="worker", message="Job failed", severity="error", category="pipeline", tags=["failure"])
    assert third.total_events == 3
    assert third.severity_counts[LogSeverity.ERROR] == 1
    assert third.requires_intervention()
    assert len(captured) == 3
    assert captured[-1].startswith("error:")

    fourth = engine.log(source="worker", message="Recovered", severity="info", tags=["recovery"])
    fifth = engine.log(source="worker", message="Stabilised", severity="info", tags=["steady"])
    final = engine.log(source="api", message="Drift check", severity="debug", tags=["ingress"])

    assert final.total_events == 3
    assert final.severity_counts[LogSeverity.ERROR] == 0
    assert "worker" in final.top_sources
    assert "pipeline" not in final.top_categories  # category dropped with eviction
    assert final.stability_index > 0.0
    assert final.recent_events[-1].message == "Drift check"
    assert len(captured) == 6


def test_dynamic_engines_legacy_entrypoint() -> None:
    legacy_engine = LegacyLoggingEngine(history_limit=2)
    assert isinstance(legacy_engine, DynamicLoggingEngine)

