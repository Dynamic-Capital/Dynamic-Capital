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


class _SequenceClient:
    def __init__(self, payloads: list[dict[str, object]]) -> None:
        self._payloads = payloads
        self._index = 0
        self.calls: list[tuple[str, dict[str, object] | None]] = []

    async def get(
        self, url: str, params: dict[str, object] | None = None
    ) -> _DummyResponse:
        self.calls.append((url, params))
        if not self._payloads:
            raise RuntimeError("No payloads configured for _SequenceClient")
        payload = self._payloads[min(self._index, len(self._payloads) - 1)]
        self._index += 1
        return _DummyResponse(payload)


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


def test_fetch_price_point_uses_stonfi_pool_stats_endpoint() -> None:
    payload = {
        "since": "2024-05-01T00:00:00",
        "until": "2024-05-01T01:00:00",
        "stats": [
            {
                "pool_address": "0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3",
                "last_price": "1.2345",
                "base_volume": "567.89",
            }
        ],
    }
    client = _SequenceClient([payload])
    collector = TonDataCollector(http_client=client)

    price_point = asyncio.run(
        collector.fetch_price_point(venue="stonfi", pair="pton-dct", interval="1h")
    )

    url, params = client.calls[0]
    assert url == "https://api.ston.fi/v1/stats/pool"
    assert params is not None
    assert params["pool_address"].lower().startswith("0:31876bc3")
    assert math.isclose(price_point.open_price, 1.2345)
    assert math.isclose(price_point.close_price, 1.2345)
    assert math.isclose(price_point.volume, 567.89)
    assert price_point.start_time <= price_point.end_time


def test_fetch_price_point_uses_dedust_v2_candles() -> None:
    payload = {
        "candles": [
            {
                "time": 1_700_000_000,
                "timeClose": 1_700_003_600,
                "open": "0.95",
                "high": "1.05",
                "low": "0.90",
                "close": "1.01",
                "volume": "42.5",
            }
        ]
    }
    client = _SequenceClient([payload])
    collector = TonDataCollector(http_client=client)

    price_point = asyncio.run(
        collector.fetch_price_point(venue="dedust", pair="ton-dct", interval="1h")
    )

    url, params = client.calls[0]
    assert url == (
        "https://api.dedust.io/v2/pools/0:D3278947B93E817536048A8F7D50C64D0BD873950F937E803D4C7AEFCAB2EE98/candles"
    )
    assert params == {"resolution": "1h", "limit": 1}
    assert math.isclose(price_point.open_price, 0.95)
    assert math.isclose(price_point.high_price, 1.05)
    assert math.isclose(price_point.low_price, 0.90)
    assert math.isclose(price_point.close_price, 1.01)
    assert math.isclose(price_point.volume, 42.5)
    assert price_point.start_time < price_point.end_time


def test_fetch_liquidity_uses_latest_stonfi_schema() -> None:
    payload = {
        "pool": {
            "reserve0": "1500.5",
            "reserve1": "3200.75",
            "lp_fee": "20",
            "last_transaction_lt": "1234567",
        }
    }
    client = _SequenceClient([payload])
    collector = TonDataCollector(http_client=client)

    snapshot = asyncio.run(
        collector.fetch_liquidity(venue="stonfi", pair="pton-dct")
    )

    url, _ = client.calls[0]
    assert url == (
        "https://api.ston.fi/v1/pools/0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3"
    )
    assert math.isclose(snapshot.ton_depth, 1500.5)
    assert math.isclose(snapshot.quote_depth, 3200.75)
    assert math.isclose(snapshot.fee_bps, 20.0)
    assert snapshot.block_height == 1_234_567


def test_fetch_liquidity_uses_dedust_v2_pool_state() -> None:
    payload = {
        "reserves": ["1000", "2500.5"],
        "tradeFee": "0.25",
        "lt": "987654321",
    }
    client = _SequenceClient([payload])
    collector = TonDataCollector(http_client=client)

    snapshot = asyncio.run(
        collector.fetch_liquidity(venue="dedust", pair="ton-dct")
    )

    url, _ = client.calls[0]
    assert url == (
        "https://api.dedust.io/v2/pools/0:D3278947B93E817536048A8F7D50C64D0BD873950F937E803D4C7AEFCAB2EE98"
    )
    assert math.isclose(snapshot.ton_depth, 1000.0)
    assert math.isclose(snapshot.quote_depth, 2500.5)
    assert math.isclose(snapshot.fee_bps, 25.0)
    assert snapshot.block_height == 987_654_321


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
