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

from dataclasses import dataclass
from datetime import datetime, timezone

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


class DomainValidationError(ValueError):
    """Raised when a domain string does not satisfy the DNS auction rules."""


@dataclass(slots=True)
class _DomainBits:
    """Represents the portion of a domain up to the first null terminator."""

    bits: int

    @classmethod
    def from_slice(cls, domain: bytes | bytearray | memoryview | str) -> "_DomainBits":
        data = domain.encode("utf-8") if isinstance(domain, str) else bytes(domain)
        try:
            zero_index = data.index(0)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise DomainValidationError("domain must contain a null terminator") from exc
        if zero_index == 0:
            raise DomainValidationError("domain must not start with a null terminator")
        return cls(bits=zero_index * 8)


def get_top_domain_bits(domain: bytes | bytearray | memoryview | str) -> int:
    """Return the number of bits occupied by the top-level label of *domain*.

    The FunC contract stores domains as null-terminated byte sequences.  This
    helper mirrors ``get_top_domain_bits`` by counting the number of bits before
    the first ``\0`` byte and raises :class:`DomainValidationError` if the
    sequence is malformed.
    """

    return _DomainBits.from_slice(domain).bits


def check_domain_string(domain: str) -> bool:
    """Validate that *domain* satisfies TON DNS naming requirements.

    The contract allows lower-case ASCII letters, digits, and hyphens.  Hyphens
    must appear only in the middle of the label (not at the beginning or end).
    Any other character invalidates the string.  The function mirrors the FunC
    logic by returning ``True`` when the domain is valid and ``False``
    otherwise.
    """

    if not domain:
        return False
    length = len(domain)
    for index, char in enumerate(domain):
        code_point = ord(char)
        if char == "-":
            if index == 0 or index == length - 1:
                return False
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

    if domain_char_count == 4:
        return 1000, 100
    if domain_char_count == 5:
        return 500, 50
    if domain_char_count == 6:
        return 400, 40
    if domain_char_count == 7:
        return 300, 30
    if domain_char_count == 8:
        return 200, 20
    if domain_char_count == 9:
        return 100, 10
    if domain_char_count == 10:
        return 50, 5
    return 10, 1


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
    if months > 21:
        return end_min_price

    price = start_min_price
    for _ in range(months):
        price = price * 90 // 100
    return price


def get_min_price_for_domain(domain: str, now_time: int | float | datetime) -> int:
    """Convenience wrapper that validates *domain* and delegates to :func:`get_min_price`."""

    if not check_domain_string(domain):
        raise DomainValidationError("domain string is invalid")
    return get_min_price(len(domain) * 8, now_time)
