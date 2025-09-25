from __future__ import annotations

from collections import deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from algorithms.python.backtesting import Backtester
from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from algorithms.python.model_artifacts import load_artifacts, save_artifacts
from algorithms.python.deepseek_advisor import DeepSeekAdvisor
from algorithms.python.grok_advisor import AdvisorFeedback
from algorithms.python.offline_labeler import LabelingConfig, OfflineLabeler
from algorithms.python.realtime import InMemoryStateStore, RealtimeExecutor, build_realtime_executor
from algorithms.python.trade_logic import (
    ActivePosition,
    FeaturePipeline,
    LabeledFeature,
    LorentzianKNNModel,
    MarketSnapshot,
    TradeDecision,
    TradeConfig,
    TradeLogic,
    TradeSignal,
)


def _build_snapshots() -> list[MarketSnapshot]:
    start = datetime(2024, 1, 1, 0, 0)
    bars = []
    price = 100.0
    for idx in range(20):
        high = price + 0.5
        low = price - 0.5
        close = price + (0.2 if idx % 2 == 0 else -0.1)
        bars.append(
            RawBar(
                timestamp=start + timedelta(minutes=idx * 5),
                open=price,
                high=high,
                low=low,
                close=close,
            )
        )
        price = close
    job = MarketDataIngestionJob()
    snapshots = job.run(bars, InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0))
    assert snapshots, "expected non-empty snapshots from ingestion job"
    return snapshots


def test_feature_pipeline_persistence_round_trip():
    pipeline = FeaturePipeline()
    vector = (10.0, 20.0, 30.0, 40.0)
    transformed = pipeline.transform(vector, update=True)
    state = pipeline.state_dict()
    restored = FeaturePipeline()
    restored.load_state_dict(state)
    replay = restored.transform(vector, update=False)
    assert pytest.approx(transformed) == replay


def test_offline_labeler_produces_labeled_features():
    snapshots = _build_snapshots()
    labeler = OfflineLabeler()
    labelled = labeler.label(snapshots, LabelingConfig(lookahead=3, neutral_zone_pips=0.5))
    assert labelled, "offline labeler should produce labelled samples"
    assert all(isinstance(sample.label, int) for sample in labelled)


def test_lorentzian_knn_model_predicts_direction():
    timestamp = datetime.now(timezone.utc)
    samples = [
        LabeledFeature(features=(0.0, 0.0, 0.0, 0.0), label=1, close=1.0, timestamp=timestamp),
        LabeledFeature(features=(5.0, 5.0, 5.0, 5.0), label=-1, close=1.0, timestamp=timestamp),
    ]
    model = LorentzianKNNModel(neighbors=1)
    model.fit(samples)
    signal = model.predict((0.1, 0.1, 0.1, 0.1))
    assert signal is not None
    assert signal.direction == 1


def test_backtester_generates_performance_metrics(tmp_path: Path):
    snapshots = _build_snapshots()
    config = TradeConfig(neighbors=1, label_lookahead=2, min_confidence=0.0)
    logic = TradeLogic(config=config)
    backtester = Backtester(logic)
    result = backtester.run(snapshots[: len(snapshots) - 2])
    assert result.performance.total_trades >= 0
    artefact_path = tmp_path / "model.json"
    save_artifacts(artefact_path, logic)
    new_logic = TradeLogic(config=TradeConfig())
    load_artifacts(artefact_path, new_logic)
    assert new_logic.config.neighbors == config.neighbors


def test_realtime_executor_updates_state():
    snapshots = _build_snapshots()[:5]
    config = TradeConfig(neighbors=1, label_lookahead=2, min_confidence=0.0)
    logic = TradeLogic(config=config)

    class MemoryBroker:
        def __init__(self) -> None:
            self.decisions: list[TradeDecision] = []
            self.positions: list[ActivePosition] = []

        def fetch_open_positions(self):
            return list(self.positions)

        def execute(self, decision):
            self.decisions.append(decision)

    broker = MemoryBroker()
    executor = RealtimeExecutor(logic, broker, state_store=InMemoryStateStore())
    total = 0
    for snapshot in snapshots:
        total += len(executor.process_snapshot(snapshot))
    stored_positions = executor.state_store.load()
    assert isinstance(stored_positions, list)
    assert total >= 0


