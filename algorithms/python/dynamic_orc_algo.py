"""Operational readiness coordination utilities for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ORCStatus",
    "ORCContext",
    "ORCRequirement",
    "ORCCategorySummary",
    "ORCReport",
    "DynamicORCAlgo",
]


class ORCStatus(Enum):
    """Lifecycle states that readiness requirements can move through."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    AT_RISK = "at_risk"
    BLOCKED = "blocked"
    COMPLETE = "complete"
    VERIFIED = "verified"

    @property
    def is_flagged(self) -> bool:
        """Return ``True`` when the status should trigger escalation."""

        return self in {ORCStatus.AT_RISK, ORCStatus.BLOCKED}


_DEFAULT_STATUS_WEIGHTS: Mapping[ORCStatus, float] = {
    ORCStatus.NOT_STARTED: 0.0,
    ORCStatus.BLOCKED: 0.1,
    ORCStatus.AT_RISK: 0.4,
    ORCStatus.IN_PROGRESS: 0.65,
    ORCStatus.COMPLETE: 0.85,
    ORCStatus.VERIFIED: 1.0,
}


@dataclass(slots=True)
class ORCContext:
    """Contextual information used to tailor readiness insights."""

    initiative: str
    scope: str
    stakeholders: Sequence[str] = field(default_factory=tuple)
    objectives: Sequence[str] = field(default_factory=tuple)
    go_live_date: str | None = None
    risk_appetite: str | None = None
    dependencies: Sequence[str] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)

    def keywords(self) -> frozenset[str]:
        """Return a keyword set for heuristics such as risk surfacing."""

        terms: list[str] = [self.initiative, self.scope]
        terms.extend(self.stakeholders)
        terms.extend(self.objectives)
        if self.go_live_date:
            terms.append(self.go_live_date)
        if self.risk_appetite:
            terms.append(self.risk_appetite)
        terms.extend(self.dependencies)
        terms.extend(map(str, self.metadata.keys()))
        return frozenset(term.lower() for term in terms if term)


@dataclass(slots=True)
class ORCRequirement:
    """Represents a readiness requirement that must be satisfied."""

    identifier: str
    title: str
    category: str
    description: str
    status: ORCStatus = ORCStatus.NOT_STARTED
    owner: str | None = None
    dependencies: Sequence[str] = field(default_factory=tuple)
    weight: float = 1.0
    notes: list[str] = field(default_factory=list)
    evidence: Sequence[str] = field(default_factory=tuple)
    risk: str | None = None

    def __post_init__(self) -> None:
        if not self.identifier:
            raise ValueError("identifier is required")
        if not self.title:
            raise ValueError("title is required")
        if not self.category:
            raise ValueError("category is required")
        if not self.description:
            raise ValueError("description is required")
        self.identifier = self.identifier.strip()
        self.category = self.category.strip().lower().replace(" ", "_")
        self.weight = max(float(self.weight), 0.0)
        if isinstance(self.status, str):  # pragma: no cover - defensive for dynamic inputs
            self.status = ORCStatus(self.status)

    def progress(self, *, status_weights: Mapping[ORCStatus, float] | None = None) -> float:
        """Return weighted progress based on the current status."""

        weights = status_weights or _DEFAULT_STATUS_WEIGHTS
        return self.weight * weights.get(self.status, 0.0)

    def missing_dependencies(self, registry: Mapping[str, "ORCRequirement"]) -> tuple[str, ...]:
        """Return identifiers for dependencies that are not yet verified."""

        gaps: list[str] = []
        for dependency in self.dependencies:
            dependency = dependency.strip()
            if not dependency:
                continue
            requirement = registry.get(dependency)
            if requirement is None or requirement.status not in {ORCStatus.COMPLETE, ORCStatus.VERIFIED}:
                gaps.append(dependency)
        return tuple(gaps)

    def to_dict(self) -> Mapping[str, object]:
        """Return a serialisable representation of the requirement."""

        return {
            "id": self.identifier,
            "title": self.title,
            "category": self.category,
            "description": self.description,
            "status": self.status.value,
            "owner": self.owner,
            "dependencies": list(self.dependencies),
            "weight": self.weight,
            "notes": list(self.notes),
            "evidence": list(self.evidence),
            "risk": self.risk,
        }


@dataclass(slots=True)
class ORCCategorySummary:
    """Aggregated readiness metrics for a requirement category."""

    name: str
    score: float
    total_weight: float
    requirement_ids: tuple[str, ...]
    status_counts: Mapping[ORCStatus, int]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "score": self.score,
            "total_weight": self.total_weight,
            "requirements": list(self.requirement_ids),
            "status_counts": {status.value: count for status, count in self.status_counts.items()},
        }


@dataclass(slots=True)
class ORCReport:
    """Snapshot of readiness progress across all requirements."""

    context: ORCContext | None
    overall_score: float
    readiness_level: str
    category_summaries: tuple[ORCCategorySummary, ...]
    flagged_requirements: tuple[ORCRequirement, ...]
    dependency_gaps: Mapping[str, tuple[str, ...]]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "context": self.context.keywords() if self.context else None,
            "overall_score": self.overall_score,
            "readiness_level": self.readiness_level,
            "categories": [summary.to_dict() for summary in self.category_summaries],
            "flagged": [requirement.to_dict() for requirement in self.flagged_requirements],
            "dependency_gaps": {
                identifier: list(gaps) for identifier, gaps in self.dependency_gaps.items()
            },
        }


