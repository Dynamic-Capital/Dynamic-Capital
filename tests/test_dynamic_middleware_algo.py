"""Tests for the dynamic middleware orchestration helper."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic.trading.algo.middleware import (
    DynamicMiddlewareAlgo,
    MiddlewareContext,
    MiddlewareExecutionError,
)


def test_pipeline_runs_in_priority_order() -> None:
    algo = DynamicMiddlewareAlgo()
    execution_order: List[str] = []

    def low(ctx: MiddlewareContext, nxt) -> Any:
        execution_order.append("low")
        ctx.log("low")
        ctx.state.setdefault("sequence", []).append("low")
        return ctx.halt({"sequence": ctx.state["sequence"]})

    def high(ctx: MiddlewareContext, nxt) -> Any:
        execution_order.append("high")
        ctx.log("high")
        ctx.state.setdefault("sequence", []).append("high")
        result = nxt()
        execution_order.append("high:end")
        return result

    algo.register(low, name="low", priority=0)
    algo.register(high, name="high", priority=10)

    context = algo.execute({"payload": True}, state={"sequence": []})

    assert execution_order == ["high", "low", "high:end"]
    assert context.response == {"sequence": ["high", "low"]}
    assert context.logs == ["high", "low"]
    assert context.halted is True


def test_register_replace_and_unregister() -> None:
    algo = DynamicMiddlewareAlgo()

    def handler(ctx: MiddlewareContext, nxt) -> Any:
        return nxt()

    algo.register(handler, name="auth")

    with pytest.raises(ValueError):
        algo.register(handler, name="auth")

    algo.register(handler, name="auth", replace=True)
    assert algo.handlers() == ["auth"]

    assert algo.unregister("auth") is True
    assert algo.handlers() == []
    assert algo.unregister("auth") is False


def test_execute_captures_handler_errors() -> None:
    algo = DynamicMiddlewareAlgo()

    def boom(ctx: MiddlewareContext, nxt) -> Any:
        raise RuntimeError("database offline")

    algo.register(boom, name="fail")

    context = algo.execute({"payload": False})

    assert isinstance(context.error, RuntimeError)
    assert context.logs[-1] == "fail failed: database offline"
    assert context.state["errors"] == [{"name": "fail", "error": "database offline"}]

    with pytest.raises(MiddlewareExecutionError):
        algo.execute({"payload": False}, raise_errors=True)


def test_constructor_accepts_registration_tuples() -> None:
    execution_log: List[str] = []

    def first(ctx: MiddlewareContext, nxt) -> Any:
        execution_log.append("first")
        return nxt()

    def second(ctx: MiddlewareContext, nxt) -> Any:
        execution_log.append("second")
        ctx.halt({"done": True})
        return ctx.response

    algo = DynamicMiddlewareAlgo(
        [
            (first, {"priority": 1}),
            (second, {"name": "stopper", "priority": 5}),
        ]
    )

    context = algo.execute({"payload": True})

    assert context.response == {"done": True}
    assert execution_log == ["second"]
    assert algo.handlers() == ["stopper", "first"]


def test_auto_generates_unique_names_when_omitted() -> None:
    algo = DynamicMiddlewareAlgo()

    def handler_a(ctx: MiddlewareContext, nxt) -> Any:
        return nxt()

    def handler_b(ctx: MiddlewareContext, nxt) -> Any:
        return nxt()

    handler_a.__name__ = "duplicate"
    handler_b.__name__ = "duplicate"

    algo.register(handler_a)
    algo.register(handler_b)

    assert algo.handlers() == ["duplicate", "duplicate_2"]
