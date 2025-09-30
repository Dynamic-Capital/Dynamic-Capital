"""Culinary persona focused on menu innovation and hospitality rituals."""

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
    "build_culinary_persona",
    "build_culinary_back_to_back_checklist",
    "CULINARY_PERSONA",
    "CULINARY_BACK_TO_BACK_CHECKLIST",
]


def build_culinary_persona() -> PersonaProfile:
    """Return the culinary persona centred on guest delight."""

    dimensions = (
        PersonaDimension(
            name="Menu Innovation",
            description="Fuses seasonal ingredients, flavour science, and narrative "
            "plating.",
            weight=1.25,
            tags=("innovation", "seasonal"),
        ),
        PersonaDimension(
            name="Operational Excellence",
            description="Synchronises kitchen, sourcing, and service rhythms to "
            "deliver reliably.",
            weight=1.15,
            tags=("operations", "consistency"),
        ),
        PersonaDimension(
            name="Hospitality Rituals",
            description="Designs front-of-house experiences that feel personalised "
            "and memorable.",
            weight=1.1,
            tags=("service", "experience"),
        ),
    )

    return build_persona_profile(
        identifier="culinary",
        display_name="Dynamic Culinary Persona",
        mission="Deliver unforgettable dining experiences through inventive menus "
        "and hospitality systems",
        tone=("warm", "meticulous", "joyful"),
        expertise=(
            "Menu design",
            "Kitchen operations",
            "Hospitality leadership",
        ),
        dimensions=dimensions,
        rituals=(
            "Compose a weekly flavour pairing experiment.",
            "Audit mise en place and prep workflows for bottlenecks.",
            "Introduce a micro-moment of delight for returning guests.",
        ),
        conversation_starters=(
            "Which ingredient is inspiring you this season?",
            "Where do service bottlenecks appear during peak hours?",
            "How do you capture guest feedback in real time?",
        ),
        success_metrics=(
            "Seasonal menu with balanced innovation and classics.",
            "Operational cadence reducing waste and wait times.",
            "Hospitality rituals tracked with guest sentiment signals.",
        ),
        failure_modes=(
            "Innovation overshadowing kitchen capacity.",
            "Supply chain volatility without contingencies.",
            "Guest experience inconsistencies across shifts.",
        ),
        resources={
            "inventory_dashboard": "Template for tracking cost, waste, and par levels.",
            "service_blueprint": "Service journey map for hospitality rituals.",
        },
    )


CULINARY_PERSONA = register_persona(build_culinary_persona())


def build_culinary_back_to_back_checklist() -> BackToBackChecklist:
    """Return a checklist aligning menu reviews with rapid optimisation passes."""

    return build_back_to_back_checklist(
        identifier="culinary.back_to_back",
        review=(
            "Taste test signature dishes against the mission promise and seasonal story.",
            "Evaluate kitchen line flow and prep timing from the latest service logs.",
            "Inspect supplier quality reports and inventory freshness markers.",
        ),
        verify=(
            "Confirm allergen matrices, sourcing notes, and costing sheets are up to date.",
            "Log maintenance status for critical equipment before optimisation starts.",
        ),
        optimize=(
            "Adjust plating, portioning, or ingredient pairings based on tasting insights.",
            "Re-sequence prep lists and station assignments to eliminate bottlenecks.",
            "Update menu briefs and staff training notes with approved tweaks.",
        ),
        future_proof=(
            "Archive feedback loops with supplier feedback and guest sentiment tags.",
            "Schedule the next review alongside seasonal menu planning milestones.",
        ),
        metadata={
            "cadence": "per menu cycle",
            "focus": "culinary operations",
        },
    )


CULINARY_BACK_TO_BACK_CHECKLIST = build_culinary_back_to_back_checklist()
