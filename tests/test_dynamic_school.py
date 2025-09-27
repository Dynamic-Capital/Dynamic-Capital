"""Tests for the DynamicSchool helper."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_algo.dynamic_school import (  # noqa: E402
    CourseDefinition,
    DynamicSchool,
)


def _dt(minutes: int = 0) -> datetime:
    return datetime(2025, 3, 1, 8, 0, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def test_dynamic_school_tracks_progress_and_mastery() -> None:
    catalog = [
        CourseDefinition(
            course_id="preschool",
            title="Preschool",
            level="foundation",
            lessons=("What is Forex?", "How Do You Trade Forex?"),
        ),
        CourseDefinition(
            course_id="kindergarten",
            title="Kindergarten",
            level="foundation",
            lessons=("Forex Brokers 101",),
        ),
    ]
    school = DynamicSchool(catalog=catalog)

    first = school.record_lesson(
        "alice",
        "preschool",
        "What is Forex?",
        progress=0.5,
        time_spent_minutes=15,
        timestamp=_dt(),
        status="in_progress",
    )
    assert first.status == "in_progress"
    assert first.progress == pytest.approx(0.5)
    assert first.interactions == 1
    assert first.time_spent_minutes == 15

    second = school.record_lesson(
        "alice",
        "preschool",
        "What is Forex?",
        progress=1.0,
        mastery=0.8,
        time_spent_minutes=5,
        timestamp=_dt(5),
        notes=["Understood margin concepts."],
    )
    assert second.status == "completed"
    assert second.progress == pytest.approx(1.0)
    assert second.interactions == 2
    assert second.time_spent_minutes == 20
    assert second.notes == ("Understood margin concepts.",)

    school.record_lesson(
        "alice",
        "preschool",
        "How Do You Trade Forex?",
        status="completed",
        mastery=0.6,
        timestamp=_dt(10),
    )
    school.record_lesson(
        "alice",
        "kindergarten",
        "Forex Brokers 101",
        progress=0.3,
        mastery=0.4,
        timestamp=_dt(20),
        time_spent_minutes=30,
    )

    snapshot = school.snapshot("ALICE")
    assert snapshot.student_id == "ALICE"
    assert snapshot.total_courses == 2
    assert snapshot.completed_courses == 1
    assert snapshot.active_courses == 1
    assert snapshot.total_lessons == 3
    assert snapshot.completed_lessons == 2
    assert snapshot.progress == pytest.approx((2 * 1.0 + 0.3) / 3)
    assert snapshot.mastery == pytest.approx((0.8 + 0.6 + 0.4) / 3)
    assert snapshot.started_at == _dt()
    assert snapshot.last_interaction_at == _dt(20)

    preschool = school.course_progress("alice", "preschool")
    assert preschool.is_complete is True
    assert preschool.completed_lessons == 2
    assert preschool.progress == pytest.approx(1.0)
    assert preschool.mastery == pytest.approx((0.8 + 0.6) / 2)
    assert preschool.started_at == _dt()
    assert preschool.completed_at == _dt(10)
    assert preschool.lesson_progress[0].interactions == 2
    assert preschool.lesson_progress[1].status == "completed"

    kindergarten = snapshot.courses[1]
    assert kindergarten.course_id == "kindergarten"
    assert kindergarten.title == "Kindergarten"
    assert kindergarten.progress == pytest.approx(0.3)
    assert kindergarten.lesson_progress[0].mastery == pytest.approx(0.4)
    assert kindergarten.lesson_progress[0].last_interaction_at == _dt(20)


def test_dynamic_school_handles_resets_and_missing_history() -> None:
    catalog = [
        CourseDefinition(
            course_id="preschool",
            title="Preschool",
            lessons=("What is Forex?",),
        )
    ]
    school = DynamicSchool(catalog=catalog)

    empty = school.snapshot("bob")
    assert empty.student_id == "BOB"
    assert empty.progress == 0.0
    assert empty.courses[0].lesson_progress[0].status == "not_started"

    school.record_lesson(
        "bob",
        "preschool",
        "What is Forex?",
        status="completed",
        mastery=0.9,
        timestamp=_dt(),
    )
    snapshot = school.snapshot("bob")
    assert snapshot.completed_lessons == 1
    assert snapshot.mastery == pytest.approx(0.9)
    assert snapshot.courses[0].lesson_progress[0].status == "completed"

    school.clear("bob")
    reset = school.snapshot("bob")
    assert reset.completed_lessons == 0
    assert reset.mastery is None
    assert reset.courses[0].lesson_progress[0].status == "not_started"
