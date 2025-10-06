from datetime import datetime, timezone
from pathlib import Path
import sys

from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_syncronization import (  # noqa: E402
    DynamicSyncronizationOrchestrator,
    SyncEvent,
    SyncIncident,
    SyncSystem,
)


def test_status_respects_system_timezone() -> None:
    orchestrator = DynamicSyncronizationOrchestrator(
        systems=[
            SyncSystem(
                name="Ops Feed",
                category="ops",
                cadence_minutes=15,
                tolerance_minutes=5,
                timezone="America/New_York",
            )
        ]
    )
    orchestrator.record_event(
        SyncEvent(
            system="Ops Feed",
            status="success",
            drift_minutes=1.5,
            completed_at=datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc),
        )
    )
    orchestrator.open_incident(
        SyncIncident(
            identifier="INC-1",
            system="Ops Feed",
            severity="major",
            summary="Feed disruption",
            opened_at=datetime(2024, 1, 1, 10, 30, tzinfo=timezone.utc),
        )
    )

    snapshot = orchestrator.status("Ops Feed")

    eastern = ZoneInfo("America/New_York")
    assert snapshot.timezone == eastern
    assert snapshot.metadata["timezone"] == "America/New_York"
    assert snapshot.last_synced_at is not None
    assert snapshot.last_synced_at.tzinfo == eastern
    assert snapshot.last_synced_at.hour == 7
    assert snapshot.last_synced_at.minute == 0

    assert snapshot.incidents
    incident = snapshot.incidents[0]
    assert incident.opened_at.tzinfo == eastern
    assert incident.opened_at.hour == 5
    assert incident.opened_at.minute == 30


def test_status_supports_timezone_override() -> None:
    orchestrator = DynamicSyncronizationOrchestrator(
        systems=[
            SyncSystem(
                name="Global Feed",
                category="ops",
                cadence_minutes=30,
                tolerance_minutes=10,
            )
        ]
    )
    orchestrator.record_event(
        SyncEvent(
            system="Global Feed",
            status="success",
            completed_at=datetime(2024, 6, 1, 15, 0, tzinfo=timezone.utc),
        )
    )

    snapshot_tokyo = orchestrator.status("Global Feed", timezone="Asia/Tokyo")
    tokyo = ZoneInfo("Asia/Tokyo")
    assert snapshot_tokyo.timezone == tokyo
    assert snapshot_tokyo.metadata["timezone"] == "Asia/Tokyo"
    assert snapshot_tokyo.last_synced_at is not None
    assert snapshot_tokyo.last_synced_at.hour == 0
    assert snapshot_tokyo.last_synced_at.day == 2

    snapshot_default = orchestrator.status("Global Feed")
    assert snapshot_default.timezone == ZoneInfo("UTC")
    assert snapshot_default.last_synced_at is not None
    assert snapshot_default.last_synced_at.hour == 15
