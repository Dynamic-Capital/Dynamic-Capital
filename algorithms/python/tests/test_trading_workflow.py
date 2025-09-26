from __future__ import annotations

from collections import deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from algorithms.python.backtesting import Backtester
from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from algorithms.python.model_artifacts import load_artifacts, save_artifacts
from algorithms.python.grok_advisor import AdvisorFeedback
from algorithms.python.offline_labeler import LabelingConfig, OfflineLabeler
from algorithms.python.realtime import InMemoryStateStore, RealtimeExecutor
from algorithms.python.trade_logic import (
    ActivePosition,
    FeaturePipeline,
    LabeledFeature,
    LorentzianKNNModel,
    LorentzianKNNStrategy,
    MarketSnapshot,
    SMCZone,
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
    vector = (10.0, 20.0, 30.0, 40.0, 0.5, 0.1, -0.05, 0.2, 0.15, 0.3)
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
    signal = model.predict((0.1, 0.1, 0.1, 0.1), timestamp=timestamp)
    assert signal is not None
    assert signal.direction == 1


def test_lorentzian_knn_model_skips_unlabelled_samples():
    timestamp = datetime.now(timezone.utc)
    model = LorentzianKNNModel(neighbors=2)
    model.add_sample(
        LabeledFeature(features=(0.0, 0.0, 0.0, 0.0), label=1, close=1.0, timestamp=timestamp)
    )
    model.add_sample(
        LabeledFeature(features=(10.0, 10.0, 10.0, 10.0), label=None, close=1.0, timestamp=timestamp)
    )
    assert model.predict((0.1, 0.1, 0.1, 0.1), timestamp=timestamp) is None


def test_lorentzian_knn_model_prediction_consistency_with_unlabelled_entries():
    timestamp = datetime.now(timezone.utc)
    model = LorentzianKNNModel(neighbors=1)
    labeled = LabeledFeature(
        features=(0.0, 0.0, 0.0, 0.0),
        label=1,
        close=1.0,
        timestamp=timestamp,
    )
    model.add_sample(labeled)
    model.add_sample(
        LabeledFeature(features=(10.0, 10.0, 10.0, 10.0), label=None, close=1.0, timestamp=timestamp)
    )
    first_signal = model.predict((0.1, 0.1, 0.1, 0.1), timestamp=timestamp)
    assert first_signal is not None
    assert first_signal.direction == 1

    # Ensure cached predictions remain the same when requesting again.
    cached_signal = model.predict((0.1, 0.1, 0.1, 0.1), timestamp=timestamp)
    assert cached_signal is not None
    assert cached_signal.direction == first_signal.direction


def test_lorentzian_knn_model_serializes_weights():
    timestamp = datetime.now(timezone.utc)
    model = LorentzianKNNModel(neighbors=1, grok_weight=0.7, deepseek_weight=0.2)
    model.add_sample(
        LabeledFeature(features=(0.0, 0.0, 0.0, 0.0), label=1, close=1.0, timestamp=timestamp)
    )
    state = model.state_dict()
    assert state["weights"]["grok"] == pytest.approx(0.7)
    restored = LorentzianKNNModel.from_state(state)
    assert restored.grok_weight == pytest.approx(0.7)
    assert restored.deepseek_weight == pytest.approx(0.2)


def test_lorentzian_knn_model_applies_advisor_feedback():
    timestamp = datetime.now(timezone.utc)
    model = LorentzianKNNModel(neighbors=1)
    model.add_sample(
        LabeledFeature(features=(0.0, 0.0, 0.0, 0.0), label=1, close=1.0, timestamp=timestamp)
    )

    snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=timestamp,
        close=1800.0,
        rsi_fast=55.0,
        adx_fast=22.0,
        rsi_slow=50.0,
        adx_slow=20.0,
        pip_size=0.1,
        pip_value=1.0,
    )

    class StubAdvisor:
        def __init__(self) -> None:
            self.calls = 0

        def review(self, *, snapshot, signal, context, open_positions):
            self.calls += 1
            assert snapshot.symbol == "XAUUSD"
            assert context["risk"] == "medium"
            return AdvisorFeedback(
                adjusted_signal=TradeSignal(
                    direction=-signal.direction,
                    confidence=0.5,
                    votes=signal.votes,
                    neighbors_considered=signal.neighbors_considered,
                ),
                metadata={"source": "dual_llm"},
            )

    advisor = StubAdvisor()
    signal, feedbacks = model.evaluate_with_advisors(
        (0.1, 0.1, 0.1, 0.1),
        snapshot=snapshot,
        context={"risk": "medium"},
        open_positions=[],
        advisors=[advisor],
    )

    assert advisor.calls == 1
    assert signal is not None
    assert signal.direction == -1
    assert feedbacks and feedbacks[0].metadata["source"] == "dual_llm"


