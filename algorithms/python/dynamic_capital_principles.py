"""Structured representation of the Dynamic Capital playbook of principles."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Tuple

from .dynamic_question_answer_algo import DQAPrinciple, DQARule

__all__ = [
    "PrincipleSection",
    "SuccessFormula",
    "PLAYBOOK_OF_PRINCIPLES",
    "SUCCESS_FORMULA",
    "build_principle_sections",
    "build_dqa_principles",
    "build_dqa_rules",
]


@dataclass(frozen=True, slots=True)
class PrincipleSection:
    """Represents a thematic section of the Dynamic Capital playbook."""

    key: str
    title: str
    summary: str
    tenets: Tuple[str, ...]
    tags: Tuple[str, ...] = ()

    def __post_init__(self) -> None:  # pragma: no cover - validated via tests
        if not self.key:
            raise ValueError("principle section key cannot be empty")
        if not self.title:
            raise ValueError("principle section title cannot be empty")
        if not self.tenets:
            raise ValueError("principle section must include at least one tenet")

    def to_dict(self) -> Mapping[str, object]:
        return {
            "key": self.key,
            "title": self.title,
            "summary": self.summary,
            "tenets": list(self.tenets),
            "tags": list(self.tags),
        }

    def to_dqa_principle(self, priority: float = 1.0) -> DQAPrinciple:
        """Convert the section into a :class:`DQAPrinciple` instance."""

        tag_candidates: Tuple[str, ...]
        if self.tags:
            tag_candidates = tuple(tag.lower() for tag in self.tags)
        else:
            tag_candidates = (self.key.lower(),)
        return DQAPrinciple(
            identifier=self.key,
            summary=self.summary,
            tags=tag_candidates,
            priority=priority,
            guardrails=self.tenets,
        )

    def to_dqa_rules(self, priority: float = 1.0) -> Tuple[DQARule, ...]:
        """Return :class:`DQARule` entries for each tenet in the section."""

        base_tags: Tuple[str, ...]
        if self.tags:
            base_tags = tuple(tag.lower() for tag in self.tags)
        else:
            base_tags = (self.key.lower(),)
        rules: list[DQARule] = []
        for index, tenet in enumerate(self.tenets, start=1):
            rules.append(
                DQARule(
                    identifier=f"{self.key}.tenet.{index}",
                    description=tenet,
                    tags=base_tags,
                    priority=priority,
                )
            )
        return tuple(rules)


@dataclass(frozen=True, slots=True)
class SuccessFormula:
    """Represents the formula for success highlighted in the playbook."""

    name: str
    components: Tuple[str, ...]
    result: str
    context: str

    def equation(self) -> str:
        return f"{' + '.join(self.components)} = {self.result}"

    def to_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "components": list(self.components),
            "result": self.result,
            "context": self.context,
            "equation": self.equation(),
        }


PLAYBOOK_OF_PRINCIPLES: Tuple[PrincipleSection, ...] = (
    PrincipleSection(
        key="faith_mindset",
        title="Faith & Mindset",
        summary="Build unshakeable trust in Allah through patience, gratitude, and resilience.",
        tenets=(
            "Believe in one God (Allah) and maintain unwavering trust (tawakkul).",
            "Anchor life in patience (sabr) and gratitude (shukr).",
            "View hardship as a test designed to elevate, not punish.",
            "Let resilience and hope frame every decision and response.",
        ),
        tags=("faith", "mindset", "tawakkul", "sabr", "shukr"),
    ),
    PrincipleSection(
        key="character_code",
        title="Character Code",
        summary="Lead with uncompromising integrity, mercy, and humility in every interaction.",
        tenets=(
            "Tell the truth without compromise—integrity is non-negotiable.",
            "Show mercy, kindness, and forgiveness, even toward enemies.",
            "Embrace humility and simplicity as sources of strength.",
            "Treat others with the same compassion you seek from Allah.",
        ),
        tags=("character", "integrity", "mercy", "humility", "simplicity"),
    ),
    PrincipleSection(
        key="leadership_rules",
        title="Leadership Rules",
        summary="Model justice, consultation, and accountability as the core of leadership.",
        tenets=(
            "Lead by example rather than title or position.",
            "Apply justice equally—favoritism erodes trust.",
            "Seek consultation (shura) before major decisions.",
            "Accept accountability as an essential leadership duty.",
        ),
        tags=("leadership", "justice", "shura", "accountability"),
    ),
    PrincipleSection(
        key="relationship_principles",
        title="Relationship Principles",
        summary="Protect the community through honor, service, and a bias toward peace.",
        tenets=(
            "Respect and honor women as partners, not subordinates.",
            "Care for orphans, neighbors, and those in need.",
            "Practice brotherhood—the community thrives as one body.",
            "Pursue peace first; conflict remains a last resort.",
        ),
        tags=("relationships", "community", "service", "peace"),
    ),
    PrincipleSection(
        key="work_wealth",
        title="Work & Wealth",
        summary="Balance worship, family, and livelihood while treating wealth as a trust.",
        tenets=(
            "Trade fairly—honesty invites lasting blessings.",
            "Keep promises and contracts sacred.",
            "Balance worship, family, and livelihood commitments.",
            "Treat wealth as a trust and share with those in need.",
        ),
        tags=("work", "wealth", "honesty", "balance", "charity"),
    ),
    PrincipleSection(
        key="strategy_wisdom",
        title="Strategy & Wisdom",
        summary="Favour patience, diplomacy, and principled adaptation over aggression.",
        tenets=(
            "Combine patience and diplomacy before resorting to aggression.",
            "Negotiate peace whenever possible.",
            "Think long-term—build durable foundations over shortcuts.",
            "Adapt to changing circumstances without compromising principles.",
        ),
        tags=("strategy", "wisdom", "diplomacy", "patience", "adaptation"),
    ),
    PrincipleSection(
        key="spiritual_practices",
        title="Spiritual Practices",
        summary="Anchor routines in prayer, fasting, remembrance, and night devotion.",
        tenets=(
            "Anchor each day with the five daily prayers.",
            "Fast to cultivate self-control and empathy.",
            "Maintain remembrance (dhikr) to calm and focus the heart.",
            "Rise for night prayer (tahajjud) to renew private strength.",
        ),
        tags=("spirituality", "prayer", "fasting", "dhikr", "tahajjud"),
    ),
    PrincipleSection(
        key="legacy_vision",
        title="Legacy & Vision",
        summary="Advance equality, justice, and mercy as the blueprint for humanity.",
        tenets=(
            "Uphold equality—no superiority based on race or wealth.",
            "Live the Farewell Sermon blueprint of justice, unity, and rights.",
            "Follow the Qur'an and Sunnah as timeless guidance.",
            "Inspire through mercy and compassion rather than fear.",
        ),
        tags=("legacy", "vision", "justice", "mercy", "equality"),
    ),
)


SUCCESS_FORMULA = SuccessFormula(
    name="Formula for Success",
    components=("Faith", "Patience", "Justice", "Mercy", "Simplicity"),
    result="Victory",
    context="in this life and the next",
)


def build_principle_sections() -> Tuple[PrincipleSection, ...]:
    """Return an immutable tuple of the principle sections."""

    return PLAYBOOK_OF_PRINCIPLES


def build_dqa_principles(*, priority: float = 1.0) -> Tuple[DQAPrinciple, ...]:
    """Construct :class:`DQAPrinciple` entries for the playbook."""

    return tuple(section.to_dqa_principle(priority=priority) for section in PLAYBOOK_OF_PRINCIPLES)


def build_dqa_rules(*, priority: float = 1.0) -> Tuple[DQARule, ...]:
    """Construct :class:`DQARule` entries mapping to every playbook tenet."""

    rules: list[DQARule] = []
    for section in PLAYBOOK_OF_PRINCIPLES:
        rules.extend(section.to_dqa_rules(priority=priority))
    return tuple(rules)
