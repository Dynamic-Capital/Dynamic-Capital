from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.backend_keeper import (  # noqa: E402
    BackendService,
    DynamicBackendKeeperAlgorithm,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class DummyClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.prompts.append(prompt)
        return json.dumps(
            {
                "summary": "Backend keeper synced",
                "actions": ["Escalate auth-gateway rollout"],
            }
        )


def test_backend_keeper_sync_tracks_services_and_incidents() -> None:
    keeper = DynamicBackendKeeperAlgorithm()
    core_api = BackendService(
        name="core-api",
        owner="CoreApps",
        status="operational",
        runtime="Node.js",
        tier="critical",
        priority=10,
        endpoints=("/v1/core",),
        tags=("core", "graphql"),
    )
    keeper.register_service(core_api)
    keeper.register_dependency("core-api", ("auth-gateway", "metrics-service"))
    keeper.register_deployment("core-api", {"version": "2024.05.01", "env": "production"})

    risk_engine = BackendService(
        name="risk-engine",
        owner="QuantOps",
        status="operational",
        runtime="Python",
        priority=8,
        endpoints=("/jobs/risk",),
    )
    data_pipeline = BackendService(
        name="data-pipeline",
        owner="DataOps",
        status="operational",
        runtime="Go",
        priority=7,
        endpoints=("/streams/market",),
    )

    dummy_client = DummyClient()
    config = LLMConfig(
        name="backend-keeper-gpt",
        client=dummy_client,
        temperature=0.25,
        nucleus_p=0.85,
        max_tokens=256,
    )

    as_of = datetime(2024, 5, 1, 12, 45, tzinfo=timezone.utc)
    result = keeper.sync(
        as_of=as_of,
        services=(risk_engine, data_pipeline),
        dependencies={"risk-engine": ("core-api", "auth-db")},
        incidents=(
            {"service": "auth-gateway", "title": "Auth gateway latency spike", "severity": "critical"},
        ),
        deployments={"risk-engine": {"version": "2024.05.01-beta", "env": "staging"}},
        status_overrides={"risk-engine": "degraded"},
        llm_configs=(config,),
        theme="Backend resilience",
        context={"notes": ["Monitor auth dependencies"]},
    )

    assert result.timestamp == as_of
    assert result.theme == "Backend resilience"
    assert len(result.services) == 3

    risk_payload = next(service for service in result.services if service["name"] == "risk-engine")
    assert risk_payload["status"] == "degraded"
    assert risk_payload["deployment"]["version"] == "2024.05.01-beta"

    core_payload = next(service for service in result.services if service["name"] == "core-api")
    assert core_payload["deployment"]["version"] == "2024.05.01"

    dependency_entry = next(dep for dep in result.dependencies if dep["service"] == "risk-engine")
    assert "auth-db" in dependency_entry["missing"]

    assert any(risk["issue"] == "missing_dependency" for risk in result.risks)
    assert any(risk["issue"] == "status_alert" and risk["service"] == "risk-engine" for risk in result.risks)
    assert any(risk["issue"] == "critical_incident" for risk in result.risks)

    assert result.llm_runs and result.llm_runs[0].name == "backend-keeper-gpt"
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]
    assert "Backend resilience" in result.metadata["prompt"]
    assert "auth-gateway" in result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["timestamp"] == as_of.isoformat()
    assert payload["summary"].startswith("3 services")
    assert payload["metadata"]["prompt"] == result.metadata["prompt"]


def test_backend_keeper_requires_services() -> None:
    keeper = DynamicBackendKeeperAlgorithm()
    with pytest.raises(ValueError):
        keeper.sync()