def test_lorentzian_strategy_respects_mechanical_bias() -> None:
    timestamp = datetime.now(timezone.utc)
    strategy = LorentzianKNNStrategy(
        neighbors=1,
        max_rows=64,
        label_lookahead=0,
        neutral_zone_pips=0.1,
        recency_halflife_minutes=None,
    )

    bullish_snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=timestamp,
        close=1800.0,
        rsi_fast=55.0,
        adx_fast=22.0,
        rsi_slow=52.0,
        adx_slow=19.0,
        pip_size=0.1,
        pip_value=1.0,
        mechanical_velocity=0.8,
        mechanical_acceleration=0.4,
        mechanical_jerk=0.2,
        mechanical_energy=0.7,
        mechanical_stress_ratio=0.3,
        mechanical_state="Bullish",
    )

    base_features = bullish_snapshot.feature_vector()
    strategy.pipeline.push(base_features)
    strategy.model.add_sample(
        LabeledFeature(
            features=strategy.pipeline.transform(base_features, update=False),
            label=1,
            close=bullish_snapshot.close,
            timestamp=timestamp,
        )
    )

    bullish_signal = strategy.update(bullish_snapshot)
    assert bullish_signal is not None
    assert bullish_signal.direction == 1

    bearish_snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=timestamp + timedelta(minutes=5),
        close=1799.5,
        rsi_fast=55.0,
        adx_fast=22.0,
        rsi_slow=52.0,
        adx_slow=19.0,
        pip_size=0.1,
        pip_value=1.0,
        mechanical_velocity=-0.9,
        mechanical_acceleration=-0.5,
        mechanical_jerk=-0.3,
        mechanical_energy=0.8,
        mechanical_stress_ratio=0.3,
        mechanical_state="Bearish",
    )

    conflicting_signal = strategy.update(bearish_snapshot)
    assert conflicting_signal is not None
    assert conflicting_signal.direction == 0

    supportive_snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=timestamp + timedelta(minutes=10),
        close=1801.0,
        rsi_fast=55.0,
        adx_fast=22.0,
        rsi_slow=52.0,
        adx_slow=19.0,
        pip_size=0.1,
        pip_value=1.0,
        mechanical_velocity=1.2,
        mechanical_acceleration=0.7,
        mechanical_jerk=0.4,
        mechanical_energy=1.0,
        mechanical_stress_ratio=0.2,
        mechanical_state="Bullish",
    )

    supportive_signal = strategy.update(supportive_snapshot)
    assert supportive_signal is not None
    assert supportive_signal.direction == 1
    assert supportive_signal.confidence >= 0.8


def test_lorentzian_knn_model_prefers_recent_samples():
    now = datetime.now(timezone.utc)
    model = LorentzianKNNModel(neighbors=1, recency_halflife_minutes=60)
    model.fit(
        [
            LabeledFeature(
                features=(0.0, 0.0, 0.0, 0.0),
                label=1,
                close=1.0,
                timestamp=now - timedelta(hours=12),
            ),
            LabeledFeature(
                features=(1.0, 1.0, 1.0, 1.0),
                label=-1,
                close=1.0,
                timestamp=now - timedelta(minutes=5),
            ),
        ]
    )

    signal = model.predict((0.5, 0.5, 0.5, 0.5), timestamp=now)

    assert signal is not None
    assert signal.direction == -1


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


def test_trade_logic_exposes_signal_context():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        use_smc_context=False,
    )
    logic = TradeLogic(config=config)

    base_signal = TradeSignal(direction=1, confidence=0.7, votes=5, neighbors_considered=7)

    class StaticStrategy:
        def __init__(self, signal: TradeSignal) -> None:
            self._signal = signal

        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return self._signal

    logic.strategy = StaticStrategy(base_signal)

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
        correlation_scores={"EURUSD": 0.8},
        seasonal_bias=0.5,
        seasonal_confidence=0.9,
    )

    open_positions = [
        ActivePosition(symbol="EURUSD", direction=1, size=0.2, entry_price=1.1000)
    ]

    context_snapshot = logic.compute_signal_context(
        snapshot=snapshot,
        signal=base_signal,
        open_positions=open_positions,
    )

    decisions = logic.on_bar(snapshot, open_positions=open_positions)
    open_decision = next(dec for dec in decisions if dec.action == "open")

    assert open_decision.signal is not None
    assert open_decision.context == context_snapshot
    assert open_decision.signal.confidence == pytest.approx(
        context_snapshot["final_confidence"], rel=1e-6
    )


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


