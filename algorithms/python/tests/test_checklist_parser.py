from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path

from algorithms.python.checklist_parser import ChecklistTask, parse_checklist, save_tasks


def test_parse_checklist_extracts_status_and_due_dates(tmp_path: Path) -> None:
    checklist = tmp_path / "checklist.md"
    checklist.write_text(
        """
        # Release tasks
        - [ ] Draft release notes @2025-10-01
        - [x] Ship patch release
        - [ ] Book stakeholder review @2024-03-15  
        * [ ] Not a checklist line
        """
    )

    timestamp = datetime(2024, 1, 5, 15, 30, tzinfo=UTC)
    tasks = parse_checklist(checklist, now=timestamp)

    assert tasks == [
        ChecklistTask(
            task="Draft release notes",
            status="pending",
            due_date=date(2025, 10, 1),
            created_at=timestamp,
        ),
        ChecklistTask(
            task="Ship patch release",
            status="done",
            due_date=None,
            created_at=timestamp,
        ),
        ChecklistTask(
            task="Book stakeholder review",
            status="pending",
            due_date=date(2024, 3, 15),
            created_at=timestamp,
        ),
    ]


def test_save_tasks_serialises_to_json(tmp_path: Path) -> None:
    tasks = [
        ChecklistTask(
            task="Draft release notes",
            status="pending",
            due_date=date(2025, 10, 1),
            created_at=datetime(2024, 1, 5, 15, 30, tzinfo=UTC),
        )
    ]

    output_file = tmp_path / "tasks.json"
    save_tasks(tasks, output_file)

    payload = json.loads(output_file.read_text())
    assert payload == [
        {
            "task": "Draft release notes",
            "status": "pending",
            "due_date": "2025-10-01",
            "created_at": "2024-01-05T15:30:00+00:00",
        }
    ]
