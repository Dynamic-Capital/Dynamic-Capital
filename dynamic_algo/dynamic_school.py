"""Learning progress tracker for the Dynamic Capital education catalog.

The School of Pipsology and broader trading curriculum are structured into
progressive courses with dozens of lessons.  The production application tracks
progress via Supabase; this module offers a deterministic, in-memory
implementation so notebooks and tests can reason about learner state without
external dependencies.

The helper focuses on three concerns:

* maintaining a canonical catalog of courses/lessons;
* capturing per-lesson interactions for each learner; and
* producing aggregated views for coaching, reporting, and gamification.

It mirrors the design of other ``dynamic_algo`` helpers by leaning on Python
``dataclasses`` and timezone-aware ``datetime`` objects.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import re
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CourseDefinition",
    "LessonProgress",
    "CourseProgress",
    "StudentSnapshot",
    "DynamicSchool",
    "DEFAULT_COURSES",
]


# ---------------------------------------------------------------------------
# utility helpers


def _slug(value: str) -> str:
    """Convert *value* into a stable, lowercase identifier."""

    cleaned = re.sub(r"[^0-9a-zA-Z]+", "-", value.strip().lower()).strip("-")
    return cleaned or value.strip().lower()


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    """Clamp *value* within the inclusive ``[minimum, maximum]`` range."""

    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def _coerce_datetime(value: datetime | None) -> datetime:
    """Normalise *value* into a timezone-aware ``datetime`` in UTC."""

    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_student(student_id: str) -> str:
    if not student_id:
        raise ValueError("student_id is required")
    return str(student_id).strip().upper()


def _normalise_course(course_id: str) -> str:
    if not course_id:
        raise ValueError("course_id is required")
    return _slug(str(course_id))


# ---------------------------------------------------------------------------
# dataclasses exposed by the helper


@dataclass(frozen=True, slots=True)
class CourseDefinition:
    """Static description of a course in the learning catalog."""

    course_id: str
    title: str
    level: str = "core"
    lessons: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.course_id:
            raise ValueError("course_id is required")
        if not self.title:
            raise ValueError("title is required")
        object.__setattr__(self, "lessons", tuple(str(lesson).strip() for lesson in self.lessons))
        object.__setattr__(self, "tags", tuple(str(tag).strip() for tag in self.tags))


@dataclass(slots=True)
class LessonProgress:
    """Aggregated metrics for a specific lesson and learner."""

    course_id: str
    lesson_id: str
    title: str
    status: str
    progress: float
    mastery: float | None
    time_spent_minutes: int
    interactions: int
    first_started_at: datetime | None
    last_interaction_at: datetime | None
    notes: tuple[str, ...] = ()


@dataclass(slots=True)
class CourseProgress:
    """Snapshot of a learner's state within a particular course."""

    course_id: str
    title: str
    level: str
    total_lessons: int
    completed_lessons: int
    in_progress_lessons: int
    progress: float
    mastery: float | None
    started_at: datetime | None
    completed_at: datetime | None
    last_interaction_at: datetime | None
    lesson_progress: tuple[LessonProgress, ...]

    @property
    def is_complete(self) -> bool:
        return self.total_lessons > 0 and self.completed_lessons == self.total_lessons


@dataclass(slots=True)
class StudentSnapshot:
    """Aggregated overview of a learner across the entire catalog."""

    student_id: str
    total_courses: int
    active_courses: int
    completed_courses: int
    total_lessons: int
    completed_lessons: int
    progress: float
    mastery: float | None
    started_at: datetime | None
    last_interaction_at: datetime | None
    courses: tuple[CourseProgress, ...]


# ---------------------------------------------------------------------------
# canonical School of Pipsology catalog


