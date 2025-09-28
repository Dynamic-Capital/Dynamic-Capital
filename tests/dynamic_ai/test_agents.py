from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from dynamic_ai import (
    AISignal,
    DynamicChatAgent,
    ExecutionAgent,
    ResearchAgent,
    RiskAgent,
)
from dynamic_ai.analysis import DynamicAnalysis
from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle


@pytest.fixture()
def research_payload() -> dict:
    return {
        "technical": {"trend": "bullish", "momentum": 0.4, "volatility": 0.8},
        "fundamental": {"earnings_trend": "up", "growth": 0.2},
        "sentiment": {"tone": "positive", "volume": 0.6},
    }


def test_dynamic_analysis_handles_generator_alignment() -> None:
    analysis = DynamicAnalysis()
    component = analysis._analyse_technical(
        {
            "trend": "neutral",
            "momentum": 0.0,
            "volatility": 1.0,
            "moving_average_alignment": (signal for signal in ("bullish", "bearish", "bullish")),
        }
    )

    assert component.score == pytest.approx(0.05, abs=1e-6)


def test_dynamic_analysis_handles_string_sentiment_sources() -> None:
    analysis = DynamicAnalysis()

    component = analysis._analyse_sentiment({"sources": "Breaking headline"})

    assert component.score == pytest.approx(0.0, abs=1e-6)
    assert component.signals["feed_count"] == 0


def test_research_agent_generates_structured_analysis(research_payload: dict) -> None:
    agent = ResearchAgent()

    result = agent.run(research_payload)
    payload = result.to_dict()

    assert payload["agent"] == "research"
    assert payload["analysis"]["action"] in {"BUY", "HOLD"}
    assert payload["analysis"]["components"]
    assert isinstance(result.confidence, float)


def test_execution_agent_includes_primary_driver(research_payload: dict) -> None:
    agent = ExecutionAgent()

    result = agent.run(
        {
            "market": {"signal": "BUY", "confidence": 0.62, "momentum": 0.5},
            "analysis": {"primary_driver": "technical"},
        }
    )
    payload = result.to_dict()

    assert payload["agent"] == "execution"
    assert payload["signal"]["action"] == "BUY"
    assert payload["context"]["analysis_primary_driver"] == "technical"


def test_risk_agent_enforces_circuit_breaker() -> None:
    agent = RiskAgent()
    signal = AISignal(action="BUY", confidence=0.9, reasoning="test")

    result = agent.run(
        {
            "signal": signal,
            "risk_context": {
                "daily_drawdown": -0.2,
                "treasury_utilisation": 0.3,
                "treasury_health": 0.9,
                "volatility": 0.6,
            },
            "risk_parameters": {"circuit_breaker_drawdown": 0.12},
            "market_state": {"volatility": {}},
            "account_state": {},
        }
    )
    payload = result.to_dict()

    assert payload["agent"] == "risk"
    assert payload["adjusted_signal"]["action"] == "NEUTRAL"
    assert "daily_drawdown" in payload.get("escalations", [])
    assert "Circuit breaker" in result.rationale


def test_risk_agent_produces_hedge_directives() -> None:
    agent = RiskAgent()
    signal = AISignal(action="SELL", confidence=0.55, reasoning="bearish")

    result = agent.run(
        {
            "signal": signal,
            "risk_context": {
                "daily_drawdown": -0.01,
                "treasury_utilisation": 0.2,
                "treasury_health": 1.0,
                "volatility": 0.4,
            },
            "market_state": {
                "volatility": {
                    "EURUSD": {
                        "atr": 0.02,
                        "close": 1.1,
                        "median_ratio": 0.01,
                    }
                }
            },
            "account_state": {
                "exposures": [
                    {"symbol": "EURUSD", "side": "LONG", "quantity": 100_000, "beta": 1.0, "price": 1.1},
                ]
            },
        }
    )

    payload = result.to_dict()

    assert payload["hedge_decisions"]
    decision = payload["hedge_decisions"][0]
    assert decision["action"] == "OPEN"
    assert decision["symbol"] == "EURUSD"


