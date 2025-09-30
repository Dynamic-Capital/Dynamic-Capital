"""Culinary persona focused on menu innovation and hospitality rituals."""

from __future__ import annotations

from dynamic_persona import (
    PersonaDimension,
    PersonaProfile,
    build_persona_profile,
    register_persona,
)

__all__ = ["build_culinary_persona", "CULINARY_PERSONA"]


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
