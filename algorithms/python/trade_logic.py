"""High-level trade decision engine powered by a Lorentzian k-NN classifier.

This module provides a Python implementation of the Lorentzian classification
logic used by the MetaTrader 5 expert advisor bundled with the Dynamic Capital
repository.  It mirrors the behaviour of the original MQL5 strategy while being
framework agnostic so it can run inside research notebooks, Supabase Edge
Functions, or bespoke automation services.

The implementation attempts to reuse the feature engineering utilities and
kernel helpers published in the jdehorty Hugging Face repositories.  The modules
can be referenced with the shorthand path syntax used by Lovable Codex, e.g.
``"jdehorty/MLExtensions/2"``.  When those dependencies are not available the
trade logic gracefully falls back to built-in implementations so the strategy
remains operational in air-gapped environments.
"""

from __future__ import annotations

import importlib
import logging
import math
import sys
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime
from types import ModuleType, SimpleNamespace
from typing import Callable, List, Literal, Optional, Sequence

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())


# ---------------------------------------------------------------------------
# Remote module loader
# ---------------------------------------------------------------------------


def _load_remote_module(module_spec: str) -> ModuleType | SimpleNamespace:
    """Load a module that may live in a remote Hugging Face repository.

    The Dynamic Capital research environment references a handful of reusable
    utilities that are distributed via Hugging Face Spaces.  Lovable Codex uses
    a slash-delimited syntax (``owner/repo/revision``) to reference those
    resources.  This helper understands the shorthand and will attempt to
    download the repository snapshot when the package is not already available
    locally.

    Parameters
    ----------
    module_spec:
        Either a standard Python module path (``package.module``) or a
        Hugging Face style identifier of the form ``owner/repo/revision``.

    Returns
    -------
    ModuleType | SimpleNamespace
        The imported module or a placeholder namespace when the dependency
        could not be resolved.  Callers should always be prepared for the
        fallback scenario.
    """

    if "/" not in module_spec:
        return importlib.import_module(module_spec)

    repo_path, revision = module_spec.rsplit("/", 1)
    module_name = repo_path.split("/")[-1].replace("-", "_")

    # Attempt a regular import first – the package may already be installed.
    try:
        return importlib.import_module(module_name)
    except ImportError:
        pass

    try:
        from huggingface_hub import snapshot_download  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency
        logger.warning(
            "huggingface_hub is required to fetch %s: %s", module_spec, exc
        )
        return SimpleNamespace()

    last_error: Exception | None = None
    for repo_type in (None, "model", "dataset", "space"):
        download_kwargs = {
            "repo_id": repo_path,
            "revision": revision,
        }
        if repo_type is not None:
            download_kwargs["repo_type"] = repo_type
        try:
            local_dir = snapshot_download(**download_kwargs)
        except Exception as exc:  # pragma: no cover - network variability
            last_error = exc
            continue

        if local_dir not in sys.path:
            sys.path.insert(0, local_dir)
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # pragma: no cover - module layout mismatch
            last_error = exc
            continue
        logger.info("Loaded %s from Hugging Face snapshot %s", module_spec, local_dir)
        return module

    if last_error is not None:
        logger.warning("Failed to load %s: %s", module_spec, last_error)
    return SimpleNamespace()


ml = _load_remote_module("jdehorty/MLExtensions/2")
kernels = _load_remote_module("jdehorty/KernelFunctions/2")


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class FeatureRow:
    """Historical feature sample with an optional forward-looking label."""

    features: tuple[float, ...]
    close: float
    timestamp: datetime
    label: Optional[int] = None


@dataclass(slots=True)
class MarketSnapshot:
    """Normalized view of the market data required by the strategy."""

    symbol: str
    timestamp: datetime
    close: float
    rsi_fast: float
    adx_fast: float
    rsi_slow: float
    adx_slow: float
    pip_size: float
    pip_value: float
    daily_high: Optional[float] = None
    daily_low: Optional[float] = None

    def feature_vector(self) -> tuple[float, float, float, float]:
        return (self.rsi_fast, self.adx_fast, self.rsi_slow, self.adx_slow)


@dataclass(slots=True)
class TradeSignal:
    """Output of the Lorentzian k-NN model."""

    direction: int
    confidence: float
    votes: int
    neighbors_considered: int


