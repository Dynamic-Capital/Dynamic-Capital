"""Unit tests for the Dynamic Mentorship Engine."""

from dynamic_mentorship import (
    DynamicMentorshipEngine,
    MenteeProfile,
    MentorProfile,
    MentorshipProgram,
)


def build_engine() -> DynamicMentorshipEngine:
    engine = DynamicMentorshipEngine()
    engine.extend_mentors(
        [
            MentorProfile(
                name="Amina",
                domains=("price action", "risk"),
                strengths=("journaling", "discipline"),
                tempo_bias=0.7,
                capacity=1,
                timezone="UTC+1",
            ),
            MentorProfile(
                name="Noah",
                domains=("automation", "systems"),
                strengths=("playbook", "automation"),
                tempo_bias=0.5,
                capacity=2,
                timezone="UTC-5",
            ),
        ]
    )
    engine.extend_mentees(
        [
            MenteeProfile(
                name="Lina",
                focus_areas=("discipline", "price action"),
                goals=("discipline", "risk"),
                intensity=0.85,
                timezone="UTC",
            ),
            MenteeProfile(
                name="Marcus",
                focus_areas=("automation", "journaling"),
                goals=("automation",),
                intensity=0.6,
                timezone="UTC-4",
            ),
        ]
    )
    return engine


def test_design_creates_matches_and_summary() -> None:
    engine = build_engine()
    program = MentorshipProgram(
        name="Clarity Sprint",
        duration_weeks=4,
        cadence_per_week=2,
        themes=("discipline", "automation"),
        rituals=("weekly momentum sync",),
    )

    plan = engine.design(program)

    assert len(plan.matches) == 2
    pairs = {(match.mentor.name, match.mentee.name) for match in plan.matches}
    assert ("Amina", "Lina") in pairs
    assert ("Noah", "Marcus") in pairs
    fit_scores = [match.fit_score for match in plan.matches]
    assert fit_scores == sorted(fit_scores, reverse=True)
    assert any(match.focus_path[0] == "discipline" for match in plan.matches)
    assert "Clarity Sprint" in plan.summary
    assert "weekly momentum sync" in " ".join(plan.program_rituals)


def test_waitlist_populated_when_capacity_exhausted() -> None:
    engine = build_engine()
    # Reduce total capacity to force a waitlist entry.
    engine.clear()
    engine.add_mentor(
        MentorProfile(
            name="Sasha",
            domains=("automation", "risk"),
            strengths=("automation", "ops"),
            tempo_bias=0.4,
            capacity=1,
            timezone="UTC",
        )
    )
    engine.extend_mentees(
        [
            MenteeProfile(
                name="Iris",
                focus_areas=("automation",),
                goals=("automation",),
                intensity=0.9,
            ),
            MenteeProfile(
                name="Leo",
                focus_areas=("automation", "discipline"),
                goals=("discipline",),
                intensity=0.7,
            ),
        ]
    )
    program = MentorshipProgram(name="Edge Mentorship", duration_weeks=3, cadence_per_week=1)

    plan = engine.design(program)

    assert len(plan.matches) == 1
    assert "Expand mentor bench" in plan.operations_backlog[1]
    assert "waitlist" in plan.summary


def test_design_requires_available_capacity() -> None:
    engine = DynamicMentorshipEngine()
    engine.add_mentor(MentorProfile(name="Amina", capacity=0))
    engine.add_mentee(MenteeProfile(name="Lina", focus_areas=("discipline",)))
    program = MentorshipProgram(name="Zero", duration_weeks=2, cadence_per_week=1)

    try:
        engine.design(program)
    except RuntimeError as exc:  # pragma: no cover - defensive
        assert "capacity" in str(exc)
    else:  # pragma: no cover - guard
        raise AssertionError("engine should raise when no capacity is available")
