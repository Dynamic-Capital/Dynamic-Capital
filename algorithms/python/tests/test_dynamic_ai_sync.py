from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Sequence

from algorithms.python.dynamic_ai_sync import AlgorithmSyncAdapter, DynamicAISynchroniser
from algorithms.python.multi_llm import LLMConfig


class StubClient:
    def __init__(self, responses: Sequence[str]) -> None:
        self.responses = list(responses)
        self.calls: list[Dict[str, Any]] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self.responses:
            raise RuntimeError("No responses queued")
        return self.responses.pop(0)


def _config(client: StubClient) -> LLMConfig:
    return LLMConfig(name="stub", client=client, temperature=0.1, nucleus_p=0.9, max_tokens=512)


def test_synchroniser_compiles_results_and_summary() -> None:
    def run_orders(context: Mapping[str, Any]) -> Mapping[str, Any]:
        assert context["environment"] == "staging"
        return {"orders_synced": 5, "latency_ms": 120}

    @dataclass
    class InventorySnapshot:
        items: int
        stale: int

        def to_dict(self) -> Dict[str, Any]:
            return {"items": self.items, "stale": self.stale}

    def run_inventory(context: Mapping[str, Any]) -> InventorySnapshot:
        return InventorySnapshot(items=42, stale=2)

    summary_payload = {
        "summary": "Dynamic AI confirms all sync jobs are healthy.",
        "actions": ["Schedule nightly replay"],
        "risks": ["Latency creeping on orders"],
        "opportunities": ["Expand coverage to indices"],
        "recommendations": ["Enable advanced telemetry"],
        "alerts": ["Review stale inventory"],
    }
    client = StubClient([json.dumps(summary_payload)])

    synchroniser = DynamicAISynchroniser(
        algorithms=[
            AlgorithmSyncAdapter(name="orders", runner=run_orders, description="Order bridge"),
            AlgorithmSyncAdapter(name="inventory", runner=run_inventory, tags=("supabase",)),
        ],
        llm_configs=[_config(client)],
    )

    report = synchroniser.sync_all(context={"environment": "staging"}, notes=["Cycle check"])

    assert len(report.results) == 2
    assert all(result.status == "success" for result in report.results)
    assert report.prompt_payload["notes"] == ["Cycle check"]
    assert report.prompt_payload["algorithms"][0]["payload"]["orders_synced"] == 5
    assert report.prompt_payload["algorithms"][1]["payload"]["items"] == 42
    assert report.summary is not None
    assert report.summary.summary == "Dynamic AI confirms all sync jobs are healthy."
    assert report.summary.actions == ["Schedule nightly replay"]
    assert report.summary.alerts == ["Review stale inventory"]
    assert report.status_counts == {"success": 2, "error": 0}
    assert report.llm_runs and report.llm_runs[0].name == "stub"
    assert client.calls and "Telemetry" in client.calls[0]["prompt"]


def test_synchroniser_handles_errors_and_textual_summary() -> None:
    def failing_sync(context: Mapping[str, Any]) -> Mapping[str, Any]:  # pragma: no cover - executed in test
        raise RuntimeError("upstream failure")

    def metrics_sync(context: Mapping[str, Any]) -> Mapping[str, Any]:
        return {"members_synced": 7}

    client = StubClient(["Narrative summary without JSON"])

    synchroniser = DynamicAISynchroniser(
        algorithms=[
            AlgorithmSyncAdapter(name="failing", runner=failing_sync),
            AlgorithmSyncAdapter(name="metrics", runner=metrics_sync),
        ],
        llm_configs=[_config(client)],
    )

    report = synchroniser.sync_all()

    assert len(report.results) == 2
    assert report.results[0].status == "error"
    assert report.results[0].error == "upstream failure"
    assert report.results[1].payload["members_synced"] == 7
    assert report.summary is not None
    assert report.summary.summary == "Narrative summary without JSON"
    assert report.summary.actions == []
    assert report.status_counts == {"success": 1, "error": 1}

