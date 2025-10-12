"""Tests for the treasury contract fingerprint helpers."""

from __future__ import annotations

from dynamic_ton.ton_index_client import TonIndexAccountState
from dynamic_ton.treasury_contract import (
    TREASURY_CODE_HASH,
    TREASURY_DATA_HASH,
    filter_treasury_states,
    matches_treasury_contract,
)


def _build_state(
    *,
    code_hash: str | None = TREASURY_CODE_HASH,
    data_hash: str | None = TREASURY_DATA_HASH,
) -> TonIndexAccountState:
    return TonIndexAccountState(
        address="0:abc",
        balance=0,
        status=None,
        account_state_hash=None,
        last_transaction_hash=None,
        last_transaction_lt=None,
        code_hash=code_hash,
        data_hash=data_hash,
        extra_currencies={},
    )


def test_matches_treasury_contract_positive_match() -> None:
    state = _build_state()

    assert matches_treasury_contract(state) is True


def test_matches_treasury_contract_requires_both_hashes() -> None:
    missing_code = _build_state(code_hash=None)
    mismatched_data = _build_state(data_hash="different")

    assert matches_treasury_contract(missing_code) is False
    assert matches_treasury_contract(mismatched_data) is False


def test_filter_treasury_states_returns_matches_only() -> None:
    states = (
        _build_state(),
        _build_state(code_hash="unexpected"),
        _build_state(data_hash="unexpected"),
    )

    result = filter_treasury_states(states)

    assert result == (states[0],)

