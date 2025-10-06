#!/usr/bin/env python3
"""Validate mailbox TXT records in a TON DNS bundle."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

EXPECTED_LABELS = {
    "hello": "hello@dynamiccapital.ton",
    "support": "support@dynamiccapital.ton",
}


class VerificationError(RuntimeError):
    """Raised when validation detects a mismatch."""


def load_records(path: Path) -> List[Dict[str, object]]:
    data = json.loads(path.read_text())
    records = data.get("records")
    if not isinstance(records, list):
        raise VerificationError("JSON payload is missing the `records` array.")
    return [record for record in records if isinstance(record, dict)]


def find_mailbox_records(records: Iterable[Dict[str, object]]) -> Dict[str, Tuple[str, Dict[str, object]]]:
    mailbox_records: Dict[str, Tuple[str, Dict[str, object]]] = {}
    for record in records:
        if record.get("type") != "TXT":
            continue
        name = str(record.get("name", ""))
        data = str(record.get("data", ""))
        if data.startswith("mailbox="):
            mailbox_records[name] = (data.partition("=")[2], record)
    return mailbox_records


def verify_mailboxes(records: Iterable[Dict[str, object]], expected: Dict[str, str]) -> None:
    mailbox_records = find_mailbox_records(records)

    missing_labels = []
    mismatched_values = []

    for label, mailbox in expected.items():
        if label not in mailbox_records:
            missing_labels.append(label)
            continue
        value, _ = mailbox_records[label]
        if value.lower() != mailbox.lower():
            mismatched_values.append((label, mailbox, value))

    extra_labels = sorted(set(mailbox_records) - set(expected))

    problems: List[str] = []
    if missing_labels:
        problems.append(
            "Missing TXT mailbox records for: " + ", ".join(sorted(missing_labels))
        )
    if mismatched_values:
        for label, expected_value, actual in mismatched_values:
            problems.append(
                f"Mailbox TXT mismatch for `{label}`: expected `{expected_value}` but found `{actual}`"
            )
    if extra_labels:
        problems.append(
            "Unexpected TXT mailbox labels present: " + ", ".join(extra_labels)
        )

    if problems:
        raise VerificationError("; ".join(problems))


def format_report(records: Dict[str, Tuple[str, Dict[str, object]]]) -> str:
    rows = ["label | mailbox | ttl | note", "----- | ------- | --- | ----"]
    for label in sorted(records):
        mailbox, record = records[label]
        ttl = record.get("ttl", "–")
        note = record.get("note", "")
        rows.append(f"{label} | {mailbox} | {ttl} | {note}")
    return "\n".join(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "domain_json",
        nargs="?",
        type=Path,
        default=Path("dns/dynamiccapital.ton.json"),
        help="Path to the TON DNS JSON bundle to verify.",
    )
    args = parser.parse_args()

    try:
        records = load_records(args.domain_json)
        mailbox_records = find_mailbox_records(records)
        verify_mailboxes(records, EXPECTED_LABELS)
    except VerificationError as exc:
        print("Mailbox verification failed:\n" + str(exc))
        return 1
    except FileNotFoundError:
        print(f"Domain JSON not found: {args.domain_json}")
        return 1
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON in {args.domain_json}: {exc}")
        return 1

    print("Mailbox verification succeeded.")
    print()
    print(format_report(mailbox_records))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