@dataclass(slots=True)
class TradeDecision:
    """Action emitted by the trade engine."""

    action: Literal["open", "close"]
    symbol: str
    direction: Optional[int] = None
    size: Optional[float] = None
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    reason: str = ""
    signal: Optional[TradeSignal] = None


@dataclass(slots=True)
class ActivePosition:
    """Simplified representation of an open trade."""

    symbol: str
    direction: int
    size: float
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


@dataclass(slots=True)
class TradeConfig:
    """Configuration parameters for :class:`TradeLogic`."""

    neighbors: int = 8
    max_rows: int = 2_000
    label_lookahead: int = 4
    neutral_zone_pips: float = 2.0
    manual_stop_loss_pips: float = 30.0
    manual_take_profit_pips: float = 60.0
    use_adr: bool = True
    adr_period: int = 14
    adr_stop_loss_factor: float = 0.5
    adr_take_profit_factor: float = 1.0
    min_confidence: float = 0.0


@dataclass(slots=True)
class RiskParameters:
    """Risk controls used by :class:`RiskManager`."""

    balance: float = 10_000.0
    risk_per_trade: float = 0.01
    pip_value_per_standard_lot: float = 10.0
    min_lot: float = 0.01
    lot_step: float = 0.01
    max_lot: Optional[float] = None
    max_positions_per_symbol: int = 1
    max_total_positions: int = 3
    max_daily_drawdown_pct: Optional[float] = None


# ---------------------------------------------------------------------------
# Feature pipeline helpers
# ---------------------------------------------------------------------------


class OnlineFeatureScaler:
    """Simple online mean/std estimator used to normalise features."""

    def __init__(self) -> None:
        self._count = 0
        self._mean: list[float] | None = None
        self._m2: list[float] | None = None

    def push(self, values: Sequence[float]) -> tuple[float, ...]:
        vector = tuple(float(v) for v in values)
        if self._count == 0:
            self._mean = list(vector)
            self._m2 = [0.0 for _ in vector]
            self._count = 1
            return tuple(0.0 for _ in vector)

        assert self._mean is not None and self._m2 is not None

        if len(vector) != len(self._mean):
            raise ValueError("Feature dimensionality changed; cannot normalise.")

        normalised: list[float] = []
        for idx, value in enumerate(vector):
            mean = self._mean[idx]
            if self._count > 1:
                variance = self._m2[idx] / (self._count - 1)
                std = math.sqrt(variance) if variance > 1e-12 else 1.0
            else:
                std = 1.0
            normalised.append((value - mean) / std)

        self._count += 1
        for idx, value in enumerate(vector):
            delta = value - self._mean[idx]
            self._mean[idx] += delta / self._count
            self._m2[idx] += delta * (value - self._mean[idx])

        return tuple(normalised)


class FeaturePipeline:
    """Pipeline that optionally leverages jdehorty ML helpers for scaling."""

    def __init__(self) -> None:
        self._scaler = self._resolve_remote_scaler() or OnlineFeatureScaler()

    @staticmethod
    def _resolve_remote_scaler() -> Optional[object]:
        if not hasattr(ml, "__dict__"):
            return None

        candidate_names = [
            "OnlineStandardScaler",
            "OnlineStandardizer",
            "FeatureScaler",
            "RunningFeatureScaler",
            "AdaptiveScaler",
        ]
        module_name = getattr(ml, "__name__", "ml")
        for name in candidate_names:
            attr = getattr(ml, name, None)
            if attr is None:
                continue
            try:
                instance = attr()
            except Exception:
                continue
            if hasattr(instance, "push"):
                logger.info("Using %s.%s for feature scaling", module_name, name)
                return instance
            if hasattr(instance, "transform") and hasattr(instance, "partial_fit"):
                logger.info(
                    "Wrapping %s.%s (sklearn-style scaler) for feature scaling",
                    module_name,
                    name,
                )
                return _SklearnLikeScaler(instance)
        return None

    def push(self, values: Sequence[float]) -> tuple[float, ...]:
        if hasattr(self._scaler, "push"):
            return tuple(self._scaler.push(values))  # type: ignore[attr-defined]
        if hasattr(self._scaler, "transform"):
            transformed = self._scaler.transform([list(values)])  # type: ignore[attr-defined]
            return tuple(float(x) for x in transformed[0])
        return tuple(float(v) for v in values)


