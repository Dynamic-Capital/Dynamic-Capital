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

from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from statistics import fmean
from typing import Any, Iterable, Mapping, Protocol, Sequence

from .ton_index_client import (
    TonIndexAccountStatesResult,
    TonIndexClient,
    TonIndexTransactionsResult,
)

__all__ = [
    "TonPricePoint",
    "TonLiquiditySnapshot",
    "TonWalletDistribution",
    "TonNetworkSnapshot",
    "TonActionRecord",
    "TONCENTER_ACTION_FIELD_ALIASES",
    "TONCENTER_ACTION_OPTIONAL_FIELDS",
    "TONCENTER_ACTION_KNOWN_RAW_KEYS",
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


TONCENTER_ACTION_FIELD_ALIASES: Mapping[str, tuple[str, ...]] = {
    "action_id": ("action_id", "actionId"),
    "type": ("type",),
    "success": ("success",),
    "start_lt": ("start_lt", "startLt"),
    "end_lt": ("end_lt", "endLt"),
    "start_utime": ("start_utime", "startUtime"),
    "end_utime": ("end_utime", "endUtime"),
    "trace_id": ("trace_id", "traceId"),
    "trace_end_lt": ("trace_end_lt", "traceEndLt"),
    "trace_end_utime": ("trace_end_utime", "traceEndUtime"),
    "trace_external_hash": ("trace_external_hash", "traceExternalHash"),
    "trace_external_hash_norm": ("trace_external_hash_norm", "traceExternalHashNorm"),
    "trace_mc_seqno_end": ("trace_mc_seqno_end", "traceMcSeqnoEnd"),
    "accounts": ("accounts",),
    "transactions": ("transactions",),
    "details": ("details",),
}

TONCENTER_ACTION_OPTIONAL_FIELDS: frozenset[str] = frozenset(
    {
        "start_utime",
        "end_utime",
        "trace_id",
        "trace_end_lt",
        "trace_end_utime",
        "trace_external_hash",
        "trace_external_hash_norm",
        "trace_mc_seqno_end",
        "accounts",
        "transactions",
        "details",
    }
)

TONCENTER_ACTION_KNOWN_RAW_KEYS: frozenset[str] = frozenset(
    key for aliases in TONCENTER_ACTION_FIELD_ALIASES.values() for key in aliases
)


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


def _ensure_aware_datetime(value: Any, *, field: str) -> datetime:
    """Normalise datetime values to timezone-aware UTC instances."""

    timestamp = _ensure_datetime(value, field=field)
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp


def _normalise_pool_alias(
    pair: str, *, mapping: Mapping[str, str], venue: str
) -> str:
    """Resolve human-friendly market aliases into pool addresses."""

    candidate = pair.strip()
    if not candidate:
        raise ValueError(f"pair must be provided for {venue} markets")
    if ":" in candidate or candidate.upper().startswith("EQ"):
        return candidate
    key = "".join(ch for ch in candidate if ch.isalnum()).upper()
    resolved = mapping.get(key)
    if not resolved:
        raise ValueError(f"Unknown {venue} market alias: {pair}")
    return resolved


_STONFI_POOL_ALIASES: Mapping[str, str] = {
    "PTONDCT": "0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3",
}

_DEDUST_POOL_ALIASES: Mapping[str, str] = {
    "TONDCT": "0:D3278947B93E817536048A8F7D50C64D0BD873950F937E803D4C7AEFCAB2EE98",
}


def _stonfi_pool_address(pair: str) -> str:
    return _normalise_pool_alias(pair, mapping=_STONFI_POOL_ALIASES, venue="STON.fi")


def _dedust_pool_address(pair: str) -> str:
    return _normalise_pool_alias(pair, mapping=_DEDUST_POOL_ALIASES, venue="DeDust")


_INTERVAL_SECONDS: Mapping[str, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1_800,
    "1h": 3_600,
    "4h": 14_400,
    "1d": 86_400,
}


def _interval_to_timedelta(interval: str) -> timedelta:
    seconds = _INTERVAL_SECONDS.get(interval.lower())
    if seconds is None:
        raise ValueError(f"Unsupported interval: {interval}")
    return timedelta(seconds=seconds)


def _extract_candle_value(
    candle: Mapping[str, Any],
    *,
    field: str,
    aliases: Sequence[str],
    default: float = 0.0,
) -> float:
    for key in aliases:
        if key in candle and candle[key] is not None:
            return float(candle[key])
    return float(default)


def _extract_candle_time(
    candle: Mapping[str, Any], *, field: str, aliases: Sequence[str]
) -> datetime:
    for key in aliases:
        if key in candle and candle[key] is not None:
            return _ensure_aware_datetime(candle[key], field=field)
    raise ValueError(f"Missing candle timestamp: {field}")


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
        value = candidate
    try:
        return _as_int(value, field=field)
    except ValueError as exc:  # pragma: no cover - defensive guard
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


def _coerce_mapping(value: Any, *, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{label} must be a mapping")
    return value


def _extract(
    mapping: Mapping[str, Any], *candidates: str, required: bool = True
) -> Any:
    for key in candidates:
        if key in mapping:
            return mapping[key]
    if required:
        joined = ", ".join(candidates)
        raise ValueError(f"Missing required field(s): {joined}")
    return None


def _as_int(value: Any, *, field: str) -> int:
    if isinstance(value, bool):
        raise ValueError(f"{field} must be an integer")
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        candidate = value.strip()
        if candidate == "":
            raise ValueError(f"{field} must be an integer")
        try:
            return int(candidate, 0)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError(f"{field} must be an integer") from exc
    raise ValueError(f"{field} must be an integer")


class TonDataCollector:
    """Fetches market, liquidity, and wallet telemetry for TON ecosystems."""

    def __init__(
        self,
        *,
        http_client: Any | None = None,
        base_urls: Mapping[str, str] | None = None,
        ton_index_client: TonIndexClient | None = None,
        toncenter_api_key: str | None = None,
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
        self._ton_index_client = ton_index_client
        self._toncenter_api_key = toncenter_api_key.strip() if toncenter_api_key else None
        self._unknown_action_fields: Counter[str] = Counter()

    @property
    def unknown_toncenter_action_fields(self) -> Mapping[str, int]:
        """Return a snapshot of unrecognised TONCenter action keys observed."""

        return dict(self._unknown_action_fields)

    def reset_unknown_toncenter_action_fields(self) -> None:
        """Clear previously captured TONCenter action schema warnings."""

        self._unknown_action_fields.clear()

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

        venue_key = venue.lower()
        if venue_key == "stonfi":
            base = self._base_urls["stonfi"]
            pool_address = _stonfi_pool_address(pair)
            delta = _interval_to_timedelta(interval)
            end_ts = datetime.now(tz=timezone.utc).replace(microsecond=0)
            start_ts = end_ts - delta
            params = {
                "since": start_ts.strftime("%Y-%m-%dT%H:%M:%S"),
                "until": end_ts.strftime("%Y-%m-%dT%H:%M:%S"),
                "pool_address": pool_address,
            }
            payload = await self._request(f"{base}/v1/stats/pool", params=params)
            stats = payload.get("stats") or []
            if not stats:
                raise ValueError(f"STON.fi did not return stats for {pool_address}")
            latest = stats[-1]
            price = float(latest.get("last_price", 0.0))
            volume = float(latest.get("base_volume", 0.0))
            start = start_ts
            end = end_ts
        elif venue_key == "dedust":
            base = self._base_urls["dedust"]
            pool_address = _dedust_pool_address(pair)
            payload = await self._request(
                f"{base}/v2/pools/{pool_address}/candles",
                params={"resolution": interval, "limit": 1},
            )
            candles = payload.get("candles") or payload.get("data") or []
            if not candles:
                raise ValueError(f"DeDust did not return candles for {pool_address}")
            candle = candles[-1]
            open_price = _extract_candle_value(
                candle,
                field="open",
                aliases=("open", "o", "priceOpen"),
            )
            high_price = _extract_candle_value(
                candle,
                field="high",
                aliases=("high", "h", "priceHigh"),
                default=open_price,
            )
            low_price = _extract_candle_value(
                candle,
                field="low",
                aliases=("low", "l", "priceLow"),
                default=open_price,
            )
            close_price = _extract_candle_value(
                candle,
                field="close",
                aliases=("close", "c", "priceClose"),
            )
            volume = _extract_candle_value(
                candle,
                field="volume",
                aliases=("volume", "v", "baseVolume"),
            )
            start = _extract_candle_time(
                candle,
                field="candles[0].time",
                aliases=("time", "t", "timeStart", "start", "openTime"),
            )
            try:
                end = _extract_candle_time(
                    candle,
                    field="candles[0].time_close",
                    aliases=("timeClose", "t_close", "closeTime", "end"),
                )
            except ValueError:
                end = start + _interval_to_timedelta(interval)
        else:
            raise ValueError(f"Unsupported venue for price data: {venue}")

        return TonPricePoint(
            venue=venue,
            pair=pair,
            open_price=open_price if venue_key == "dedust" else price,
            high_price=high_price if venue_key == "dedust" else price,
            low_price=low_price if venue_key == "dedust" else price,
            close_price=close_price if venue_key == "dedust" else price,
            volume=float(volume),
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
        url = f"{base.rstrip('/')}/actions"
        params: dict[str, Any] = {
            "account": account_id,
            "limit": limit,
            "offset": offset,
            "sort": sort_order,
        }
        if self._toncenter_api_key:
            params["api_key"] = self._toncenter_api_key
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
            unknown_keys: list[str] = []
            for key in mapping:
                raw_key = str(key)
                if raw_key not in TONCENTER_ACTION_KNOWN_RAW_KEYS:
                    unknown_keys.append(raw_key)
            if unknown_keys:
                self._unknown_action_fields.update(unknown_keys)
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

            def _resolve(field: str, *, required: bool = True) -> Any:
                aliases = TONCENTER_ACTION_FIELD_ALIASES[field]
                return _extract(mapping, *aliases, required=required)

            def _field_label(field: str) -> str:
                aliases = TONCENTER_ACTION_FIELD_ALIASES[field]
                return aliases[-1] if aliases else field

            actions.append(
                TonActionRecord(
                    action_id=str(_resolve("action_id")),
                    type=str(_resolve("type")),
                    success=_as_bool(_resolve("success"), field="success"),
                    start_lt=_as_int(_resolve("start_lt"), field=_field_label("start_lt")),
                    end_lt=_as_int(_resolve("end_lt"), field=_field_label("end_lt")),
                    start_utime=_as_optional_int(
                        _resolve("start_utime", required=False),
                        field=_field_label("start_utime"),
                    ),
                    end_utime=_as_optional_int(
                        _resolve("end_utime", required=False),
                        field=_field_label("end_utime"),
                    ),
                    trace_id=_normalise_identifier(
                        _resolve("trace_id", required=False),
                        field=_field_label("trace_id"),
                    ),
                    trace_end_lt=_as_optional_int(
                        _resolve("trace_end_lt", required=False),
                        field=_field_label("trace_end_lt"),
                    ),
                    trace_end_utime=_as_optional_int(
                        _resolve("trace_end_utime", required=False),
                        field=_field_label("trace_end_utime"),
                    ),
                    trace_external_hash=_normalise_identifier(
                        _resolve("trace_external_hash", required=False),
                        field=_field_label("trace_external_hash"),
                    ),
                    trace_external_hash_norm=_normalise_identifier(
                        _resolve("trace_external_hash_norm", required=False),
                        field=_field_label("trace_external_hash_norm"),
                    ),
                    trace_mc_seqno_end=_as_optional_int(
                        _resolve("trace_mc_seqno_end", required=False),
                        field=_field_label("trace_mc_seqno_end"),
                    ),
                    accounts=accounts,
                    transactions=transactions,
                    details=mapping.get("details"),
                )
            )

        return tuple(actions)

    async def fetch_liquidity(self, *, venue: str, pair: str) -> TonLiquiditySnapshot:
        venue_key = venue.lower()
        if venue_key == "stonfi":
            base = self._base_urls["stonfi"]
            pool_address = _stonfi_pool_address(pair)
            payload = await self._request(f"{base}/v1/pools/{pool_address}")
            pool = payload.get("pool", payload)
            ton_depth = float(pool.get("reserve0", 0.0))
            quote_depth = float(pool.get("reserve1", 0.0))
            fee_bps = float(pool.get("lp_fee", 0.0))
            block_height = int(pool.get("last_transaction_lt", 0) or 0)
            return TonLiquiditySnapshot(
                venue=venue,
                pair=pair,
                ton_depth=ton_depth,
                quote_depth=quote_depth,
                fee_bps=fee_bps,
                block_height=block_height,
            )
        if venue_key == "dedust":
            base = self._base_urls["dedust"]
            pool_address = _dedust_pool_address(pair)
            payload = await self._request(f"{base}/v2/pools/{pool_address}")
            pool = payload.get("pool", payload)
            reserves = pool.get("reserves") or ()
            ton_depth = float(reserves[0]) if len(reserves) > 0 else 0.0
            quote_depth = float(reserves[1]) if len(reserves) > 1 else 0.0
            trade_fee = pool.get("tradeFee")
            if isinstance(trade_fee, Mapping):
                trade_fee_value = trade_fee.get("value") or trade_fee.get("percent")
            else:
                trade_fee_value = trade_fee
            fee_bps = float(trade_fee_value or 0.0) * 100.0
            block_height = int(pool.get("lt", 0) or 0)
            return TonLiquiditySnapshot(
                venue=venue,
                pair=pair,
                ton_depth=ton_depth,
                quote_depth=quote_depth,
                fee_bps=fee_bps,
                block_height=block_height,
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

    async def fetch_account_states(
        self, addresses: Sequence[str], *, include_boc: bool = False
    ) -> TonIndexAccountStatesResult:
        if self._ton_index_client is None:
            raise RuntimeError(
                "TonIndexClient is required for account state queries. Provide one via "
                "TonDataCollector(ton_index_client=...)"
            )
        return await self._ton_index_client.get_account_states(
            addresses, include_boc=include_boc
        )

    async def fetch_transactions(
        self,
        *,
        account: str | None = None,
        start_lt: int | None = None,
        end_lt: int | None = None,
        limit: int = 20,
        offset: int = 0,
        sort_desc: bool = True,
    ) -> TonIndexTransactionsResult:
        if self._ton_index_client is None:
            raise RuntimeError(
                "TonIndexClient is required for transaction queries. Provide one via "
                "TonDataCollector(ton_index_client=...)"
            )
        return await self._ton_index_client.get_transactions(
            account=account,
            start_lt=start_lt,
            end_lt=end_lt,
            limit=limit,
            offset=offset,
            sort_desc=sort_desc,
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
