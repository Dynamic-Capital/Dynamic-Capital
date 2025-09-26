from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.jobs import econopy_macro_job as job


def test_sync_econopy_macro_series_normalises(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyClient:
        def indicator(self, *, name: str, region: str) -> list[dict[str, object]]:
            assert name == "CPI"
            assert region == "US"
            return [
                {
                    "released_at": "2024-04-01T12:30:00Z",
                    "actual": "3.1",
                    "forecast": "3.0",
                    "previous": 2.9,
                    "unit": "%",
                    "region": "United States",
                },
                {
                    "released_at": "2024-05-01T12:30:00Z",
                    "actual": 3.4,
                    "forecast": 3.3,
                    "previous": "3.1",
                    "unit": "%",
                    "region": "United States",
                },
            ]

    class DummyModule:
        def __init__(self, client: DummyClient) -> None:
            self._client = client

        def EconoPy(self) -> DummyClient:
            return self._client

    client = DummyClient()
    monkeypatch.setattr(job, "_load_econopy", lambda: DummyModule(client))

    captured: dict[str, object] = {}

    class DummyWriter:
        def __init__(self, *, table: str, conflict_column: str, **_: object) -> None:
            captured["table"] = table
            captured["conflict_column"] = conflict_column

        def upsert(self, rows: list[dict[str, object]]) -> int:
            captured["rows"] = rows
            return len(rows)

    monkeypatch.setattr(job, "SupabaseTableWriter", DummyWriter)  # type: ignore[arg-type]

    count = job.sync_econopy_macro_series(indicators=["CPI"], region="US")

    assert count == 1
    assert captured["table"] == "macro_indicators"
    assert captured["conflict_column"] == "indicator,released_at"

    rows = captured["rows"]
    assert isinstance(rows, list)
    row = rows[0]
    assert row["indicator"] == "CPI"
    assert row["region"] == "United States"
    assert row["actual"] == pytest.approx(3.4)
    assert row["forecast"] == pytest.approx(3.3)
    assert row["previous"] == pytest.approx(3.1)
    assert row["unit"] == "%"
    assert isinstance(row["released_at"], datetime)
    assert row["released_at"].tzinfo is timezone.utc
    assert row["source"] == "econopy"

