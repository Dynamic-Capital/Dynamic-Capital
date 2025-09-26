"""Tests for the DexScannerAlgo TON DEX scoring engine."""

from __future__ import annotations

import pytest

from algorithms.python.dex_scanner import (
    DexPoolSnapshot,
    DexScannerAlgo,
    build_scanner_for_tokens,
)


def test_prime_pool_scores_high() -> None:
    algo = DexScannerAlgo()
    snapshot = DexPoolSnapshot(
        dex="DeDust",
        pool_address="0:pool",
        base_token="DCT",
        quote_token="TON",
        price_usd=1.05,
        liquidity_usd=250_000.0,
        volume_24h_usd=125_000.0,
        price_change_24h_pct=12.0,
        transactions_24h=420,
        fees_24h_usd=1_400.0,
        is_verified=True,
    )

    signal = algo.score_pool(snapshot)

    assert signal.tier == "prime"
    assert signal.score > 0.8
    assert "Verified pool" in signal.notes[0]


def test_low_liquidity_and_volume_flagged() -> None:
    algo = DexScannerAlgo(min_liquidity_usd=10_000.0, min_volume_24h_usd=5_000.0, min_transactions_24h=10)
    snapshot = DexPoolSnapshot(
        dex="STON.fi",
        pool_address="0:thin",
        base_token="TON",
        quote_token="USDT",
        price_usd=7.5,
        liquidity_usd=6_000.0,
        volume_24h_usd=2_500.0,
        price_change_24h_pct=1.0,
        transactions_24h=4,
    )

    signal = algo.score_pool(snapshot)

    assert signal.tier == "caution"
    assert any("liquidity" in note.lower() for note in signal.notes)
    assert any("volume" in note.lower() for note in signal.notes)
    assert any("swaps" in note.lower() for note in signal.notes)


def test_high_volatility_penalty_applied() -> None:
    algo = DexScannerAlgo(high_volatility_threshold_pct=10.0)
    snapshot = DexPoolSnapshot(
        dex="DeDust",
        pool_address="0:volatile",
        base_token="DCT",
        quote_token="USDT",
        price_usd=0.95,
        liquidity_usd=80_000.0,
        volume_24h_usd=45_000.0,
        price_change_24h_pct=28.0,
        transactions_24h=200,
    )

    signal = algo.score_pool(snapshot)

    assert signal.volatility_penalty > 0.0
    assert any("volatility" in note.lower() for note in signal.notes)


def test_untracked_pool_raises_error() -> None:
    algo = DexScannerAlgo(tracked_tokens=("DCT",))
    snapshot = DexPoolSnapshot(
        dex="DeDust",
        pool_address="0:ignored",
        base_token="USDT",
        quote_token="TONCOIN",
        price_usd=2.1,
        liquidity_usd=15_000.0,
        volume_24h_usd=6_000.0,
        price_change_24h_pct=3.0,
        transactions_24h=30,
    )

    with pytest.raises(ValueError):
        algo.score_pool(snapshot)


def test_rank_pools_orders_by_score() -> None:
    algo = build_scanner_for_tokens(["DCT", "TON"])
    high = DexPoolSnapshot(
        dex="DeDust",
        pool_address="0:high",
        base_token="DCT",
        quote_token="TON",
        liquidity_usd=200_000.0,
        volume_24h_usd=120_000.0,
        price_change_24h_pct=9.0,
        transactions_24h=300,
    )
    mid = DexPoolSnapshot(
        dex="STON.fi",
        pool_address="0:mid",
        base_token="TON",
        quote_token="USDT",
        liquidity_usd=60_000.0,
        volume_24h_usd=18_000.0,
        price_change_24h_pct=4.0,
        transactions_24h=120,
    )
    low = DexPoolSnapshot(
        dex="STON.fi",
        pool_address="0:low",
        base_token="DCT",
        quote_token="USDT",
        liquidity_usd=12_000.0,
        volume_24h_usd=7_000.0,
        price_change_24h_pct=-6.0,
        transactions_24h=40,
    )

    ranked = algo.rank_pools([mid, low, high])

    assert [signal.pool.pool_address for signal in ranked] == ["0:high", "0:mid", "0:low"]

