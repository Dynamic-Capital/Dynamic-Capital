"""Tests for domain configuration verification helpers."""

from __future__ import annotations

import json
from pathlib import Path

from dynamic_domain import (
    DomainConfigCheck,
    summarise_checks,
    verify_config,
    verify_directory,
)


def _write_config(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload))


def test_verify_config_detects_placeholders(tmp_path: Path) -> None:
    config_path = tmp_path / "example.json"
    _write_config(
        config_path,
        {
            "domain": "Example.com",
            "records": [
                {"type": "A", "name": "@", "data": "1.2.3.4", "ttl": 300},
                {
                    "type": "CNAME",
                    "name": "api",
                    "data": "your-project-ref.supabase.co",
                    "ttl": 600,
                },
            ],
            "ton_site": {
                "adnl_address": "0:abc",
                "public_key_base64": "Zm9v",
            },
        },
    )

    check = verify_config(config_path)

    assert isinstance(check, DomainConfigCheck)
    assert check.domain == "example.com"
    assert check.ok is True
    assert check.ton_site_valid is True
    assert check.placeholders == ("CNAME api -> your-project-ref.supabase.co",)
    assert check.record_count == 2


def test_verify_directory_aggregates_results(tmp_path: Path) -> None:
    good_path = tmp_path / "good.json"
    _write_config(
        good_path,
        {
            "domain": "valid.example",
            "records": [
                {"type": "A", "name": "@", "data": "5.6.7.8", "ttl": 300},
            ],
        },
    )

    bad_path = tmp_path / "bad.json"
    _write_config(
        bad_path,
        {
            "domain": "",  # triggers domain missing
            "records": [
                {"type": "TXT", "name": "@", "data": ""},  # invalid data
            ],
            "ton_site": "invalid",  # not a mapping
        },
    )

    checks = verify_directory(tmp_path)
    assert len(checks) == 2

    summary = summarise_checks(checks)
    assert summary["total"] == 2
    assert summary["healthy"] == 1
    assert summary["unhealthy"] == 1
    assert summary["placeholders"] == 0
    assert summary["ton_sites_present"] == 1
    assert summary["ton_sites_valid"] == 0

    bad_check = next(check for check in checks if check.domain != "valid.example")
    assert bad_check.ok is False
    assert any("domain missing" in error for error in bad_check.errors)
    assert any("record 1 invalid" in error for error in bad_check.errors)
    assert any("ton_site" in error for error in bad_check.errors)
