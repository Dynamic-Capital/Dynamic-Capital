"""Command-line utilities for running TONCenter action schema audits."""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from typing import Iterable, Sequence

from .data_pipeline import TonDataCollector
from .schema_guard import SchemaDriftReport, audit_toncenter_actions, format_schema_report

ENV_ACCOUNT_LIST = "TONCENTER_SCHEMA_ACCOUNTS"
ENV_API_KEY = "TONCENTER_API_KEY"
ENV_BASE_URL = "TONCENTER_ACTIONS_BASE_URL"
ENV_LIMIT = "TONCENTER_SCHEMA_LIMIT"


def _split_account_tokens(values: Iterable[str]) -> list[str]:
    accounts: list[str] = []
    for value in values:
        for token in value.replace("\n", ",").split(","):
            candidate = token.strip()
            if candidate:
                accounts.append(candidate)
    return accounts


def resolve_accounts(cli_values: Sequence[str] | None, env_value: str | None) -> tuple[str, ...]:
    """Return an ordered, de-duplicated tuple of accounts to audit."""

    tokens: list[str] = []
    if cli_values:
        tokens.extend(cli_values)
    if env_value:
        tokens.append(env_value)
    ordered = _split_account_tokens(tokens)
    # Preserve insertion order while removing duplicates.
    unique: dict[str, None] = {}
    for account in ordered:
        if account not in unique:
            unique[account] = None
    return tuple(unique.keys())


async def audit_accounts(
    collector: TonDataCollector,
    accounts: Sequence[str],
    *,
    limit: int,
    include_accounts: bool,
) -> list[tuple[str, SchemaDriftReport]]:
    """Run schema audits for each account and return reports."""

    results: list[tuple[str, SchemaDriftReport]] = []
    for account in accounts:
        report = await audit_toncenter_actions(
            collector,
            account=account,
            limit=limit,
            include_accounts=include_accounts,
        )
        results.append((account, report))
    return results


def _determine_limit(cli_limit: int | None, env_value: str | None) -> int:
    if cli_limit is not None:
        return cli_limit
    if env_value:
        try:
            parsed = int(env_value.strip())
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError("TONCENTER_SCHEMA_LIMIT must be an integer") from exc
        if parsed < 1:
            raise ValueError("TONCENTER_SCHEMA_LIMIT must be positive")
        return parsed
    return 20


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Audit TONCenter actions for schema drift",
    )
    parser.add_argument(
        "--account",
        dest="accounts",
        action="append",
        help="Account to audit (friendly or raw workchain:hex). May be provided multiple times.",
    )
    parser.add_argument(
        "--limit",
        dest="limit",
        type=int,
        default=None,
        help="Number of actions to request per account (defaults to 20 or TONCENTER_SCHEMA_LIMIT).",
    )
    parser.add_argument(
        "--include-accounts",
        action="store_true",
        help="Include the accounts array in responses to exercise optional parsing paths.",
    )
    parser.add_argument(
        "--base-url",
        dest="base_url",
        default=None,
        help="Override the TONCenter actions endpoint base URL.",
    )
    parser.add_argument(
        "--api-key",
        dest="api_key",
        default=None,
        help="Explicit TONCenter API key. Defaults to TONCENTER_API_KEY env variable if present.",
    )
    parser.add_argument(
        "--allow-drift",
        action="store_true",
        help="Exit with code 0 even if schema drift is detected.",
    )
    return parser


async def _async_main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    env_accounts = os.environ.get(ENV_ACCOUNT_LIST)
    accounts = resolve_accounts(args.accounts, env_accounts)
    if not accounts:
        parser.error(
            "No accounts supplied. Provide --account or set TONCENTER_SCHEMA_ACCOUNTS environment variable."
        )

    base_urls = None
    base_url = args.base_url or os.environ.get(ENV_BASE_URL)
    if base_url:
        base_urls = {"toncenter_actions": base_url}

    api_key = args.api_key or os.environ.get(ENV_API_KEY) or None
    if api_key:
        api_key = api_key.strip() or None

    limit = _determine_limit(args.limit, os.environ.get(ENV_LIMIT))
    if limit < 1:
        parser.error("limit must be positive")

    collector = TonDataCollector(
        base_urls=base_urls,
        toncenter_api_key=api_key,
    )

    reports = await audit_accounts(
        collector,
        accounts,
        limit=limit,
        include_accounts=args.include_accounts,
    )

    has_drift = False
    for account, report in reports:
        print(f"Account: {account}")
        print(format_schema_report(report))
        print("-")
        has_drift = has_drift or report.has_drift()

    if has_drift and not args.allow_drift:
        return 1
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    try:
        return asyncio.run(_async_main(argv))
    except KeyboardInterrupt:  # pragma: no cover - interactive safeguard
        return 130


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    sys.exit(main())
