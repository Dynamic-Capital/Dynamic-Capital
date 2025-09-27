from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.api_keeper import (  # noqa: E402
    ApiEndpoint,
    DynamicAPIKeeperAlgorithm,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class DummyClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.prompts.append(prompt)
        return json.dumps(
            {
                "summary": "API keeper aligned",
                "actions": ["Investigate reporting latency"]
            }
        )


def test_api_keeper_sync_tracks_endpoints_and_risks() -> None:
    keeper = DynamicAPIKeeperAlgorithm()
    trading_api = ApiEndpoint(
        name="trading-api",
        method="post",
        path="/v1/trades",
        owner="Execution",
        version="2024-05-01",
        status="operational",
        tier="critical",
        priority=10,
        documentation_url="https://docs.dynamic.capital/apis/trading",
        description="Primary trade execution endpoint",
        consumers=("mobile", "partners"),
        tags=("core", "ton"),
    )
    keeper.register_endpoint(trading_api)
    keeper.register_schema("trading-api", {"version": "2024-05-01", "checksum": "abc123"})
    keeper.register_monitor(
        "trading-api",
        {
            "error_rate": 0.004,
            "error_budget": 0.01,
            "p95_latency_ms": 120,
            "latency_slo_ms": 200,
            "uptime": 99.95,
            "uptime_slo": 99.9,
        },
    )

    reporting_api = ApiEndpoint(
        name="reporting-api",
        method="GET",
        path="/v1/reports",
        owner="Analytics",
        version="2024-04-20",
        status="degraded",
        tier="standard",
        priority=6,
        description="Aggregated reporting endpoint",
    )

    dummy_client = DummyClient()
    config = LLMConfig(
        name="api-keeper-gpt",
        client=dummy_client,
        temperature=0.15,
        nucleus_p=0.9,
        max_tokens=256,
    )

    as_of = datetime(2024, 5, 2, 8, 30, tzinfo=timezone.utc)
    result = keeper.sync(
        as_of=as_of,
        endpoints=(reporting_api,),
        schemas={"reporting-api": {"version": "2024-04-20"}},
        monitors={
            "reporting-api": {
                "error_rate": 0.08,
                "error_budget": 0.02,
                "p95_latency_ms": 450,
                "latency_slo_ms": 300,
                "uptime": 99.1,
                "uptime_slo": 99.5,
            }
        },
        alerts=(
            {"endpoint": "reporting-api", "title": "Latency SLO breach", "severity": "critical"},
        ),
        status_overrides={"reporting-api": "outage"},
        llm_configs=(config,),
        theme="API resilience",
        context={"notes": ["Coordinate with analytics squad"]},
    )

    assert result.timestamp == as_of
    assert result.theme == "API resilience"
    assert len(result.endpoints) == 2

    trading_payload = next(endpoint for endpoint in result.endpoints if endpoint["name"] == "trading-api")
    assert trading_payload["monitor"]["error_rate"] == 0.004
    assert trading_payload["schema"]["checksum"] == "abc123"

    reporting_payload = next(endpoint for endpoint in result.endpoints if endpoint["name"] == "reporting-api")
    assert reporting_payload["status"] == "outage"
    assert reporting_payload["monitor"]["p95_latency_ms"] == 450

    assert any(risk["issue"] == "error_budget_exceeded" for risk in result.risks)
    assert any(risk["issue"] == "latency_slo_breach" for risk in result.risks)
    assert any(risk["issue"] == "uptime_slo_breach" for risk in result.risks)
    assert any(risk["issue"] == "status_alert" and risk["endpoint"] == "reporting-api" for risk in result.risks)
    assert any(risk["issue"] == "critical_alert" for risk in result.risks)

    assert result.llm_runs and result.llm_runs[0].name == "api-keeper-gpt"
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]
    assert "API resilience" in result.metadata["prompt"]
    assert "Latency SLO breach" in result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["timestamp"] == as_of.isoformat()
    assert payload["summary"].startswith("2 endpoints")
    assert payload["metadata"]["prompt"] == result.metadata["prompt"]


def test_api_keeper_requires_endpoints() -> None:
    keeper = DynamicAPIKeeperAlgorithm()
    with pytest.raises(ValueError):
        keeper.sync()

