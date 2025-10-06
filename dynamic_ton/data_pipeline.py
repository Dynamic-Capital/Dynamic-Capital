"""TON trading data pipeline and feature extraction utilities.

This module provides the foundations for an end-to-end research and trading
workflow on the TON blockchain.  The intent is to keep the implementation small
but expressive so it can be embedded inside research notebooks, deployed as a
micro-service, or orchestrated by Airflow/Prefect style schedulers.

The pipeline is divided into three layers:

``TonDataCollector``
    Wraps the public TON HTTP/JSON APIs and DEX endpoints.  The collector
    returns strongly-typed snapshots that document exactly which fields the rest
    of the system depends upon.  The implementation deliberately avoids taking a
    dependency on any single vendor so that downstream consumers can swap
    providers (e.g. TonCenter, TonAPI, or in-house indexers).

``TonFeatureEngineer``
    Converts the raw snapshots into feature vectors ready for modelling.  The
    focus is on features that are broadly useful across statistical models and
    reinforcement learning agents (price deltas, liquidity depth ratios, wallet
    concentration, etc.).

``TonModelCoordinator``
    A thin façade around AI models.  The coordinator caches rolling windows of
    features, prepares batched tensors, and exposes `train`/`predict` methods.
    It is intentionally framework agnostic so that researchers can bring their
    preferred modelling libraries (PyTorch, TensorFlow, scikit-learn, etc.).

The module favours explicit data structures and dataclasses over dynamically
shaped dictionaries to keep the code-base type safe and self-documenting.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import fmean
from typing import Any, Iterable, Mapping, Protocol, Sequence

__all__ = [
    "TonPricePoint",
    "TonLiquiditySnapshot",
    "TonWalletDistribution",
    "TonNetworkSnapshot",
    "TonActionRecord",
    "TonDataCollector",
    "TonFeatureEngineer",
    "TonModelCoordinator",
]


@dataclass(slots=True, frozen=True)
class TonPricePoint:
    """Represents an OHLCV candle for a Jetton/TON pair."""

    venue: str
    pair: str
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    start_time: datetime
    end_time: datetime

    @property
    def midpoint(self) -> float:
        return (self.high_price + self.low_price) / 2

    @property
    def true_range(self) -> float:
        return self.high_price - self.low_price


@dataclass(slots=True, frozen=True)
class TonLiquiditySnapshot:
    """Represents liquidity information for a Jetton/TON pool."""

    venue: str
    pair: str
    ton_depth: float
    quote_depth: float
    fee_bps: float
    block_height: int

    @property
    def depth_ratio(self) -> float:
        if self.ton_depth == 0:
            return 0.0
        return self.quote_depth / self.ton_depth


@dataclass(slots=True, frozen=True)
class TonWalletDistribution:
    """Describes holder concentration statistics for a token."""

    jetton: str
    top_10_share: float
    top_50_share: float
    unique_wallets: int
    whale_transactions_24h: int


@dataclass(slots=True, frozen=True)
class TonNetworkSnapshot:
    """Aggregated network level metrics."""

    timestamp: datetime
    price_point: TonPricePoint
    liquidity: Sequence[TonLiquiditySnapshot]
    wallet_distribution: TonWalletDistribution
    total_txs_24h: int
    avg_gas_fee: float
    bridge_latency_ms: float


@dataclass(slots=True, frozen=True)
class TonActionRecord:
    """Represents a normalised action returned by the toncenter v3 API."""

    action_id: str
    type: str
    success: bool
    start_lt: int
    end_lt: int
    start_utime: int | None
    end_utime: int | None
    trace_id: str | None
    trace_end_lt: int | None
    trace_end_utime: int | None
    trace_external_hash: str | None
    trace_external_hash_norm: str | None
    trace_mc_seqno_end: int | None
    accounts: tuple[str, ...]
    transactions: tuple[str, ...]
    details: Mapping[str, Any] | str | None


def _ensure_datetime(value: Any, *, field: str) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        try:
            # Try ISO-8601 parsing before falling back to UNIX timestamps
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError(f"{field} must be ISO-8601 or epoch seconds") from exc
    raise ValueError(f"Unsupported datetime type for {field}: {type(value)!r}")


def _as_bool(value: Any, *, field: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    if isinstance(value, (int, float)):
        return bool(int(value))
    raise ValueError(f"{field} must be a boolean value")


def _as_optional_int(value: Any, *, field: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, str):
        candidate = value.strip()
        if candidate == "":
            return None
        try:
            return int(candidate, 10)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError(f"{field} must be an integer or omitted") from exc
    try:
        return int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"{field} must be an integer or omitted") from exc


def _normalise_identifier(value: Any, *, field: str) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        if candidate.lower() == "string":
            return None
        return candidate
    candidate = str(value).strip()
    if not candidate or candidate.lower() == "string":
        return None
    return candidate


class TonDataCollector:
    """Fetches market, liquidity, and wallet telemetry for TON ecosystems."""

    def __init__(
        self,
        *,
        http_client: Any | None = None,
        base_urls: Mapping[str, str] | None = None,
    ) -> None:
        self._client = http_client
        self._base_urls = {
            "toncenter": "https://toncenter.com/api/v2",
            "toncenter_actions": "https://toncenter.com/api/v3",
            "stonfi": "https://api.ston.fi",
            "dedust": "https://api.dedust.io",
            "tonapi": "https://tonapi.io/v2",
        }
        if base_urls:
            self._base_urls.update(base_urls)

    async def _request(self, url: str, params: Mapping[str, Any] | None = None) -> Any:
        if self._client is None:
            try:
                import httpx
            except ModuleNotFoundError as exc:  # pragma: no cover - informative error
                raise RuntimeError(
                    "httpx is required for TonDataCollector unless a custom client is provided"
                ) from exc
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
        else:  # pragma: no cover - exercised in integration tests
            response = await self._client.get(url, params=params)
        response.raise_for_status()
        return response.json()

    async def fetch_price_point(
        self, *, venue: str, pair: str, interval: str = "1h"
    ) -> TonPricePoint:
        """Retrieve the latest candle for the requested pair."""

        if venue.lower() == "stonfi":
            base = self._base_urls["stonfi"]
            payload = await self._request(
                f"{base}/chart/candles",
                params={"pair": pair, "resolution": interval, "limit": 1},
            )
            candle = payload["candles"][0]
            start = _ensure_datetime(candle["time"], field="candles[0].time")
            end = start
        elif venue.lower() == "dedust":
            base = self._base_urls["dedust"]
            payload = await self._request(
                f"{base}/candles/{pair}", params={"resolution": interval, "limit": 1}
            )
            candle = payload["data"][0]
            start = _ensure_datetime(candle["t"], field="candles[0].t")
            end = _ensure_datetime(candle["t_close"], field="candles[0].t_close")
        else:
            raise ValueError(f"Unsupported venue for price data: {venue}")

        return TonPricePoint(
            venue=venue,
            pair=pair,
            open_price=float(candle["o"]),
            high_price=float(candle["h"]),
            low_price=float(candle["l"]),
            close_price=float(candle["c"]),
            volume=float(candle.get("v", 0.0)),
            start_time=start,
            end_time=end,
        )

    async def fetch_account_actions(
        self,
        *,
        account: str,
        limit: int = 10,
        offset: int = 0,
        sort: str = "desc",
        include_accounts: bool = False,
        tx_hash: Any | None = None,
        msg_hash: Any | None = None,
        action_id: Any | None = None,
        trace_id: Any | None = None,
    ) -> tuple[TonActionRecord, ...]:
        """Retrieve normalised account actions from toncenter's v3 REST API."""

        account_id = _normalise_identifier(account, field="account")
        if not account_id:
            raise ValueError("account must be provided")
        if limit < 1 or limit > 100:
            raise ValueError("limit must be between 1 and 100")
        if offset < 0:
            raise ValueError("offset must be non-negative")
        sort_order = sort.lower()
        if sort_order not in {"asc", "desc"}:
            raise ValueError("sort must be either 'asc' or 'desc'")

        base = self._base_urls.get("toncenter_actions", "https://toncenter.com/api/v3")
        url = f"{base.rstrip('/')}\/actions"
        params: dict[str, Any] = {
            "account": account_id,
            "limit": limit,
            "offset": offset,
            "sort": sort_order,
        }
        if include_accounts:
            params["include_accounts"] = "true"

        for field_name, value in (
            ("tx_hash", tx_hash),
            ("msg_hash", msg_hash),
            ("action_id", action_id),
            ("trace_id", trace_id),
        ):
            normalised = _normalise_identifier(value, field=field_name)
            if normalised:
                params[field_name] = normalised

        payload = await self._request(url, params=params)
        raw_actions = payload.get("actions", [])
        actions: list[TonActionRecord] = []

        for index, entry in enumerate(raw_actions):
            mapping = _coerce_mapping(entry, label=f"actions[{index}]")
            accounts: tuple[str, ...] = ()
            if include_accounts and (raw_accounts := mapping.get("accounts")):
                if isinstance(raw_accounts, Sequence) and not isinstance(
                    raw_accounts, (str, bytes, bytearray)
                ):
                    accounts = tuple(str(item) for item in raw_accounts)
                else:  # pragma: no cover - API contract safeguard
                    raise ValueError("accounts must be a sequence when requested")
            transactions_field = mapping.get("transactions", [])
            if isinstance(transactions_field, Sequence) and not isinstance(
                transactions_field, (str, bytes, bytearray)
            ):
                transactions = tuple(str(item) for item in transactions_field)
            else:
                transactions = ()

            actions.append(
                TonActionRecord(
                    action_id=str(_extract(mapping, "action_id", "actionId")),
                    type=str(_extract(mapping, "type")),
                    success=_as_bool(_extract(mapping, "success"), field="success"),
                    start_lt=_as_int(_extract(mapping, "start_lt", "startLt"), field="startLt"),
                    end_lt=_as_int(_extract(mapping, "end_lt", "endLt"), field="endLt"),
                    start_utime=_as_optional_int(mapping.get("start_utime"), field="startUtime"),
                    end_utime=_as_optional_int(mapping.get("end_utime"), field="endUtime"),
                    trace_id=_normalise_identifier(mapping.get("trace_id"), field="traceId"),
                    trace_end_lt=_as_optional_int(mapping.get("trace_end_lt"), field="traceEndLt"),
                    trace_end_utime=_as_optional_int(
                        mapping.get("trace_end_utime"), field="traceEndUtime"
                    ),
                    trace_external_hash=_normalise_identifier(
                        mapping.get("trace_external_hash"), field="traceExternalHash"
                    ),
                    trace_external_hash_norm=_normalise_identifier(
                        mapping.get("trace_external_hash_norm"), field="traceExternalHashNorm"
                    ),
                    trace_mc_seqno_end=_as_optional_int(
                        mapping.get("trace_mc_seqno_end"), field="traceMcSeqnoEnd"
                    ),
                    accounts=accounts,
                    transactions=transactions,
                    details=mapping.get("details"),
                )
            )

        return tuple(actions)

    async def fetch_liquidity(self, *, venue: str, pair: str) -> TonLiquiditySnapshot:
        if venue.lower() == "stonfi":
            base = self._base_urls["stonfi"]
            payload = await self._request(f"{base}/pool/{pair}")
            pool = payload["pool"]
            return TonLiquiditySnapshot(
                venue=venue,
                pair=pair,
                ton_depth=float(pool["ton_reserve"]),
                quote_depth=float(pool["token_reserve"]),
                fee_bps=float(pool.get("fee", 0.0)) * 10_000,
                block_height=int(pool.get("block_last_updated", 0)),
            )
        if venue.lower() == "dedust":
            base = self._base_urls["dedust"]
            payload = await self._request(f"{base}/pools/{pair}")
            return TonLiquiditySnapshot(
                venue=venue,
                pair=pair,
                ton_depth=float(payload["liquidity"]["base"]),
                quote_depth=float(payload["liquidity"]["quote"]),
                fee_bps=float(payload.get("fee", 0.0)) * 10_000,
                block_height=int(payload.get("last_transaction_lt", 0)),
            )
        raise ValueError(f"Unsupported venue for liquidity data: {venue}")

    async def fetch_wallet_distribution(self, jetton: str) -> TonWalletDistribution:
        base = self._base_urls["tonapi"]
        payload = await self._request(
            f"{base}/jetton/{jetton}/holders", params={"limit": 50}
        )
        holders = payload.get("holders")
        if holders is None:
            holders = payload.get("addresses", [])

        def _coerce_balance(entry: Mapping[str, Any]) -> float:
            value = entry.get("balance", 0)
            try:
                return float(value)
            except (TypeError, ValueError):  # pragma: no cover - defensive guard
                return 0.0

        balances = sorted(
            (_coerce_balance(holder) for holder in holders), reverse=True
        )
        total = sum(balances) or 1.0
        top_10_share = sum(balances[:10]) / total
        top_50_share = sum(balances[:50]) / total
        metrics = payload.get("statistics") or {}
        unique_holders = metrics.get("unique_holders")
        if unique_holders is None:
            unique_holders = payload.get("total", len(balances))
        return TonWalletDistribution(
            jetton=jetton,
            top_10_share=top_10_share,
            top_50_share=top_50_share,
            unique_wallets=int(unique_holders or len(balances)),
            whale_transactions_24h=int(metrics.get("whale_transactions_24h", 0)),
        )

    async def build_snapshot(
        self,
        *,
        venue: str,
        pair: str,
        jetton: str,
        gas_price: float,
        total_txs_24h: int,
        bridge_latency_ms: float,
    ) -> TonNetworkSnapshot:
        price_point = await self.fetch_price_point(venue=venue, pair=pair)
        liquidity = [await self.fetch_liquidity(venue=venue, pair=pair)]
        distribution = await self.fetch_wallet_distribution(jetton)
        return TonNetworkSnapshot(
            timestamp=datetime.now(tz=timezone.utc),
            price_point=price_point,
            liquidity=liquidity,
            wallet_distribution=distribution,
            total_txs_24h=total_txs_24h,
            avg_gas_fee=gas_price,
            bridge_latency_ms=bridge_latency_ms,
        )


