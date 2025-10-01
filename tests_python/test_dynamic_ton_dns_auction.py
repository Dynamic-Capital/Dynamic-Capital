from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_ton import (
    AUCTION_START_TIME,
    ONE_MONTH,
    ONE_TON,
    DomainValidationError,
    check_domain_string,
    get_min_price,
    get_min_price_config,
    get_min_price_for_domain,
    get_top_domain_bits,
)


def test_get_top_domain_bits_handles_null_terminated_bytes() -> None:
    domain = b"ton\0test\0"
    assert get_top_domain_bits(domain) == len("ton") * 8


@pytest.mark.parametrize(
    "domain, expected",
    [
        ("ton", True),
        ("ton123", True),
        ("ton-capital", True),
        ("-leading", False),
        ("trailing-", False),
        ("UpperCase", False),
        ("space domain", False),
        ("", False),
    ],
)
def test_check_domain_string_validation(domain: str, expected: bool) -> None:
    assert check_domain_string(domain) is expected


@pytest.mark.parametrize(
    "length, expected",
    [
        (4, (1000, 100)),
        (5, (500, 50)),
        (6, (400, 40)),
        (7, (300, 30)),
        (8, (200, 20)),
        (9, (100, 10)),
        (10, (50, 5)),
        (11, (10, 1)),
    ],
)
def test_get_min_price_config_matches_reference(length: int, expected: tuple[int, int]) -> None:
    assert get_min_price_config(length) == expected


def test_get_min_price_declines_by_ten_percent_per_month() -> None:
    domain_bits = 4 * 8
    start_price = 1000 * ONE_TON
    # advance by three months from launch
    timestamp = AUCTION_START_TIME + 3 * ONE_MONTH
    price = get_min_price(domain_bits, timestamp)
    # integer math mirrors FunC implementation (floor division per month)
    expected_price = start_price
    for _ in range(3):
        expected_price = expected_price * 90 // 100
    assert price == expected_price


def test_get_min_price_clamps_to_floor_after_twenty_two_months() -> None:
    domain_bits = 4 * 8
    timestamp = AUCTION_START_TIME + 22 * ONE_MONTH
    assert get_min_price(domain_bits, timestamp) == 100 * ONE_TON


def test_get_min_price_for_domain_raises_for_invalid_domain() -> None:
    with pytest.raises(DomainValidationError):
        get_min_price_for_domain("Invalid", AUCTION_START_TIME)


def test_get_min_price_for_domain_delegates_to_length() -> None:
    timestamp = datetime.fromtimestamp(AUCTION_START_TIME, tz=timezone.utc)
    assert get_min_price_for_domain("tonic", timestamp) == get_min_price(5 * 8, timestamp)
