"""Tests for the dynamic node orchestration helper."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic.trading.algo.dynamic_nodes import (
    DynamicNode,
    DynamicNodeRegistry,
    NodeConfigError,
    NodeDependencyError,
)


def _ts(minutes: int) -> datetime:
    return datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def test_dynamic_node_normalises_configuration() -> None:
    node = DynamicNode(
        node_id="  Fusion  ",
        type="Processing",
        interval_sec=60,
        dependencies=[" ticks ", "ticks"],
        outputs=[" Signals ", "signals"],
        metadata={"source": "fusion"},
        weight="0.8",
    )

    assert node.node_id == "Fusion"
    assert node.type == "processing"
    assert node.dependencies == ("ticks",)
    assert node.outputs == ("Signals", "signals")
    assert node.metadata == {"source": "fusion"}
    assert node.weight == pytest.approx(0.8)


def test_dynamic_node_due_respects_interval_and_enablement() -> None:
    node = DynamicNode(node_id="collector", type="ingestion", interval_sec=30)

    assert node.is_due(now=_ts(0)) is True

    node.enabled = False
    assert node.is_due(now=_ts(10)) is False

    node.enabled = True
    node.mark_run(completed_at=_ts(0))
    assert node.is_due(now=_ts(0)) is False
    assert node.is_due(now=_ts(0) + timedelta(seconds=20)) is False
    assert node.is_due(now=_ts(0) + timedelta(seconds=30)) is True


def test_registry_resolves_dependency_order_with_weights() -> None:
    registry = DynamicNodeRegistry(
        [
            {
                "node_id": "market-data",
                "type": "ingestion",
                "interval_sec": 30,
                "outputs": ["ticks"],
            },
            {
                "node_id": "fusion",
                "type": "processing",
                "interval_sec": 60,
                "dependencies": ["ticks"],
                "outputs": ["signals"],
                "weight": 0.9,
            },
            {
                "node_id": "policy",
                "type": "policy",
                "interval_sec": 60,
                "dependencies": ["signals"],
                "weight": 0.4,
            },
        ]
    )

    ready = registry.resolve_ready_nodes(available_outputs=["telemetry"])

    assert [node.node_id for node in ready] == ["market-data", "fusion", "policy"]


def test_registry_skips_nodes_not_due() -> None:
    registry = DynamicNodeRegistry(
        [
            {
                "node_id": "market-data",
                "type": "ingestion",
                "interval_sec": 60,
                "outputs": ["ticks"],
            },
            {
                "node_id": "fusion",
                "type": "processing",
                "interval_sec": 60,
                "dependencies": ["ticks"],
                "outputs": ["signals"],
            },
        ]
    )

    registry.record_result("market-data", completed_at=_ts(0), outputs=["ticks"])

    ready = registry.resolve_ready_nodes(now=_ts(0) + timedelta(seconds=30))
    assert [node.node_id for node in ready] == []

    ready = registry.resolve_ready_nodes(now=_ts(1) + timedelta(seconds=5))
    assert [node.node_id for node in ready] == ["market-data", "fusion"]


def test_registry_enable_all_nodes() -> None:
    registry = DynamicNodeRegistry(
        [
            {
                "node_id": "market-data",
                "type": "ingestion",
                "interval_sec": 60,
                "outputs": ["ticks"],
            },
            {
                "node_id": "fusion",
                "type": "processing",
                "interval_sec": 60,
                "dependencies": ["ticks"],
                "outputs": ["signals"],
            },
        ]
    )

    registry.get("market-data").enabled = False
    registry.get("fusion").enabled = False

    snapshot = registry.enable_all()

    assert all(node.enabled for node in snapshot)


def test_registry_detects_dependency_cycles() -> None:
    registry = DynamicNodeRegistry(
        [
            {
                "node_id": "a",
                "type": "processing",
                "interval_sec": 30,
                "dependencies": ["gamma"],
                "outputs": ["alpha"],
            },
            {
                "node_id": "b",
                "type": "processing",
                "interval_sec": 30,
                "dependencies": ["alpha"],
                "outputs": ["beta"],
            },
            {
                "node_id": "c",
                "type": "processing",
                "interval_sec": 30,
                "dependencies": ["beta"],
                "outputs": ["gamma"],
            },
        ]
    )

    with pytest.raises(NodeDependencyError) as exc:
        registry.resolve_ready_nodes()

    assert "Cyclical" in str(exc.value)


def test_record_result_updates_runtime_state() -> None:
    registry = DynamicNodeRegistry(
        [
            {
                "node_id": "human-analysis",
                "type": "processing",
                "interval_sec": 21600,
                "outputs": ["fusion"],
            }
        ]
    )

    node = registry.record_result(
        "human-analysis",
        completed_at=_ts(0),
        status="success",
        outputs=["fusion"],
    )

    assert node.last_run_at == _ts(0)
    assert node.last_status == "success"
    assert node.last_outputs == ("fusion",)


def test_invalid_configuration_raises() -> None:
    with pytest.raises(NodeConfigError):
        DynamicNode(node_id="", type="processing", interval_sec=0)