class TonFeatureEngineer:
    """Transforms raw snapshots into ML-friendly feature dictionaries."""

    def __init__(self, *, history: int = 24) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = history
        self._window: list[Mapping[str, float]] = []

    def _append(self, features: Mapping[str, float]) -> None:
        self._window.append(features)
        if len(self._window) > self._history:
            self._window.pop(0)

    def transform(self, snapshot: TonNetworkSnapshot) -> Mapping[str, float]:
        liquidity_depths = [entry.depth_ratio for entry in snapshot.liquidity]
        avg_depth_ratio = fmean(liquidity_depths) if liquidity_depths else 0.0
        price = snapshot.price_point
        features = {
            "close_price": price.close_price,
            "true_range": price.true_range,
            "volume": price.volume,
            "midpoint": price.midpoint,
            "depth_ratio": avg_depth_ratio,
            "ton_depth": fmean([entry.ton_depth for entry in snapshot.liquidity])
            if snapshot.liquidity
            else 0.0,
            "wallet_top10": snapshot.wallet_distribution.top_10_share,
            "wallet_top50": snapshot.wallet_distribution.top_50_share,
            "wallet_uniques": float(snapshot.wallet_distribution.unique_wallets),
            "whale_txs": float(snapshot.wallet_distribution.whale_transactions_24h),
            "total_txs_24h": float(snapshot.total_txs_24h),
            "avg_gas_fee": snapshot.avg_gas_fee,
            "bridge_latency_ms": snapshot.bridge_latency_ms,
        }
        previous_close = self._window[-1]["close_price"] if self._window else price.close_price
        features["return_1"] = (price.close_price / previous_close) - 1
        self._append(features)
        return features

    def rolling_window(self) -> Sequence[Mapping[str, float]]:
        return tuple(self._window)


