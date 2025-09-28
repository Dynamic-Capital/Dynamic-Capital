"""Dynamic Mentorship Engine for pairing mentors with mentees."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, List, MutableMapping, Sequence

__all__ = [
    "MentorProfile",
    "MenteeProfile",
    "MentorshipProgram",
    "MentorshipMatch",
    "MentorshipPlan",
    "DynamicMentorshipEngine",
]


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback is not None:
        fallback_text = (fallback or "").strip()
        if fallback_text:
            return fallback_text
    raise ValueError("text value must not be empty")


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in values:
        candidate = raw.strip().lower()
        if not candidate:
            continue
        if candidate not in seen:
            seen.add(candidate)
            normalised.append(candidate)
    return tuple(normalised)


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _overlap(a: Sequence[str], b: Sequence[str]) -> float:
    if not a or not b:
        return 0.0
    aset = {item.lower() for item in a}
    bset = {item.lower() for item in b}
    intersection = len(aset & bset)
    union = len(aset | bset)
    if union == 0:
        return 0.0
    return intersection / union


@dataclass(slots=True)
class MentorProfile:
    """Representation of a mentor inside the program."""

    name: str
    domains: tuple[str, ...] = field(default_factory=tuple)
    strengths: tuple[str, ...] = field(default_factory=tuple)
    tempo_bias: float = 0.6
    capacity: int = 2
    timezone: str = "UTC"

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.domains = _normalise_tags(self.domains)
        self.strengths = _normalise_tags(self.strengths)
        self.tempo_bias = _clamp_unit(self.tempo_bias)
        self.capacity = max(int(self.capacity), 0)
        self.timezone = _normalise_text(self.timezone, fallback="UTC")


@dataclass(slots=True)
class MenteeProfile:
    """Representation of a mentee seeking support."""

    name: str
    focus_areas: tuple[str, ...] = field(default_factory=tuple)
    goals: tuple[str, ...] = field(default_factory=tuple)
    intensity: float = 0.5
    timezone: str = "UTC"

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.focus_areas = _normalise_tags(self.focus_areas)
        self.goals = _normalise_tags(self.goals)
        self.intensity = _clamp_unit(self.intensity)
        self.timezone = _normalise_text(self.timezone, fallback="UTC")


@dataclass(slots=True)
class MentorshipProgram:
    """Structure for an upcoming mentorship program."""

    name: str
    duration_weeks: int
    cadence_per_week: int
    themes: tuple[str, ...] = field(default_factory=tuple)
    rituals: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.duration_weeks = max(int(self.duration_weeks), 1)
        self.cadence_per_week = max(int(self.cadence_per_week), 1)
        self.themes = _normalise_tags(self.themes)
        self.rituals = _normalise_tags(self.rituals)


@dataclass(slots=True)
class MentorshipMatch:
    """Single mentor ↔ mentee pairing along with an execution plan."""

    mentor: MentorProfile
    mentee: MenteeProfile
    fit_score: float
    focus_path: tuple[str, ...]
    cadence: str
    milestones: tuple[str, ...]
    rituals: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "mentor": self.mentor.name,
            "mentee": self.mentee.name,
            "fit_score": self.fit_score,
            "focus_path": list(self.focus_path),
            "cadence": self.cadence,
            "milestones": list(self.milestones),
            "rituals": list(self.rituals),
        }


@dataclass(slots=True)
class MentorshipPlan:
    """Complete mentorship program blueprint."""

    program: MentorshipProgram
    matches: tuple[MentorshipMatch, ...]
    program_rituals: tuple[str, ...]
    operations_backlog: tuple[str, ...]
    summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "program": {
                "name": self.program.name,
                "duration_weeks": self.program.duration_weeks,
                "cadence_per_week": self.program.cadence_per_week,
                "themes": list(self.program.themes),
                "rituals": list(self.program.rituals),
            },
            "matches": [match.as_dict() for match in self.matches],
            "program_rituals": list(self.program_rituals),
            "operations_backlog": list(self.operations_backlog),
            "summary": self.summary,
        }


class DynamicMentorshipEngine:
    """Coordinate mentors and mentees into an actionable mentorship engine."""

    def __init__(self) -> None:
        self._mentors: List[MentorProfile] = []
        self._mentees: List[MenteeProfile] = []

    # ------------------------------------------------------------------ state
    def add_mentor(self, mentor: MentorProfile) -> None:
        if not isinstance(mentor, MentorProfile):  # pragma: no cover - guard
            raise TypeError("mentor must be a MentorProfile instance")
        self._mentors.append(mentor)

    def extend_mentors(self, mentors: Iterable[MentorProfile]) -> None:
        for mentor in mentors:
            self.add_mentor(mentor)

    def add_mentee(self, mentee: MenteeProfile) -> None:
        if not isinstance(mentee, MenteeProfile):  # pragma: no cover - guard
            raise TypeError("mentee must be a MenteeProfile instance")
        self._mentees.append(mentee)

    def extend_mentees(self, mentees: Iterable[MenteeProfile]) -> None:
        for mentee in mentees:
            self.add_mentee(mentee)

    def clear(self) -> None:
        self._mentors.clear()
        self._mentees.clear()

    # -------------------------------------------------------------- orchestrat
    def design(self, program: MentorshipProgram) -> MentorshipPlan:
        if not self._mentors:
            raise RuntimeError("no mentors registered")
        if not self._mentees:
            raise RuntimeError("no mentees registered")

        capacity_pool = [
            {"profile": mentor, "capacity": mentor.capacity}
            for mentor in sorted(self._mentors, key=lambda m: m.tempo_bias, reverse=True)
            if mentor.capacity > 0
        ]
        if not capacity_pool:
            raise RuntimeError("no mentor capacity available")

        matches: list[MentorshipMatch] = []
        deferred: list[str] = []

        for mentee in sorted(self._mentees, key=lambda m: m.intensity, reverse=True):
            best_index = -1
            best_score = -1.0
            for index, bucket in enumerate(capacity_pool):
                if bucket["capacity"] <= 0:
                    continue
                score = self._score(bucket["profile"], mentee, program)
                if score > best_score:
                    best_score = score
                    best_index = index
            if best_index < 0:
                deferred.append(mentee.name)
                continue

            bucket = capacity_pool[best_index]
            bucket["capacity"] -= 1
            mentor = bucket["profile"]

            focus_path = self._focus_path(mentor, mentee, program)
            cadence = (
                f"{program.cadence_per_week}x weekly for {program.duration_weeks} week"
                f"{'s' if program.duration_weeks != 1 else ''}"
            )
            milestones = self._milestones(mentee, program, focus_path)
            rituals = self._match_rituals(program, mentor, mentee)

            matches.append(
                MentorshipMatch(
                    mentor=mentor,
                    mentee=mentee,
                    fit_score=round(best_score, 3),
                    focus_path=focus_path,
                    cadence=cadence,
                    milestones=milestones,
                    rituals=rituals,
                )
            )

        program_rituals = self._program_rituals(program)
        operations_backlog = self._operations_backlog(program, deferred)
        summary = self._summary(program, matches, deferred)

        matches.sort(key=lambda match: match.fit_score, reverse=True)

        return MentorshipPlan(
            program=program,
            matches=tuple(matches),
            program_rituals=tuple(program_rituals),
            operations_backlog=tuple(operations_backlog),
            summary=summary,
        )

    # ----------------------------------------------------------------- helpers
    def _score(
        self, mentor: MentorProfile, mentee: MenteeProfile, program: MentorshipProgram
    ) -> float:
        domain_alignment = _overlap(mentor.domains, mentee.focus_areas)
        strength_alignment = _overlap(mentor.strengths, mentee.goals)
        tempo_alignment = 1.0 - abs(mentor.tempo_bias - mentee.intensity)
        theme_alignment = _overlap(program.themes, mentee.focus_areas)
        score = (
            domain_alignment * 0.45
            + strength_alignment * 0.35
            + tempo_alignment * 0.15
            + theme_alignment * 0.05
        )
        return max(score, 0.0)

    def _focus_path(
        self,
        mentor: MentorProfile,
        mentee: MenteeProfile,
        program: MentorshipProgram,
    ) -> tuple[str, ...]:
        shared_domains = [tag for tag in mentee.focus_areas if tag in mentor.domains]
        if program.themes:
            theme_matches = [
                tag for tag in mentee.focus_areas if tag in program.themes and tag not in shared_domains
            ]
            shared_domains = theme_matches + shared_domains
        if not shared_domains:
            shared_domains = list(mentee.focus_areas[:2] or mentor.domains[:1])
        ladder = [shared_domains[0]] if shared_domains else ["foundations"]
        if mentee.goals:
            ladder.append(f"activate_{mentee.goals[0].replace(' ', '_')}")
        ladder.append("codify_playbook")
        return tuple(dict.fromkeys(ladder))

    def _milestones(
        self,
        mentee: MenteeProfile,
        program: MentorshipProgram,
        focus_path: Sequence[str],
    ) -> tuple[str, ...]:
        anchor = focus_path[0] if focus_path else "foundation"
        primary_goal = mentee.goals[0] if mentee.goals else anchor
        midpoint = max(program.duration_weeks // 2, 1)
        return (
            f"Week 1: Diagnostic deep dive on {anchor}",
            f"Week {midpoint}: System stress test with live reps",
            f"Week {program.duration_weeks}: Showcase {primary_goal}",
        )

    def _match_rituals(
        self,
        program: MentorshipProgram,
        mentor: MentorProfile,
        mentee: MenteeProfile,
    ) -> tuple[str, ...]:
        async_cadence = max(1, round(7 / program.cadence_per_week))
        rituals = [
            f"Pre-brief: 10-minute journal sync ({mentor.timezone} ↔ {mentee.timezone})",
            f"Async check-in every {async_cadence} day(s)",
        ]
        if mentor.strengths and mentor.strengths[0] in mentee.goals:
            rituals.append(f"Shadow {mentor.strengths[0]} routine live once per sprint")
        if program.rituals:
            rituals.append(f"Contribute insight to cohort ritual: {program.rituals[0]}")
        return tuple(rituals)

    def _program_rituals(self, program: MentorshipProgram) -> list[str]:
        rituals = ["Weekly cohort office hours led by program staff"]
        if program.themes:
            rituals.append(f"Theme spotlight: {program.themes[0].title()} labs")
        if program.rituals:
            rituals.extend(f"Cohort ritual: {item}" for item in program.rituals)
        rituals.append("Signal review + accountability broadcast on Fridays")
        return rituals

    def _operations_backlog(
        self, program: MentorshipProgram, deferred: Sequence[str]
    ) -> list[str]:
        backlog = ["Publish kickoff playbook and onboarding survey"]
        if deferred:
            backlog.append(
                "Expand mentor bench for: " + ", ".join(sorted(deferred))
            )
        backlog.append(
            f"Instrument metrics dashboard for {program.name} ({program.duration_weeks}w)"
        )
        return backlog

    def _summary(
        self,
        program: MentorshipProgram,
        matches: Sequence[MentorshipMatch],
        deferred: Sequence[str],
    ) -> str:
        paired = ", ".join(f"{match.mentor.name}→{match.mentee.name}" for match in matches)
        deferred_note = f"; waitlist: {', '.join(deferred)}" if deferred else ""
        return (
            f"{program.name}: {len(matches)} active match(es) across {program.duration_weeks} week"
            f"{'s' if program.duration_weeks != 1 else ''} "
            f"with cadence {program.cadence_per_week}x/week. Pairs: {paired or 'none'}{deferred_note}."
        )
