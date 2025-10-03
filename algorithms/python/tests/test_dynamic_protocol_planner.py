import json
from types import SimpleNamespace
from typing import Any, Dict, Iterable, Mapping, Sequence

import pytest

from algorithms.python import (
    DynamicProtocolPlanner as RootDynamicProtocolPlanner,
    PROTOCOL_CATEGORY_EXECUTORS as ROOT_PROTOCOL_CATEGORY_EXECUTORS,
    PROTOCOL_CATEGORY_KEYS as ROOT_PROTOCOL_CATEGORY_KEYS,
    PROTOCOL_HORIZON_KEYS as ROOT_PROTOCOL_HORIZON_KEYS,
)
from algorithms.python.dynamic_protocol_planner import (
    CATEGORY_EXECUTORS,
    CATEGORY_KEYS,
    DynamicProtocolPlanner,
    HORIZON_KEYS,
    ProtocolDraft,
)
from algorithms.python.multi_llm import LLMConfig
from algorithms.python.backtesting import BacktestResult
from algorithms.python.optimization_workflow import OptimizationInsights
from algorithms.python.trade_logic import PerformanceMetrics, RiskParameters, TradeConfig


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
    return LLMConfig(name="stub", client=client, temperature=0.2, nucleus_p=0.9, max_tokens=512)


def test_planner_aggregates_multiple_models() -> None:
    architect_payload = {
        "protocol": {
            "Yearly": {
                "Setting Goals": ["Codify annual vision"],
                "Objectives": ["Build automation"],
                "Daily Tasks": ["Refresh dashboards"],
            },
            "monthly": {
                "trade plan": ["Document A setups"],
                "risk & money management": ["Cap loss at 6%"],
                "Review": ["Publish scorecard"],
            },
        }
    }

    risk_payload = {
        "risk_overrides": {
            "risk_and_money_management": {"monthly": ["Tighten stop variance"]},
            "review": {"weekly": ["Audit compliance logs"]},
        }
    }

    psychology_payload = {
        "psychology": {
            "trading_psychology": {"weekly": ["Run mindset retro"]},
            "daily_tasks": {"daily": ["Log sentiment"], "Monthly": ["Schedule rest days"]},
        }
    }

    review_payload = {
        "audit": {
            "review": {"daily": ["Micro closeout checklist"]},
            "trade_journaling": {"weekly": ["Tag trades by structure"]},
        }
    }

    architect_client = StubClient([json.dumps(architect_payload)])
    risk_client = StubClient([json.dumps(risk_payload)])
    psychology_client = StubClient([json.dumps(psychology_payload)])
    review_client = StubClient([json.dumps(review_payload)])

    planner = DynamicProtocolPlanner(
        architect=_config(architect_client),
        risk=_config(risk_client),
        psychology=_config(psychology_client),
        review=_config(review_client),
    )

    draft = planner.generate_protocol(context={"desk": "FX", "focus": "structure"})

    assert isinstance(draft, ProtocolDraft)
    assert set(draft.plan.keys()) == set(HORIZON_KEYS)
    assert any("Codify annual vision" in entry for entry in draft.plan["yearly"]["setting_goals"])
    assert "Tighten stop variance" in draft.plan["monthly"]["risk_and_money_management"]
    assert "Audit compliance logs" in draft.plan["weekly"]["review"]
    assert "Log sentiment" in draft.plan["daily"]["daily_tasks"]
    assert "Schedule rest days" in draft.plan["monthly"]["daily_tasks"]
    assert "Tag trades by structure" in draft.plan["weekly"]["trade_journaling"]
    assert len(draft.runs) == 4
    assert "Design an integrated trading protocol" in architect_client.calls[0]["prompt"]
    assert "risk and capital management" in risk_client.calls[0]["prompt"].lower()
    assert "psychology specialist" in psychology_client.calls[0]["prompt"]
    assert "audit model" in review_client.calls[0]["prompt"]
    assert draft.annotations["category_assignments"]["market_outlook"] == ["DynamicTradingAlgo"]


def test_generate_protocol_includes_trade_logic_context() -> None:
    architect_payload = {"protocol": {"daily": {"trade plan": ["Execute core setup"]}}}
    architect_client = StubClient([json.dumps(architect_payload)])

    class RiskStub:
        def __init__(self) -> None:
            self.params = RiskParameters(
                balance=50_000.0,
                risk_per_trade=0.015,
                pip_value_per_standard_lot=7.5,
                min_lot=0.1,
                lot_step=0.05,
                max_lot=2.0,
                max_positions_per_symbol=2,
                max_total_positions=4,
                max_daily_drawdown_pct=7.5,
            )
            self._metrics = PerformanceMetrics(
                total_trades=120,
                wins=70,
                losses=50,
                hit_rate=0.5833,
                profit_factor=1.9,
                max_drawdown_pct=6.4,
                equity_curve=[],
            )

        def metrics(self) -> PerformanceMetrics:
            return self._metrics

    trade_logic = SimpleNamespace(
        config=TradeConfig(neutral_zone_pips=3.5, correlation_weight=0.7),
        risk=RiskStub(),
        adr_tracker=SimpleNamespace(period=14, value=97.3),
        smc=None,
    )

    planner = DynamicProtocolPlanner(architect=_config(architect_client))
    draft = planner.generate_protocol(trade_logic=trade_logic)

    prompt = architect_client.calls[0]["prompt"]
    assert '"neutral_zone_pips": 3.5' in prompt
    assert '"risk_per_trade": 0.015' in prompt
    assert '"period": 14' in prompt

    trade_logic_annotations = draft.annotations["trade_logic"]
    assert trade_logic_annotations["config"]["neutral_zone_pips"] == 3.5
    assert trade_logic_annotations["risk_parameters"]["risk_per_trade"] == 0.015
    assert trade_logic_annotations["adr"]["period"] == 14


