from __future__ import annotations

import asyncio
import math

import pytest

from dynamic_ton.data_pipeline import TonDataCollector
from dynamic_ton.ton_index_client import TonIndexClient


class _DummyResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:  # pragma: no cover - simple stub
        return None

    def json(self) -> dict[str, object]:
        return self._payload


class _DummyClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload
        self.calls: list[tuple[str, dict[str, object] | None]] = []

    async def get(
        self, url: str, params: dict[str, object] | None = None
    ) -> _DummyResponse:
        self.calls.append((url, params))
        return _DummyResponse(self._payload)


class _DummyTonIndexHTTPClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload
        self.calls: list[dict[str, object | None]] = []

    async def request(
        self,
        method: str,
        url: str,
        *,
        params: list[tuple[str, object]] | None = None,
        json: object | None = None,
        headers: dict[str, str] | None = None,
    ) -> _DummyResponse:
        self.calls.append(
            {
                "method": method,
                "url": url,
                "params": tuple(params or []),
                "json": json,
                "headers": dict(headers or {}),
            }
        )
        return _DummyResponse(self._payload)


def test_fetch_wallet_distribution_supports_addresses_payload() -> None:
    payload = {
        "addresses": [
            {
                "address": "0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789",
                "owner": {
                    "address": "0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38",
                    "name": "dynamiccapital.ton",
                    "is_scam": False,
                    "is_wallet": True,
                },
                "balance": "500000000000",
            }
        ],
        "total": 1,
    }
    client = _DummyClient(payload)
    collector = TonDataCollector(http_client=client)

    distribution = asyncio.run(
        collector.fetch_wallet_distribution("test-jetton")
    )

    assert client.calls == [
        ("https://tonapi.io/v2/jetton/test-jetton/holders", {"limit": 50})
    ]
    assert distribution.jetton == "test-jetton"
    assert distribution.unique_wallets == 1
    assert math.isclose(distribution.top_10_share, 1.0)
    assert math.isclose(distribution.top_50_share, 1.0)
    assert distribution.whale_transactions_24h == 0


def test_fetch_account_states_requires_ton_index_client() -> None:
    collector = TonDataCollector()

    with pytest.raises(RuntimeError):
        asyncio.run(collector.fetch_account_states(["eqB7..."], include_boc=True))


def test_ton_index_client_account_states_roundtrip() -> None:
    payload = {
        "accounts": [
            {
                "address": "0:abc",
                "balance": "1000000000",
                "status": "active",
                "last_transaction_lt": "0x10",
                "extra_currencies": {"USD": "42"},
            }
        ],
        "address_book": {"0:abc": {"domain": "example.ton", "user_friendly": None}},
        "metadata": {"0:abc": {"is_indexed": True, "token_info": []}},
    }
    http_client = _DummyTonIndexHTTPClient(payload)
    client = TonIndexClient(
        base_url="https://example.test/api/v3",
        api_key="test-key",
        http_client=http_client,
    )

    result = asyncio.run(client.get_account_states(["0:abc"]))

    assert http_client.calls[0]["url"] == "https://example.test/api/v3/accountStates"
    assert http_client.calls[0]["params"] == (("address", "0:abc"),)
    assert http_client.calls[0]["headers"].get("X-Api-Key") == "test-key"
    assert len(result.accounts) == 1
    account = result.accounts[0]
    assert account.address == "0:abc"
    assert account.balance == 1_000_000_000
    assert account.balance_ton == 1.0
    assert account.last_transaction_lt == 16
    assert result.address_book["0:abc"].domain == "example.ton"
    assert result.metadata["0:abc"].is_indexed is True


def test_ton_index_client_transactions_roundtrip() -> None:
    payload = {
        "transactions": [
            {
                "account": "0:abc",
                "hash": "deadbeef",
                "lt": "0x20",
                "now": 1700000000,
                "total_fees": "20000000",
                "in_msg": {
                    "hash": "msg1",
                    "value": "100",
                    "bounce": False,
                    "bounced": False,
                    "ihr_fee": 0,
                    "fwd_fee": 0,
                    "value_extra_currencies": {},
                },
                "out_msgs": [
                    {
                        "hash": "msg2",
                        "value": "300",
                        "bounce": False,
                        "bounced": False,
                        "ihr_fee": 0,
                        "fwd_fee": 0,
                        "value_extra_currencies": {"USD": "1"},
                    }
                ],
            }
        ],
        "address_book": {},
        "metadata": {},
    }
    http_client = _DummyTonIndexHTTPClient(payload)
    client = TonIndexClient(base_url="https://example.test/api/v3", http_client=http_client)

    result = asyncio.run(client.get_transactions(account="0:abc", limit=5, offset=1))

    assert result.transactions[0].lt == 32
    assert result.transactions[0].total_fees_ton == pytest.approx(0.02)
    assert result.transactions[0].in_msg is not None
    assert result.transactions[0].out_msgs[0].value == 300
    call = http_client.calls[0]
    assert call["params"] == (
        ("account", "0:abc"),
        ("limit", 5),
        ("offset", 1),
        ("sort", "desc"),
    )
