import asyncio
import json
from typing import Sequence

from dynamic_ton.data_pipeline import TonActionRecord
from dynamic_ton.schema_guard import SchemaDriftReport
from dynamic_ton import schema_guard_runner as runner


def test_resolve_accounts_merges_cli_and_env() -> None:
    accounts = runner.resolve_accounts([
        "EQ1, EQ2",
        "0:abc",
    ], "EQ2\n0:def\n")

    assert accounts == ("EQ1", "EQ2", "0:abc", "0:def")


def test_determine_limit_prefers_cli(monkeypatch) -> None:
    monkeypatch.delenv(runner.ENV_LIMIT, raising=False)
    assert runner._determine_limit(15, None) == 15


def test_determine_limit_reads_env(monkeypatch) -> None:
    assert runner._determine_limit(None, "25") == 25


def test_audit_accounts_invokes_underlying_helper(monkeypatch) -> None:
    calls: list[tuple[Sequence[str], int, bool]] = []

    async def _fake_audit(collector: object, account: str, *, limit: int, include_accounts: bool) -> SchemaDriftReport:
        calls.append((account, limit, include_accounts))
        return SchemaDriftReport(total_records=1, unknown_fields={}, records=())

    monkeypatch.setattr(runner, "audit_toncenter_actions", _fake_audit)

    collector = object()
    reports = asyncio.run(
        runner.audit_accounts(collector, ("EQ1", "EQ2"), limit=5, include_accounts=True)
    )

    assert [account for account, _ in reports] == ["EQ1", "EQ2"]
    assert calls == [
        ("EQ1", 5, True),
        ("EQ2", 5, True),
    ]


def test_async_main_writes_json_summary(tmp_path, monkeypatch) -> None:
    report = SchemaDriftReport(total_records=2, unknown_fields={"foo": 1}, records=())

    async def _fake_audit_accounts(collector: object, accounts: Sequence[str], *, limit: int, include_accounts: bool):
        return [(accounts[0], report)]

    class _StubCollector:
        def __init__(self, **_: object) -> None:
            return None

    monkeypatch.setattr(runner, "TonDataCollector", _StubCollector)
    monkeypatch.setattr(runner, "audit_accounts", _fake_audit_accounts)

    output_path = tmp_path / "report.json"
    exit_code = asyncio.run(
        runner._async_main(
            ["--account", "EQ1", "--output-json", str(output_path), "--allow-drift"],
        )
    )

    assert exit_code == 0

    payload = json.loads(output_path.read_text())
    assert payload["total_accounts"] == 1
    assert payload["accounts"]["EQ1"]["unknown_fields"] == {"foo": 1}
    assert payload["accounts"]["EQ1"].get("records") is None
    assert payload["has_drift"] is True


def test_async_main_writes_json_with_records(tmp_path, monkeypatch) -> None:
    record = TonActionRecord(
        action_id="1",
        type="transfer",
        success=True,
        start_lt=1,
        end_lt=2,
        start_utime=None,
        end_utime=None,
        trace_id=None,
        trace_end_lt=None,
        trace_end_utime=None,
        trace_external_hash=None,
        trace_external_hash_norm=None,
        trace_mc_seqno_end=None,
        accounts=(),
        transactions=(),
        details=None,
    )
    report = SchemaDriftReport(total_records=1, unknown_fields={}, records=(record,))

    async def _fake_audit_accounts(collector: object, accounts: Sequence[str], *, limit: int, include_accounts: bool):
        return [(accounts[0], report)]

    class _StubCollector:
        def __init__(self, **_: object) -> None:
            return None

    monkeypatch.setattr(runner, "TonDataCollector", _StubCollector)
    monkeypatch.setattr(runner, "audit_accounts", _fake_audit_accounts)

    output_path = tmp_path / "report.json"
    exit_code = asyncio.run(
        runner._async_main(
            [
                "--account",
                "EQ1",
                "--output-json",
                str(output_path),
                "--output-include-records",
                "--allow-drift",
            ]
        )
    )

    assert exit_code == 0

    payload = json.loads(output_path.read_text())
    account_payload = payload["accounts"]["EQ1"]
    assert account_payload["records"][0]["action_id"] == "1"


def test_render_summary_markdown_formats_accounts() -> None:
    payload = {
        "accounts": {
            "EQ1": {
                "total_records": 5,
                "unknown_fields": {},
            },
            "EQ2": {
                "total_records": 3,
                "unknown_fields": {"new_field": 2},
            },
        },
        "has_drift": True,
    }

    summary = runner.render_summary_markdown(payload)

    assert summary.startswith("# TONCenter Schema Audit")
    assert "## EQ1" in summary
    assert "- Records fetched: 5" in summary
    assert "- Unknown fields detected: none" in summary
    assert "  - new_field: 2 occurrence(s)" in summary


def test_render_summary_markdown_handles_missing_accounts() -> None:
    summary = runner.render_summary_markdown({})

    assert "_No accounts audited._" in summary
