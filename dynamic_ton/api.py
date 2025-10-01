"""JSON-style interface helpers for :mod:`dynamic_ton`.

The orchestration engine in :mod:`dynamic_ton.engine` focuses on the business
logic for evaluating liquidity posture and treasury risk.  External systems
frequently need to interact with that logic through JSON payloads (for
example, web hooks or background jobs orchestrated in JavaScript).  This module
provides a thin bridge that validates loosely-typed dictionaries and converts
them into the strongly-typed dataclasses used by the engine.

Two primary helpers are exposed:

``build_execution_plan``
    Accepts a JSON-like mapping describing the engine configuration together
    with liquidity, telemetry, and treasury snapshots.  The function returns a
    :class:`~dynamic_ton.engine.TonExecutionPlan` ready for downstream
    consumption.

``serialise_execution_plan``
    Converts a :class:`~dynamic_ton.engine.TonExecutionPlan` into a plain
    dictionary that can be serialised as JSON without losing relevant
    structure.  Keys are emitted in camelCase to match the conventions used by
    the TypeScript and Go services in this repository.

The helpers deliberately avoid accepting/returning :class:`typing.Any` and keep
the conversion logic explicit so that mistakes are surfaced as descriptive
``ValueError`` exceptions instead of failing silently.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Iterable

from .engine import (
    DynamicTonEngine,
    TonExecutionPlan,
    TonLiquidityPool,
    TonNetworkTelemetry,
    TonTreasuryPosture,
)

__all__ = [
    "build_execution_plan",
    "serialise_execution_plan",
]


def _coerce_mapping(value: Any, *, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{label} must be a mapping")
    return value


def _coerce_sequence(value: Any, *, label: str) -> Sequence[Any]:
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return value
    raise ValueError(f"{label} must be a sequence of mappings")


def _extract(data: Mapping[str, Any], *candidates: str, required: bool = True) -> Any:
    for key in candidates:
        if key in data:
            return data[key]
    if required:
        joined = ", ".join(candidates)
        raise ValueError(f"Missing required field(s): {joined}")
    return None


def _as_float(value: Any, *, field: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"{field} must be a number") from exc


def _as_int(value: Any, *, field: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"{field} must be an integer") from exc


def _build_pools(raw_pools: Iterable[Mapping[str, Any]]) -> list[TonLiquidityPool]:
    pools: list[TonLiquidityPool] = []
    for index, entry in enumerate(raw_pools, start=1):
        mapping = _coerce_mapping(entry, label=f"liquidity[{index}]")
        pools.append(
            TonLiquidityPool(
                venue=_extract(mapping, "venue"),
                pair=_extract(mapping, "pair"),
                ton_depth=_as_float(
                    _extract(mapping, "tonDepth", "ton_depth"), field="tonDepth"
                ),
                quote_depth=_as_float(
                    _extract(mapping, "quoteDepth", "quote_depth"), field="quoteDepth"
                ),
                utilisation=_as_float(
                    _extract(mapping, "utilisation", "utilization", required=False)
                    or 0.0,
                    field="utilisation",
                ),
            )
        )
    return pools


def _build_telemetry(mapping: Mapping[str, Any]) -> TonNetworkTelemetry:
    return TonNetworkTelemetry(
        ton_price_usd=_as_float(
            _extract(mapping, "tonPriceUsd", "ton_price_usd"), field="tonPriceUsd"
        ),
        bridge_latency_ms=_as_float(
            _extract(mapping, "bridgeLatencyMs", "bridge_latency_ms"),
            field="bridgeLatencyMs",
        ),
        settlement_backlog=_as_int(
            _extract(mapping, "settlementBacklog", "settlement_backlog", required=False)
            or 0,
            field="settlementBacklog",
        ),
        ton_inflow_24h=_as_float(
            _extract(mapping, "tonInflow24h", "ton_inflow_24h", required=False) or 0.0,
            field="tonInflow24h",
        ),
        ton_outflow_24h=_as_float(
            _extract(mapping, "tonOutflow24h", "ton_outflow_24h", required=False) or 0.0,
            field="tonOutflow24h",
        ),
    )


def _build_treasury(mapping: Mapping[str, Any]) -> TonTreasuryPosture:
    return TonTreasuryPosture(
        ton_reserve=_as_float(
            _extract(mapping, "tonReserve", "ton_reserve"), field="tonReserve"
        ),
        stable_reserve=_as_float(
            _extract(mapping, "stableReserve", "stable_reserve"), field="stableReserve"
        ),
        target_ton_ratio=_as_float(
            _extract(mapping, "targetTonRatio", "target_ton_ratio"), field="targetTonRatio"
        ),
        hedged_ratio=_as_float(
            _extract(mapping, "hedgedRatio", "hedged_ratio", required=False) or 0.0,
            field="hedgedRatio",
        ),
    )


def _build_engine(config: Mapping[str, Any] | None) -> DynamicTonEngine:
    if config is None:
        return DynamicTonEngine()
    mapping = _coerce_mapping(config, label="engine")
    kwargs: dict[str, float] = {}
    if (value := mapping.get("minTotalDepthTon")) is not None:
        kwargs["min_total_depth_ton"] = _as_float(value, field="minTotalDepthTon")
    if (value := mapping.get("maxBridgeLatencyMs")) is not None:
        kwargs["max_bridge_latency_ms"] = _as_float(value, field="maxBridgeLatencyMs")
    if (value := mapping.get("utilisationCeiling")) is not None:
        kwargs["utilisation_ceiling"] = _as_float(value, field="utilisationCeiling")
    if (value := mapping.get("ratioTolerance")) is not None:
        kwargs["ratio_tolerance"] = _as_float(value, field="ratioTolerance")
    return DynamicTonEngine(**kwargs)


def build_execution_plan(
    payload: Mapping[str, Any],
    *,
    engine: DynamicTonEngine | None = None,
) -> TonExecutionPlan:
    """Create a :class:`TonExecutionPlan` from a JSON-like mapping.

    Parameters
    ----------
    payload:
        Mapping containing ``liquidity``, ``telemetry``, and ``treasury``
        entries.  An optional ``engine`` configuration is honoured when
        ``engine`` is not supplied directly.
    engine:
        Optional :class:`DynamicTonEngine` instance.  When omitted, a new engine
        is constructed using ``payload['engine']`` as configuration.
    """

    mapping = _coerce_mapping(payload, label="payload")
    raw_liquidity = _coerce_sequence(_extract(mapping, "liquidity"), label="liquidity")
    liquidity = _build_pools(raw_liquidity)
    telemetry = _build_telemetry(_coerce_mapping(_extract(mapping, "telemetry"), label="telemetry"))
    treasury = _build_treasury(_coerce_mapping(_extract(mapping, "treasury"), label="treasury"))

    engine_instance = engine or _build_engine(mapping.get("engine"))
    return engine_instance.build_plan(
        liquidity=liquidity,
        telemetry=telemetry,
        treasury=treasury,
    )


def serialise_execution_plan(plan: TonExecutionPlan) -> dict[str, Any]:
    """Convert *plan* into a JSON-friendly mapping."""

    return {
        "actions": [
            {
                "category": action.category,
                "description": action.description,
                "priority": action.priority,
                "metadata": dict(action.metadata) if action.metadata is not None else {},
            }
            for action in plan.actions
        ],
        "alerts": list(plan.alerts),
        "tonAllocation": {key: float(amount) for key, amount in plan.ton_allocation.items()},
        "expectedTonRatio": plan.expected_ton_ratio,
        "commentary": plan.commentary,
        "hasHighPriorityActions": plan.has_high_priority_actions,
    }
