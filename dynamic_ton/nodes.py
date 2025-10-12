"""Dynamic node presets tailored for TON infrastructure operations.

The TON ecosystem spans on-chain telemetry, DEX liquidity, and treasury
execution pipelines. Automation stacks interacting with these surfaces often
reuse the same scheduling patterns:

* High-frequency ingestion that snapshots validator/node health.
* Liquidity monitors that reconcile pool depth and bridge latency.
* Feature engineering pipelines that turn raw telemetry into modelling inputs.
* Policy engines that translate model output into treasury or liquidity tasks.

This module packages those recurring configurations as default node definitions
so schedulers can bootstrap a
:class:`~dynamic.trading.algo.dynamic_nodes.DynamicNodeRegistry` without copying
boilerplate. The registry stays fully compatible with the broader dynamic node
framework used across the repository.
"""

from __future__ import annotations

from itertools import chain
from typing import Iterable, Mapping

from dynamic.trading.algo.dynamic_nodes import DynamicNode, DynamicNodeRegistry

TonNodeConfig = Mapping[str, object]

DEFAULT_TON_NODE_CONFIGS: tuple[TonNodeConfig, ...] = (
    {
        "node_id": "ton-network-health",
        "type": "ingestion",
        "interval_sec": 120,
        "dependencies": (),
        "outputs": ("ton_network_metrics",),
        "metadata": {
            "description": "Poll validator RPC endpoints for block lag, peers, and resource telemetry.",
            "dashboards": ("grafana:TON/Node", "grafana:TON/Storage"),
            "alert_routes": ("pagerduty:on-call", "slack:#ton-ops"),
        },
        "weight": 0.6,
    },
    {
        "node_id": "ton-liquidity-ingestion",
        "type": "ingestion",
        "interval_sec": 300,
        "dependencies": ("ton_network_metrics",),
        "outputs": ("ton_liquidity_curves",),
        "metadata": {
            "description": "Ingest DEX pool depth and fee telemetry from STON.fi, DeDust, and swap.coffee.",
            "venues": ("stonfi", "dedust", "swap.coffee"),
        },
        "weight": 0.5,
    },
    {
        "node_id": "ton-wallet-audit",
        "type": "processing",
        "interval_sec": 600,
        "dependencies": ("ton_network_metrics",),
        "outputs": ("ton_wallet_balances",),
        "metadata": {
            "description": "Reconcile treasury and operations wallets against Supabase tx logs.",
            "supabase_tables": ("tx_logs", "wallet_limits"),
        },
        "weight": 0.4,
    },
    {
        "node_id": "ton-feature-engineer",
        "type": "processing",
        "interval_sec": 900,
        "dependencies": (
            "ton_liquidity_curves",
            "ton_network_metrics",
            "ton_wallet_balances",
        ),
        "outputs": ("ton_feature_windows",),
        "metadata": {
            "description": "Transform raw TON telemetry into modelling features and rolling aggregates.",
            "feature_windows": ("1h", "6h", "24h"),
        },
        "weight": 0.7,
    },
    {
        "node_id": "ton-execution-planner",
        "type": "policy",
        "interval_sec": 600,
        "dependencies": ("ton_feature_windows",),
        "outputs": ("ton_execution_actions", "ton_alerts"),
        "metadata": {
            "description": "Run DynamicTonEngine to propose liquidity and treasury actions.",
            "playbooks": ("docs/ton-node-monitoring.md", "docs/ton-infrastructure-config.md"),
        },
        "weight": 0.9,
    },
    {
        "node_id": "ton-ops-briefing",
        "type": "community",
        "interval_sec": 3600,
        "dependencies": ("ton_execution_actions", "ton_alerts"),
        "outputs": ("ton_ops_digest",),
        "metadata": {
            "description": "Summarise TON actions and alerts for operations handovers.",
            "channels": ("notion:runbook", "slack:#ops-daily"),
        },
        "weight": 0.3,
    },
)


def build_ton_node_registry(
    additional_nodes: Iterable[DynamicNode | TonNodeConfig] | None = None,
    *,
    include_defaults: bool = True,
) -> DynamicNodeRegistry:
    """Create a :class:`DynamicNodeRegistry` seeded with TON-centric nodes."""

    default_nodes: Iterable[DynamicNode | TonNodeConfig]
    if include_defaults:
        default_nodes = DEFAULT_TON_NODE_CONFIGS
    else:
        default_nodes = ()

    if additional_nodes is None:
        nodes = default_nodes
    else:
        nodes = chain(default_nodes, additional_nodes)

    if not include_defaults and additional_nodes is None:
        return DynamicNodeRegistry()

    return DynamicNodeRegistry(nodes)


__all__ = [
    "DEFAULT_TON_NODE_CONFIGS",
    "TonNodeConfig",
    "build_ton_node_registry",
]