DEFAULT_COURSES: tuple[CourseDefinition, ...] = (
    CourseDefinition(
        course_id="preschool",
        title="Preschool",
        level="foundation",
        lessons=(
            "What is Forex?",
            "How Do You Trade Forex?",
            "When Can You Trade Forex?",
            "Who Trades Forex?",
            "Why Trade Forex?",
            "Margin Trading 101: Understand How Your Margin Account Works",
        ),
        tags=("beginner", "orientation"),
    ),
    CourseDefinition(
        course_id="kindergarten",
        title="Kindergarten",
        level="foundation",
        lessons=("Forex Brokers 101", "Three Types of Analysis", "Types of Charts"),
        tags=("basics", "analysis"),
    ),
    CourseDefinition(
        course_id="elementary",
        title="Elementary",
        level="core",
        lessons=(
            "Grade 1 — Support and Resistance Levels",
            "Grade 2 — Japanese Candlesticks",
            "Grade 3 — Fibonacci",
            "Grade 4 — Moving Averages",
            "Grade 5 — Popular Chart Indicators",
        ),
        tags=("technical", "price-action"),
    ),
    CourseDefinition(
        course_id="middle-school",
        title="Middle School",
        level="core",
        lessons=(
            "Grade 6 — Oscillators and Momentum Indicators",
            "Grade 7 — Important Chart Patterns",
            "Grade 8 — Pivot Points",
        ),
        tags=("technical", "patterns"),
    ),
    CourseDefinition(
        course_id="summer-school",
        title="Summer School",
        level="core",
        lessons=("Heikin Ashi", "Elliott Wave Theory", "Harmonic Price Patterns"),
        tags=("advanced", "patterns"),
    ),
    CourseDefinition(
        course_id="high-school",
        title="High School",
        level="core",
        lessons=(
            "Grade 9 — Trading Divergences",
            "Grade 10 — Market Environment",
            "Grade 11 — Trading Breakouts and Fakeouts",
            "Grade 12 — Fundamental Analysis",
            "Grade 13 — Currency Crosses",
            "Grade 14 — Multiple Time Frame Analysis",
        ),
        tags=("advanced", "technical"),
    ),
    CourseDefinition(
        course_id="undergraduate-freshman",
        title="Undergraduate — Freshman",
        level="advanced",
        lessons=("Market Sentiment", "Trading the News", "Carry Trade"),
        tags=("macro", "sentiment"),
    ),
    CourseDefinition(
        course_id="undergraduate-sophomore",
        title="Undergraduate — Sophomore",
        level="advanced",
        lessons=("The U.S. Dollar Index", "Intermarket Correlations", "Using Equities to Trade FX", "Country Profiles"),
        tags=("macro", "correlation"),
    ),
    CourseDefinition(
        course_id="undergraduate-junior",
        title="Undergraduate — Junior",
        level="advanced",
        lessons=(
            "Developing Your Own Trading Plan",
            "Which Type of Trader Are You?",
            "Create Your Own Trading System",
            "Keeping a Trading Journal",
            "How to Use MetaTrader 4",
        ),
        tags=("strategy", "journaling"),
    ),
    CourseDefinition(
        course_id="undergraduate-senior",
        title="Undergraduate — Senior",
        level="advanced",
        lessons=(
            "Risk Management",
            "The Number 1 Cause of Death of Forex Traders",
            "Position Sizing",
            "Setting Stop Losses",
            "Scaling In and Out",
            "Currency Correlations",
        ),
        tags=("risk", "mindset"),
    ),
    CourseDefinition(
        course_id="graduation",
        title="Graduation",
        level="capstone",
        lessons=(
            "The Most Common Trading Mistakes New Traders Make",
            "Forex Trading Scams",
            "Personality Quizzes",
            "Graduation Speech",
        ),
        tags=("capstone", "wisdom"),
    ),
)


# ---------------------------------------------------------------------------
# internal data containers


@dataclass(slots=True)
class _LessonRecord:
    lesson_id: str
    title: str
    progress: float = 0.0
    mastery: float | None = None
    mastery_samples: int = 0
    time_spent_minutes: int = 0
    interactions: int = 0
    first_started_at: datetime | None = None
    last_interaction_at: datetime | None = None
    notes: list[str] = field(default_factory=list)

    def apply(
        self,
        *,
        progress: float | None = None,
        mastery: float | None = None,
        time_spent_minutes: int | None = None,
        timestamp: datetime,
        status: str | None = None,
        notes: Sequence[str] | None = None,
    ) -> None:
        self.interactions += 1
        self.last_interaction_at = timestamp

        if progress is not None:
            progress_value = _clamp(progress)
            self.progress = max(self.progress, progress_value)
            if self.first_started_at is None and progress_value > 0:
                self.first_started_at = timestamp
        elif status == "completed":
            if self.first_started_at is None:
                self.first_started_at = timestamp
            self.progress = 1.0
        elif self.first_started_at is None and status == "in_progress":
            self.first_started_at = timestamp

        if status == "completed":
            self.progress = 1.0

        if mastery is not None:
            mastery_value = _clamp(mastery)
            self.mastery_samples += 1
            if self.mastery is None:
                self.mastery = mastery_value
            else:
                weight = self.mastery_samples - 1
                self.mastery = (self.mastery * weight + mastery_value) / self.mastery_samples

        if time_spent_minutes:
            self.time_spent_minutes += int(time_spent_minutes)

        if notes:
            for note in notes:
                note_text = str(note).strip()
                if note_text and note_text not in self.notes:
                    self.notes.append(note_text)

    @property
    def status(self) -> str:
        if self.progress >= 1.0:
            return "completed"
        if self.progress > 0:
            return "in_progress"
        return "not_started"


