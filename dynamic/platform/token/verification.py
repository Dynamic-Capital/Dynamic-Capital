"""Verification helpers for Telegram initData, DCT state, and TON signatures."""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, Sequence

__all__ = [
    "TelegramVerificationResult",
    "TokenVerificationReport",
    "TonContractSignature",
    "verify_telegram_init_data",
    "verify_dynamic_capital_token",
    "sign_ton_contract",
    "verify_contract_signature",
]

# --- Telegram verification -------------------------------------------------


@dataclass(slots=True)
class TelegramVerificationResult:
    """Structured representation of a verified Telegram Mini App initData payload."""

    auth_date: datetime
    hash: str
    user: Mapping[str, Any] | None
    raw: str

    def is_fresh(self, *, max_age_seconds: int) -> bool:
        """Return ``True`` if the payload is within ``max_age_seconds`` of now."""

        if max_age_seconds <= 0:
            return True
        delta = datetime.now(timezone.utc) - self.auth_date
        return delta.total_seconds() <= max_age_seconds

    def to_dict(self) -> dict[str, Any]:
        """Serialise the verification payload for logging."""

        return {
            "auth_date": self.auth_date.isoformat(),
            "hash": self.hash,
            "user": dict(self.user) if self.user is not None else None,
            "raw": self.raw,
        }


def _parse_init_data(init_data: str) -> dict[str, str]:
    pairs: list[tuple[str, str]] = []
    for chunk in init_data.split("&"):
        if not chunk:
            continue
        if "=" in chunk:
            key, value = chunk.split("=", 2)
        else:
            key, value = chunk, ""
        if not key:
            continue
        pairs.append((urllib.parse.unquote_to_bytes(key).decode(), urllib.parse.unquote_to_bytes(value).decode()))
    return dict(pairs)


def verify_telegram_init_data(
    init_data: str,
    bot_token: str,
    *,
    max_age_seconds: int = 900,
) -> TelegramVerificationResult:
    """Verify Telegram Mini App ``initData`` signatures.

    Parameters
    ----------
    init_data:
        The raw query-string style payload provided by ``window.Telegram.WebApp``.
    bot_token:
        Telegram bot token used to derive the HMAC key.
    max_age_seconds:
        Optional freshness window. Payloads older than this raise ``ValueError``.
    """

    if not init_data:
        raise ValueError("init_data must be a non-empty string")
    if not bot_token:
        raise ValueError("bot_token must be provided")

    params = _parse_init_data(init_data)
    provided_hash = params.pop("hash", None)
    if not provided_hash:
        raise ValueError("hash parameter missing from initData")

    data_check_string = "\n".join(f"{k}={params[k]}" for k in sorted(params))
    secret = hashlib.sha256(bot_token.encode("utf-8")).digest()
    expected_hash = hmac.new(secret, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, provided_hash):
        raise ValueError("initData signature mismatch")

    auth_date_raw = params.get("auth_date")
    if not auth_date_raw:
        raise ValueError("auth_date missing from initData")
    try:
        auth_date_value = int(auth_date_raw)
    except ValueError as exc:
        raise ValueError("auth_date must be an integer") from exc

    auth_dt = datetime.fromtimestamp(auth_date_value, tz=timezone.utc)
    if max_age_seconds > 0:
        age_seconds = datetime.now(timezone.utc).timestamp() - auth_date_value
        if age_seconds > max_age_seconds:
            raise ValueError("initData is expired")

    user_payload: Mapping[str, Any] | None = None
    user_raw = params.get("user")
    if user_raw:
        try:
            user_payload = json.loads(user_raw)
            if not isinstance(user_payload, Mapping):
                user_payload = None
        except json.JSONDecodeError:
            user_payload = None

    return TelegramVerificationResult(
        auth_date=auth_dt,
        hash=provided_hash,
        user=user_payload,
        raw=init_data,
    )


# --- Dynamic Capital Token verification ------------------------------------


@dataclass(slots=True)
class TokenVerificationReport:
    """Summary of Dynamic Capital Token supply and metadata checks."""

    name: str
    symbol: str
    decimals: int
    total_supply: float
    circulating_supply: float
    max_supply: float
    genesis_closed: bool

    def supply_remaining(self) -> float:
        return max(self.max_supply - self.total_supply, 0.0)

    def as_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "symbol": self.symbol,
            "decimals": self.decimals,
            "total_supply": self.total_supply,
            "circulating_supply": self.circulating_supply,
            "max_supply": self.max_supply,
            "genesis_closed": self.genesis_closed,
            "supply_remaining": self.supply_remaining(),
        }


