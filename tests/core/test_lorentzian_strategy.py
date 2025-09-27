from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.strategies.lorentzian import LorentzianSignalState, lorentzian_distance, rolling_signal
from algorithms.python.trade_logic import _lorentzian_distance


def test_lorentzian_distance_wrapper_matches_core() -> None:
    a = [1.0, 2.0, 3.0]
    b = [0.0, 1.0, 1.5]
    assert lorentzian_distance(a, b) == _lorentzian_distance(a, b)
    assert lorentzian_distance(a, b, mode="l1") == _lorentzian_distance(a, b, mode="l1")


def test_rolling_signal_generates_mean_reversion_bias() -> None:
    prices = [100 + i * 0.5 for i in range(80)]
    state = rolling_signal(
        prices,
        window=20,
        alpha=0.5,
        style="mean_rev",
        enter_z=1.0,
        exit_z=0.25,
    )
    assert isinstance(state, LorentzianSignalState)
    assert state.signal in {"SELL", "HOLD"}
    assert state.regime in {"stressed", "transition"}


def test_rolling_signal_flips_for_trend_style() -> None:
    prices = [200 - i * 0.3 for i in range(80)]
    state = rolling_signal(
        prices,
        window=20,
        alpha=0.5,
        style="trend",
        enter_z=1.0,
        exit_z=0.25,
    )
    assert isinstance(state, LorentzianSignalState)
    assert state.signal in {"SELL", "HOLD"}
    assert state.regime in {"stressed", "transition"}


def test_rolling_signal_requires_history() -> None:
    assert rolling_signal([1.0] * 10, window=8) is None
