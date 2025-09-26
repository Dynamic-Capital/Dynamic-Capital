from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.route_keeper import (  # noqa: E402
    Route,
    RouteKeeperAlgorithm,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class DummyClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.prompts.append(prompt)
        return json.dumps(
            {
                "summary": "Routes aligned",
                "actions": ["Confirm risk bridge"]
            }
        )


def test_route_keeper_sync_manages_routes_and_conflicts() -> None:
    keeper = RouteKeeperAlgorithm()
    fx_route = Route(
        name="fx-core",
        entrypoint="market_advisory.scan",
        exitpoint="core_orchestration.deploy",
        description="Primary FX execution route",
        algorithms=("market_advisory",),
        tags=("fx", "core"),
        status="active",
        priority=10,
    )
    keeper.register_route(fx_route)
    keeper.register_link("fx-core", ("risk-bridge",))

    risk_route = Route(
        name="risk-bridge",
        entrypoint="risk_engine.prepare",
        exitpoint="market_risk.alerts",
        description="Bridge risk telemetry into market alerts",
        algorithms=("risk_manager",),
        status="standby",
    )
    orphan_route = Route(
        name="dead-end",
        entrypoint="ops.queue",
        exitpoint="ops.archive",
        description="Legacy operations route awaiting decommission",
        status="active",
    )

    dummy_client = DummyClient()
    config = LLMConfig(
        name="route-keeper-gpt",
        client=dummy_client,
        temperature=0.2,
        nucleus_p=0.9,
        max_tokens=256,
    )

    as_of = datetime(2024, 4, 5, 15, 30, tzinfo=timezone.utc)
    result = keeper.sync(
        as_of=as_of,
        routes=(risk_route, orphan_route),
        dependencies={"risk-bridge": ("dead-end",)},
        status_overrides={"risk-bridge": "active"},
        algorithm_routes={
            "core_orchestration": ("fx-core", "risk-bridge"),
            "time_keeper": ("fx-core",),
        },
        llm_configs=(config,),
        theme="Route harmonisation",
        context={"notes": ["Check risk coverage"]},
    )

    assert result.timestamp == as_of
    assert result.theme == "Route harmonisation"
    assert result.algorithms == (
        "core_orchestration",
        "market_advisory",
        "risk_manager",
        "time_keeper",
    )

    fx_payload = next(route for route in result.routes if route["name"] == "fx-core")
    assert fx_payload["status"] == "active"
    assert fx_payload["algorithms"] == [
        "core_orchestration",
        "market_advisory",
        "time_keeper",
    ]

    risk_payload = next(route for route in result.routes if route["name"] == "risk-bridge")
    assert risk_payload["status"] == "active"
    assert "risk_manager" in risk_payload["algorithms"]

    assert any(conflict["route"] == "dead-end" for conflict in result.conflicts)
    assert any(dep["route"] == "fx-core" for dep in result.dependencies)

    assert result.llm_runs and result.llm_runs[0].name == "route-keeper-gpt"
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]
    assert "Route harmonisation" in result.metadata["prompt"]
    assert "dead-end" in result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["timestamp"] == as_of.isoformat()
    assert payload["summary"].startswith("3 routes")
    assert payload["metadata"]["prompt"] == result.metadata["prompt"]


def test_route_keeper_requires_routes() -> None:
    keeper = RouteKeeperAlgorithm()
    with pytest.raises(ValueError):
        keeper.sync()
