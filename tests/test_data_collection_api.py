from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from integrations.data_collection_api import (
    DataCollectionAPI,
    bootstrap_data_collection_api,
    serialise_for_collection,
)


@dataclass
class SampleDataclass:
    value: int
    when: datetime


def test_serialise_for_collection_handles_dataclasses() -> None:
    payload = SampleDataclass(value=7, when=datetime(2024, 1, 2, tzinfo=timezone.utc))

    serialised = serialise_for_collection(payload)

    assert isinstance(serialised, dict)
    assert serialised["value"] == 7
    assert serialised["when"].endswith("+00:00")


class DummyResponse:
    def __init__(self, *, ok: bool = True, status_code: int = 201, payload: dict[str, object] | None = None) -> None:
        self.ok = ok
        self.status_code = status_code
        self._payload = payload or {"status": "accepted"}
        self.reason = "Created"

    def json(self) -> dict[str, object]:
        return dict(self._payload)


class DummySession:
    def __init__(self, response: DummyResponse | None = None) -> None:
        self.requests: list[SimpleNamespace] = []
        self._response = response or DummyResponse()

    def request(self, method: str, url: str, json: dict[str, object], headers: dict[str, str], timeout: float) -> DummyResponse:
        self.requests.append(
            SimpleNamespace(method=method, url=url, json=json, headers=headers, timeout=timeout)
        )
        return self._response


def test_record_trade_serialises_payload() -> None:
    session = DummySession()
    api = DataCollectionAPI("https://collector.test/api", session=session, dataset="unit-tests")

    payload = {
        "trade": {
            "ticket": 42,
            "executed_at": datetime(2024, 3, 14, 15, 9, tzinfo=timezone.utc),
        },
        "tags": {"source": "unit"},
    }

    response = api.record_trade(payload)

    assert response["status"] == "accepted"
    assert len(session.requests) == 1
    request = session.requests[0]
    assert request.method == "POST"
    assert request.url == "https://collector.test/api/trades"
    assert request.json["dataset"] == "unit-tests"
    assert request.json["trade"]["executed_at"].endswith("+00:00")
    assert request.json["captured_at"].endswith("+00:00")


def test_bootstrap_data_collection_api(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATA_COLLECTION_API_URL", "https://collector.test")
    monkeypatch.setenv("DATA_COLLECTION_API_KEY", "secret")
    monkeypatch.setenv("DATA_COLLECTION_MAX_ATTEMPTS", "3")
    monkeypatch.setenv("DATA_COLLECTION_RETRY_BACKOFF", "0.25")

    captured: dict[str, object] = {}

    class DummyCollector(DataCollectionAPI):
        def __init__(self, base_url: str, **kwargs: object) -> None:  # type: ignore[override]
            captured["base_url"] = base_url
            captured["kwargs"] = kwargs
            self.base_url = base_url
            # do not call super().__init__ to avoid session bootstrap

    monkeypatch.setattr("integrations.data_collection_api.DataCollectionAPI", DummyCollector)

    collector = bootstrap_data_collection_api()

    assert isinstance(collector, DummyCollector)
    assert captured["base_url"] == "https://collector.test"
    assert captured["kwargs"]["api_key"] == "secret"
    assert captured["kwargs"]["max_attempts"] == 3
    assert captured["kwargs"]["retry_backoff"] == pytest.approx(0.25)


def test_data_collection_api_retries_transient_failures() -> None:
    class FlakySession:
        def __init__(self) -> None:
            self.calls: list[str] = []

        def request(
            self,
            method: str,
            url: str,
            *,
            json: dict[str, object],
            headers: dict[str, str],
            timeout: float,
        ) -> DummyResponse:
            self.calls.append(url)
            if len(self.calls) == 1:
                raise RuntimeError("collector unavailable")
            return DummyResponse(status_code=200, payload={"status": "accepted"})

    session = FlakySession()
    api = DataCollectionAPI(
        "https://collector.test/api",
        session=session,
        max_attempts=2,
        retry_backoff=0.0,
    )

    result = api.record_telemetry({"metric": 42})

    assert len(session.calls) == 2
    assert result["status"] == "accepted"