def _coerce_number(value: Any, *, field: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be numeric") from exc
    if number < 0:
        raise ValueError(f"{field} must be non-negative")
    return number


def verify_dynamic_capital_token(
    state: Mapping[str, Any],
    *,
    max_supply: float = 100_000_000.0,
    expected_name: str = "Dynamic Capital Token",
    expected_symbol: str = "DCT",
    expected_decimals: int = 9,
) -> TokenVerificationReport:
    """Validate Dynamic Capital Token ledger metadata.

    The function raises ``ValueError`` if any invariants are violated and returns a
    :class:`TokenVerificationReport` otherwise.
    """

    if not isinstance(state, Mapping):
        raise TypeError("state must be a mapping of token fields")

    name = str(state.get("name", "")).strip()
    symbol = str(state.get("symbol", "")).strip()
    decimals_value = state.get("decimals", expected_decimals)
    genesis_closed = bool(state.get("genesis_closed", False))

    if name != expected_name:
        raise ValueError(f"Unexpected token name: {name!r}")
    if symbol.upper() != expected_symbol:
        raise ValueError(f"Unexpected token symbol: {symbol!r}")

    try:
        decimals = int(decimals_value)
    except (TypeError, ValueError) as exc:
        raise ValueError("decimals must be an integer") from exc
    if decimals != expected_decimals:
        raise ValueError(f"Token decimals must equal {expected_decimals}")

    total_supply = _coerce_number(state.get("total_supply", 0), field="total_supply")
    circulating_supply = _coerce_number(
        state.get("circulating_supply", total_supply), field="circulating_supply"
    )

    if circulating_supply > total_supply + 1e-9:
        raise ValueError("circulating_supply cannot exceed total_supply")
    if total_supply - max_supply > 1e-6:
        raise ValueError("total_supply exceeds configured max_supply")

    return TokenVerificationReport(
        name=name,
        symbol=expected_symbol,
        decimals=decimals,
        total_supply=total_supply,
        circulating_supply=circulating_supply,
        max_supply=max_supply,
        genesis_closed=genesis_closed,
    )


# --- Ed25519 signing for TON contracts -------------------------------------

P = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493


def _inv(x: int) -> int:
    return pow(x, P - 2, P)


D = (-121665 * _inv(121666)) % P
I = pow(2, (P - 1) // 4, P)


Bx = 15112221349535400772501151409588531511454012693041857206046113283949847762202
By = 46316835694926478169428394003475163141307993866256225615783033603165251855960
BASE_POINT = (Bx % P, By % P)
IDENTITY = (0, 1)


def _edwards_add(p1: tuple[int, int], p2: tuple[int, int]) -> tuple[int, int]:
    x1, y1 = p1
    x2, y2 = p2
    x1 %= P
    y1 %= P
    x2 %= P
    y2 %= P
    denominator = (1 + D * x1 * x2 * y1 * y2) % P
    denominator2 = (1 - D * x1 * x2 * y1 * y2) % P
    if denominator == 0 or denominator2 == 0:
        raise ValueError("Point addition denominator vanished")
    x3 = ((x1 * y2 + y1 * x2) * _inv(denominator)) % P
    y3 = ((y1 * y2 + x1 * x2) * _inv(denominator2)) % P
    return (x3, y3)


def _scalar_mult(scalar: int, point: tuple[int, int]) -> tuple[int, int]:
    scalar = scalar % L
    result = IDENTITY
    addend = point
    while scalar:
        if scalar & 1:
            result = _edwards_add(result, addend)
        addend = _edwards_add(addend, addend)
        scalar >>= 1
    return result


def _encode_point(point: tuple[int, int]) -> bytes:
    x, y = point
    x %= P
    y %= P
    bits = bytearray(y.to_bytes(32, "little"))
    bits[-1] |= (x & 1) << 7
    return bytes(bits)


def _recover_x(y: int, sign: int) -> int:
    y %= P
    y2 = y * y % P
    u = (y2 - 1) % P
    v = (D * y2 + 1) % P
    inv_v = _inv(v)
    x = pow((u * inv_v) % P, (P + 3) // 8, P)
    if (x * x - u * inv_v) % P != 0:
        x = (x * I) % P
    if (x * x - u * inv_v) % P != 0:
        raise ValueError("Invalid point encoding")
    if (x & 1) != sign:
        x = (-x) % P
    return x


def _decode_point(data: bytes) -> tuple[int, int]:
    if len(data) != 32:
        raise ValueError("Encoded point must be 32 bytes")
    y = int.from_bytes(data, "little") & ((1 << 255) - 1)
    sign = data[31] >> 7
    x = _recover_x(y, sign)
    if (y * y - x * x - 1 - D * x * x * y * y) % P != 0:
        raise ValueError("Point not on curve")
    return (x, y)


def _normalize_private_key(private_key: bytes) -> bytes:
    if len(private_key) == 32:
        return private_key
    if len(private_key) == 64:
        return private_key[:32]
    raise ValueError("private_key must be 32-byte seed or 64-byte expanded key")


def _coerce_bytes(value: bytes | str, *, field: str) -> bytes:
    if isinstance(value, bytes):
        if not value:
            raise ValueError(f"{field} must not be empty")
        return value
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    value = value.strip()
    try:
        return bytes.fromhex(value)
    except ValueError:
        try:
            return base64.b64decode(value, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise ValueError(f"{field} is not valid hex or base64") from exc


def _ensure_message_bytes(value: bytes | str, *, field: str = "message") -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        encoded = value.encode("utf-8")
        return encoded
    raise ValueError(f"{field} must be bytes or string")


def _derive_keypair(seed: bytes) -> tuple[bytes, bytes, int, bytes]:
    h = hashlib.sha512(seed).digest()
    h_list = bytearray(h[:32])
    h_list[0] &= 248
    h_list[31] &= 127
    h_list[31] |= 64
    a = int.from_bytes(h_list, "little")
    prefix = h[32:]
    public_point = _scalar_mult(a, BASE_POINT)
    public_key = _encode_point(public_point)
    return public_key, prefix, a, h_list


def _ed25519_sign(message: bytes, seed: bytes) -> tuple[bytes, bytes]:
    public_key, prefix, a_scalar, _ = _derive_keypair(seed)
    r = hashlib.sha512(prefix + message).digest()
    r_int = int.from_bytes(r, "little") % L
    r_point = _scalar_mult(r_int, BASE_POINT)
    r_encoded = _encode_point(r_point)
    k = hashlib.sha512(r_encoded + public_key + message).digest()
    k_int = int.from_bytes(k, "little") % L
    s = (r_int + k_int * a_scalar) % L
    signature = r_encoded + s.to_bytes(32, "little")
    return signature, public_key


def _ed25519_verify(signature: bytes, public_key: bytes, message: bytes) -> bool:
    if len(signature) != 64 or len(public_key) != 32:
        return False
    r_encoded = signature[:32]
    s_int = int.from_bytes(signature[32:], "little")
    if s_int >= L:
        return False
    try:
        r_point = _decode_point(r_encoded)
        a_point = _decode_point(public_key)
    except ValueError:
        return False
    k = hashlib.sha512(r_encoded + public_key + message).digest()
    k_int = int.from_bytes(k, "little") % L
    left = _scalar_mult(s_int, BASE_POINT)
    right = _edwards_add(r_point, _scalar_mult(k_int, a_point))
    return left == right


@dataclass(slots=True)
class TonContractSignature:
    """Ed25519 signature artefact for TON contract interactions."""

    signature: bytes
    public_key: bytes
    message: bytes

    def to_hex(self) -> str:
        return self.signature.hex()

    def to_base64(self) -> str:
        return base64.b64encode(self.signature).decode("ascii")

    def verify(self, public_key: bytes | str | None = None) -> bool:
        key = _coerce_bytes(public_key, field="public_key") if public_key is not None else self.public_key
        return _ed25519_verify(self.signature, key, self.message)

    def signature_bytes(self) -> bytes:
        return self.signature

    def public_key_hex(self) -> str:
        return self.public_key.hex()


def sign_ton_contract(
    message: bytes | str,
    private_key: bytes | str,
) -> TonContractSignature:
    """Sign ``message`` using an Ed25519 private key for TON contracts."""

    message_bytes = _ensure_message_bytes(message)
    key_bytes = _coerce_bytes(private_key, field="private_key")
    seed = _normalize_private_key(key_bytes)
    signature, public_key = _ed25519_sign(message_bytes, seed)
    return TonContractSignature(signature=signature, public_key=public_key, message=message_bytes)


def verify_contract_signature(
    signature: TonContractSignature | bytes,
    public_key: bytes | str,
    message: bytes | str | None = None,
) -> bool:
    """Verify a signature produced for TON contract interactions."""

    if isinstance(signature, TonContractSignature):
        message_bytes = signature.message if message is None else _ensure_message_bytes(message)
        key_bytes = _coerce_bytes(public_key, field="public_key")
        sig_bytes = signature.signature
    else:
        if message is None:
            raise ValueError("message must be provided when verifying raw signatures")
        message_bytes = _ensure_message_bytes(message)
        sig_bytes = signature
        key_bytes = _coerce_bytes(public_key, field="public_key")
    return _ed25519_verify(sig_bytes, key_bytes, message_bytes)
