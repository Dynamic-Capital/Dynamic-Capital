from __future__ import annotations

import base64
import hashlib
import hmac
import json
import urllib.parse

import pytest

from dynamic.platform.token.verification import (
    TelegramVerificationResult,
    TonContractSignature,
    verify_contract_signature,
    verify_dynamic_capital_token,
    verify_telegram_init_data,
    sign_ton_contract,
)


def _build_init_data(bot_token: str, params: dict[str, str]) -> str:
    data_check = "\n".join(f"{k}={params[k]}" for k in sorted(params))
    secret = hashlib.sha256(bot_token.encode("utf-8")).digest()
    signature = hmac.new(secret, data_check.encode("utf-8"), hashlib.sha256).hexdigest()
    payload = {**params, "hash": signature}
    return urllib.parse.urlencode(payload)


def test_verify_telegram_init_data_accepts_valid_payload() -> None:
    bot_token = "123456:TEST"
    params = {
        "auth_date": "1700000000",
        "query_id": "AAEQEw",
        "user": json.dumps({"id": 42, "username": "dynamic"}, separators=(",", ":")),
    }
    init_data = _build_init_data(bot_token, params)

    result = verify_telegram_init_data(init_data, bot_token, max_age_seconds=10**9)
    assert isinstance(result, TelegramVerificationResult)
    assert result.hash
    assert result.user and result.user["id"] == 42
    assert result.is_fresh(max_age_seconds=10**9)
    assert "hash" in result.to_dict()


def test_verify_telegram_init_data_rejects_bad_signature() -> None:
    bot_token = "123456:TEST"
    params = {
        "auth_date": "1700000000",
        "query_id": "AAEQEw",
        "user": json.dumps({"id": 42}, separators=(",", ":")),
    }
    init_data = _build_init_data(bot_token, params)
    tampered = init_data.replace("AAEQEw", "ZZZ")

    with pytest.raises(ValueError):
        verify_telegram_init_data(tampered, bot_token)


def test_verify_dynamic_capital_token_validates_metadata() -> None:
    report = verify_dynamic_capital_token(
        {
            "name": "Dynamic Capital Token",
            "symbol": "DCT",
            "decimals": 9,
            "total_supply": 50_000_000,
            "circulating_supply": 48_500_000,
            "genesis_closed": True,
        }
    )
    assert report.symbol == "DCT"
    assert report.total_supply == pytest.approx(50_000_000)
    assert report.circulating_supply == pytest.approx(48_500_000)
    assert report.supply_remaining() == pytest.approx(50_000_000)
    payload = report.as_dict()
    assert payload["max_supply"] == pytest.approx(100_000_000)


def test_verify_dynamic_capital_token_rejects_bad_symbol() -> None:
    with pytest.raises(ValueError):
        verify_dynamic_capital_token(
            {
                "name": "Dynamic Capital Token",
                "symbol": "INVALID",
                "decimals": 9,
                "total_supply": 1,
            }
        )


def test_sign_ton_contract_matches_rfc_vector() -> None:
    private_key = bytes.fromhex(
        "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
    )
    expected_public = bytes.fromhex(
        "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
    )
    expected_signature = (
        "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155"
        "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"
    )

    signature = sign_ton_contract(b"", private_key)
    assert isinstance(signature, TonContractSignature)
    assert signature.public_key == expected_public
    assert signature.to_hex() == expected_signature
    assert signature.verify()


def test_sign_ton_contract_accepts_string_inputs() -> None:
    message = "Sign Dynamic Capital contract"
    private_key_hex = (
        "4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb"
    )
    sig = sign_ton_contract(message, private_key_hex)
    hex_value = sig.to_hex()
    assert len(hex_value) == 128
    assert sig.verify()
    assert verify_contract_signature(sig.signature, sig.public_key, message)
    assert base64.b64decode(sig.to_base64()) == sig.signature