def test_planner_handles_textual_fallbacks() -> None:
    architect_client = StubClient(["Narrative only response"])
    planner = DynamicProtocolPlanner(architect=_config(architect_client))

    draft = planner.generate_protocol()

    for horizon in HORIZON_KEYS:
        for category in CATEGORY_KEYS:
            assert draft.plan[horizon][category] == []
    assert len(draft.runs) == 1


def test_to_dict_excludes_empty_categories() -> None:
    architect_payload = {"protocol": {"yearly": {"objectives": ["Ship tooling"]}}}
    architect_client = StubClient([json.dumps(architect_payload)])
    planner = DynamicProtocolPlanner(architect=_config(architect_client))

    draft = planner.generate_protocol(context={"team": "alpha"})
    serialised = draft.to_dict()

    assert "yearly" in serialised
    assert "objectives" in serialised["yearly"]
    assert "weekly" not in serialised
    assert serialised["annotations"]["horizons"] == HORIZON_KEYS
    assert serialised["annotations"]["categories"] == CATEGORY_KEYS
    assert serialised["annotations"]["context_supplied"] is True
    assert serialised["annotations"]["category_assignments"]["market_outlook"] == [
        "DynamicTradingAlgo"
    ]


def test_optimize_and_generate_syncs_plan(monkeypatch: pytest.MonkeyPatch) -> None:
    architect_payload = {"protocol": {"weekly": {"review": ["Sync optimisation results"]}}}
    architect_client = StubClient([json.dumps(architect_payload)])
    planner = DynamicProtocolPlanner(architect=_config(architect_client))

    metrics = PerformanceMetrics(
        total_trades=40,
        wins=24,
        losses=16,
        hit_rate=0.6,
        profit_factor=1.75,
        max_drawdown_pct=4.8,
        equity_curve=[],
    )

    class RiskStub:
        def __init__(self) -> None:
            self.params = RiskParameters()

        def metrics(self) -> PerformanceMetrics:
            return metrics

    trade_logic = SimpleNamespace(
        config=TradeConfig(),
        risk=RiskStub(),
        adr_tracker=None,
        smc=None,
    )

    insights = OptimizationInsights(
        snapshot_count=25,
        average_correlation=0.42,
        max_correlation=0.61,
        average_seasonal_bias=0.18,
        average_seasonal_confidence=0.53,
        average_range_pips=47.5,
    )
    backtest = BacktestResult(
        decisions=[],
        trades=[],
        performance=metrics,
        ending_equity=12_500.5,
    )
    plan = SimpleNamespace(
        trade_logic=trade_logic,
        base_config=trade_logic.config,
        tuned_config=trade_logic.config,
        best_config=trade_logic.config,
        backtest_result=backtest,
        history=[(trade_logic.config, backtest)],
        insights=insights,
        realtime_executor=None,
    )

    captured: Dict[str, Any] = {}

    def fake_optimize(snapshots: Sequence[Any], search_space: Mapping[str, Iterable], **kwargs: Any) -> Any:
        captured["snapshots"] = snapshots
        captured["search_space"] = search_space
        captured["kwargs"] = kwargs
        return plan

    monkeypatch.setattr("algorithms.python.dynamic_protocol_planner.optimize_trading_stack", fake_optimize)

    snapshots = [object()]
    search_space = {"neighbors": [5, 7]}
    draft = planner.optimize_and_generate(snapshots, search_space, context={"desk": "FX"})

    prompt = architect_client.calls[0]["prompt"]
    assert '"snapshot_count": 25' in prompt
    assert '"desk": "FX"' in prompt

    assert captured["snapshots"] is snapshots
    assert captured["search_space"] is search_space
    assert captured["kwargs"]["initial_equity"] == 10_000.0

    optimisation_annotations = draft.annotations["optimization"]
    assert optimisation_annotations["insights"]["snapshot_count"] == 25
    assert optimisation_annotations["backtest"]["ending_equity"] == 12_500.5
    assert draft.annotations["context_supplied"] is True


def test_root_package_exports_hardened_protocol_metadata() -> None:
    assert RootDynamicProtocolPlanner is DynamicProtocolPlanner
    assert ROOT_PROTOCOL_CATEGORY_KEYS == CATEGORY_KEYS
    assert ROOT_PROTOCOL_HORIZON_KEYS == HORIZON_KEYS
    assert isinstance(ROOT_PROTOCOL_CATEGORY_EXECUTORS, Mapping)
    assert dict(ROOT_PROTOCOL_CATEGORY_EXECUTORS) == CATEGORY_EXECUTORS
    assert all(
        isinstance(owners, tuple) for owners in ROOT_PROTOCOL_CATEGORY_EXECUTORS.values()
    )
    with pytest.raises(TypeError):
        ROOT_PROTOCOL_CATEGORY_EXECUTORS["market_outlook"] = ("Override",)