def test_trade_logic_smc_zones_balance_support_and_pressure():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        smc_structure_lookback=3,
        smc_structure_threshold_pips=5.0,
        smc_level_threshold_pips=15.0,
        smc_round_number_interval_pips=50.0,
        smc_bias_weight=0.2,
        smc_liquidity_weight=0.1,
        max_smc_adjustment=0.4,
    )
    logic = TradeLogic(config=config)

    signals = deque(
        [
            TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0),
            TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=0),
            TradeSignal(direction=1, confidence=0.75, votes=7, neighbors_considered=9),
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

    base_time = datetime(2024, 3, 6, 12, 0, tzinfo=timezone.utc)
    snapshots = [
        MarketSnapshot(
            symbol="EURUSD",
            timestamp=base_time,
            open=1.2000,
            high=1.2010,
            low=1.1990,
            close=1.2000,
            rsi_fast=52.0,
            adx_fast=18.0,
            rsi_slow=49.0,
            adx_slow=16.0,
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
            symbol="EURUSD",
            timestamp=base_time + timedelta(minutes=5),
            open=1.2000,
            high=1.2030,
            low=1.1995,
            close=1.2025,
            rsi_fast=55.0,
            adx_fast=20.0,
            rsi_slow=50.5,
            adx_slow=17.2,
            pip_size=0.0001,
            pip_value=10.0,
            daily_high=1.2030,
            daily_low=1.1995,
            previous_daily_high=1.1985,
            previous_daily_low=1.1950,
            weekly_high=1.2050,
            weekly_low=1.1950,
            previous_week_high=1.2100,
            previous_week_low=1.1900,
        ),
        MarketSnapshot(
            symbol="EURUSD",
            timestamp=base_time + timedelta(minutes=10),
            open=1.2025,
            high=1.2035,
            low=1.2010,
            close=1.2020,
            rsi_fast=56.5,
            adx_fast=21.0,
            rsi_slow=51.0,
            adx_slow=17.5,
            pip_size=0.0001,
            pip_value=10.0,
            daily_high=1.2035,
            daily_low=1.1995,
            previous_daily_high=1.2035,
            previous_daily_low=1.1950,
            weekly_high=1.2050,
            weekly_low=1.1950,
            previous_week_high=1.2100,
            previous_week_low=1.1900,
            smc_zones=[
                SMCZone(
                    name="Demand-Base",
                    price=1.2010,
                    side="demand",
                    role="continuation",
                    strength=1.5,
                    metadata={"note": "London continuation zone"},
                ),
                {
                    "name": "Supply-Flip",
                    "price": 1.2030,
                    "side": "supply",
                    "role": "reversal",
                    "strength": 0.8,
                },
            ],
        ),
    ]

    decisions: list[TradeDecision] = []
    for snapshot in snapshots:
        decisions = logic.on_bar(snapshot)

    open_decisions = [decision for decision in decisions if decision.action == "open"]
    assert open_decisions, "expected an open trade decision with enhanced SMC context"

    decision = open_decisions[0]
    smc_context = decision.context["smc"]
    assert smc_context["enabled"]
    assert smc_context["structure"]["bias"] == 1
    liquidity = smc_context["liquidity"]
    assert "Demand-Base" in liquidity["supportive_levels"]
    assert "Supply-Flip" in liquidity["penalised_levels"]
    assert liquidity["support"] == pytest.approx(0.18, rel=1e-3)
    assert liquidity["penalty"] == pytest.approx(0.072, rel=1e-3)
    assert smc_context["components"]["liquidity_penalty"] == pytest.approx(
        0.108, rel=1e-3
    )
    assert smc_context["modifier"] == pytest.approx(1.308, rel=1e-3)


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


