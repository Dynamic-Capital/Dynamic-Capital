"""Tests for dynamic_orderflow agents and helpers."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_orderflow import (  # noqa: E402
    OrderEvent,
    OrderFlowAgent,
    OrderFlowBot,
    OrderFlowBuilder,
    OrderFlowDirective,
    OrderFlowHelper,
)
from dynamic_orderflow.engine import _utcnow  # noqa: E402


def _event(symbol: str, side: str, size: float, price: float, *, seconds_ago: int = 0) -> OrderEvent:
    timestamp = _utcnow() - timedelta(seconds=seconds_ago)
    return OrderEvent(symbol=symbol, side=side, size=size, price=price, timestamp=timestamp)


def test_order_flow_helper_filters_and_ranks() -> None:
    helper = OrderFlowHelper(min_intensity=0.2, min_notional=100.0)

    builder = OrderFlowBuilder(horizon=30, max_samples=5)
    agent = OrderFlowAgent(builder=builder, helper=helper)
    agent.ingest(
        [
            _event("ES", "buy", 1.0, 4000.0, seconds_ago=5),
            _event("ES", "buy", 0.8, 4010.0, seconds_ago=3),
            _event("NQ", "sell", 0.5, 13000.0, seconds_ago=2),
            _event("CL", "buy", 0.1, 75.0, seconds_ago=1),
        ]
    )

    directives = agent.optimise(top_n=2)

    assert len(directives) == 2
    assert isinstance(directives[0], OrderFlowDirective)
    assert directives[0].symbol == "ES"
    assert directives[0].action == "accumulate"
    assert directives[0].confidence >= directives[1].confidence
    assert all(d.confidence >= 0.2 for d in directives)


def test_order_flow_bot_cycle_returns_plan_and_health() -> None:
    helper = OrderFlowHelper(min_intensity=0.1)
    builder = OrderFlowBuilder(horizon=60, max_samples=10)
    agent = OrderFlowAgent(builder=builder, helper=helper)
    bot = OrderFlowBot(agent=agent)

    events = [
        _event("GC", "sell", 0.3, 1900.0, seconds_ago=4),
        _event("GC", "sell", 0.2, 1895.0, seconds_ago=2),
        _event("SI", "buy", 1.2, 23.5, seconds_ago=3),
    ]

    snapshot = bot.cycle(events, top_n=1)

    assert "plan" in snapshot and "health" in snapshot
    assert isinstance(snapshot["plan"], list)
    assert snapshot["plan"]
    assert snapshot["plan"][0]["action"] in {"accumulate", "distribute", "observe"}
    assert snapshot["health"]["streams"]


def test_order_flow_bot_prioritise_respects_top_n() -> None:
    bot = OrderFlowBot()
    events = [
        _event("AAPL", "buy", 2.0, 100.0, seconds_ago=4),
        _event("MSFT", "sell", 1.5, 250.0, seconds_ago=3),
        _event("GOOG", "buy", 1.8, 120.0, seconds_ago=2),
    ]

    directives = bot.prioritise(events, top_n=2)
    assert len(directives) == 2
    assert all(isinstance(d, OrderFlowDirective) for d in directives)

    bot_empty = OrderFlowBot()
    directives_empty = bot_empty.prioritise([], top_n=2)
    assert directives_empty == ()
