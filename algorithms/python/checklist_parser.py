"""Utilities for converting markdown checklists into structured JSON."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Iterable, Iterator, Optional

_CHECKLIST_LINE = re.compile(
    r"^\s*-\s*\[(?P<state>[ xX])\]\s+(?P<text>.+)$"
)
_DUE_DATE = re.compile(r"@(?P<date>\d{4}-\d{2}-\d{2})\b")


@dataclass(slots=True)
class ChecklistTask:
    """Represents a single checklist item parsed from markdown."""

    task: str
    status: str
    due_date: Optional[date]
    created_at: datetime

    def to_json(self) -> dict[str, str | None]:
        """Return a JSON-serialisable mapping for the task."""

        payload = {
            "task": self.task,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat(),
        }
        return payload


def _iter_checklist_lines(lines: Iterable[str]) -> Iterator[tuple[str, str]]:
    """Yield ``(status, text)`` pairs from markdown checklist bullet lines."""

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        match = _CHECKLIST_LINE.match(line)
        if not match:
            continue
        status_char = match.group("state").lower()
        text = match.group("text").strip()
        status = "done" if status_char == "x" else "pending"
        yield status, text


def _extract_due_date(text: str) -> tuple[str, Optional[date]]:
    """Return checklist text without the due date tag and the parsed ``date``."""

    match = _DUE_DATE.search(text)
    if not match:
        return text.strip(), None

    due_date = datetime.strptime(match.group("date"), "%Y-%m-%d").date()
    cleaned = _DUE_DATE.sub("", text).strip()
    return cleaned, due_date


def parse_checklist(file_path: str | Path, *, now: Optional[datetime] = None) -> list[ChecklistTask]:
    """Parse ``file_path`` and return any checklist items it contains."""

    path = Path(file_path)
    lines = path.read_text(encoding="utf-8").splitlines()
    timestamp = now or datetime.now(tz=UTC)

    tasks: list[ChecklistTask] = []
    for status, text in _iter_checklist_lines(lines):
        cleaned_text, due_date = _extract_due_date(text)
        tasks.append(
            ChecklistTask(
                task=cleaned_text,
                status=status,
                due_date=due_date,
                created_at=timestamp,
            )
        )
    return tasks


def save_tasks(tasks: Iterable[ChecklistTask], output_file: str | Path) -> None:
    """Serialise ``tasks`` to ``output_file`` as formatted JSON."""

    output_path = Path(output_file)
    serialisable = [task.to_json() for task in tasks]
    output_path.write_text(json.dumps(serialisable, indent=4), encoding="utf-8")


def main(argv: Optional[Iterable[str]] = None) -> int:
    """CLI entrypoint for converting a markdown checklist to JSON."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checklist", type=Path, help="Path to the markdown checklist file")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("tasks.json"),
        help="Destination for the generated JSON payload",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    tasks = parse_checklist(args.checklist)
    save_tasks(tasks, args.output)
    print(f"✅ {len(tasks)} tasks parsed and saved to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
