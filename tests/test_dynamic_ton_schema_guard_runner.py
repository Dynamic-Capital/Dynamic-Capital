import asyncio
from typing import Sequence

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
