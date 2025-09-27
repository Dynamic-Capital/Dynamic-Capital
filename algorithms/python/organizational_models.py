"""Organisational structure and management style reference data."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Optional, Sequence, Tuple

__all__ = [
    "StructureProfile",
    "ManagementStyleProfile",
    "resolve_operating_model_context",
    "build_playbook_overlay",
]


def _normalise_key(value: str) -> str:
    return value.strip().lower().replace("-", "_").replace(" ", "_")


@dataclass(frozen=True)
class StructureProfile:
    """Description of how an organisation arranges teams."""

    name: str
    description: str
    advantages: Sequence[str]
    disadvantages: Sequence[str]
    best_suited_for: Sequence[str] = field(default_factory=tuple)
    helpful_management_styles: Sequence[str] = field(default_factory=tuple)


@dataclass(frozen=True)
class ManagementStyleProfile:
    """How leadership guides teams day to day."""

    name: str
    description: str
    best_for: Sequence[str]
    drawbacks: Sequence[str]


STRUCTURES: Dict[str, StructureProfile] = {
    profile.name: profile
    for profile in (
        StructureProfile(
            name="functional",
            description="Teams are grouped by specialised capability (marketing, finance, engineering).",
            advantages=(
                "Deep expertise and specialisation",
                "Clear ownership of functional KPIs",
                "Predictable resourcing for repeatable work",
            ),
            disadvantages=(
                "Risk of siloed execution and slower cross-team handoffs",
                "Dependencies surface late without shared rituals",
            ),
            best_suited_for=(
                "Larger organisations scaling core functions",
                "Teams focused on efficiency and depth of expertise",
            ),
            helpful_management_styles=("transactional", "participative"),
        ),
        StructureProfile(
            name="divisional",
            description="Teams operate inside product, market, or regional business units.",
            advantages=(
                "High focus on specific customer segments",
                "Flexible pivots by product line",
            ),
            disadvantages=(
                "Duplicated capabilities across divisions",
                "Harder to maintain shared standards",
            ),
            best_suited_for=(
                "Portfolio companies running multiple go-to-market motions",
                "Enterprises with clear P&L ownership per line",
            ),
            helpful_management_styles=("transactional", "transformational"),
        ),
        StructureProfile(
            name="matrix",
            description="Dual reporting between functional and project/program leaders.",
            advantages=(
                "Cross-functional collaboration on complex initiatives",
                "Resource sharing without collapsing functional expertise",
            ),
            disadvantages=(
                "Potential confusion from dual reporting lines",
                "Requires explicit escalation paths",
            ),
            best_suited_for=(
                "Scaling organisations balancing platform and customer demands",
                "Programmes requiring multidisciplinary pods",
            ),
            helpful_management_styles=("transformational", "participative"),
        ),
        StructureProfile(
            name="flat",
            description="Minimal hierarchy with autonomous, multi-skilled contributors.",
            advantages=(
                "Fast decision cycles",
                "High ownership and experimentation",
            ),
            disadvantages=(
                "Role ambiguity as headcount scales",
                "Need for explicit decision logs",
            ),
            best_suited_for=(
                "Startups or skunkworks teams",
                "Innovation cells exploring new bets",
            ),
            helpful_management_styles=("democratic", "transformational"),
        ),
        StructureProfile(
            name="hierarchical",
            description="Traditional layered management with clear reporting chains.",
            advantages=(
                "Clear authority and accountability",
                "Strong compliance and audit trails",
            ),
            disadvantages=(
                "Slower decision velocity",
                "Innovation can stall without sponsorship",
            ),
            best_suited_for=(
                "Regulated environments",
                "Risk-sensitive functions such as treasury or compliance",
            ),
            helpful_management_styles=("transactional", "autocratic"),
        ),
        StructureProfile(
            name="network",
            description="Lean core team augmented by partners, contractors, or agencies.",
            advantages=(
                "Flexible resourcing",
                "Cost efficiency by leveraging specialists on demand",
            ),
            disadvantages=(
                "Dependency on external partners",
                "Knowledge can leak without retention rituals",
            ),
            best_suited_for=(
                "Innovation-focused organisations",
                "Teams orchestrating large partner ecosystems",
            ),
            helpful_management_styles=("transformational", "laissez_faire"),
        ),
    )
}


MANAGEMENT_STYLES: Dict[str, ManagementStyleProfile] = {
    profile.name: profile
    for profile in (
        ManagementStyleProfile(
            name="autocratic",
            description="Leaders make decisions unilaterally with limited consultation.",
            best_for=("Crisis response", "Inexperienced teams needing tight guidance"),
            drawbacks=("Low empowerment", "Limited innovation"),
        ),
        ManagementStyleProfile(
            name="democratic",
            description="Leaders solicit input and involve teams in decisions.",
            best_for=("Creative teams", "Motivating experienced contributors"),
            drawbacks=("Slower consensus building", "Requires structured forums"),
        ),
        ManagementStyleProfile(
            name="participative",
            description="Leaders solicit input and involve teams in decisions with shared accountability.",
            best_for=("Teams seeking collective buy-in", "Cross-functional initiatives"),
            drawbacks=("Time-consuming facilitation", "Risk of diffusion of responsibility"),
        ),
        ManagementStyleProfile(
            name="laissez_faire",
            description="Leaders provide autonomy with light-touch oversight.",
            best_for=("Highly skilled independent teams", "Specialist partners"),
            drawbacks=("Risk of drift", "Requires strong self-management"),
        ),
        ManagementStyleProfile(
            name="transformational",
            description="Leaders inspire through vision, change narratives, and coaching.",
            best_for=("Innovation programmes", "Major change initiatives"),
            drawbacks=("Requires charismatic leadership", "Can overlook day-to-day operations"),
        ),
        ManagementStyleProfile(
            name="transactional",
            description="Leaders emphasise structure, KPIs, and rewards/penalties.",
            best_for=("Process-driven teams", "Highly regulated operations"),
            drawbacks=("Limited creative latitude", "Can demotivate experimentation"),
        ),
    )
}



STRUCTURE_STYLE_ALIGNMENT: Dict[Tuple[str, str], Sequence[str]] = {
    ("flat", "democratic"): (
        "Great for early-stage teams needing rapid iteration with buy-in.",
        "Facilitate weekly design or growth councils to keep alignment high.",
    ),
    ("flat", "transformational"): (
        "Use vision updates to keep autonomous squads aligned.",
        "Pair with lightweight participative rituals once headcount grows.",
    ),
    ("functional", "transactional"): (
        "Stabilises mature teams with process control and KPI discipline.",
        "Layer quarterly participative planning to surface cross-team risks early.",
    ),
    ("functional", "participative"): (
        "Balances functional depth with cross-team collaboration forums.",
    ),
    ("matrix", "transactional"): (
        "Use clear SLAs and budgets to reduce conflict between dual leads.",
    ),
    ("matrix", "participative"): (
        "Hold joint planning cadences so program and functional leads co-own priorities.",
    ),
    ("matrix", "transformational"): (
        "Narrate the change story often to keep teams aligned across reporting lines.",
    ),
    ("network", "transformational"): (
        "Anchor partners on the mission to sustain engagement despite distance.",
    ),
    ("network", "laissez_faire"): (
        "Provide autonomy to expert partners while monitoring delivery health.",
    ),
    ("hierarchical", "transactional"): (
        "Ideal for regulated sectors that need audit trails and predictable output.",
    ),
    ("hierarchical", "autocratic"): (
        "Reserve for crisis cells where rapid, centralised decisions are vital.",
    ),
}


def resolve_operating_model_context(
    *, structure: Optional[str] = None, management_style: Optional[str] = None
) -> Dict[str, Any]:
    """Return descriptive metadata for the supplied structure and management style."""

    payload: Dict[str, Any] = {}
    structure_key = _normalise_key(structure) if structure else None
    management_key = _normalise_key(management_style) if management_style else None

    if structure_key and structure_key in STRUCTURES:
        profile = STRUCTURES[structure_key]
        payload["structure"] = {
            "name": profile.name,
            "description": profile.description,
            "advantages": list(profile.advantages),
            "disadvantages": list(profile.disadvantages),
            "best_suited_for": list(profile.best_suited_for),
            "helpful_management_styles": list(profile.helpful_management_styles),
        }

    if management_key and management_key in MANAGEMENT_STYLES:
        profile = MANAGEMENT_STYLES[management_key]
        payload["management_style"] = {
            "name": profile.name,
            "description": profile.description,
            "best_for": list(profile.best_for),
            "drawbacks": list(profile.drawbacks),
        }

    if structure_key and management_key:
        alignment = STRUCTURE_STYLE_ALIGNMENT.get((structure_key, management_key))
        if alignment:
            payload.setdefault("alignment_notes", list(alignment))

    return payload


def _overlay_notes(description: str, *items: str) -> Dict[str, Any]:
    notes: Dict[str, Any] = {"description": description}
    if items:
        notes["checkpoints"] = list(items)
    return notes


STRUCTURE_PLAYBOOK_OVERLAYS: Dict[str, Dict[str, Any]] = {
    "functional": {
        "workflow": (
            "Schedule weekly cross-functional syncs to surface inter-team dependencies early.",
            "Tag shared OKRs or KR owners when delivering updates to prevent silo drift.",
        ),
        "annotations": {
            "structure_guidance": _overlay_notes(
                "Mitigate silo risk with deliberate collaboration cadences.",
                "Pair every functional update with impact on adjacent teams.",
                "Use shared dashboards so finance, product, and marketing see the same metrics.",
            )
        },
    },
    "divisional": {
        "workflow": (
            "Coordinate with shared services (finance, HR, data) to avoid duplicated work.",
            "Publish divisional scorecards alongside enterprise benchmarks for transparency.",
        ),
        "annotations": {
            "structure_guidance": _overlay_notes(
                "Balance divisional autonomy with unified standards.",
                "Clarify which capabilities sit centrally versus within the division.",
            )
        },
    },
    "matrix": {
        "workflow": (
            "Document decision-rights between functional and program leads for each initiative.",
            "Run fortnightly dual-lead reviews to resolve conflicts quickly.",
        ),
        "annotations": {
            "structure_guidance": _overlay_notes(
                "Prevent dual-reporting friction with transparent escalation paths.",
                "Ensure both leads co-sign major scope or budget changes.",
            )
        },
    },
    "flat": {
        "workflow": (
            "Maintain a living decision log so autonomy does not erode shared context.",
            "Rotate facilitation of retrospectives to keep ownership distributed.",
        ),
        "annotations": {
            "structure_guidance": _overlay_notes(
                "Clarify responsibilities as headcount grows.",
                "Escalate when ambiguous ownership slows execution.",
            )
        },
    },
    "hierarchical": {
        "workflow": (
            "Map approvals to authority levels and track cycle time for escalations.",
            "Surface automation opportunities that maintain compliance while reducing delays.",
        ),
        "annotations": {
            "structure_guidance": _overlay_notes(
                "Keep decision logs audit-ready.",
                "Use delegated authority matrices to speed up routine actions.",
            )
        },
    },
    "network": {
        "workflow": (
            "Maintain partner scorecards capturing SLAs, delivery status, and renewal posture.",
            "Document knowledge transfers from partners into the internal wiki weekly.",
        ),
        "annotations": {
            "structure_guidance": _overlay_notes(
                "Monitor partner dependencies and have fallback vendors identified.",
                "Protect proprietary knowledge with clear documentation hand-offs.",
            )
        },
    },
}


MANAGEMENT_STYLE_PLAYBOOK_OVERLAYS: Dict[str, Dict[str, Any]] = {
    "autocratic": {
        "workflow": (
            "Escalate blockers immediately to leadership for direction.",
            "Record rationale from leader directives to preserve team context.",
        ),
        "annotations": {
            "management_guidance": _overlay_notes(
                "Use sparingly outside crisis windows to avoid disengagement.",
                "Balance command decisions with post-mortems capturing lessons learned.",
            )
        },
    },
    "democratic": {
        "workflow": (
            "Prepare decision briefs outlining options, data, and recommended path before forums.",
            "Capture dissenting opinions and follow-up actions in the shared workspace.",
        ),
        "annotations": {
            "management_guidance": _overlay_notes(
                "Time-box discussions to protect momentum.",
                "Rotate facilitators to keep voices balanced.",
            )
        },
    },
    "laissez_faire": {
        "workflow": (
            "Publish weekly async updates covering priorities, blockers, and help requests.",
            "Set explicit checkpoints for high-risk deliverables despite autonomy.",
        ),
        "annotations": {
            "management_guidance": _overlay_notes(
                "Ensure teams agree on quality bars before work starts.",
                "Use shared dashboards so leaders can intervene if momentum drops.",
            )
        },
    },
    "transformational": {
        "workflow": (
            "Open each planning cycle with vision linkage: how this work advances the mission.",
            "Schedule coaching touchpoints to unblock capability gaps highlighted by the vision.",
        ),
        "annotations": {
            "management_guidance": _overlay_notes(
                "Balance inspiration with operational accountability.",
                "Translate the north star into measurable outcomes each sprint.",
            )
        },
    },
    "transactional": {
        "workflow": (
            "Review KPI dashboards daily and trigger playbook responses when thresholds breach.",
            "Align incentives/penalties with clearly documented performance bands.",
        ),
        "annotations": {
            "management_guidance": _overlay_notes(
                "Pair KPI focus with periodic innovation windows to avoid stagnation.",
                "Keep reward structures transparent and updated.",
            )
        },
    },
}


def build_playbook_overlay(
    *, structure: Optional[str] = None, management_style: Optional[str] = None
) -> Dict[str, Any]:
    """Return workflow overlays based on structure and management style."""

    overlay: Dict[str, Any] = {}
    structure_key = _normalise_key(structure) if structure else None
    management_key = _normalise_key(management_style) if management_style else None

    if structure_key and structure_key in STRUCTURE_PLAYBOOK_OVERLAYS:
        overlay.update(STRUCTURE_PLAYBOOK_OVERLAYS[structure_key])
        overlay.setdefault("applied", {})["structure"] = structure_key

    if management_key and management_key in MANAGEMENT_STYLE_PLAYBOOK_OVERLAYS:
        management_overlay = MANAGEMENT_STYLE_PLAYBOOK_OVERLAYS[management_key]
        for key, value in management_overlay.items():
            if key == "annotations":
                overlay.setdefault(key, {}).update(value)
            elif isinstance(value, Iterable) and not isinstance(value, (str, bytes)):
                existing = list(overlay.get(key, ()))
                existing.extend(value)
                overlay[key] = tuple(existing)
            else:
                overlay[key] = value
        overlay.setdefault("applied", {})["management_style"] = management_key

    return overlay

