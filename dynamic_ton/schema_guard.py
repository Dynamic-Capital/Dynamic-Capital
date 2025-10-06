"""Schema monitoring utilities for TONCenter action payloads."""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass
from typing import Any, Iterable, Mapping, Sequence

from .data_pipeline import (
    TONCENTER_ACTION_FIELD_ALIASES,
    TONCENTER_ACTION_KNOWN_RAW_KEYS,
    TonActionRecord,
    TonDataCollector,
)


@dataclass(slots=True, frozen=True)
class SchemaDriftReport:
    """Summary of observed schema drift for TONCenter actions."""

    total_records: int
    unknown_fields: Mapping[str, int]
    records: Sequence[TonActionRecord]

    def has_drift(self) -> bool:
        return bool(self.unknown_fields)

    def to_summary_dict(self, *, include_records: bool = False) -> Mapping[str, Any]:
        """Return a JSON-serialisable summary of the schema drift report."""

        payload: dict[str, Any] = {
            "total_records": self.total_records,
            "unknown_fields": dict(self.unknown_fields),
            "has_drift": self.has_drift(),
        }
        if include_records:
            payload["records"] = [asdict(record) for record in self.records]
        return payload

    def require_clean_schema(self) -> None:
        if self.has_drift():
            formatted = ", ".join(
                f"{field} (seen {count}x)" for field, count in self.unknown_fields.items()
            )
            raise RuntimeError(
                "Detected unknown TONCenter action fields: "
                f"{formatted}. Update TonActionRecord parsing helpers."
            )


def summarise_unknown_action_fields(
    actions: Iterable[Mapping[str, Any] | Sequence[Any]]
) -> dict[str, int]:
    """Return a frequency map of unrecognised keys within raw action payloads."""

    counter: Counter[str] = Counter()
    for entry in actions:
        if not isinstance(entry, Mapping):
            continue
        for key in entry.keys():
            raw_key = str(key)
            if raw_key not in TONCENTER_ACTION_KNOWN_RAW_KEYS:
                counter[raw_key] += 1
    return dict(sorted(counter.items()))


async def audit_toncenter_actions(
    collector: TonDataCollector,
    *,
    account: str,
    limit: int = 20,
    include_accounts: bool = False,
) -> SchemaDriftReport:
    """Fetch actions and return a schema drift report highlighting unknown fields."""

    collector.reset_unknown_toncenter_action_fields()
    actions = await collector.fetch_account_actions(
        account=account,
        limit=limit,
        include_accounts=include_accounts,
    )
    unknown_fields = collector.unknown_toncenter_action_fields
    return SchemaDriftReport(
        total_records=len(actions),
        unknown_fields=dict(sorted(unknown_fields.items())),
        records=actions,
    )


def describe_expected_toncenter_fields() -> Mapping[str, tuple[str, ...]]:
    """Expose the canonical TONCenter field aliases for reporting purposes."""

    return dict(TONCENTER_ACTION_FIELD_ALIASES)


async def ensure_no_action_schema_drift(
    collector: TonDataCollector,
    *,
    account: str,
    limit: int = 20,
    include_accounts: bool = False,
) -> Sequence[TonActionRecord]:
    """Fetch actions while enforcing that no unknown fields were encountered."""

    report = await audit_toncenter_actions(
        collector,
        account=account,
        limit=limit,
        include_accounts=include_accounts,
    )
    report.require_clean_schema()
    return report.records


def format_schema_report(report: SchemaDriftReport) -> str:
    """Render a human-friendly summary of schema drift findings."""

    if not report.has_drift():
        return (
            "TONCenter actions schema matches expectations. "
            f"Observed {report.total_records} records."
        )
    parts = [
        "Detected TONCenter action schema drift:",
    ]
    for field, count in report.unknown_fields.items():
        parts.append(f"- {field}: seen {count} time(s)")
    return "\n".join(parts)


__all__ = [
    "SchemaDriftReport",
    "audit_toncenter_actions",
    "describe_expected_toncenter_fields",
    "ensure_no_action_schema_drift",
    "format_schema_report",
    "summarise_unknown_action_fields",
]