def test_run_dynamic_agent_cycle_aggregates_outputs(research_payload: dict) -> None:
    result = run_dynamic_agent_cycle(
        {
            "research_payload": research_payload,
            "market_payload": {"signal": "BUY", "confidence": 0.65, "momentum": 0.4},
            "risk_context": {
                "daily_drawdown": -0.01,
                "treasury_utilisation": 0.1,
                "treasury_health": 1.1,
                "volatility": 0.3,
            },
            "market_state": {
                "volatility": {
                    "GBPUSD": {
                        "atr": 0.03,
                        "close": 1.25,
                        "median_ratio": 0.015,
                    }
                }
            },
            "account_state": {
                "exposures": [
                    {"symbol": "GBPUSD", "side": "SHORT", "quantity": 50_000, "beta": 1.0, "price": 1.25},
                ]
            },
        }
    )

    assert set(result.keys()) == {"agents", "decision"}
    assert result["agents"]["research"]["agent"] == "research"
    assert result["agents"]["execution"]["signal"]["action"] in {"BUY", "NEUTRAL"}
    assert result["agents"]["risk"]["agent"] == "risk"
    assert "action" in result["decision"]
    assert "hedge_decisions" in result["decision"]


def test_dynamic_chat_agent_produces_transcript(research_payload: dict) -> None:
    cycle = run_dynamic_agent_cycle(
        {
            "research_payload": research_payload,
            "market_payload": {"signal": "BUY", "confidence": 0.6, "momentum": 0.5},
            "risk_context": {
                "daily_drawdown": -0.015,
                "treasury_utilisation": 0.18,
                "treasury_health": 1.05,
                "volatility": 0.45,
            },
            "market_state": {
                "volatility": {
                    "EURUSD": {"atr": 0.02, "close": 1.1, "median_ratio": 0.01},
                }
            },
            "account_state": {
                "exposures": [
                    {"symbol": "EURUSD", "side": "LONG", "quantity": 75_000, "beta": 1.0, "price": 1.1},
                ]
            },
        }
    )

    agent = DynamicChatAgent()
    result = agent.run({
        "agents": cycle["agents"],
        "decision": cycle["decision"],
        "user": "What is the latest EURUSD plan?",
    })
    payload = result.to_dict()

    assert payload["agent"] == "chat"
    assert payload["messages"]
    assert payload["messages"][0]["role"] == "user"
    assert any(message["role"] == "execution" for message in payload["messages"])
    assert payload["decision"]["action"] in {"BUY", "SELL", "HOLD", "NEUTRAL"}
    assert "Final decision" in payload["rationale"]


def test_dynamic_chat_agent_blends_dynamic_agi_payload() -> None:
    agent = DynamicChatAgent()
    result = agent.run(
        {
            "user": "Share the AGI verdict.",
            "agi": {
                "signal": {
                    "action": "BUY",
                    "confidence": 0.72,
                    "reasoning": "Momentum, flow, and sentiment align on upside continuation.",
                },
                "research": {
                    "summary": "Liquidity inflows and resilient macro data back the long bias.",
                    "confidence": 0.68,
                },
                "risk_adjusted": {
                    "action": "BUY",
                    "confidence": 0.66,
                    "rationale": "Risk within guardrails; hedge to cap tail risk.",
                    "hedge_decisions": [
                        {"symbol": "EURUSD", "action": "HOLD", "size": 0.25},
                    ],
                },
                "sizing": {"base": 100000, "adjusted": 75000},
                "market_making": {"spread_bps": 1.2, "skew": -0.15},
                "diagnostics": {
                    "context": {"momentum": 0.6, "volatility": 0.2},
                    "composite": {"score": 0.71},
                    "consensus": {"fusion": 0.68},
                },
                "improvement": {"summary": "Track treasury stress signals nightly."},
            },
        }
    )

    payload = result.to_dict()

    assert payload["agent"] == "chat"
    agi_messages = [message for message in payload["messages"] if message["role"] == "agi"]
    assert agi_messages, "expected AGI summary message"
    agi_metadata = agi_messages[0].get("metadata", {})
    assert agi_metadata.get("market_making") == {"spread_bps": 1.2, "skew": -0.15}
    assert agi_metadata.get("diagnostics", {}).get("consensus", {}).get("fusion") == pytest.approx(0.68)
    assert payload["decision"]["action"] == "BUY"
    assert payload["decision"]["confidence"] == pytest.approx(0.66)
    assert "Dynamic AGI" in payload["rationale"]
