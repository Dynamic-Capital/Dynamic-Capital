from __future__ import annotations

import pytest

from dynamic_ai.agents import TradingAgent, TradingAgentResult
from dynamic_algo.trading_core import SUCCESS_RETCODE, TradeExecutionResult


class StubTrader:
    def __init__(self) -> None:
        self.calls: list[tuple[dict[str, str], float, str]] = []

    def execute_trade(self, signal: dict[str, str], *, lot: float, symbol: str) -> TradeExecutionResult:
        self.calls.append((dict(signal), lot, symbol))
        return TradeExecutionResult(
            retcode=SUCCESS_RETCODE,
            message="filled",
            profit=12.5,
            ticket=9876,
            symbol=symbol,
            lot=lot,
            price=1.2345,
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
