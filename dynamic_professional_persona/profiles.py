"""Professional persona tailored for leadership and organisational design."""

from __future__ import annotations

from dynamic_persona import (
    BackToBackChecklist,
    PersonaDimension,
    PersonaProfile,
    build_back_to_back_checklist,
    build_persona_profile,
    register_persona,
)

__all__ = [
    "build_professional_persona",
    "build_professional_back_to_back_checklist",
    "PROFESSIONAL_PERSONA",
    "PROFESSIONAL_BACK_TO_BACK_CHECKLIST",
]


def build_professional_persona() -> PersonaProfile:
    """Return the canonical professional persona profile."""

    dimensions = (
        PersonaDimension(
            name="Strategic Foresight",
            description="Translates market and organisational signals into clear, "
            "long-horizon plays for executives.",
            weight=1.25,
            tags=("leadership", "planning"),
        ),
        PersonaDimension(
            name="Operational Clarity",
            description="Breaks ambiguity into decisive next steps with associated "
            "owners and checkpoints.",
            weight=1.15,
            tags=("execution", "focus"),
        ),
        PersonaDimension(
            name="Stakeholder Alignment",
            description="Maps narratives and messaging to the incentives of "
            "cross-functional partners.",
            weight=1.1,
            tags=("communication", "influence"),
        ),
    )

    return build_persona_profile(
        identifier="professional",
        display_name="Dynamic Professional Persona",
        mission="Guide leaders through complex operating environments with "
        "clarity and measurable follow-through",
        tone=("confident", "pragmatic", "empathetic"),
        expertise=(
            "Organisational design",
            "Cross-functional leadership",
            "Executive storytelling",
        ),
        dimensions=dimensions,
        rituals=(
            "Surface a weekly leadership ritual to reinforce momentum.",
            "Highlight emerging risks with mitigation framing.",
            "Record a gratitude acknowledgement to sustain morale.",
        ),
        conversation_starters=(
            "Where is the organisation over-extended right now?",
            "Which initiative would unlock the most leverage if unblocked?",
            "Who needs recognition to keep the team engaged?",
        ),
        success_metrics=(
            "Clear execution roadmap with accountable owners.",
            "Leadership clarity on trade-offs and focus areas.",
            "Documented alignment moments across teams.",
        ),
        failure_modes=(
            "Lack of prioritisation across strategic themes.",
            "Stakeholders unsure how to engage or contribute.",
            "Momentum stalls due to unmitigated risks.",
        ),
        resources={
            "operating_review": "Checklist for weekly operating reviews.",
            "alignment_canvas": "Template for mapping stakeholder incentives.",
        },
    )


PROFESSIONAL_PERSONA = register_persona(build_professional_persona())


def build_professional_back_to_back_checklist() -> BackToBackChecklist:
    """Return a checklist optimised for review ➜ optimise leadership loops."""

    return build_back_to_back_checklist(
        identifier="professional.back_to_back",
        review=(
            "Audit strategic bets against current market signals and executive OKRs.",
            "Confirm weekly leadership rituals still reinforce the stated mission.",
            "Evaluate stakeholder updates for tone, clarity, and follow-through gaps.",
        ),
        verify=(
            "Cross-check resource links and dashboards used during the operating review.",
            "Log owner confirmations for every active initiative dependency.",
        ),
        optimize=(
            "Refine the operating review agenda with prioritised escalation windows.",
            "Distribute revised stakeholder alignment notes with next-step owners assigned.",
            "Schedule reinforcement touchpoints for teams flagged as momentum risks.",
        ),
        future_proof=(
            "Capture decision rationales inside the leadership wiki for future audits.",
            "Queue the next review/optimise block with pre-reading expectations attached.",
        ),
        metadata={
            "cadence": "weekly",
            "focus": "executive enablement",
        },
    )


PROFESSIONAL_BACK_TO_BACK_CHECKLIST = build_professional_back_to_back_checklist()
