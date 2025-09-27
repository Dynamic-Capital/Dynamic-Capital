from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Sequence

from algorithms.python.dynamic_ai_sync import (
    AlgorithmSyncAdapter,
    DynamicAISynchroniser,
    dynamic_algo_sync_adapter,
    run_dynamic_algo_alignment,
)
from algorithms.python.multi_llm import LLMConfig
from dynamic_algo.trading_core import SUCCESS_RETCODE, TradeExecutionResult
from dynamic_token.treasury import TreasuryEvent


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


def _research_payload() -> Dict[str, Any]:
    return {
        "technical": {
            "trend": "bullish",
            "momentum": 0.6,
            "volatility": 0.2,
            "rsi": 58,
            "adx": 28,
            "support": 1.08,
            "resistance": 1.12,
        },
        "fundamental": {
            "eps_growth": 0.12,
            "revenue_growth": 0.18,
            "valuation": 0.1,
            "debt_ratio": 0.25,
        },
        "sentiment": {
            "bullish": 0.7,
            "bearish": 0.2,
            "news": [
                {"score": 0.4, "summary": "Analysts issue bullish upgrade"},
                {"score": 0.2, "summary": "growth tailwinds"},
            ],
        },
        "macro": {
            "gdp_trend": 0.15,
            "inflation": 0.02,
            "dollar_index": -0.05,
            "employment": 0.3,
        },
    }


def _market_payload() -> Dict[str, Any]:
    return {
        "signal": "BUY",
        "momentum": 0.7,
        "trend": "bullish",
        "sentiment": 0.4,
        "volatility": 0.25,
        "news": ["FOMC minutes hint at dovish stance"],
        "confidence": 0.62,
        "risk_score": 0.1,
        "drawdown": 0.0,
        "human_bias": "BUY",
    }


def _risk_payload() -> Dict[str, Any]:
    return {
        "risk_context": {
            "daily_drawdown": -0.01,
            "treasury_utilisation": 0.3,
            "treasury_health": 1.0,
            "volatility": 0.25,
        },
        "risk_parameters": {
            "max_daily_drawdown": 0.08,
            "treasury_utilisation_cap": 0.75,
            "circuit_breaker_drawdown": 0.15,
        },
        "market_state": {
            "volatility": {
                "EURUSD": {"symbol": "EURUSD", "atr": 0.0012, "close": 1.1, "median_ratio": 0.0008},
            },
            "news": [],
        },
        "account_state": {
            "mode": "hedging",
            "exposures": [],
            "hedges": [],
            "drawdown_r": 0.1,
            "risk_capital": 100_000,
        },
    }


class StubTrader:
    def __init__(self) -> None:
        self.calls: list[Dict[str, Any]] = []

    def execute_trade(self, signal: Mapping[str, Any], *, lot: float, symbol: str) -> TradeExecutionResult:
        self.calls.append({"signal": dict(signal), "lot": lot, "symbol": symbol})
        return TradeExecutionResult(
            retcode=SUCCESS_RETCODE,
            message="filled",
            profit=42.5,
            ticket=12345,
            symbol=symbol,
            lot=lot,
        )


class StubTreasury:
    def __init__(self) -> None:
        self.calls: list[TradeExecutionResult] = []

    def update_from_trade(self, trade_result: TradeExecutionResult) -> TreasuryEvent:
        self.calls.append(trade_result)
        return TreasuryEvent(burned=1.0, rewards_distributed=2.0, profit_retained=3.0)


def test_run_dynamic_algo_alignment_executes_trade_and_treasury() -> None:
    trader = StubTrader()
    treasury = StubTreasury()

    result = run_dynamic_algo_alignment(
        {
            "symbol": "EURUSD",
            "lot": 0.5,
            "research_payload": _research_payload(),
            "market_payload": _market_payload(),
            "risk_payload": _risk_payload(),
            "trader": trader,
            "treasury": treasury,
        }
    )

    assert trader.calls and trader.calls[0]["lot"] == 0.5
    assert result["trade"]["status"] == "executed"
    assert result["trade"]["symbol"] == "EURUSD"
    assert result["treasury_event"] == {"burned": 1.0, "rewards_distributed": 2.0, "profit_retained": 3.0}
    assert result["optimisation"]["risk_flags"] == ()
    assert result["optimisation"]["hedges_recommended"] == 0


def test_run_dynamic_algo_alignment_reuses_existing_cycle() -> None:
    trader = StubTrader()

    agent_cycle = {
        "agents": {
            "research": {"agent": "research", "rationale": "stub", "confidence": 0.5, "analysis": {}},
            "execution": {
                "agent": "execution",
                "rationale": "stub",
                "confidence": 0.8,
                "signal": {"action": "BUY", "confidence": 0.8},
            },
            "risk": {
                "agent": "risk",
                "rationale": "risk stable",
                "confidence": 0.7,
                "adjusted_signal": {"action": "BUY", "confidence": 0.7, "risk_notes": ["stable"]},
                "hedge_decisions": (),
                "escalations": (),
            },
        },
        "decision": {"action": "BUY", "confidence": 0.7, "rationale": "alignment"},
    }

    class FailingAgent:
        def run(self, payload: Mapping[str, Any]) -> None:  # pragma: no cover - guard
            raise AssertionError("agent should not execute")

    result = run_dynamic_algo_alignment(
        {
            "symbol": "BTCUSD",
            "lot": 0.2,
            "agent_cycle": agent_cycle,
            "trader": trader,
            "research_agent": FailingAgent(),
            "execution_agent": FailingAgent(),
            "risk_agent": FailingAgent(),
        }
    )

    assert result["decision"]["action"] == "BUY"
    assert result["trade"]["symbol"] == "BTCUSD"
    assert result["trade"]["lot"] == 0.2
    assert result["optimisation"]["risk_notes"] == ("stable",)


def test_dynamic_algo_sync_adapter_wraps_alignment() -> None:
    trader = StubTrader()

    adapter_result = dynamic_algo_sync_adapter.execute(
        {
            "symbol": "GBPUSD",
            "lot": 0.3,
            "research_payload": _research_payload(),
            "market_payload": _market_payload(),
            "risk_payload": _risk_payload(),
            "trader": trader,
        }
    )

    assert adapter_result.status == "success"
    payload = adapter_result.payload
    assert payload["trade"]["status"] == "executed"
    assert payload["trade"]["symbol"] == "GBPUSD"
    assert adapter_result.metadata["chain"] == ("research", "execution", "risk", "trading")

