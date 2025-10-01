from __future__ import annotations

import pytest

from dynamic.intelligence.ai_apps.agents import TradingAgent, TradingAgentResult
from dynamic.intelligence.ai_apps.risk import PositionSizing
from dynamic.trading.algo.trading_core import (
    SUCCESS_RETCODE,
    TradeExecutionResult,
    DynamicTradingAlgo,
)


class StubTrader:
    def __init__(self) -> None:
        self.calls: list[tuple[dict[str, str], float, str]] = []
        self.hedge_calls: list[tuple[str, float, str, bool]] = []
        self._helper = DynamicTradingAlgo()

    def _resolve_symbol(self, symbol: str) -> tuple[str, object]:
        return self._helper._resolve_symbol(symbol)

    def _clamp_lot(self, lot: float, profile: object) -> float:
        return self._helper._clamp_lot(lot, profile)

    def execute_trade(
        self, signal: dict[str, str], *, lot: float, symbol: str
    ) -> TradeExecutionResult:
        resolved_symbol, profile = self._resolve_symbol(symbol)
        adjusted_lot = self._clamp_lot(lot, profile)
        self.calls.append((dict(signal), adjusted_lot, resolved_symbol))
        return TradeExecutionResult(
            retcode=SUCCESS_RETCODE,
            message="filled",
            profit=12.5,
            ticket=9876,
            symbol=resolved_symbol,
            lot=adjusted_lot,
            price=1.2345,
        )

    def execute_hedge(
        self, *, symbol: str, lot: float, side: str, close: bool = False
    ) -> TradeExecutionResult:
        resolved_symbol, profile = self._resolve_symbol(symbol)
        adjusted_lot = self._clamp_lot(lot, profile)
        self.hedge_calls.append((resolved_symbol, adjusted_lot, side, close))
        return TradeExecutionResult(
            retcode=SUCCESS_RETCODE,
            message="hedged",
            profit=3.21,
            ticket=5555,
            symbol=resolved_symbol,
            lot=adjusted_lot,
            price=1.0,
        )


@pytest.fixture()
def agent_cycle() -> dict[str, object]:
    return {
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


def test_trading_agent_uses_payload_cycle(agent_cycle: dict[str, object]) -> None:
    trader = StubTrader()
    agent = TradingAgent()

    result = agent.run({"symbol": "ETHUSD", "lot": 0.4, "agent_cycle": agent_cycle, "trader": trader})

    assert isinstance(result, TradingAgentResult)
    assert trader.calls and trader.calls[0][2] == "ETHUSD"
    assert result.trade["symbol"] == "ETHUSD"
    assert result.decision["action"] == "BUY"
    assert result.rationale == "alignment"
    assert pytest.approx(result.confidence, rel=1e-6) == 0.7


def test_trading_agent_respects_default_trader(agent_cycle: dict[str, object]) -> None:
    trader = StubTrader()
    agent = TradingAgent(trader=trader)

    result = agent.run({"symbol": "XAUUSD", "lot": 0.2, "agent_cycle": agent_cycle})

    assert trader.calls and trader.calls[0][2] == "XAUUSD"
    assert result.trade["status"] == "executed"
    assert result.trade["ticket"] == 9876
    assert result.optimisation["status"] == "executed"


def test_trading_agent_executes_hedge_decisions(agent_cycle: dict[str, object]) -> None:
    trader = StubTrader()
    agent = TradingAgent(trader=trader)

    cycle = dict(agent_cycle)
    decision = dict(cycle["decision"])
    decision["hedge_decisions"] = [
        {
            "action": "OPEN",
            "symbol": "BTCUSD",
            "hedge_symbol": "ETHUSD",
            "side": "SHORT_HEDGE",
            "quantity": 0.25,
            "reason": "VOLATILITY",
            "score": 0.9,
        },
        {
            "action": "CLOSE",
            "symbol": "BTCUSD",
            "hedge_symbol": "ETHUSD",
            "side": "SHORT_HEDGE",
            "quantity": 0.25,
            "reason": "VOLATILITY",
            "score": 0.4,
        },
    ]
    cycle["decision"] = decision
    agents = dict(cycle["agents"])
    risk_agent = dict(agents["risk"])
    risk_agent["hedge_decisions"] = tuple(decision["hedge_decisions"])
    agents["risk"] = risk_agent
    cycle["agents"] = agents

    result = agent.run({"symbol": "ETHUSD", "lot": 0.1, "agent_cycle": cycle})

    assert len(trader.hedge_calls) == 2
    assert trader.hedge_calls[0][3] is False
    assert trader.hedge_calls[1][3] is True
    assert result.optimisation["hedges_recommended"] == 2
    assert result.optimisation["hedges_executed"] == 2
    assert result.trade["status"] == "executed"
    assert "hedges" in result.trade


def test_trading_agent_applies_risk_sizing(agent_cycle: dict[str, object]) -> None:
    trader = StubTrader()
    agent = TradingAgent(trader=trader)

    cycle = dict(agent_cycle)
    decision = dict(cycle["decision"])
    decision["sizing"] = PositionSizing(notional=150.0, leverage=1.5, notes="risk guided")
    cycle["decision"] = decision

    result = agent.run({"symbol": "ETHUSD", "lot": 0.1, "agent_cycle": cycle})

    assert trader.calls, "trade execution expected"
    executed_signal, executed_lot, executed_symbol = trader.calls[0]
    assert executed_symbol == "ETHUSD"

    _, profile = trader._resolve_symbol("ETHUSD")
    exposure = 150.0 * 1.5
    expected_lot = trader._clamp_lot(exposure / profile.reference_price, profile)
    assert pytest.approx(executed_lot, rel=1e-6) == expected_lot

    applied_sizing = result.trade.get("applied_sizing")
    assert applied_sizing is not None
    assert pytest.approx(applied_sizing["lot"], rel=1e-6) == expected_lot
    assert applied_sizing["notional"] == 150.0
    assert applied_sizing["leverage"] == 1.5
