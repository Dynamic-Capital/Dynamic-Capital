"""Tests for TONCenter action schema monitoring utilities."""

from __future__ import annotations

import asyncio
from typing import Any, Mapping

from dynamic_ton.data_pipeline import TonActionRecord, TonDataCollector
from dynamic_ton.schema_guard import (
    SchemaDriftReport,
    audit_toncenter_actions,
    ensure_no_action_schema_drift,
    format_schema_report,
    summarise_unknown_action_fields,
)


class _StubResponse:
    def __init__(self, payload: Mapping[str, Any]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:  # pragma: no cover - trivial
        return None

    def json(self) -> Mapping[str, Any]:
        return self._payload


class _StubHttpClient:
    def __init__(self, payload: Mapping[str, Any]) -> None:
        self._payload = payload

    async def get(self, url: str, params: Mapping[str, Any] | None = None) -> _StubResponse:
        return _StubResponse(self._payload)


def test_summarise_unknown_action_fields_flags_new_keys() -> None:
    payloads = [
        {"action_id": "1", "type": "Transfer", "newField": 1},
        {"action_id": "2", "type": "Transfer", "newField": 3, "another": "x"},
    ]

    summary = summarise_unknown_action_fields(payloads)

    assert summary == {"another": 1, "newField": 2}


def test_audit_toncenter_actions_reports_unknown_fields() -> None:
    payload = {
        "actions": [
            {
                "action_id": "1",
                "type": "Transfer",
                "success": True,
                "start_lt": "0x1",
                "end_lt": "0x2",
                "unknown_attr": "value",
            }
        ]
    }
    collector = TonDataCollector(http_client=_StubHttpClient(payload))

    report = asyncio.run(
        audit_toncenter_actions(
            collector,
            account="EQCTestAddress0000000000000000000000000000000000",
        )
    )

    assert isinstance(report, SchemaDriftReport)
    assert report.total_records == 1
    assert report.unknown_fields == {"unknown_attr": 1}
    assert len(report.records) == 1


def test_ensure_no_action_schema_drift_raises_on_unknown_fields() -> None:
    payload = {
        "actions": [
            {
                "action_id": "1",
                "type": "Transfer",
                "success": True,
                "start_lt": "0x1",
                "end_lt": "0x2",
                "unexpected": "value",
            }
        ]
    }
    collector = TonDataCollector(http_client=_StubHttpClient(payload))

    try:
        asyncio.run(
            ensure_no_action_schema_drift(
                collector,
                account="EQCTestAddress0000000000000000000000000000000000",
            )
        )
    except RuntimeError as exc:
        assert "unexpected" in str(exc)
    else:  # pragma: no cover - defensive
        raise AssertionError("RuntimeError not raised for unknown fields")


def test_format_schema_report_formats_human_message() -> None:
    report = SchemaDriftReport(total_records=2, unknown_fields={"new": 3}, records=())

    formatted = format_schema_report(report)

    assert "Detected TONCenter action schema drift" in formatted
    assert "new" in formatted

    clean = SchemaDriftReport(total_records=5, unknown_fields={}, records=())
    assert "matches expectations" in format_schema_report(clean)


def test_schema_drift_report_to_summary_dict_handles_records() -> None:
    record = TonActionRecord(
        action_id="1",
        type="transfer",
        success=True,
        start_lt=1,
        end_lt=2,
        start_utime=1700000000,
        end_utime=1700000050,
        trace_id="trace",
        trace_end_lt=3,
        trace_end_utime=1700000100,
        trace_external_hash="0xabc",
        trace_external_hash_norm="0xabc",
        trace_mc_seqno_end=42,
        accounts=("EQ1",),
        transactions=("tx1",),
        details={"kind": "transfer"},
    )

    report = SchemaDriftReport(total_records=1, unknown_fields={}, records=(record,))

    minimal = report.to_summary_dict()
    assert minimal == {
        "total_records": 1,
        "unknown_fields": {},
        "has_drift": False,
    }

    with_records = report.to_summary_dict(include_records=True)
    assert with_records["has_drift"] is False
    assert with_records["records"][0]["action_id"] == "1"
