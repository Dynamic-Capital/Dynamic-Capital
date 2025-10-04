from __future__ import annotations

from typing import Iterable

from dynamic_ton.nodes import DEFAULT_TON_NODE_CONFIGS, build_ton_node_registry


def test_default_configs_cover_key_ton_workstreams() -> None:
    node_ids = {config["node_id"] for config in DEFAULT_TON_NODE_CONFIGS}
    assert {
        "ton-network-health",
        "ton-liquidity-ingestion",
        "ton-wallet-audit",
        "ton-feature-engineer",
        "ton-execution-planner",
        "ton-ops-briefing",
    } <= node_ids

    for config in DEFAULT_TON_NODE_CONFIGS:
        assert config["interval_sec"] > 0
        assert isinstance(config["outputs"], tuple)


def test_registry_includes_defaults_and_custom_nodes() -> None:
    registry = build_ton_node_registry(
        [
            {
                "node_id": "ton-backfill-replay",
                "type": "processing",
                "interval_sec": 1800,
                "dependencies": ("ton_feature_windows",),
                "outputs": ("ton_backfill_jobs",),
            }
        ]
    )

    snapshot = registry.snapshot()
    node_ids = {node.node_id for node in snapshot}
    assert "ton-execution-planner" in node_ids
    assert "ton-backfill-replay" in node_ids


def test_registry_can_skip_defaults() -> None:
    registry = build_ton_node_registry(include_defaults=False)
    assert registry.snapshot() == ()


def test_registry_accepts_iterators_without_materialising() -> None:
    def generator() -> Iterable[dict[str, object]]:
        yield {
            "node_id": "ton-once-off",  # back-to-back generators should not be consumed eagerly
            "type": "processing",
            "interval_sec": 60,
            "outputs": ("ton_once_output",),
        }

    registry = build_ton_node_registry(generator(), include_defaults=False)
    snapshot = registry.snapshot()

    assert len(snapshot) == 1
    assert snapshot[0].node_id == "ton-once-off"
