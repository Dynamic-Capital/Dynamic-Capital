from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[4]
TESTS_ROOT = PROJECT_ROOT / "tests"
sys.path.insert(0, str(PROJECT_ROOT))
sys.path = [p for p in sys.path if not p.startswith(str(TESTS_ROOT))]

from dynamic.platform.token.treasury import (
    SUCCESS_RETCODE,
    DynamicTreasuryAlgo,
    TreasuryEvent,
)


@pytest.fixture()
def treasury() -> DynamicTreasuryAlgo:
    return DynamicTreasuryAlgo(starting_balance=1_000.0)


def test_update_from_trade_happy_path(
    capsys: pytest.CaptureFixture[str],
    treasury: DynamicTreasuryAlgo,
) -> None:
    trade_result = SimpleNamespace(retcode=SUCCESS_RETCODE, profit=200.0)

    event = treasury.update_from_trade(trade_result)

    assert event == TreasuryEvent(
        burned=40.0,
        rewards_distributed=60.0,
        profit_retained=100.0,
    )
    assert treasury.treasury_balance == pytest.approx(1_100.0)

    captured = capsys.readouterr()
    assert "🔥 Burning DCT worth 40.0 from treasury" in captured.out
    assert "💰 Distributing 60.0 DCT as rewards to stakers" in captured.out


@pytest.mark.parametrize(
    "trade_result",
    [
        None,
        SimpleNamespace(retcode=0, profit=200.0),
        SimpleNamespace(retcode=SUCCESS_RETCODE, profit=0.0),
        SimpleNamespace(retcode=SUCCESS_RETCODE, profit=None),
        SimpleNamespace(retcode=SUCCESS_RETCODE, profit="not-a-number"),
        SimpleNamespace(retcode=SUCCESS_RETCODE, profit=float("nan")),
        SimpleNamespace(retcode=SUCCESS_RETCODE, profit=float("inf")),
    ],
)
def test_update_from_trade_failure_cases(
    trade_result,
    treasury: DynamicTreasuryAlgo,
) -> None:
    starting_balance = treasury.treasury_balance

    event = treasury.update_from_trade(trade_result)

    assert event is None
    assert treasury.treasury_balance == pytest.approx(starting_balance)


def test_update_from_trade_handles_losses(
    capsys: pytest.CaptureFixture[str],
    treasury: DynamicTreasuryAlgo,
) -> None:
    trade_result = SimpleNamespace(retcode=SUCCESS_RETCODE, profit=-750.0)

    event = treasury.update_from_trade(trade_result)

    assert event == TreasuryEvent(
        burned=0.0,
        rewards_distributed=0.0,
        profit_retained=0.0,
        loss_covered=750.0,
        notes=(),
    )
    assert treasury.treasury_balance == pytest.approx(250.0)

    captured = capsys.readouterr()
    assert "🛡️ Absorbing 750.0 DCT loss from treasury reserves" in captured.out


def test_update_from_trade_shortfall_notes() -> None:
    treasury = DynamicTreasuryAlgo(starting_balance=100.0)
    trade_result = SimpleNamespace(retcode=SUCCESS_RETCODE, profit=-250.0)

    event = treasury.update_from_trade(trade_result)

    assert event is not None
    assert event.loss_covered == pytest.approx(100.0)
    assert event.notes and "Loss exceeded treasury reserves" in event.notes[0]


def test_update_from_trade_records_rounding_adjustment(
    capsys: pytest.CaptureFixture[str],
    treasury: DynamicTreasuryAlgo,
) -> None:
    trade_result = SimpleNamespace(retcode=SUCCESS_RETCODE, profit=1.03)

    event = treasury.update_from_trade(trade_result)

    assert event is not None
    assert event.profit_retained == pytest.approx(0.51)
    assert event.notes and "Rounding adjustment applied" in event.notes[0]

    capsys.readouterr()  # drain prints for cleanliness