def test_realtime_executor_reports_broker_failures():
    snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=datetime.now(timezone.utc),
        close=1800.0,
        rsi_fast=50.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.1,
        pip_value=1.0,
    )

    class StaticLogic:
        def on_bar(self, snapshot, *, open_positions, account_equity=None, advisor=None):
            return [
                TradeDecision(
                    action="open",
                    symbol=snapshot.symbol,
                    direction=1,
                    size=0.1,
                    entry=snapshot.close,
                )
            ]

    class FailingBroker:
        def fetch_open_positions(self):
            return []

        def execute(self, decision):
            raise RuntimeError("broker outage")

    class SpyHealthMonitor:
        def __init__(self):
            self.calls = []

        def record_status(self, status, *, timestamp, details=None):
            self.calls.append((status, timestamp, details or {}))

    monitor = SpyHealthMonitor()
    executor = RealtimeExecutor(
        StaticLogic(),
        FailingBroker(),
        state_store=InMemoryStateStore(),
        health_monitor=monitor,
    )

    decisions = executor.process_snapshot(snapshot)

    assert len(decisions) == 1
    stored_positions = executor.state_store.load()
    assert stored_positions == []
    assert monitor.calls, "health monitor should receive status updates"
    status, timestamp, details = monitor.calls[-1]
    assert status == "error"
    assert details["decisions"] == 1
    assert details["failed_decisions"] == 1
    assert any("broker outage" in message for message in details["errors"])


def test_build_realtime_executor_configures_deepseek(monkeypatch: pytest.MonkeyPatch) -> None:
    config = TradeConfig(neighbors=1, label_lookahead=0, min_confidence=0.0)
    logic = TradeLogic(config=config)

    class DummyBroker:
        def fetch_open_positions(self):
            return []

        def execute(self, decision):  # pragma: no cover - not exercised in the test
            raise AssertionError("execute should not be called")

    class DummyAdvisor:
        def review(self, **kwargs):  # pragma: no cover - no direct invocation
            return None

    stub_advisor = DummyAdvisor()
    monkeypatch.setenv("DEEPSEEK_API_KEY", "placeholder")
    monkeypatch.setattr(
        "algorithms.python.deepseek_advisor.advisor_from_environment",
        lambda: stub_advisor,
    )

    executor = build_realtime_executor(
        logic,
        DummyBroker(),
        state_store=InMemoryStateStore(),
        advisor_provider="deepseek",
    )

    assert isinstance(executor, RealtimeExecutor)
    assert executor.advisor is stub_advisor


def test_trade_logic_applies_correlation_and_seasonal_context():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        correlation_threshold=0.5,
        correlation_weight=0.5,
        max_correlation_adjustment=0.4,
        seasonal_bias_weight=0.5,
        max_seasonal_adjustment=0.3,
    )
    logic = TradeLogic(config=config)

    class StaticStrategy:
        def __init__(self, signal: TradeSignal) -> None:
            self._signal = signal

        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return self._signal

    logic.strategy = StaticStrategy(
        TradeSignal(direction=1, confidence=0.8, votes=6, neighbors_considered=8)
    )

    snapshot = MarketSnapshot(
        symbol="GBPUSD",
        timestamp=datetime.now(timezone.utc),
        close=1.2750,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
        correlation_scores={"EURUSD": 0.9},
        seasonal_bias=0.6,
        seasonal_confidence=0.8,
    )

    open_positions = [
        ActivePosition(symbol="EURUSD", direction=1, size=0.1, entry_price=1.1000)
    ]

    decisions = logic.on_bar(snapshot, open_positions=open_positions)
    open_decisions = [decision for decision in decisions if decision.action == "open"]
    assert open_decisions, "expected an open trade decision"

    decision = open_decisions[0]
    assert decision.signal is not None
    assert decision.signal.confidence == pytest.approx(0.8 * 0.6 * 1.24, rel=1e-3)
    assert decision.context["correlation"]["modifier"] == pytest.approx(0.6, rel=1e-3)
    assert decision.context["seasonal"]["modifier"] == pytest.approx(1.24, rel=1e-3)
    assert "correlation" in decision.reason
    assert "seasonal" in decision.reason
    assert decision.context["smc"]["modifier"] == pytest.approx(1.0, rel=1e-3)


