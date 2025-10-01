"""Utilities for reasoning about TON DNS auction parameters.

This module mirrors a subset of the FunC reference implementation that
controls auction pricing for the TON DNS smart contract.  The original
implementation lives in the TON blockchain repository and exposes a collection
of helper routines that validate domain names and compute the minimum auction
price based on the number of months since the auction launch.

Having a Python translation allows Dynamic Capital tooling to simulate pricing
scenarios and build guardrails around governance decisions without interacting
with chain state directly.  The behaviour intentionally sticks to integer
arithmetic to match the FunC semantics and avoid rounding surprises.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Mapping

__all__ = [
    "ONE_MONTH",
    "ONE_YEAR",
    "AUCTION_START_TIME",
    "ONE_TON",
    "DNS_NEXT_RESOLVER_PREFIX",
    "DNS_CONFIG_ID",
    "DomainValidationError",
    "get_top_domain_bits",
    "check_domain_string",
    "get_min_price_config",
    "get_min_price",
    "get_min_price_for_domain",
]


ONE_MONTH = 2_592_000
ONE_YEAR = 31_622_400
AUCTION_START_TIME = 1_659_171_600
ONE_TON = 1_000_000_000
DNS_NEXT_RESOLVER_PREFIX = 0xBA93
DNS_CONFIG_ID = 80

_MAX_DISCOUNT_MONTHS = 21
_DISCOUNT_NUMERATOR = 90
_DISCOUNT_DENOMINATOR = 100

_MIN_PRICE_CONFIG: Mapping[int, tuple[int, int]] = {
    4: (1000, 100),
    5: (500, 50),
    6: (400, 40),
    7: (300, 30),
    8: (200, 20),
    9: (100, 10),
    10: (50, 5),
}
_MIN_PRICE_DEFAULT = (10, 1)


def _build_price_schedule(start_price: int) -> tuple[int, ...]:
    price = start_price
    schedule = [price]
    for _ in range(_MAX_DISCOUNT_MONTHS):
        price = price * _DISCOUNT_NUMERATOR // _DISCOUNT_DENOMINATOR
        schedule.append(price)
    return tuple(schedule)


_PRICE_SCHEDULES = {
    start * ONE_TON: _build_price_schedule(start * ONE_TON)
    for start in {config[0] for config in _MIN_PRICE_CONFIG.values()} | {_MIN_PRICE_DEFAULT[0]}
}


class DomainValidationError(ValueError):
    """Raised when a domain string does not satisfy the DNS auction rules."""


def _coerce_domain_bytes(domain: bytes | bytearray | memoryview | str) -> bytes:
    if isinstance(domain, str):
        return domain.encode("utf-8")
    if isinstance(domain, bytes):
        return domain
    if isinstance(domain, bytearray):
        return bytes(domain)
    if isinstance(domain, memoryview):
        return domain.tobytes()
    raise TypeError("domain must be bytes-like or str")


def _top_label_bit_length(domain: bytes | bytearray | memoryview | str) -> int:
    data = _coerce_domain_bytes(domain)
    zero_index = data.find(b"\0")
    if zero_index == -1:
        raise DomainValidationError("domain must contain a null terminator")
    if zero_index == 0:
        raise DomainValidationError("domain must not start with a null terminator")
    return zero_index * 8


def get_top_domain_bits(domain: bytes | bytearray | memoryview | str) -> int:
    """Return the number of bits occupied by the top-level label of *domain*.

    The FunC contract stores domains as null-terminated byte sequences.  This
    helper mirrors ``get_top_domain_bits`` by counting the number of bits before
    the first ``\0`` byte and raises :class:`DomainValidationError` if the
    sequence is malformed.
    """

    return _top_label_bit_length(domain)


def check_domain_string(domain: str) -> bool:
    """Validate that *domain* satisfies TON DNS naming requirements.

    The contract allows lower-case ASCII letters, digits, and hyphens.  Hyphens
    must appear only in the middle of the label (not at the beginning or end).
    Any other character invalidates the string.  The function mirrors the FunC
    logic by returning ``True`` when the domain is valid and ``False``
    otherwise.
    """

    if not domain or not domain.isascii():
        return False
    if domain[0] == "-" or domain[-1] == "-":
        return False
    for char in domain:
        code_point = ord(char)
        if char == "-":
            continue
        if 48 <= code_point <= 57 or 97 <= code_point <= 122:
            continue
        return False
    return True


def get_min_price_config(domain_char_count: int) -> tuple[int, int]:
    """Return the starting and ending minimum price (in TON) for *domain_char_count*.

    The values mirror the FunC ``get_min_price_config`` function.  They express
    TON amounts in their integer representation (i.e. without applying
    :data:`ONE_TON`).
    """

    return _MIN_PRICE_CONFIG.get(domain_char_count, _MIN_PRICE_DEFAULT)


def _coerce_timestamp(value: int | float | datetime) -> int:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return int(value.timestamp())
    return int(value)


def _calculate_months_since_launch(timestamp: int) -> int:
    if timestamp <= AUCTION_START_TIME:
        return 0
    seconds = timestamp - AUCTION_START_TIME
    return seconds // ONE_MONTH


def get_min_price(domain_bits_length: int, now_time: int | float | datetime) -> int:
    """Compute the minimum bid price in nanotons for a label of *domain_bits_length* bits.

    The :class:`FunC implementation <https://github.com/ton-blockchain/ton/blob/7e3df93ca2ab336716a230fceb1726d81bac0a06/crypto/block/block.tlb>`
    performs integer arithmetic; this function follows the same approach.  The
    caller must supply *domain_bits_length* in bits (multiples of eight).  The
    return value is expressed in nanotons.
    """

    if domain_bits_length <= 0 or domain_bits_length % 8 != 0:
        raise ValueError("domain_bits_length must be a positive multiple of 8")

    char_count = domain_bits_length // 8
    start_min_price, end_min_price = get_min_price_config(char_count)
    start_min_price *= ONE_TON
    end_min_price *= ONE_TON

    timestamp = _coerce_timestamp(now_time)
    months = _calculate_months_since_launch(timestamp)
    if months > _MAX_DISCOUNT_MONTHS:
        return end_min_price

    schedule = _PRICE_SCHEDULES[start_min_price]
    return schedule[months]


def get_min_price_for_domain(domain: str, now_time: int | float | datetime) -> int:
    """Convenience wrapper that validates *domain* and delegates to :func:`get_min_price`."""

    if not check_domain_string(domain):
        raise DomainValidationError("domain string is invalid")
    return get_min_price(len(domain) * 8, now_time)
