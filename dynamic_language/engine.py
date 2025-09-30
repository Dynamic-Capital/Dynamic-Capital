"""Dynamic Language engine built on top of the language model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, Sequence

from .model import DynamicLanguageModel, LanguageProfile

__all__ = [
    "LanguageAssessment",
    "DynamicLanguageEngine",
]


def _normalise_text(value: str, *, field_name: str) -> str:
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    cleaned: list[str] = []
    for value in values:
        candidate = value.strip()
        if candidate:
            cleaned.append(candidate)
    return tuple(cleaned)


def _clamp(value: float) -> float:
    numeric = float(value)
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric


@dataclass(slots=True)
class LanguageAssessment:
    """Structured output describing a language recommendation."""

    language: LanguageProfile
    domain: str
    suitability: float
    rationale: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.domain = _normalise_text(self.domain, field_name="domain").lower()
        self.suitability = _clamp(self.suitability)
        self.rationale = _normalise_tuple(self.rationale)

    def as_dict(self) -> dict[str, object]:
        return {
            "language": self.language.name,
            "domain": self.domain,
            "suitability": self.suitability,
            "rationale": list(self.rationale),
            "profile": self.language.as_dict(),
        }


class DynamicLanguageEngine:
    """High-level orchestrator for Dynamic Language recommendations."""

    def __init__(
        self,
        *,
        model: DynamicLanguageModel | None = None,
        default_domains: Sequence[str] | None = None,
    ) -> None:
        self.model = model or DynamicLanguageModel()
        self._default_domains = _normalise_tuple(default_domains)

    def register_languages(
        self, profiles: Iterable[LanguageProfile | Mapping[str, object]]
    ) -> list[LanguageProfile]:
        registered: list[LanguageProfile] = []
        for profile in profiles:
            registered.append(self.model.register_language(profile))
        return registered

    def recommend(
        self,
        domain: str,
        *,
        limit: int | None = 3,
        rationale: bool = True,
    ) -> tuple[LanguageAssessment, ...]:
        domain_name = _normalise_text(domain, field_name="domain")
        recommendations = self.model.recommend(domain_name, limit=limit)
        assessments: list[LanguageAssessment] = []
        for profile, score in recommendations:
            if rationale:
                reasons = self._build_rationale(profile, domain_name, score)
            else:
                reasons = ()
            assessments.append(
                LanguageAssessment(
                    language=profile,
                    domain=domain_name,
                    suitability=score,
                    rationale=reasons,
                )
            )
        return tuple(assessments)

    def snapshot(self) -> dict[str, object]:
        return {
            "domains": list(self._default_domains),
            "languages": self.model.snapshot(),
        }

    # ------------------------------------------------------------------ helpers
    def _build_rationale(
        self, profile: LanguageProfile, domain: str, score: float
    ) -> tuple[str, ...]:
        reasons: list[str] = [
            f"Adaptability index {profile.adaptability_index:.2f}",
            f"Domain readiness {profile.score_for_domain(domain):.2f}",
        ]
        if profile.strengths:
            reasons.append(
                "Strengths: " + ", ".join(profile.strengths[:3])
            )
        if profile.cautions:
            reasons.append(
                "Considerations: " + ", ".join(profile.cautions[:2])
            )
        if profile.primary_use_cases:
            reasons.append(
                "Use cases: " + ", ".join(profile.primary_use_cases[:3])
            )
        reasons.append(f"Overall suitability {score:.2f}")
        return tuple(reasons)
