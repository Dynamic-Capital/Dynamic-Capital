"""Typed client helpers for the `ton-index-go` service."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, MutableMapping, Sequence

__all__ = [
    "TonIndexClient",
    "TonIndexAccountState",
    "TonIndexAccountStatesResult",
    "TonIndexAddressBookEntry",
    "TonIndexAddressMetadata",
    "TonIndexMessage",
    "TonIndexTransaction",
    "TonIndexTransactionsResult",
]


def _as_int(value: Any) -> int:
    if isinstance(value, bool):
        raise TypeError("boolean cannot be converted to int")
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        if not value:
            return 0
        return int(value, 0) if value.startswith("0x") else int(value)
    raise TypeError(f"Unsupported integer value: {value!r}")


def _as_optional_int(value: Any | None) -> int | None:
    if value in (None, ""):
        return None
    return _as_int(value)


def _as_optional_str(value: Any | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.lower()
        if lowered in {"1", "true", "yes"}:
            return True
        if lowered in {"0", "false", "no"}:
            return False
    return bool(value)


def _coerce_numeric_mapping(payload: Mapping[str, Any] | None) -> Mapping[str, int]:
    if not payload:
        return {}
    normalised: MutableMapping[str, int] = {}
    for key, raw_value in payload.items():
        try:
            normalised[str(key)] = _as_int(raw_value)
        except (TypeError, ValueError):  # pragma: no cover - defensive guard
            continue
    return normalised


@dataclass(slots=True, frozen=True)
class TonIndexAddressBookEntry:
    """Human-friendly metadata for a TON address."""

    domain: str | None
    user_friendly: str | None

    @classmethod
    def from_json(cls, payload: Mapping[str, Any]) -> "TonIndexAddressBookEntry":
        return cls(
            domain=_as_optional_str(payload.get("domain")),
            user_friendly=_as_optional_str(payload.get("user_friendly")),
        )


@dataclass(slots=True, frozen=True)
class TonIndexAddressMetadata:
    """Indexer metadata describing enrichment available for an address."""

    is_indexed: bool
    token_info: tuple[Mapping[str, Any], ...]

    @classmethod
    def from_json(cls, payload: Mapping[str, Any]) -> "TonIndexAddressMetadata":
        token_info: list[Mapping[str, Any]] = []
        for item in payload.get("token_info", []):
            if isinstance(item, Mapping):
                token_info.append(dict(item))
        return cls(
            is_indexed=_as_bool(payload.get("is_indexed", False)),
            token_info=tuple(token_info),
        )


@dataclass(slots=True, frozen=True)
class TonIndexMessage:
    """Lightweight representation of a message linked to a transaction."""

    hash: str
    source: str | None
    destination: str | None
    value: int
    created_lt: int | None
    created_at: int | None
    bounce: bool
    bounced: bool
    ihr_fee: int
    fwd_fee: int
    opcode: int | None
    value_extra_currencies: Mapping[str, int]

    @classmethod
    def from_json(cls, payload: Mapping[str, Any]) -> "TonIndexMessage":
        return cls(
            hash=str(payload.get("hash", "")),
            source=_as_optional_str(payload.get("source")),
            destination=_as_optional_str(payload.get("destination")),
            value=_as_int(payload.get("value", 0)),
            created_lt=_as_optional_int(payload.get("created_lt")),
            created_at=_as_optional_int(payload.get("created_at")),
            bounce=_as_bool(payload.get("bounce", False)),
            bounced=_as_bool(payload.get("bounced", False)),
            ihr_fee=_as_int(payload.get("ihr_fee", 0)),
            fwd_fee=_as_int(payload.get("fwd_fee", 0)),
            opcode=_as_optional_int(payload.get("opcode")),
            value_extra_currencies=_coerce_numeric_mapping(
                payload.get("value_extra_currencies")
            ),
        )


@dataclass(slots=True, frozen=True)
class TonIndexTransaction:
    """Transaction entry returned by the TON Index API."""

    account: str
    hash: str
    lt: int
    now: int
    mc_block_seqno: int | None
    trace_id: str | None
    orig_status: str | None
    end_status: str | None
    total_fees: int
    total_fees_extra_currencies: Mapping[str, int]
    in_msg: TonIndexMessage | None
    out_msgs: tuple[TonIndexMessage, ...]

    @classmethod
    def from_json(cls, payload: Mapping[str, Any]) -> "TonIndexTransaction":
        in_msg_payload = payload.get("in_msg")
        in_msg = (
            TonIndexMessage.from_json(in_msg_payload)
            if isinstance(in_msg_payload, Mapping)
            else None
        )
        out_msgs: list[TonIndexMessage] = []
        for item in payload.get("out_msgs", []):
            if isinstance(item, Mapping):
                out_msgs.append(TonIndexMessage.from_json(item))
        return cls(
            account=str(payload.get("account", "")),
            hash=str(payload.get("hash", "")),
            lt=_as_int(payload.get("lt", 0)),
            now=_as_int(payload.get("now", 0)),
            mc_block_seqno=_as_optional_int(payload.get("mc_block_seqno")),
            trace_id=_as_optional_str(payload.get("trace_id")),
            orig_status=_as_optional_str(payload.get("orig_status")),
            end_status=_as_optional_str(payload.get("end_status")),
            total_fees=_as_int(payload.get("total_fees", 0)),
            total_fees_extra_currencies=_coerce_numeric_mapping(
                payload.get("total_fees_extra_currencies")
            ),
            in_msg=in_msg,
            out_msgs=tuple(out_msgs),
        )

    @property
    def total_fees_ton(self) -> float:
        """Return the total fees in TON units (nanoTON -> TON)."""

        return self.total_fees / 1_000_000_000


@dataclass(slots=True, frozen=True)
class TonIndexAccountState:
    """Account state record returned by the TON Index API."""

    address: str
    balance: int
    status: str | None
    account_state_hash: str | None
    last_transaction_hash: str | None
    last_transaction_lt: int | None
    code_hash: str | None
    data_hash: str | None
    extra_currencies: Mapping[str, int]

    @classmethod
    def from_json(cls, payload: Mapping[str, Any]) -> "TonIndexAccountState":
        return cls(
            address=str(payload.get("address", "")),
            balance=_as_int(payload.get("balance", 0)),
            status=_as_optional_str(payload.get("status")),
            account_state_hash=_as_optional_str(payload.get("account_state_hash")),
            last_transaction_hash=_as_optional_str(payload.get("last_transaction_hash")),
            last_transaction_lt=_as_optional_int(payload.get("last_transaction_lt")),
            code_hash=_as_optional_str(payload.get("code_hash")),
            data_hash=_as_optional_str(payload.get("data_hash")),
            extra_currencies=_coerce_numeric_mapping(payload.get("extra_currencies")),
        )

    @property
    def balance_ton(self) -> float:
        """Return the balance in TON units (nanoTON -> TON)."""

        return self.balance / 1_000_000_000


@dataclass(slots=True, frozen=True)
class TonIndexAccountStatesResult:
    """Container for account state queries."""

    accounts: tuple[TonIndexAccountState, ...]
    address_book: Mapping[str, TonIndexAddressBookEntry]
    metadata: Mapping[str, TonIndexAddressMetadata]


@dataclass(slots=True, frozen=True)
class TonIndexTransactionsResult:
    """Container for transaction queries."""

    transactions: tuple[TonIndexTransaction, ...]
    address_book: Mapping[str, TonIndexAddressBookEntry]
    metadata: Mapping[str, TonIndexAddressMetadata]


class TonIndexClient:
    """Asynchronous helper for the TON Index HTTP API."""

    def __init__(
        self,
        *,
        base_url: str = "https://tonindexer.toncenter.com/api/v3",
        api_key: str | None = None,
        http_client: Any | None = None,
        request_timeout: float = 10.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._client = http_client
        self._timeout = request_timeout

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Sequence[tuple[str, Any]] | None = None,
        json: Any | None = None,
    ) -> Any:
        import httpx

        url = f"{self._base_url}{path}"
        headers = {"Accept": "application/json"}
        if self._api_key:
            headers["X-Api-Key"] = self._api_key

        if self._client is None:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    headers=headers,
                )
        else:  # pragma: no cover - exercised in integration environments
            response = await self._client.request(
                method,
                url,
                params=params,
                json=json,
                headers=headers,
            )
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _parse_address_book(
        payload: Mapping[str, Any] | None,
    ) -> Mapping[str, TonIndexAddressBookEntry]:
        if not payload:
            return {}
        book: MutableMapping[str, TonIndexAddressBookEntry] = {}
        for address, meta in payload.items():
            if isinstance(meta, Mapping):
                book[str(address)] = TonIndexAddressBookEntry.from_json(meta)
        return book

    @staticmethod
    def _parse_metadata(
        payload: Mapping[str, Any] | None,
    ) -> Mapping[str, TonIndexAddressMetadata]:
        if not payload:
            return {}
        metadata: MutableMapping[str, TonIndexAddressMetadata] = {}
        for address, meta in payload.items():
            if isinstance(meta, Mapping):
                metadata[str(address)] = TonIndexAddressMetadata.from_json(meta)
        return metadata

    async def get_account_states(
        self,
        addresses: Sequence[str],
        *,
        include_boc: bool = False,
    ) -> TonIndexAccountStatesResult:
        if not addresses:
            raise ValueError("addresses cannot be empty")
        params: list[tuple[str, Any]] = [("address", address) for address in addresses]
        if include_boc:
            params.append(("include_boc", "true"))
        payload = await self._request("GET", "/accountStates", params=params)
        accounts_payload = payload.get("accounts", [])
        accounts: list[TonIndexAccountState] = []
        for entry in accounts_payload:
            if isinstance(entry, Mapping):
                accounts.append(TonIndexAccountState.from_json(entry))
        return TonIndexAccountStatesResult(
            accounts=tuple(accounts),
            address_book=self._parse_address_book(payload.get("address_book")),
            metadata=self._parse_metadata(payload.get("metadata")),
        )

    async def get_transactions(
        self,
        *,
        account: str | None = None,
        start_lt: int | None = None,
        end_lt: int | None = None,
        limit: int = 20,
        offset: int = 0,
        sort_desc: bool = True,
    ) -> TonIndexTransactionsResult:
        params: list[tuple[str, Any]] = []
        if account:
            params.append(("account", account))
        if start_lt is not None:
            params.append(("start_lt", start_lt))
        if end_lt is not None:
            params.append(("end_lt", end_lt))
        params.append(("limit", max(1, min(limit, 1000))))
        if offset:
            params.append(("offset", max(0, offset)))
        params.append(("sort", "desc" if sort_desc else "asc"))
        payload = await self._request("GET", "/transactions", params=params)
        transactions_payload = payload.get("transactions", [])
        transactions: list[TonIndexTransaction] = []
        for entry in transactions_payload:
            if isinstance(entry, Mapping):
                transactions.append(TonIndexTransaction.from_json(entry))
        return TonIndexTransactionsResult(
            transactions=tuple(transactions),
            address_book=self._parse_address_book(payload.get("address_book")),
            metadata=self._parse_metadata(payload.get("metadata")),
        )