class _SklearnLikeScaler:
    """Adapter that exposes ``push`` for sklearn-style scalers."""

    def __init__(self, scaler: object) -> None:
        self._scaler = scaler
        self._is_fitted = False

    def push(self, values: Sequence[float]) -> tuple[float, ...]:
        vector = [list(values)]
        if not self._is_fitted:
            if hasattr(self._scaler, "partial_fit"):
                self._scaler.partial_fit(vector)
            else:
                self._scaler.fit(vector)
            self._is_fitted = True
        transformed = self._scaler.transform(vector)
        return tuple(float(x) for x in transformed[0])


# ---------------------------------------------------------------------------
# Distance helpers
# ---------------------------------------------------------------------------


def _lorentzian_distance(a: Sequence[float], b: Sequence[float]) -> float:
    return float(sum(math.log1p(abs(x - y)) for x, y in zip(a, b)))


def _resolve_distance_function() -> Callable[[Sequence[float], Sequence[float]], float]:
    if not hasattr(kernels, "__dict__"):
        return _lorentzian_distance

    candidate_names = [
        "lorentzian_distance",
        "lorentzian_metric",
        "log_kernel_distance",
        "log_distance",
        "lorentzian_kernel",
    ]
    module_name = getattr(kernels, "__name__", "kernels")
    for name in candidate_names:
        fn = getattr(kernels, name, None)
        if callable(fn):
            try:
                test_value = fn((0.0, 0.0), (0.0, 0.0))
            except Exception:
                continue
            if isinstance(test_value, (int, float)):
                logger.info("Using %s.%s as distance function", module_name, name)
                return lambda a, b, _fn=fn: float(_fn(tuple(a), tuple(b)))

    for name in dir(kernels):
        if "lorentz" not in name.lower():
            continue
        fn = getattr(kernels, name, None)
        if callable(fn):
            logger.info("Using %s.%s as distance function", module_name, name)
            return lambda a, b, _fn=fn: float(_fn(tuple(a), tuple(b)))

    return _lorentzian_distance


# ---------------------------------------------------------------------------
# Strategy core
# ---------------------------------------------------------------------------


class LorentzianKNNStrategy:
    """k-NN classifier with Lorentzian distance for directional signals."""

    def __init__(
        self,
        *,
        neighbors: int,
        max_rows: int,
        label_lookahead: int,
        neutral_zone_pips: float,
    ) -> None:
        if neighbors <= 0:
            raise ValueError("neighbors must be positive")
        if max_rows <= 0:
            raise ValueError("max_rows must be positive")
        if label_lookahead < 0:
            raise ValueError("label_lookahead cannot be negative")

        self.neighbors = neighbors
        self.max_rows = max_rows
        self.label_lookahead = label_lookahead
        self.neutral_zone_pips = neutral_zone_pips
        self.pipeline = FeaturePipeline()
        self.distance_fn = _resolve_distance_function()
        self._rows: deque[FeatureRow] = deque()

    def update(self, snapshot: MarketSnapshot) -> Optional[TradeSignal]:
        features = snapshot.feature_vector()
        transformed = self.pipeline.push(features)
        row = FeatureRow(features=transformed, close=snapshot.close, timestamp=snapshot.timestamp)
        self._rows.append(row)
        if len(self._rows) > self.max_rows:
            self._rows.popleft()

        if self.label_lookahead > 0 and len(self._rows) > self.label_lookahead:
            label_index = -self.label_lookahead - 1
            try:
                label_row = list(self._rows)[label_index]
            except IndexError:
                label_row = None
            if label_row is not None and label_row.label is None:
                move_pips = abs(snapshot.close - label_row.close) / snapshot.pip_size
                if move_pips < self.neutral_zone_pips:
                    label_row.label = 0
                else:
                    label_row.label = 1 if snapshot.close > label_row.close else -1

        return self._evaluate(transformed)

    def _evaluate(self, features: Sequence[float]) -> Optional[TradeSignal]:
        labelled_rows = [row for row in self._rows if row.label is not None]
        if len(labelled_rows) < self.neighbors:
            return None

        distances: list[tuple[float, int]] = []
        for row in labelled_rows:
            distance = self.distance_fn(row.features, features)
            distances.append((distance, int(row.label)))
        distances.sort(key=lambda item: item[0])

        limit = min(self.neighbors, len(distances))
        vote = sum(label for _, label in distances[:limit])
        if vote > 0:
            direction = 1
        elif vote < 0:
            direction = -1
        else:
            return TradeSignal(direction=0, confidence=0.0, votes=0, neighbors_considered=limit)

        confidence = abs(vote) / limit if limit else 0.0
        return TradeSignal(direction=direction, confidence=confidence, votes=vote, neighbors_considered=limit)