def test_trade_logic_layers_smc_context():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        smc_structure_lookback=3,
        smc_structure_threshold_pips=5.0,
        smc_level_threshold_pips=12.0,
        smc_round_number_interval_pips=50.0,
        smc_bias_weight=0.2,
        smc_liquidity_weight=0.1,
        max_smc_adjustment=0.3,
    )
    logic = TradeLogic(config=config)

    signals = deque(
        [
            TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0),
            TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0),
            TradeSignal(direction=1, confidence=0.8, votes=6, neighbors_considered=8),
        ]
    )

    class SequenceStrategy:
        def __init__(self, queue: deque[TradeSignal]) -> None:
            self._signals = queue

        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            if self._signals:
                return self._signals.popleft()
            return TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0)

    logic.strategy = SequenceStrategy(signals)

    base_time = datetime(2024, 1, 2, 0, 0, tzinfo=timezone.utc)
    snapshots = [
        MarketSnapshot(
            symbol="GBPUSD",
            timestamp=base_time,
            open=1.2000,
            high=1.2010,
            low=1.1990,
            close=1.2005,
            rsi_fast=55.0,
            adx_fast=20.0,
            rsi_slow=52.0,
            adx_slow=18.0,
            pip_size=0.0001,
            pip_value=10.0,
            daily_high=1.2010,
            daily_low=1.1990,
            previous_daily_high=1.1985,
            previous_daily_low=1.1950,
            weekly_high=1.2050,
            weekly_low=1.1950,
            previous_week_high=1.2100,
            previous_week_low=1.1900,
        ),
        MarketSnapshot(
            symbol="GBPUSD",
            timestamp=base_time + timedelta(minutes=5),
            open=1.2005,
            high=1.2020,
            low=1.2000,
            close=1.2015,
            rsi_fast=56.0,
            adx_fast=21.0,
            rsi_slow=52.5,
            adx_slow=18.5,
            pip_size=0.0001,
            pip_value=10.0,
            daily_high=1.2020,
            daily_low=1.1990,
            previous_daily_high=1.1985,
            previous_daily_low=1.1950,
            weekly_high=1.2050,
            weekly_low=1.1950,
            previous_week_high=1.2100,
            previous_week_low=1.1900,
        ),
        MarketSnapshot(
            symbol="GBPUSD",
            timestamp=base_time + timedelta(minutes=10),
            open=1.2015,
            high=1.2040,
            low=1.2010,
            close=1.2035,
            rsi_fast=57.5,
            adx_fast=22.0,
            rsi_slow=53.0,
            adx_slow=19.0,
            pip_size=0.0001,
            pip_value=10.0,
            daily_high=1.2040,
            daily_low=1.1990,
            previous_daily_high=1.2040,
            previous_daily_low=1.1950,
            weekly_high=1.2050,
            weekly_low=1.1950,
            previous_week_high=1.2100,
            previous_week_low=1.1900,
        ),
    ]

    decisions: list[TradeDecision] = []
    for snapshot in snapshots:
        decisions = logic.on_bar(snapshot)

    open_decisions = [decision for decision in decisions if decision.action == "open"]
    assert open_decisions, "expected an open trade decision with SMC context"

    decision = open_decisions[0]
    smc_context = decision.context["smc"]
    assert smc_context["enabled"]
    assert smc_context["modifier"] == pytest.approx(1.1, rel=1e-3)
    assert smc_context["structure"]["bos"] == "bullish"
    assert "PDH" in smc_context["liquidity"]["penalised_levels"]
    assert "smc" in decision.reason


def test_trade_logic_applies_grok_advice():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        use_smc_context=False,
    )
    logic = TradeLogic(config=config)

    class StaticStrategy:
        def __init__(self, signal: TradeSignal) -> None:
            self._signal = signal

        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return self._signal

    base_signal = TradeSignal(direction=1, confidence=0.6, votes=4, neighbors_considered=6)
    logic.strategy = StaticStrategy(base_signal)

    class StubAdvisor:
        def __init__(self) -> None:
            self.invocations: list[TradeSignal] = []

        def review(self, *, snapshot, signal, context, open_positions):
            self.invocations.append(signal)
            updated = TradeSignal(
                direction=signal.direction,
                confidence=0.42,
                votes=signal.votes,
                neighbors_considered=signal.neighbors_considered,
            )
            return AdvisorFeedback(
                adjusted_signal=updated,
                metadata={"source": "stub", "rationale": "context review"},
                raw_response="{\"adjusted_confidence\": 0.42}",
            )

    advisor = StubAdvisor()

    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=datetime.now(timezone.utc),
        close=1.1025,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions = logic.on_bar(snapshot, open_positions=[], advisor=advisor)
    decision = next(dec for dec in decisions if dec.action == "open")

    assert advisor.invocations, "expected Grok advisor to be invoked"
    assert decision.signal is not None
    assert decision.signal.confidence == pytest.approx(0.42)
    assert decision.context["final_confidence"] == pytest.approx(0.42)
    assert decision.context["advisor"]["source"] == "stub"
    assert "rationale" in decision.context["advisor"]


