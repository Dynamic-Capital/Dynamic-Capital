"""Helpers for fingerprinting Dynamic Capital's TON treasury contract."""

from __future__ import annotations

from typing import Iterable

from .ton_index_client import TonIndexAccountState

__all__ = [
    "TREASURY_CODE_HASH",
    "TREASURY_DATA_HASH",
    "matches_treasury_contract",
    "filter_treasury_states",
]


#: Code hash associated with the production Dynamic Capital treasury contract.
TREASURY_CODE_HASH = "mg+Y3W+/Il7vgWXk5kQX7pMffuoABlNDnntdzcBkTNY="

#: Data hash associated with the production Dynamic Capital treasury contract.
TREASURY_DATA_HASH = "DyGKxO1CXdoOwJtbV6Mxpmi8h5rweETYPfMBkJLEtXk="


def matches_treasury_contract(state: TonIndexAccountState) -> bool:
    """Return ``True`` when *state* matches the known treasury contract hashes.

    The helper normalises empty values to an empty string to accommodate
    partially-populated payloads coming from the TON indexer API.  Both the
    ``code_hash`` and ``data_hash`` fields must be present for a positive match.
    """

    code_hash = (state.code_hash or "").strip()
    data_hash = (state.data_hash or "").strip()
    return code_hash == TREASURY_CODE_HASH and data_hash == TREASURY_DATA_HASH


def filter_treasury_states(
    states: Iterable[TonIndexAccountState],
) -> tuple[TonIndexAccountState, ...]:
    """Return the subset of *states* matching the treasury fingerprint."""

    matched = [state for state in states if matches_treasury_contract(state)]
    return tuple(matched)

