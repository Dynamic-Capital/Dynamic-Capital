"""Shared proficiency grading system for Dynamic Capital analytics."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from .model import _clamp

__all__ = ["ProficiencyBand", "ProficiencyClassification", "classify_proficiency"]


@dataclass(frozen=True, slots=True)
class ProficiencyBand:
    """Definition for a mastery tier within the proficiency model."""

    key: str
    label: str
    threshold: float
    narrative: str


@dataclass(frozen=True, slots=True)
class ProficiencyClassification:
    """Result describing the assigned proficiency tier."""

    level: str
    label: str
    narrative: str


_PROFICIENCY_BANDS: Final[tuple[ProficiencyBand, ...]] = (
    ProficiencyBand(
        key="contribution",
        label="Contribution Level",
        threshold=0.9,
        narrative=(
            "Contribution Level – research, automation, and benchmarks are elevating "
            "the broader ecosystem."
        ),
    ),
    ProficiencyBand(
        key="innovation",
        label="Innovation Level",
        threshold=0.75,
        narrative=(
            "Innovation Level – teams are devising novel methods and translating "
            "insights into differentiated execution."
        ),
    ),
    ProficiencyBand(
        key="application",
        label="Application Level",
        threshold=0.5,
        narrative=(
            "Application Level – foundational practices are applied consistently with "
            "room to mature advanced techniques."
        ),
    ),
    ProficiencyBand(
        key="observation",
        label="Observation Level",
        threshold=0.0,
        narrative=(
            "Observation Level – focus on mastering the fundamentals before expanding "
            "into complex initiatives."
        ),
    ),
)


def _select_band(score: float) -> ProficiencyBand:
    for band in _PROFICIENCY_BANDS:
        if score >= band.threshold:
            return band
    return _PROFICIENCY_BANDS[-1]


def _downgrade_for_coverage(band_index: int) -> int:
    return min(band_index + 1, len(_PROFICIENCY_BANDS) - 1)


def classify_proficiency(
    score: float,
    *,
    coverage: float | None = None,
) -> ProficiencyClassification:
    """Classify an outcome into the proficiency tiers.

    Parameters
    ----------
    score:
        Normalised mastery or benchmark score in the inclusive range ``[0, 1]``.
    coverage:
        Optional signal coverage ratio. Low coverage can lower the assigned tier
        because there is insufficient evidence to claim sustained mastery.
    """

    normalised_score = _clamp(score)
    coverage_ratio = 1.0 if coverage is None else _clamp(coverage)

    if coverage_ratio < 0.25:
        observation = _PROFICIENCY_BANDS[-1]
        narrative = (
            f"{observation.narrative} Evidence is limited; capture additional signals "
            "before drawing conclusions."
        )
        return ProficiencyClassification(
            level=observation.key,
            label=observation.label,
            narrative=narrative,
        )

    selected_band = _select_band(normalised_score)
    band_index = _PROFICIENCY_BANDS.index(selected_band)

    coverage_hint = ""
    if coverage_ratio < 0.6 and selected_band.key in {"contribution", "innovation"}:
        downgraded_index = _downgrade_for_coverage(band_index)
        selected_band = _PROFICIENCY_BANDS[downgraded_index]
        coverage_hint = " Coverage breadth is still developing; monitor additional cycles to confirm durability."
    elif coverage_ratio < 0.6:
        coverage_hint = " Coverage breadth is still developing; expand sampling to improve confidence."

    narrative = selected_band.narrative + coverage_hint
    return ProficiencyClassification(
        level=selected_band.key,
        label=selected_band.label,
        narrative=narrative,
    )