# ---------------------------------------------------------------------------
# main helper implementation


class DynamicSchool:
    """Track learner progress through the School of Pipsology catalog."""

    def __init__(
        self,
        *,
        catalog: Iterable[CourseDefinition] | Mapping[str, CourseDefinition] | None = None,
    ) -> None:
        self._catalog: Dict[str, CourseDefinition] = {}
        self._course_lessons: Dict[str, MutableMapping[str, str]] = {}
        self._course_order: list[str] = []
        self._records: Dict[str, Dict[str, Dict[str, _LessonRecord]]] = {}

        supplied = catalog if catalog is not None else DEFAULT_COURSES
        if isinstance(supplied, Mapping):
            iterable: Iterable[CourseDefinition] = supplied.values()
        else:
            iterable = supplied

        for course in iterable:
            self.register_course(course)

    # ------------------------------------------------------------------ catalog
    def register_course(self, course: CourseDefinition) -> None:
        """Register *course* with the catalog, replacing any prior version."""

        course_key = _normalise_course(course.course_id)
        self._catalog[course_key] = course
        lessons: Dict[str, str] = {}
        for lesson in course.lessons:
            lesson_slug = _slug(lesson)
            if not lesson_slug:
                raise ValueError(f"Lesson name '{lesson}' cannot be empty")
            if lesson_slug not in lessons:
                lessons[lesson_slug] = lesson
        self._course_lessons[course_key] = lessons
        if course_key not in self._course_order:
            self._course_order.append(course_key)
        else:
            # Preserve insertion order but update lessons when course is re-registered.
            pass

    def catalog(self) -> tuple[CourseDefinition, ...]:
        """Return the registered courses ordered as inserted."""

        return tuple(self._catalog[key] for key in self._course_order)

    # ------------------------------------------------------------------ records
    def record_lesson(
        self,
        student_id: str,
        course_id: str,
        lesson_id: str,
        *,
        progress: float | None = None,
        mastery: float | None = None,
        time_spent_minutes: int | None = None,
        timestamp: datetime | None = None,
        status: str | None = None,
        notes: Sequence[str] | None = None,
        title: str | None = None,
    ) -> LessonProgress:
        """Record an interaction with *lesson_id* for the given learner."""

        student_key = _normalise_student(student_id)
        course_key = _normalise_course(course_id)
        if course_key not in self._catalog:
            raise KeyError(f"Unknown course_id: {course_id}")

        lesson_slug = _slug(lesson_id)
        course_lessons = self._course_lessons.setdefault(course_key, {})
        if lesson_slug not in course_lessons:
            lesson_title = title.strip() if title else str(lesson_id).strip()
            if not lesson_title:
                raise ValueError("lesson title cannot be empty")
            course_lessons[lesson_slug] = lesson_title
        canonical_title = course_lessons[lesson_slug]

        student_courses = self._records.setdefault(student_key, {})
        lesson_records = student_courses.setdefault(course_key, {})
        record = lesson_records.get(lesson_slug)
        if record is None:
            record = _LessonRecord(lesson_id=lesson_slug, title=canonical_title)
            lesson_records[lesson_slug] = record
        elif title:
            canonical_title = title.strip() or canonical_title
            record.title = canonical_title
            course_lessons[lesson_slug] = canonical_title

        timestamp_utc = _coerce_datetime(timestamp)
        record.apply(
            progress=progress,
            mastery=mastery,
            time_spent_minutes=time_spent_minutes,
            timestamp=timestamp_utc,
            status=status,
            notes=notes,
        )

        return LessonProgress(
            course_id=self._catalog[course_key].course_id,
            lesson_id=record.lesson_id,
            title=record.title,
            status=record.status,
            progress=record.progress,
            mastery=record.mastery,
            time_spent_minutes=record.time_spent_minutes,
            interactions=record.interactions,
            first_started_at=record.first_started_at,
            last_interaction_at=record.last_interaction_at,
            notes=tuple(record.notes),
        )

    # ------------------------------------------------------------- aggregations
    def snapshot(self, student_id: str) -> StudentSnapshot:
        """Return a holistic snapshot of the learner's progress."""

        student_key = _normalise_student(student_id)
        student_courses = self._records.get(student_key, {})

        courses: list[CourseProgress] = []
        total_lessons = 0
        completed_lessons = 0
        weighted_progress = 0.0
        lesson_masteries: list[float] = []
        started_at: datetime | None = None
        last_interaction: datetime | None = None

        for course_key in self._course_order:
            course_def = self._catalog[course_key]
            lessons_map = self._course_lessons.get(course_key, {})
            lesson_records = student_courses.get(course_key, {})

            lesson_progress_items: list[LessonProgress] = []
            course_progress_sum = 0.0
            course_completed = 0
            course_in_progress = 0
            course_masteries: list[float] = []
            course_started: datetime | None = None
            course_last_interaction: datetime | None = None

            for lesson_slug, lesson_title in lessons_map.items():
                record = lesson_records.get(lesson_slug)
                if record is None:
                    lesson_progress = LessonProgress(
                        course_id=course_def.course_id,
                        lesson_id=lesson_slug,
                        title=lesson_title,
                        status="not_started",
                        progress=0.0,
                        mastery=None,
                        time_spent_minutes=0,
                        interactions=0,
                        first_started_at=None,
                        last_interaction_at=None,
                        notes=(),
                    )
                else:
                    lesson_progress = LessonProgress(
                        course_id=course_def.course_id,
                        lesson_id=record.lesson_id,
                        title=record.title,
                        status=record.status,
                        progress=record.progress,
                        mastery=record.mastery,
                        time_spent_minutes=record.time_spent_minutes,
                        interactions=record.interactions,
                        first_started_at=record.first_started_at,
                        last_interaction_at=record.last_interaction_at,
                        notes=tuple(record.notes),
                    )
                    course_progress_sum += record.progress
                    if record.status == "completed":
                        course_completed += 1
                    elif record.status == "in_progress":
                        course_in_progress += 1
                    if record.mastery is not None:
                        course_masteries.append(record.mastery)
                        lesson_masteries.append(record.mastery)
                    if record.first_started_at is not None:
                        course_started = (
                            record.first_started_at
                            if course_started is None
                            else min(course_started, record.first_started_at)
                        )
                    if record.last_interaction_at is not None:
                        course_last_interaction = (
                            record.last_interaction_at
                            if course_last_interaction is None
                            else max(course_last_interaction, record.last_interaction_at)
                        )
                lesson_progress_items.append(lesson_progress)

            total = len(lessons_map)
            total_lessons += total
            completed_lessons += course_completed
            progress = course_progress_sum / total if total else 0.0
            weighted_progress += progress * total
            if course_started is not None:
                started_at = course_started if started_at is None else min(started_at, course_started)
            if course_last_interaction is not None:
                last_interaction = (
                    course_last_interaction
                    if last_interaction is None
                    else max(last_interaction, course_last_interaction)
                )

            course_progress = CourseProgress(
                course_id=course_def.course_id,
                title=course_def.title,
                level=course_def.level,
                total_lessons=total,
                completed_lessons=course_completed,
                in_progress_lessons=course_in_progress,
                progress=progress,
                mastery=(
                    sum(course_masteries) / len(course_masteries)
                    if course_masteries
                    else None
                ),
                started_at=course_started,
                completed_at=(course_last_interaction if total and course_completed == total else None),
                last_interaction_at=course_last_interaction,
                lesson_progress=tuple(lesson_progress_items),
            )
            courses.append(course_progress)

        total_courses = len(self._course_order)
        completed_courses = sum(1 for course in courses if course.is_complete)
        active_courses = sum(
            1 for course in courses if 0 < course.progress < 1.0 and course.total_lessons > 0
        )
        overall_progress = weighted_progress / total_lessons if total_lessons else 0.0
        mastery = (
            sum(lesson_masteries) / len(lesson_masteries) if lesson_masteries else None
        )

        return StudentSnapshot(
            student_id=student_key,
            total_courses=total_courses,
            active_courses=active_courses,
            completed_courses=completed_courses,
            total_lessons=total_lessons,
            completed_lessons=completed_lessons,
            progress=overall_progress,
            mastery=mastery,
            started_at=started_at,
            last_interaction_at=last_interaction,
            courses=tuple(courses),
        )

    def course_progress(self, student_id: str, course_id: str) -> CourseProgress:
        """Return the learner's progress for a single course."""

        course_key = _normalise_course(course_id)
        if course_key not in self._catalog:
            raise KeyError(f"Unknown course_id: {course_id}")
        canonical_id = self._catalog[course_key].course_id
        snapshot = self.snapshot(student_id)
        for course in snapshot.courses:
            if course.course_id == canonical_id:
                return course
        raise KeyError(f"No progress recorded for course_id: {course_id}")

    # ------------------------------------------------------------------ control
    def clear(self, student_id: str | None = None) -> None:
        """Clear recorded state for *student_id* or the entire registry."""

        if student_id is None:
            self._records.clear()
            return
        student_key = _normalise_student(student_id)
        self._records.pop(student_key, None)
