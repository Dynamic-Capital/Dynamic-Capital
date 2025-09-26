from __future__ import annotations

from datetime import date

from algorithms.python.cot_report_sync import (
    AwesomeAPICotProvider,
    CotMarketConfig,
    CotReportSnapshot,
    CotReportSyncJob,
)


class FakeCotClient:
    def __init__(self, payloads):
        self._payloads = payloads

    def fetch_series(self, code):  # pragma: no cover - simple stub
        return list(self._payloads[code])


class MemoryWriter:
    def __init__(self):
        self.rows = []

    def upsert(self, rows):
        self.rows = list(rows)
        return len(self.rows)


def test_cot_provider_selects_latest_report():
    client = FakeCotClient(
        {
            "6E": [
                {
                    "reportDate": "20240507",
                    "commercial_long": "1000",
                    "commercial_short": "800",
                    "noncommercial_long": "1200",
                    "noncommercial_short": "900",
                },
                {
                    "date": "2024-05-14",
                    "commercial_long": 1100,
                    "commercial_short": 750,
                    "noncommercial_long": 1300,
                    "noncommercial_short": 880,
                },
            ]
        }
    )
    provider = AwesomeAPICotProvider(
        markets=[CotMarketConfig(market="EUR Futures", code="6E")],
        client=client,
    )

    snapshots = provider.fetch()

    assert len(snapshots) == 1
    snapshot = snapshots[0]
    assert snapshot.market == "EUR Futures"
    assert snapshot.date == date(2024, 5, 14)
    assert snapshot.commercial_long == 1100
    assert snapshot.commercial_short == 750
    assert snapshot.noncommercial_long == 1300
    assert snapshot.noncommercial_short == 880


def test_cot_sync_job_upserts_payload():
    provider = DummyCotProvider()
    writer = MemoryWriter()
    job = CotReportSyncJob(provider=provider, writer=writer)

    count = job.run()

    assert count == 1
    row = writer.rows[0]
    assert row["market"] == "S&P Futures"
    assert row["commercialLong"] == 4000
    assert row["commercialShort"] == 2500
    assert row["noncommercialLong"] == 1800
    assert row["noncommercialShort"] == 2200
    assert row["date"] == date(2024, 5, 7)


class DummyCotProvider:
    def fetch(self):  # pragma: no cover - simple stub
        return [
            CotReportSnapshot(
                market="S&P Futures",
                commercial_long=4000,
                commercial_short=2500,
                noncommercial_long=1800,
                noncommercial_short=2200,
                date=date(2024, 5, 7),
            )
        ]