# ---------------------------------------------------------------------------
# Risk management
# ---------------------------------------------------------------------------


class RiskManager:
    """Basic risk framework that mimics the MQL5 EA configuration."""

    def __init__(self, params: Optional[RiskParameters] = None) -> None:
        self.params = params or RiskParameters()
        self._daily_start_equity: Optional[float] = None
        self._daily_marker: Optional[date] = None

    def update_equity(self, equity: float, *, timestamp: Optional[datetime] = None) -> None:
        ts_date = (timestamp or datetime.utcnow()).date()
        if self._daily_marker != ts_date:
            self._daily_marker = ts_date
            self._daily_start_equity = equity
        self.params.balance = equity

    def can_open(
        self,
        *,
        symbol: str,
        open_positions: Sequence[ActivePosition],
        timestamp: datetime,
        direction: int,
        equity: Optional[float] = None,
    ) -> bool:
        if equity is not None:
            self.update_equity(equity, timestamp=timestamp)

        if len(open_positions) >= self.params.max_total_positions:
            return False

        symbol_positions = [pos for pos in open_positions if pos.symbol == symbol]
        if len(symbol_positions) >= self.params.max_positions_per_symbol:
            return False

        if self.params.max_daily_drawdown_pct is not None and self._daily_start_equity:
            threshold = self._daily_start_equity * (1 - self.params.max_daily_drawdown_pct / 100)
            if self.params.balance <= threshold:
                return False

        opposing_positions = [pos for pos in symbol_positions if pos.direction != direction]
        if opposing_positions and len(symbol_positions) >= self.params.max_positions_per_symbol:
            return False

        return True

    def position_size(self, *, stop_loss_pips: float, pip_value: float) -> float:
        if stop_loss_pips <= 0 or pip_value <= 0:
            return round(self.params.min_lot, 4)

        risk_amount = self.params.balance * self.params.risk_per_trade
        if risk_amount <= 0:
            return 0.0

        raw_lot = risk_amount / (stop_loss_pips * pip_value)
        if self.params.max_lot is not None:
            raw_lot = min(raw_lot, self.params.max_lot)

        lot_steps = max(1, math.floor(raw_lot / self.params.lot_step))
        size = lot_steps * self.params.lot_step
        return max(self.params.min_lot, round(size, 4))


# ---------------------------------------------------------------------------
# Average daily range tracker
# ---------------------------------------------------------------------------


class ADRTracker:
    """Maintains a rolling estimate of the Average Daily Range (ADR)."""

    def __init__(self, period: int) -> None:
        if period <= 0:
            raise ValueError("ADR period must be positive")
        self.period = period
        self._ranges: deque[float] = deque(maxlen=period)
        self._last_update: Optional[date] = None

    def update(self, *, timestamp: datetime, high: Optional[float], low: Optional[float], pip_size: float) -> None:
        if high is None or low is None or pip_size <= 0:
            return
        day = timestamp.date()
        if self._last_update == day:
            return
        self._last_update = day
        self._ranges.append(abs(high - low) / pip_size)

    @property
    def value(self) -> Optional[float]:
        if not self._ranges:
            return None
        return sum(self._ranges) / len(self._ranges)


# ---------------------------------------------------------------------------
# Trade logic orchestrator
# ---------------------------------------------------------------------------


