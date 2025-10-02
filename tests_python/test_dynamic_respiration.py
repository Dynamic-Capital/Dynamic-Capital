"""Unit tests for the dynamic respiration engine."""

from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_respiration import ChannelLoad, DynamicRespirationEngine, InformationPulse


def _pulse(channel: str, direction: str, magnitude: float, *, tags: tuple[str, ...] = ()) -> InformationPulse:
    return InformationPulse(channel=channel, direction=direction, magnitude=magnitude, tags=tags)


def test_channel_load_orders_channels_by_share() -> None:
    engine = DynamicRespirationEngine(history=10)
    engine.extend(
        [
            _pulse("alpha", "inflow", 4.0, tags=("signal",)),
            _pulse("alpha", "outflow", 1.0),
            _pulse("beta", "inflow", 1.0),
            _pulse("beta", "outflow", 3.0),
            _pulse("gamma", "inflow", 2.0),
        ]
    )

    loads = engine.channel_load()

    assert loads[0].channel == "alpha"
    assert pytest.approx(loads[0].inflow) == 4.0
    assert pytest.approx(loads[0].outflow) == 1.0
    assert pytest.approx(loads[0].net) == 3.0
    total_share = sum(load.share for load in loads)
    assert math.isclose(total_share, 1.0)


def test_channel_load_empty_history() -> None:
    engine = DynamicRespirationEngine()

    assert engine.channel_load() == ()


def test_momentum_detects_positive_trend() -> None:
    engine = DynamicRespirationEngine(history=20)
    engine.extend(
        [
            _pulse("alpha", "inflow", 1.0),
            _pulse("alpha", "outflow", 1.0),
            _pulse("beta", "inflow", 3.0),
            _pulse("beta", "outflow", 1.0),
            _pulse("gamma", "inflow", 5.0),
        ]
    )

    momentum = engine.momentum(short_window=3, long_window=5)

    assert momentum > 0


def test_momentum_handles_sparse_history() -> None:
    engine = DynamicRespirationEngine()
    engine.record(_pulse("alpha", "inflow", 2.0))

    assert engine.momentum(short_window=1, long_window=4) == pytest.approx(0.0)


@pytest.mark.parametrize(
    "short_window,long_window,error_message",
    [
        (0, 4, "short_window must be positive"),
        (2, 0, "long_window must be positive"),
        (5, 3, "short_window must be smaller than long_window"),
    ],
)
def test_momentum_validates_windows(short_window: int, long_window: int, error_message: str) -> None:
    engine = DynamicRespirationEngine()

    with pytest.raises(ValueError) as exc:
        engine.momentum(short_window=short_window, long_window=long_window)

    assert error_message in str(exc.value)


def test_channel_load_serialisation() -> None:
    load = ChannelLoad(channel="alpha", inflow=2.0, outflow=1.0, net=1.0, share=0.5)

    assert load.as_dict() == {
        "channel": "alpha",
        "inflow": 2.0,
        "outflow": 1.0,
        "net": 1.0,
        "share": 0.5,
    }