def test_trade_logic_applies_deepseek_advice():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        use_smc_context=False,
    )
    logic = TradeLogic(config=config)

    class StaticStrategy:
        def __init__(self, signal: TradeSignal) -> None:
            self._signal = signal

        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return self._signal

    base_signal = TradeSignal(direction=1, confidence=0.6, votes=4, neighbors_considered=6)
    logic.strategy = StaticStrategy(base_signal)

    class StubDeepSeekClient:
        def __init__(self, response: str) -> None:
            self._response = response
            self.calls: list[dict[str, Any]] = []

        def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
            self.calls.append(
                {
                    "prompt": prompt,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "nucleus_p": nucleus_p,
                }
            )
            return self._response

    client = StubDeepSeekClient('{"adjusted_confidence": 0.47, "rationale": "Policy support"}')
    advisor = DeepSeekAdvisor(client=client, temperature=0.2, nucleus_p=0.88, max_tokens=160)

    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=datetime.now(timezone.utc),
        close=1.1025,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions = logic.on_bar(snapshot, open_positions=[], advisor=advisor)
    decision = next(dec for dec in decisions if dec.action == "open")

    assert client.calls, "expected DeepSeek advisor to be invoked"
    assert decision.signal is not None
    assert decision.signal.confidence == pytest.approx(0.47)
    assert decision.context["final_confidence"] == pytest.approx(0.47)
    assert decision.context["advisor"]["source"] == "deepseek"
    assert decision.context["advisor"]["rationale"] == "Policy support"


def test_trade_logic_manages_break_even_and_trailing_stops():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=1.0,
        use_adr=False,
        break_even_pips=5.0,
        trail_start_pips=10.0,
        trail_step_pips=5.0,
    )
    logic = TradeLogic(config=config)

    class NeutralStrategy:
        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0)

    logic.strategy = NeutralStrategy()

    opened_at = datetime.now(timezone.utc)
    open_positions = [
        ActivePosition(
            symbol="EURUSD",
            direction=1,
            size=0.1,
            entry_price=1.1000,
            stop_loss=1.0950,
            take_profit=1.1200,
            opened_at=opened_at,
        )
    ]

    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=datetime.now(timezone.utc),
        close=1.1020,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions = logic.on_bar(snapshot, open_positions=open_positions)

    modify_decisions = [decision for decision in decisions if decision.action == "modify"]
    assert modify_decisions, "expected stop management decision"
    decision = modify_decisions[0]
    expected_stop = pytest.approx(1.1015, rel=1e-6)
    assert decision.stop_loss == expected_stop
    assert "breakeven" in decision.reason.lower()
    assert "trailing" in decision.reason.lower()
    assert "breakeven" in decision.context["components"]
    assert "trailing" in decision.context["components"]
    assert decision.context["previous_stop_loss"] == 1.0950


def test_trade_logic_handles_zero_stop_loss_inputs():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=1.0,
        use_adr=False,
        break_even_pips=5.0,
        trail_start_pips=10.0,
        trail_step_pips=5.0,
    )
    logic = TradeLogic(config=config)

    class NeutralStrategy:
        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0)

    logic.strategy = NeutralStrategy()

    opened_at = datetime.now(timezone.utc)
    open_positions = [
        ActivePosition(
            symbol="EURUSD",
            direction=-1,
            size=0.1,
            entry_price=1.1000,
            stop_loss=0.0,
            take_profit=1.0800,
            opened_at=opened_at,
        )
    ]

    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=datetime.now(timezone.utc),
        close=1.0980,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions = logic.on_bar(snapshot, open_positions=open_positions)

    modify_decisions = [decision for decision in decisions if decision.action == "modify"]
    assert modify_decisions, "expected stop management decision for zero stop loss"
    decision = modify_decisions[0]
    expected_stop = pytest.approx(1.0985, rel=1e-6)
    assert decision.stop_loss == expected_stop
    assert "breakeven" in decision.reason.lower()
    assert "trailing" in decision.reason.lower()
    assert "breakeven" in decision.context["components"]
    assert "trailing" in decision.context["components"]
    assert decision.context["previous_stop_loss"] is None
