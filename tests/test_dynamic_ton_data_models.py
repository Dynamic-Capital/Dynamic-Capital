"""Contract tests for Dynamic TON data models."""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from dataclasses import fields, is_dataclass
from typing import Any, Mapping, get_type_hints

import pytest

from dynamic_ton.data_pipeline import TonActionRecord, TonDataCollector
from dynamic_ton.ton_index_client import (
    TonIndexAccountState,
    TonIndexAccountStatesResult,
    TonIndexAddressBookEntry,
    TonIndexAddressMetadata,
    TonIndexMessage,
    TonIndexTransaction,
    TonIndexTransactionsResult,
)


def _type_map(cls: type[Any]) -> dict[str, Any]:
    """Return a mapping of dataclass field names to type hints."""

    hints = get_type_hints(cls)
    return {field.name: hints[field.name] for field in fields(cls)}


class _StubResponse:
    def __init__(self, payload: Mapping[str, Any]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:  # pragma: no cover - behaviour is trivial
        return None

    def json(self) -> Mapping[str, Any]:
        return self._payload


class _StubHttpClient:
    def __init__(self, responses: Sequence[Mapping[str, Any]]) -> None:
        self._responses = list(responses)
        self.requests: list[tuple[str, Mapping[str, Any] | None]] = []

    async def get(
        self, url: str, params: Mapping[str, Any] | None = None
    ) -> _StubResponse:
        self.requests.append((url, params))
        payload = self._responses.pop(0)
        return _StubResponse(payload)


def test_fetch_account_actions_parses_toncenter_payload() -> None:
    payload = {
        "actions": [
            {
                "action_id": "12345",
                "type": "JettonTransfer",
                "success": "true",
                "start_lt": "0x1e240",
                "end_lt": 123471,
                "start_utime": "1700000000",
                "end_utime": 1700000010,
                "trace_id": "trace_hash",
                "trace_end_lt": "123480",
                "trace_end_utime": "1700000050",
                "trace_external_hash": "ABCD",
                "trace_external_hash_norm": "abcd",
                "trace_mc_seqno_end": 42,
                "accounts": [
                    "EQCAccount1111111111111111111111111111111111",
                    "EQCAccount2222222222222222222222222222222222",
                ],
                "transactions": [
                    "de:ad:be:ef",
                    "be:ef:de:ad",
                ],
                "details": {"amount": "1000000000", "jetton": "EQCJetton"},
            }
        ]
    }

    stub_client = _StubHttpClient([payload])
    collector = TonDataCollector(http_client=stub_client)

    actions = asyncio.run(
        collector.fetch_account_actions(
            account="EQCTestAddress0000000000000000000000000000000000",
            include_accounts=True,
        )
    )

    assert len(actions) == 1
    action = actions[0]
    assert isinstance(action, TonActionRecord)
    assert action.action_id == "12345"
    assert action.type == "JettonTransfer"
    assert action.success is True
    assert action.start_lt == 123456
    assert action.end_lt == 123471
    assert action.start_utime == 1_700_000_000
    assert action.end_utime == 1_700_000_010
    assert action.trace_id == "trace_hash"
    assert action.trace_end_lt == 123480
    assert action.trace_end_utime == 1_700_000_050
    assert action.trace_external_hash == "ABCD"
    assert action.trace_external_hash_norm == "abcd"
    assert action.trace_mc_seqno_end == 42
    assert action.accounts == (
        "EQCAccount1111111111111111111111111111111111",
        "EQCAccount2222222222222222222222222222222222",
    )
    assert action.transactions == ("de:ad:be:ef", "be:ef:de:ad")
    assert isinstance(action.details, dict)


def test_fetch_account_actions_handles_camel_case_optional_fields() -> None:
    payload = {
        "actions": [
            {
                "actionId": "67890",
                "type": "NftTransfer",
                "success": 1,
                "startLt": "0x2dc6c0",
                "endLt": "0x2dc6d4",
                "startUtime": "1701000000",
                "endUtime": None,
                "traceId": "trace_camel",
                "traceEndLt": "0x2dc6d4",
                "traceEndUtime": "1701000010",
                "traceExternalHash": "EFGH",
                "traceExternalHashNorm": "efgh",
                "traceMcSeqnoEnd": "0x2a",
                "transactions": ["aa:bb"],
            }
        ]
    }

    stub_client = _StubHttpClient([payload])
    collector = TonDataCollector(http_client=stub_client)

    (action,) = asyncio.run(
        collector.fetch_account_actions(
            account="EQCTestAddress0000000000000000000000000000000000",
        )
    )

    assert action.action_id == "67890"
    assert action.start_lt == 3000000
    assert action.end_lt == 3000020
    assert action.start_utime == 1_701_000_000
    assert action.end_utime is None
    assert action.trace_id == "trace_camel"
    assert action.trace_end_lt == 3_000_020
    assert action.trace_end_utime == 1_701_000_010
    assert action.trace_external_hash == "EFGH"
    assert action.trace_external_hash_norm == "efgh"
    assert action.trace_mc_seqno_end == 42


def test_ton_action_record_schema_matches_contract() -> None:
    assert is_dataclass(TonActionRecord)

    expected = {
        "action_id": str,
        "type": str,
        "success": bool,
        "start_lt": int,
        "end_lt": int,
        "start_utime": int | None,
        "end_utime": int | None,
        "trace_id": str | None,
        "trace_end_lt": int | None,
        "trace_end_utime": int | None,
        "trace_external_hash": str | None,
        "trace_external_hash_norm": str | None,
        "trace_mc_seqno_end": int | None,
        "accounts": tuple[str, ...],
        "transactions": tuple[str, ...],
        "details": Mapping[str, Any] | str | None,
    }

    assert _type_map(TonActionRecord) == expected


def test_ton_index_account_state_coerces_numeric_fields() -> None:
    payload = {
        "address": "0:abc",
        "balance": "1000000000",
        "status": "active",
        "account_state_hash": "state_hash",
        "last_transaction_hash": "last_hash",
        "last_transaction_lt": "0x1a",
        "code_hash": "code_hash",
        "data_hash": "data_hash",
        "extra_currencies": {"1": "50"},
    }

    state = TonIndexAccountState.from_json(payload)

    assert state.address == "0:abc"
    assert state.balance == 1_000_000_000
    assert state.status == "active"
    assert state.last_transaction_lt == 26
    assert state.extra_currencies == {"1": 50}


def test_ton_index_account_state_schema_matches_contract() -> None:
    assert is_dataclass(TonIndexAccountState)

    expected = {
        "address": str,
        "balance": int,
        "status": str | None,
        "account_state_hash": str | None,
        "last_transaction_hash": str | None,
        "last_transaction_lt": int | None,
        "code_hash": str | None,
        "data_hash": str | None,
        "extra_currencies": Mapping[str, int],
    }

    assert _type_map(TonIndexAccountState) == expected


def test_ton_index_transaction_parses_nested_messages() -> None:
    payload = {
        "account": "0:abc",
        "hash": "tx_hash",
        "lt": "0x64",
        "now": 1700000100,
        "mc_block_seqno": "0x2A",
        "trace_id": None,
        "orig_status": "active",
        "end_status": "frozen",
        "total_fees": "0x12d",
        "total_fees_extra_currencies": {"1": "10"},
        "in_msg": {
            "hash": "msg_hash",
            "source": "src",
            "destination": "dst",
            "value": "0x3B9ACA00",
            "created_lt": "0x1",
            "created_at": 1700000000,
            "bounce": False,
            "bounced": False,
            "ihr_fee": 0,
            "fwd_fee": "0x64",
            "opcode": "0x0",
            "value_extra_currencies": {"2": "5"},
        },
        "out_msgs": [
            {
                "hash": "out_hash",
                "source": "dst",
                "destination": "other",
                "value": "0x5f5e100",
                "created_lt": 200,
                "created_at": "1700000020",
                "bounce": "false",
                "bounced": False,
                "ihr_fee": "0",
                "fwd_fee": "0x32",
                "opcode": None,
            }
        ],
    }

    transaction = TonIndexTransaction.from_json(payload)

    assert transaction.lt == 100
    assert transaction.mc_block_seqno == 42
    assert transaction.total_fees == 301
    assert transaction.total_fees_extra_currencies == {"1": 10}
    assert isinstance(transaction.in_msg, TonIndexMessage)
    assert transaction.in_msg.value == 1_000_000_000
    assert transaction.in_msg.value_extra_currencies == {"2": 5}
    assert len(transaction.out_msgs) == 1
    out_msg = transaction.out_msgs[0]
    assert out_msg.value == 100_000_000
    assert out_msg.created_at == 1_700_000_020


def test_ton_index_transaction_schema_matches_contract() -> None:
    assert is_dataclass(TonIndexTransaction)

    expected = {
        "account": str,
        "hash": str,
        "lt": int,
        "now": int,
        "mc_block_seqno": int | None,
        "trace_id": str | None,
        "orig_status": str | None,
        "end_status": str | None,
        "total_fees": int,
        "total_fees_extra_currencies": Mapping[str, int],
        "in_msg": TonIndexMessage | None,
        "out_msgs": tuple[TonIndexMessage, ...],
    }

    assert _type_map(TonIndexTransaction) == expected


def test_ton_index_supporting_models_schema_matches_contract() -> None:
    assert is_dataclass(TonIndexMessage)
    assert is_dataclass(TonIndexAddressBookEntry)
    assert is_dataclass(TonIndexAddressMetadata)
    assert is_dataclass(TonIndexAccountStatesResult)
    assert is_dataclass(TonIndexTransactionsResult)

    assert _type_map(TonIndexMessage) == {
        "hash": str,
        "source": str | None,
        "destination": str | None,
        "value": int,
        "created_lt": int | None,
        "created_at": int | None,
        "bounce": bool,
        "bounced": bool,
        "ihr_fee": int,
        "fwd_fee": int,
        "opcode": int | None,
        "value_extra_currencies": Mapping[str, int],
    }

    assert _type_map(TonIndexAddressBookEntry) == {
        "domain": str | None,
        "user_friendly": str | None,
    }

    assert _type_map(TonIndexAddressMetadata) == {
        "is_indexed": bool,
        "token_info": tuple[Mapping[str, Any], ...],
    }

    assert _type_map(TonIndexAccountStatesResult) == {
        "accounts": tuple[TonIndexAccountState, ...],
        "address_book": Mapping[str, TonIndexAddressBookEntry],
        "metadata": Mapping[str, TonIndexAddressMetadata],
    }

    assert _type_map(TonIndexTransactionsResult) == {
        "transactions": tuple[TonIndexTransaction, ...],
        "address_book": Mapping[str, TonIndexAddressBookEntry],
        "metadata": Mapping[str, TonIndexAddressMetadata],
    }


def test_fetch_swapcoffee_price_point_from_pool_data() -> None:
    payload = {
        "success": True,
        "exit_code": 0,
        "decoded": {
            "reserve1": "32020531554",
            "reserve2": "50048858890804",
            "lp_fee": "2000",
        },
    }

    stub_client = _StubHttpClient([payload])
    collector = TonDataCollector(http_client=stub_client)

    price_point = asyncio.run(
        collector.fetch_price_point(venue="swap.coffee", pair="TON/DCT")
    )

    expected_price = 32020531554 / 50048858890804
    assert price_point.close_price == pytest.approx(expected_price)
    assert price_point.volume == 0.0
    assert price_point.pair == "TON/DCT"
    assert price_point.start_time < price_point.end_time
    request_url, _ = stub_client.requests[0]
    assert request_url.endswith("/methods/get_pool_data")


def test_fetch_swapcoffee_liquidity_snapshot() -> None:
    payload = {
        "success": True,
        "exit_code": 0,
        "decoded": {
            "reserve1": "32020531554",
            "reserve2": "50048858890804",
            "lp_fee": "2000",
        },
    }

    stub_client = _StubHttpClient([payload])
    collector = TonDataCollector(http_client=stub_client)

    snapshot = asyncio.run(
        collector.fetch_liquidity(venue="swap.coffee", pair="DCT/TON")
    )

    assert snapshot.ton_depth == pytest.approx(32.020531554)
    assert snapshot.quote_depth == pytest.approx(50_048.858890804)
    assert snapshot.fee_bps == pytest.approx(20.0)
    assert snapshot.block_height == 0
    request_url, _ = stub_client.requests[0]
    assert request_url.endswith("/methods/get_pool_data")