class SupportsModel(Protocol):  # pragma: no cover - typed facade
    def partial_fit(self, X: Sequence[Sequence[float]], y: Sequence[float]) -> Any: ...

    def predict(self, X: Sequence[Sequence[float]]) -> Sequence[float]: ...


class TonModelCoordinator:
    """Coordinates training/inference for pluggable AI models."""

    def __init__(
        self,
        model: SupportsModel,
        *,
        feature_keys: Sequence[str],
    ) -> None:
        if not feature_keys:
            raise ValueError("feature_keys cannot be empty")
        self._model = model
        self._feature_keys = tuple(feature_keys)

    def _vectorise(self, rows: Iterable[Mapping[str, float]]) -> list[list[float]]:
        matrix: list[list[float]] = []
        for row in rows:
            vector = [float(row[key]) for key in self._feature_keys]
            matrix.append(vector)
        return matrix

    def train(self, *, history: Sequence[Mapping[str, float]], targets: Sequence[float]) -> None:
        if len(history) != len(targets):
            raise ValueError("history and targets length mismatch")
        self._model.partial_fit(self._vectorise(history), list(targets))

    def predict(self, *, latest: Mapping[str, float]) -> float:
        prediction = self._model.predict([self._vectorise([latest])[0]])
        return float(prediction[0])

    @property
    def feature_keys(self) -> Sequence[str]:
        return self._feature_keys
