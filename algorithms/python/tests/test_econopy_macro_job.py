from __future__ import annotations

from datetime import datetime, timezone

from typing import Any, Mapping

import pytest

from algorithms.python.jobs import econopy_macro_job as job


def _writer_capture(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    captured: dict[str, Any] = {}

    class DummyWriter:
        def __init__(self, *, table: str, conflict_column: str, **_: object) -> None:
            captured["table"] = table
            captured["conflict_column"] = conflict_column

        def upsert(self, rows: list[dict[str, object]]) -> int:
            captured["rows"] = rows
            return len(rows)

    monkeypatch.setattr(job, "SupabaseTableWriter", DummyWriter)  # type: ignore[arg-type]
    return captured


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

    captured = _writer_capture(monkeypatch)

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
    assert row["source_metadata"]["provider"] == "econopy"
    assert row["source_metadata"]["indicator_code"] == "CPI"


def test_sync_macro_series_fallbacks_between_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _writer_capture(monkeypatch)

    class FailingProvider:
        name = "fred"

        def fetch(self, **_: object) -> job._MacroPoint | None:
            raise job.ProviderConfigurationError("missing api key")

    class PassingProvider:
        name = "world_bank"

        def fetch(self, **_: object) -> job._MacroPoint | None:
            return job._MacroPoint(
                indicator="GDP",
                region="US",
                actual=21.4,
                forecast=None,
                previous=None,
                unit="USD",
                released_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                source="world_bank",
                source_metadata={"provider": "world_bank", "indicator_code": "NY.GDP.MKTP.CD"},
            )

    count = job.sync_econopy_macro_series(
        indicators=["GDP"],
        region="US",
        indicator_sources={"GDP": ["fred", "world_bank"]},
        provider_overrides={"fred": FailingProvider(), "world_bank": PassingProvider()},
    )

    assert count == 1
    rows = captured["rows"]
    assert rows[0]["source"] == "world_bank"
    assert rows[0]["source_metadata"]["provider"] == "world_bank"


def test_fred_adapter_normalises_units() -> None:
    seen: dict[str, Any] = {}

    def fake_fetch(url: str, params: Mapping[str, str] | None, headers: Mapping[str, str] | None) -> Mapping[str, object]:
        seen["url"] = url
        seen["params"] = params
        return {
            "frequency": "M",
            "units": "Percent",
            "units_short": "pct",
            "observations": [
                {"value": "2.1", "date": "2024-05-01"},
            ],
        }

    adapter = job._FredAdapter(api_key="token", fetch_json=fake_fetch)
    point = adapter.fetch(indicator="CPI", region="US", code="CPIAUCSL")
    assert point is not None
    assert point.actual == pytest.approx(2.1)
    assert point.unit == "pct"
    assert point.source_metadata["series_id"] == "CPIAUCSL"
    assert "series/observations" in seen["url"]
    assert seen["params"]["api_key"] == "token"


def test_world_bank_adapter_handles_series() -> None:
    response = [
        {"source": {"value": "World Development Indicators"}, "unit": "USD", "lastupdated": "2023-12-15"},
        [
            {
                "date": "2022",
                "value": 20.1,
                "countryiso3code": "USA",
                "indicator": {"id": "NY.GDP.MKTP.CD"},
            },
            {
                "date": "2023",
                "value": 21.4,
                "countryiso3code": "USA",
                "indicator": {"id": "NY.GDP.MKTP.CD"},
            },
        ],
    ]

    adapter = job._WorldBankAdapter(fetch_json=lambda *_, **__: response)  # type: ignore[arg-type]
    point = adapter.fetch(indicator="GDP", region="US", code="NY.GDP.MKTP.CD")
    assert point is not None
    assert point.actual == pytest.approx(21.4)
    assert point.region == "USA"
    assert point.source_metadata["indicator_id"] == "NY.GDP.MKTP.CD"


def test_oecd_adapter_requires_time_dimension(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_fetch(url: str, *_: object, **__: object) -> Mapping[str, object]:
        assert url.endswith("dataset/path")
        return {
            "dataSets": [
                {
                    "observations": {
                        "0:0": [1.2],
                    }
                }
            ],
            "structure": {
                "dimensions": {
                    "observation": [
                        {"id": "TIME_PERIOD", "values": [{"id": "2023"}]}
                    ]
                }
            },
        }

    adapter = job._OECDAdapter(fetch_json=fake_fetch)
    point = adapter.fetch(indicator="CLI", region="US", code="dataset/path")
    assert point is not None
    assert point.actual == pytest.approx(1.2)
    assert point.source_metadata["path"] == "dataset/path"


def test_trading_economics_adapter_requires_credentials() -> None:
    adapter = job._TradingEconomicsAdapter(fetch_json=lambda *_: [])
    with pytest.raises(job.ProviderConfigurationError):
        adapter.fetch(indicator="CPI", region="US")


def test_trading_economics_adapter_parses_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    adapter = job._TradingEconomicsAdapter(
        client_id="id",
        client_secret="secret",
        fetch_json=lambda *_: [
            {
                "LatestValue": 3.4,
                "LatestValueDate": "2024-05-01T00:00:00Z",
                "PreviousValue": 3.1,
                "LatestValueForecast": 3.5,
                "Unit": "pct",
                "Country": "United States",
                "Category": "Inflation Rate",
                "HistoricalDataSymbol": "USCPI",
            }
        ],
    )

    point = adapter.fetch(indicator="CPI", region="US", code="CPI")
    assert point is not None
    assert point.actual == pytest.approx(3.4)
    assert point.previous == pytest.approx(3.1)
    assert point.source_metadata["symbol"] == "USCPI"


def test_trading_economics_adapter_falls_back_to_legacy_endpoint() -> None:
    calls: list[str] = []

    def fake_fetch(url: str, *_: object, **__: object) -> list[Mapping[str, object]]:
        calls.append(url)
        if len(calls) == 1:
            return []
        return [
            {
                "Value": 2.1,
                "Date": "2024-06-01T00:00:00Z",
                "Country": "United States",
                "Category": "Inflation Rate",
                "HistoricalDataSymbol": "USIRATE",
            }
        ]

    adapter = job._TradingEconomicsAdapter(
        client_id="id",
        client_secret="secret",
        fetch_json=fake_fetch,
    )

    point = adapter.fetch(indicator="Inflation Rate", region="United States")

    assert len(calls) == 2
    assert calls[0].endswith("indicators/country/United%20States/Inflation%20Rate")
    assert calls[1].endswith("indicators/Inflation%20Rate/United%20States")
    assert point is not None
    assert point.actual == pytest.approx(2.1)
    assert point.source_metadata["endpoint_path"] == "indicators/Inflation%20Rate/United%20States"

