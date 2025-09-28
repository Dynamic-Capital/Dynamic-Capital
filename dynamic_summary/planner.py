"""Summary planning, validation, and scoring primitives.

This module codifies the summary taxonomy described in
``docs/summary_types.md`` and offers utilities for:

* retrieving the canonical guidance for a chosen depth, length, and purpose
* validating a draft summary against the format expectations
* calculating the QA rubric score used by Dynamic Capital reviewers

The goal is to keep the operational logic in sync with the documentation so
other tools (automation, linting, CLI helpers) can make consistent decisions
when working with deliverable summaries.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable, Mapping

_WORDS_PER_PAGE = 450


class SummaryDepth(str, Enum):
    """Depth tiers recognised by the playbook."""

    DESCRIPTIVE = "descriptive"
    INFORMATIVE = "informative"
    EVALUATIVE = "evaluative"


class SummaryLength(str, Enum):
    """Length formats supported by the playbook."""

    ABSTRACT = "abstract"
    EXECUTIVE_SUMMARY = "executive_summary"
    SYNOPSIS = "synopsis"
    CONDENSED_OUTLINE = "condensed_outline"


class SummaryPurpose(str, Enum):
    """Intent-specific variants used across Dynamic Capital."""

    ACADEMIC = "academic"
    PROFESSIONAL = "professional"
    STUDY = "study"
    TECHNICAL = "technical"


@dataclass(slots=True, frozen=True)
class DepthProfile:
    label: str
    description: str
    use_cases: tuple[str, ...]
    required_ingredients: tuple[str, ...]


@dataclass(slots=True, frozen=True)
class LengthProfile:
    label: str
    description: str
    max_words: int | None = None
    min_pages: float | None = None
    max_pages: float | None = None
    max_sentences: int | None = None
    structure: str | None = None


@dataclass(slots=True, frozen=True)
class PurposeProfile:
    label: str
    channel_examples: tuple[str, ...]
    cues: tuple[str, ...]


@dataclass(slots=True, frozen=True)
class RubricCriterion:
    name: str
    weight: float
    description: str


@dataclass(slots=True, frozen=True)
class SummaryRubric:
    """Weighted rubric matching the QA sheet outlined in the docs."""

    criteria: tuple[RubricCriterion, ...]

    @property
    def total_weight(self) -> float:
        return sum(criterion.weight for criterion in self.criteria)

    def score(self, ratings: Mapping[str, float]) -> "SummaryScore":
        """Calculate the weighted rubric score.

        ``ratings`` should map criterion names (case insensitive) to a score
        between ``0`` and ``1``. Missing criteria default to ``0``.
        """

        breakdown: dict[str, float] = {}
        lowered = {key.lower(): max(0.0, min(1.0, float(value))) for key, value in ratings.items()}
        weighted_sum = 0.0
        for criterion in self.criteria:
            score = lowered.get(criterion.name.lower(), 0.0)
            contribution = criterion.weight * score
            breakdown[criterion.name] = contribution
            weighted_sum += contribution
        total_weight = self.total_weight or 1.0
        percentage = (weighted_sum / total_weight) * 100.0
        return SummaryScore(weighted_score=weighted_sum, percentage=percentage, breakdown=breakdown)


@dataclass(slots=True, frozen=True)
class SummaryDraft:
    """Normalised metrics describing a summary draft."""

    word_count: int
    sentence_count: int
    bullet_count: int
    reference_count: int
    action_item_count: int
    ratings: Mapping[str, float]
    type_aligned: bool = False
    index_pointer_count: int = 0
    qa_signoff: bool = False


@dataclass(slots=True, frozen=True)
class ChecklistItemStatus:
    """Represents completion state for a single checklist requirement."""

    item: str
    passed: bool
    details: str | None = None


@dataclass(slots=True, frozen=True)
class ChecklistReport:
    """Summary of checklist completion for a draft."""

    items: tuple[ChecklistItemStatus, ...]

    @property
    def completed(self) -> bool:
        return all(item.passed for item in self.items)

    def missing_items(self) -> tuple[ChecklistItemStatus, ...]:
        return tuple(item for item in self.items if not item.passed)


@dataclass(slots=True, frozen=True)
class SummaryBlueprint:
    depth: DepthProfile
    length: LengthProfile
    purpose: PurposeProfile
    rubric: SummaryRubric
    checklist: tuple[str, ...]

    def checklist_items(self) -> tuple[str, ...]:
        return self.checklist


@dataclass(slots=True, frozen=True)
class SummaryScore:
    weighted_score: float
    percentage: float
    breakdown: Mapping[str, float]


@dataclass(slots=True, frozen=True)
class SummaryAssessment:
    score: SummaryScore
    issues: tuple[str, ...]
    advisories: tuple[str, ...]


_DEPTH_PROFILES: dict[SummaryDepth, DepthProfile] = {
    SummaryDepth.DESCRIPTIVE: DepthProfile(
        label="Descriptive",
        description="Quick context pass or sync recap",
        use_cases=("Daily trading desk stand-up log",),
        required_ingredients=("Storyline (2-3 sentences)", "Owner", "Time frame"),
    ),
    SummaryDepth.INFORMATIVE: DepthProfile(
        label="Informative",
        description="Research abstracts and product experiments",
        use_cases=(
            "Supabase analytics audit",
            "Smart order router test",
        ),
        required_ingredients=("Problem", "Method", "Data snapshot", "Decision"),
    ),
    SummaryDepth.EVALUATIVE: DepthProfile(
        label="Evaluative",
        description="Investment memos, retros, or vendor assessments",
        use_cases=("Validator infrastructure review",),
        required_ingredients=("Judgment (pass/block)", "Rationale", "Next action"),
    ),
}


_LENGTH_PROFILES: dict[SummaryLength, LengthProfile] = {
    SummaryLength.ABSTRACT: LengthProfile(
        label="Abstract",
        description="≤ 250 words, paragraph form for research drops, RFCs, and demos",
        max_words=250,
    ),
    SummaryLength.EXECUTIVE_SUMMARY: LengthProfile(
        label="Executive Summary",
        description="1–2 pages with action table for launches and board packets",
        min_pages=1,
        max_pages=2,
        structure="paragraphs + action table",
    ),
    SummaryLength.SYNOPSIS: LengthProfile(
        label="Synopsis",
        description="≤ 8 sentences, used for playbook refreshes or book/article distillations",
        max_sentences=8,
    ),
    SummaryLength.CONDENSED_OUTLINE: LengthProfile(
        label="Condensed Outline",
        description="Bullet format paired with impact notes",
        structure="bulleted",
    ),
}


_PURPOSE_PROFILES: dict[SummaryPurpose, PurposeProfile] = {
    SummaryPurpose.ACADEMIC: PurposeProfile(
        label="Academic / Research",
        channel_examples=("dynamic_research/", "dynamic_cap_theorem/"),
        cues=("Cite datasets", "List assumptions", "Flag replication steps"),
    ),
    SummaryPurpose.PROFESSIONAL: PurposeProfile(
        label="Professional / Recruiting",
        channel_examples=("dynamic_development_team/", "LinkedIn"),
        cues=("Highlight velocity metrics", "Stack expertise", "Quantified wins"),
    ),
    SummaryPurpose.STUDY: PurposeProfile(
        label="Study / Revision",
        channel_examples=("dynamic_learning/", "Study halls"),
        cues=("Capture formulae", "Mnemonics", "Checkpoint questions"),
    ),
    SummaryPurpose.TECHNICAL: PurposeProfile(
        label="Technical / Ops",
        channel_examples=("dynamic_infrastructure/", "Runbooks"),
        cues=("Mention environment", "Configs", "Rollback plan", "Related dashboards"),
    ),
}


_PUBLISH_CHECKLIST: tuple[str, ...] = (
    "Summary type matches deliverable and audience.",
    "Word count or page length is within spec.",
    "References and index pointers are live.",
    "Next actions, owners, and deadlines are explicit.",
    "QA reviewer signed off with rubric score.",
)


_RUBRIC = SummaryRubric(
    criteria=(
        RubricCriterion(
            name="Accuracy vs. source",
            weight=0.05,
            description="Facts, metrics, and decisions align with the underlying document.",
        ),
        RubricCriterion(
            name="Clarity & brevity",
            weight=0.04,
            description="Active sentences, defined jargon, and adherence to length targets.",
        ),
        RubricCriterion(
            name="Traceability",
            weight=0.03,
            description="Links to source material, index entries, and ticket IDs are present.",
        ),
        RubricCriterion(
            name="Actionability",
            weight=0.03,
            description="Readers understand ownership, deadlines, or risk mitigation steps.",
        ),
    ),
)


class SummaryPlanner:
    """Produce blueprints, validations, and scoring guidance."""

    def __init__(self) -> None:
        self._depth_profiles = _DEPTH_PROFILES
        self._length_profiles = _LENGTH_PROFILES
        self._purpose_profiles = _PURPOSE_PROFILES
        self._rubric = _RUBRIC

    def blueprint(
        self,
        depth: SummaryDepth,
        length: SummaryLength,
        purpose: SummaryPurpose,
    ) -> SummaryBlueprint:
        return SummaryBlueprint(
            depth=self._depth_profiles[depth],
            length=self._length_profiles[length],
            purpose=self._purpose_profiles[purpose],
            rubric=self._rubric,
            checklist=_PUBLISH_CHECKLIST,
        )

    def assess(
        self,
        depth: SummaryDepth,
        length: SummaryLength,
        purpose: SummaryPurpose,
        draft: SummaryDraft,
    ) -> SummaryAssessment:
        blueprint = self.blueprint(depth, length, purpose)
        issues = list(self._length_issues(blueprint.length, draft))
        issues.extend(self._traceability_issues(blueprint.purpose, draft))
        advisories = tuple(self._purpose_advisories(blueprint.purpose, draft))
        score = blueprint.rubric.score({key.lower(): value for key, value in draft.ratings.items()})
        return SummaryAssessment(score=score, issues=tuple(issues), advisories=advisories)

    def checklist_report(
        self,
        depth: SummaryDepth,
        length: SummaryLength,
        purpose: SummaryPurpose,
        draft: SummaryDraft,
    ) -> ChecklistReport:
        blueprint = self.blueprint(depth, length, purpose)
        length_issues = tuple(self._length_issues(blueprint.length, draft))
        references_ok = draft.reference_count > 0
        index_ok = draft.index_pointer_count > 0
        action_items_ok = draft.action_item_count > 0
        lowered_ratings = {key.lower(): value for key, value in draft.ratings.items()}
        required_ratings = {criterion.name.lower() for criterion in blueprint.rubric.criteria}
        missing_ratings = sorted(required_ratings - set(lowered_ratings.keys()))
        statuses = [
            ChecklistItemStatus(
                item=blueprint.checklist[0],
                passed=draft.type_aligned,
                details=None
                if draft.type_aligned
                else "Confirm the selected depth/length/purpose match the deliverable audience.",
            ),
            ChecklistItemStatus(
                item=blueprint.checklist[1],
                passed=len(length_issues) == 0,
                details=" ".join(length_issues) if length_issues else None,
            ),
            ChecklistItemStatus(
                item=blueprint.checklist[2],
                passed=references_ok and index_ok,
                details=" ".join(
                    detail
                    for detail in (
                        None if references_ok else "Add at least one reference link.",
                        None if index_ok else "Include knowledge index pointers for navigation.",
                    )
                    if detail
                )
                or None,
            ),
            ChecklistItemStatus(
                item=blueprint.checklist[3],
                passed=action_items_ok,
                details=None
                if action_items_ok
                else "Summaries must surface next actions, owners, or deadlines.",
            ),
            ChecklistItemStatus(
                item=blueprint.checklist[4],
                passed=draft.qa_signoff and not missing_ratings,
                details=" ".join(
                    detail
                    for detail in (
                        None if draft.qa_signoff else "QA reviewer has not recorded a sign-off.",
                        None
                        if not missing_ratings
                        else f"Missing rubric ratings: {', '.join(missing_ratings)}."
                    )
                    if detail
                )
                or None,
            ),
        ]
        return ChecklistReport(items=tuple(statuses))

    def _length_issues(self, profile: LengthProfile, draft: SummaryDraft) -> Iterable[str]:
        if profile.max_words is not None and draft.word_count > profile.max_words:
            yield (
                f"Word count {draft.word_count} exceeds {profile.max_words} limit for {profile.label}."
            )
        if profile.min_pages is not None:
            estimated_pages = draft.word_count / _WORDS_PER_PAGE
            if estimated_pages < profile.min_pages:
                yield (
                    f"Estimated length {estimated_pages:.2f} pages below {profile.min_pages} page minimum for {profile.label}."
                )
        if profile.max_pages is not None:
            estimated_pages = draft.word_count / _WORDS_PER_PAGE
            if estimated_pages > profile.max_pages:
                yield (
                    f"Estimated length {estimated_pages:.2f} pages exceeds {profile.max_pages} page maximum for {profile.label}."
                )
        if profile.max_sentences is not None and draft.sentence_count > profile.max_sentences:
            yield (
                f"Sentence count {draft.sentence_count} exceeds {profile.max_sentences} ceiling for {profile.label}."
            )
        if profile.structure == "bulleted" and draft.bullet_count <= 0:
            yield "Condensed outlines must supply at least one bullet with impact notes."

    def _traceability_issues(self, profile: PurposeProfile, draft: SummaryDraft) -> Iterable[str]:
        if draft.reference_count <= 0:
            yield "Add at least one reference link to satisfy traceability requirements."
        if draft.index_pointer_count <= 0:
            yield "Document index pointers so the summary stays connected to the knowledge map."
        if draft.action_item_count <= 0:
            yield "Call out next actions, owners, or deadlines so the summary is actionable."
        if (
            profile is self._purpose_profiles[SummaryPurpose.TECHNICAL]
            and draft.action_item_count < 1
        ):
            yield "Technical summaries require explicit rollback or mitigation steps."

    def _purpose_advisories(self, profile: PurposeProfile, draft: SummaryDraft) -> Iterable[str]:
        if profile is self._purpose_profiles[SummaryPurpose.ACADEMIC] and draft.reference_count < 2:
            yield "Academic summaries typically cite at least two datasets or sources."
        if profile is self._purpose_profiles[SummaryPurpose.PROFESSIONAL] and draft.word_count > 300:
            yield "Professional summaries read better when capped near 300 words."
        if profile is self._purpose_profiles[SummaryPurpose.STUDY] and draft.bullet_count < 3:
            yield "Study notes should include multiple checkpoints or mnemonics."
        if profile is self._purpose_profiles[SummaryPurpose.TECHNICAL] and draft.bullet_count < 2:
            yield "Technical runbooks benefit from bulletized environment/config highlights."


__all__ = [
    "SummaryPlanner",
    "SummaryDepth",
    "SummaryLength",
    "SummaryPurpose",
    "SummaryDraft",
    "SummaryBlueprint",
    "SummaryRubric",
    "SummaryScore",
    "SummaryAssessment",
]
