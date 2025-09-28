from __future__ import annotations

import math

import pytest

from dynamic_wallet import (
    DynamicWalletEngine,
    WalletAccount,
    WalletBalance,
)


@pytest.fixture()
def engine() -> DynamicWalletEngine:
    return DynamicWalletEngine(exposure_limits={"TON": 0.6, "USDT": 0.5})


@pytest.fixture()
def registered_wallet(engine: DynamicWalletEngine) -> WalletAccount:
    wallet = WalletAccount(address="EQ123", owner="Operations Desk", risk_tier="standard")
    engine.register_account(wallet)
    return wallet


def test_wallet_summary_flags_excess_exposure(engine: DynamicWalletEngine, registered_wallet: WalletAccount) -> None:
    engine.ingest_balances(
        registered_wallet.address,
        [
            WalletBalance(asset="ton", total=1_000, available=600),
            WalletBalance(asset="usdt", total=4_000, available=4_000),
        ],
    )
    summary = engine.evaluate_wallet(
        registered_wallet.address,
        price_map={"ton": 2.0, "usdt": 1.0},
    )

    assert math.isclose(summary.total_value_usd, 6_000.0)
    # USDT exceeds its 50% limit so a high priority rebalance action should be generated.
    assert any(action.category == "rebalance" and action.priority == "high" for action in summary.actions)


def test_liquidity_buffer_action_for_conservative_wallet(engine: DynamicWalletEngine) -> None:
    wallet = WalletAccount(address="EQ321", owner="Treasury", risk_tier="conservative")
    engine.register_account(wallet)
    engine.ingest_balances(
        wallet.address,
        [
            WalletBalance(asset="usdt", total=10_000, available=2_000),
        ],
    )
    summary = engine.evaluate_wallet(wallet.address, price_map={"usdt": 1.0})

    assert summary.buffer_ratio < 0.35
    assert any(action.category == "liquidity" for action in summary.actions)


def test_missing_price_emits_alert(engine: DynamicWalletEngine, registered_wallet: WalletAccount) -> None:
    engine.ingest_balances(
        registered_wallet.address,
        [
            WalletBalance(asset="ton", total=500, available=500),
        ],
    )
    summary = engine.evaluate_wallet(registered_wallet.address, price_map={})

    assert "Missing price for TON" in summary.alerts[0]


def test_duplicate_registration_is_rejected(engine: DynamicWalletEngine, registered_wallet: WalletAccount) -> None:
    with pytest.raises(ValueError):
        engine.register_account(registered_wallet)