class DynamicORCAlgo:
    """Compute readiness progress and surface operational risks."""

    def __init__(
        self,
        *,
        categories: Mapping[str, float] | None = None,
        status_weights: Mapping[ORCStatus, float] | None = None,
    ) -> None:
        self.categories: Dict[str, float] = {
            key.strip().lower().replace(" ", "_"): max(float(value), 0.0)
            for key, value in (categories or {}).items()
            if key
        }
        self.status_weights: Mapping[ORCStatus, float] = status_weights or _DEFAULT_STATUS_WEIGHTS
        self._requirements: Dict[str, ORCRequirement] = {}

    # ------------------------------------------------------------------ mutation
    def register(self, requirement: ORCRequirement) -> None:
        """Register a requirement, replacing any existing definition."""

        self._requirements[requirement.identifier] = requirement
        if requirement.category not in self.categories:
            self.categories[requirement.category] = requirement.weight or 1.0

    def extend(self, requirements: Iterable[ORCRequirement]) -> None:
        """Register multiple requirements in one call."""

        for requirement in requirements:
            self.register(requirement)

    def update_status(
        self, identifier: str, status: ORCStatus | str, *, note: str | None = None
    ) -> None:
        """Update the status (and optionally notes) for a requirement."""

        if identifier not in self._requirements:
            raise KeyError(f"Unknown requirement: {identifier}")
        requirement = self._requirements[identifier]
        if isinstance(status, str):
            original_status = status
            normalised_status = status.strip().lower()
            try:
                status = ORCStatus(normalised_status)
            except ValueError as error:  # pragma: no cover - defensive validation
                raise ValueError(
                    f"Invalid ORCStatus value: {original_status!r}"
                ) from error
        requirement.status = status
        if note:
            requirement.notes.append(note)

    # ---------------------------------------------------------------- calculations
    def _determine_readiness_level(
        self, score: float, *, flagged_count: int, dependency_gaps: int
    ) -> str:
        if not self._requirements:
            return "insufficient_data"
        if dependency_gaps > 0 or flagged_count > 0:
            if score >= 0.8:
                return "stabilisation_required"
            if score >= 0.6:
                return "escalate_blockers"
            return "critical_path_risk"
        if score >= 0.92:
            return "launch_ready"
        if score >= 0.8:
            return "stabilisation_required"
        if score >= 0.6:
            return "needs_acceleration"
        return "critical_path_risk"

    def build_report(self, *, context: ORCContext | None = None) -> ORCReport:
        """Return an :class:`ORCReport` summarising readiness progress."""

        category_totals: MutableMapping[str, float] = {key: 0.0 for key in self.categories}
        category_progress: MutableMapping[str, float] = {key: 0.0 for key in self.categories}
        status_counts: Dict[str, Dict[ORCStatus, int]] = {
            key: {status: 0 for status in ORCStatus} for key in self.categories
        }
        flagged: list[ORCRequirement] = []
        dependency_gaps: Dict[str, tuple[str, ...]] = {}

        for requirement in self._requirements.values():
            category = requirement.category
            if category not in category_totals:
                category_totals[category] = 0.0
                category_progress[category] = 0.0
                status_counts[category] = {status: 0 for status in ORCStatus}
            category_totals[category] += requirement.weight
            category_progress[category] += requirement.progress(status_weights=self.status_weights)
            status_counts[category][requirement.status] += 1

            if requirement.status.is_flagged:
                flagged.append(requirement)
            missing = requirement.missing_dependencies(self._requirements)
            if missing:
                dependency_gaps[requirement.identifier] = missing
                if requirement not in flagged:
                    flagged.append(requirement)

        category_summaries: list[ORCCategorySummary] = []
        cumulative_weight = 0.0
        cumulative_progress = 0.0

        for category, total_weight in category_totals.items():
            if total_weight <= 0:
                score = 0.0
            else:
                score = min(1.0, category_progress[category] / total_weight)
            cumulative_weight += total_weight
            cumulative_progress += score * total_weight
            category_summaries.append(
                ORCCategorySummary(
                    name=category,
                    score=score,
                    total_weight=total_weight,
                    requirement_ids=tuple(
                        requirement.identifier
                        for requirement in self._requirements.values()
                        if requirement.category == category
                    ),
                    status_counts=status_counts[category],
                )
            )

        if cumulative_weight <= 0:
            overall_score = 0.0
        else:
            overall_score = min(1.0, cumulative_progress / cumulative_weight)

        readiness_level = self._determine_readiness_level(
            overall_score, flagged_count=len(flagged), dependency_gaps=len(dependency_gaps)
        )

        category_summaries.sort(key=lambda summary: summary.name)
        flagged.sort(key=lambda requirement: requirement.identifier)

        return ORCReport(
            context=context,
            overall_score=round(overall_score, 4),
            readiness_level=readiness_level,
            category_summaries=tuple(category_summaries),
            flagged_requirements=tuple(flagged),
            dependency_gaps=dependency_gaps,
        )

    # --------------------------------------------------------------- public utils
    def requirements(self) -> tuple[ORCRequirement, ...]:
        """Return the registered requirements in registration order."""

        return tuple(self._requirements.values())

    def category_matrix(self) -> Mapping[str, tuple[ORCRequirement, ...]]:
        """Return requirements grouped by their category."""

        grouped: Dict[str, list[ORCRequirement]] = {}
        for requirement in self._requirements.values():
            grouped.setdefault(requirement.category, []).append(requirement)
        return {key: tuple(values) for key, values in grouped.items()}