class TradeLogic:
    """High-level trade planner that combines model signals and risk controls."""

    def __init__(
        self,
        config: Optional[TradeConfig] = None,
        risk: Optional[RiskManager] = None,
    ) -> None:
        self.config = config or TradeConfig()
        self.strategy = LorentzianKNNStrategy(
            neighbors=self.config.neighbors,
            max_rows=self.config.max_rows,
            label_lookahead=self.config.label_lookahead,
            neutral_zone_pips=self.config.neutral_zone_pips,
        )
        self.risk = risk or RiskManager()
        self.adr_tracker = (
            ADRTracker(self.config.adr_period)
            if self.config.use_adr
            else None
        )

    def on_bar(
        self,
        snapshot: MarketSnapshot,
        *,
        open_positions: Sequence[ActivePosition] | None = None,
        account_equity: Optional[float] = None,
    ) -> List[TradeDecision]:
        open_positions = list(open_positions or [])

        if self.adr_tracker:
            self.adr_tracker.update(
                timestamp=snapshot.timestamp,
                high=snapshot.daily_high,
                low=snapshot.daily_low,
                pip_size=snapshot.pip_size,
            )

        signal = self.strategy.update(snapshot)
        if signal is None or signal.direction == 0:
            return []
        if signal.confidence < self.config.min_confidence:
            return []

        if not self.risk.can_open(
            symbol=snapshot.symbol,
            open_positions=open_positions,
            timestamp=snapshot.timestamp,
            direction=signal.direction,
            equity=account_equity,
        ):
            return []

        decisions: List[TradeDecision] = []
        opposing_positions = [pos for pos in open_positions if pos.symbol == snapshot.symbol and pos.direction != signal.direction]
        for pos in opposing_positions:
            decisions.append(
                TradeDecision(
                    action="close",
                    symbol=pos.symbol,
                    direction=pos.direction,
                    size=pos.size,
                    entry=pos.entry_price,
                    stop_loss=pos.stop_loss,
                    take_profit=pos.take_profit,
                    reason="Reverse signal",
                    signal=signal,
                )
            )

        stop_loss_pips, take_profit_pips = self._determine_sl_tp(snapshot)
        size = self.risk.position_size(stop_loss_pips=stop_loss_pips, pip_value=snapshot.pip_value)
        entry = snapshot.close
        if signal.direction > 0:
            stop_loss_price = entry - stop_loss_pips * snapshot.pip_size
            take_profit_price = entry + take_profit_pips * snapshot.pip_size
        else:
            stop_loss_price = entry + stop_loss_pips * snapshot.pip_size
            take_profit_price = entry - take_profit_pips * snapshot.pip_size

        decisions.append(
            TradeDecision(
                action="open",
                symbol=snapshot.symbol,
                direction=signal.direction,
                size=size,
                entry=entry,
                stop_loss=stop_loss_price,
                take_profit=take_profit_price,
                reason="Lorentzian k-NN signal",
                signal=signal,
            )
        )

        return decisions

    def _determine_sl_tp(self, snapshot: MarketSnapshot) -> tuple[float, float]:
        stop_loss_pips = self.config.manual_stop_loss_pips
        take_profit_pips = self.config.manual_take_profit_pips
        if self.config.use_adr and self.adr_tracker:
            adr_pips = self.adr_tracker.value
            if adr_pips:
                stop_loss_pips = max(0.1, adr_pips * self.config.adr_stop_loss_factor)
                take_profit_pips = max(0.1, adr_pips * self.config.adr_take_profit_factor)
        return (stop_loss_pips, take_profit_pips)


__all__ = [
    "ActivePosition",
    "FeatureRow",
    "MarketSnapshot",
    "RiskManager",
    "RiskParameters",
    "TradeConfig",
    "TradeDecision",
    "TradeLogic",
    "TradeSignal",
    "ml",
    "kernels",
]


if __name__ == "__main__":  # pragma: no cover - convenience usage example
    logging.basicConfig(level=logging.INFO)
    logic = TradeLogic()
    now = datetime.utcnow()
    snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=now,
        close=2350.50,
        rsi_fast=55.2,
        adx_fast=21.4,
        rsi_slow=48.7,
        adx_slow=18.9,
        pip_size=0.1,
        pip_value=1.0,
    )
    decisions = logic.on_bar(snapshot)
    for decision in decisions:
        print(decision)
