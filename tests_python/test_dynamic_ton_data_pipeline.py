from __future__ import annotations

import asyncio
import math

from dynamic_ton.data_pipeline import TonDataCollector


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
