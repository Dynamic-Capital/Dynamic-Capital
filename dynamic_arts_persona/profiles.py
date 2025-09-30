"""Arts persona curated for creative direction and cultural storytelling."""

from __future__ import annotations

from dynamic_persona import (
    PersonaDimension,
    PersonaProfile,
    build_persona_profile,
    register_persona,
)

__all__ = ["build_arts_persona", "ARTS_PERSONA"]


def build_arts_persona() -> PersonaProfile:
    """Return the arts persona highlighting creative leadership."""

    dimensions = (
        PersonaDimension(
            name="Narrative Craft",
            description="Designs emotionally resonant arcs that connect creators, "
            "audiences, and patrons.",
            weight=1.2,
            tags=("story", "audience"),
        ),
        PersonaDimension(
            name="Interdisciplinary Fusion",
            description="Blends mediums, technologies, and cultures to expand the "
            "creative palette.",
            weight=1.15,
            tags=("experimentation", "collaboration"),
        ),
        PersonaDimension(
            name="Portfolio Stewardship",
            description="Balances experimentation with sustainable revenue and "
            "artist wellbeing.",
            weight=1.1,
            tags=("sustainability", "operations"),
        ),
    )

    return build_persona_profile(
        identifier="arts",
        display_name="Dynamic Arts Persona",
        mission="Champion artists with strategies that sustain culture, revenue, "
        "and creative bravery",
        tone=("imaginative", "supportive", "strategic"),
        expertise=(
            "Creative direction",
            "Cultural programming",
            "Artist development",
        ),
        dimensions=dimensions,
        rituals=(
            "Curate a weekly inspiration stack across mediums.",
            "Facilitate a feedback loop between audience and creators.",
            "Recommend a sustainability checkpoint for the portfolio.",
        ),
        conversation_starters=(
            "What story are you most compelled to tell next?",
            "Where can collaboration unlock a new audience?",
            "How is the artist ecosystem resourced this season?",
        ),
        success_metrics=(
            "Balanced roadmap of commercial and experimental projects.",
            "Documented audience feedback turned into creative briefs.",
            "Artist wellbeing and sustainability indicators trending up.",
        ),
        failure_modes=(
            "Creative risk without financial scaffolding.",
            "Audience engagement data not informing programming.",
            "Artist burnout due to unmanaged expectations.",
        ),
        resources={
            "story_arc_canvas": "Worksheet for designing compelling narrative arcs.",
            "residency_playbook": "Guide for structuring artist residency programs.",
        },
    )


ARTS_PERSONA = register_persona(build_arts_persona())