def test_trade_logic_recomputes_context_after_advisor_override():
    config = TradeConfig(
        neighbors=1,
        label_lookahead=0,
        min_confidence=0.0,
        use_adr=False,
        use_smc_context=False,
        correlation_threshold=0.6,
        correlation_weight=0.5,
        max_correlation_adjustment=0.4,
    )
    logic = TradeLogic(config=config)

    class StaticStrategy:
        def __init__(self, signal: TradeSignal) -> None:
            self._signal = signal

        def update(self, snapshot: MarketSnapshot) -> TradeSignal:
            return self._signal

    base_signal = TradeSignal(direction=1, confidence=0.6, votes=5, neighbors_considered=8)
    logic.strategy = StaticStrategy(base_signal)

    opened_at = datetime.now(timezone.utc) - timedelta(hours=1)
    open_positions = [
        ActivePosition(
            symbol="GBPUSD",
            direction=1,
            size=0.5,
            entry_price=1.2000,
            stop_loss=1.1900,
            take_profit=1.2200,
            opened_at=opened_at,
        )
    ]

    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=datetime.now(timezone.utc),
        close=1.1050,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
        correlation_scores={"GBPUSD": 0.9},
    )

    class FlippingAdvisor:
        def __init__(self) -> None:
            self.calls = 0
            self.initial_context = None

        def review(self, *, snapshot, signal, context, open_positions):
            self.calls += 1
            assert context["correlation"]["penalised"], "expected initial correlation penalty"
            self.initial_context = context
            return AdvisorFeedback(
                adjusted_signal=TradeSignal(
                    direction=-signal.direction,
                    confidence=signal.confidence,
                    votes=signal.votes,
                    neighbors_considered=signal.neighbors_considered,
                ),
                metadata={"source": "flip"},
            )

    advisor = FlippingAdvisor()

    decisions = logic.on_bar(snapshot, open_positions=open_positions, advisor=advisor)
    decision = next(dec for dec in decisions if dec.action == "open")

    assert advisor.calls == 1
    assert decision.signal is not None
    assert decision.signal.direction == -1
    assert advisor.initial_context is not None
    assert decision.signal.confidence > advisor.initial_context["final_confidence"]

    context = decision.context
    assert not context["correlation"]["penalised"], "penalty should be cleared after flip"
    assert any(entry["symbol"] == "GBPUSD" for entry in context["correlation"]["boosted"])
    assert context["original_confidence"] == pytest.approx(
        advisor.initial_context["final_confidence"], rel=1e-6
    )
    assert context["final_confidence"] == pytest.approx(decision.signal.confidence, rel=1e-6)
    assert context["advisor"]["source"] == "flip"


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

def test_generate_exit_decisions_respect_intrabar_stop_levels():
    logic = TradeLogic(config=TradeConfig(neighbors=1))
    now = datetime.now(timezone.utc)
    position = ActivePosition(
        symbol="EURUSD",
        direction=1,
        size=1.0,
        entry_price=1.2,
        stop_loss=1.195,
        take_profit=1.21,
    )
    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=now,
        close=1.204,
        open=1.204,
        high=1.206,
        low=1.1945,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=50.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions, remaining = logic._generate_exit_decisions(snapshot, [position])

    assert not remaining
    assert len(decisions) == 1
    decision = decisions[0]
    assert decision.context["trigger"] == "stop_loss"
    assert decision.exit == pytest.approx(1.195)


def test_generate_exit_decisions_handles_price_gaps():
    logic = TradeLogic(config=TradeConfig(neighbors=1))
    now = datetime.now(timezone.utc)
    position = ActivePosition(
        symbol="EURUSD",
        direction=1,
        size=1.0,
        entry_price=1.2,
        stop_loss=1.195,
        take_profit=1.21,
    )
    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=now,
        close=1.194,
        open=1.193,
        high=1.196,
        low=1.192,
        rsi_fast=45.0,
        adx_fast=22.0,
        rsi_slow=40.0,
        adx_slow=19.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions, _ = logic._generate_exit_decisions(snapshot, [position])

    assert decisions
    assert decisions[0].exit == pytest.approx(1.193)
    assert decisions[0].context["trigger"] == "stop_loss"


def test_generate_exit_decisions_prioritises_nearest_level_when_both_hit():
    logic = TradeLogic(config=TradeConfig(neighbors=1))
    now = datetime.now(timezone.utc)
    position = ActivePosition(
        symbol="EURUSD",
        direction=1,
        size=1.0,
        entry_price=1.2,
        stop_loss=1.19,
        take_profit=1.205,
    )
    snapshot = MarketSnapshot(
        symbol="EURUSD",
        timestamp=now,
        close=1.201,
        open=1.203,
        high=1.207,
        low=1.189,
        rsi_fast=60.0,
        adx_fast=25.0,
        rsi_slow=52.0,
        adx_slow=21.0,
        pip_size=0.0001,
        pip_value=10.0,
    )

    decisions, _ = logic._generate_exit_decisions(snapshot, [position])

    assert decisions
    assert decisions[0].context["trigger"] == "take_profit"
    assert decisions[0].exit == pytest.approx(1.205)
