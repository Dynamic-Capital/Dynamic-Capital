"""Dhivehi language operations engine and builder utilities."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from statistics import fmean
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "DhivehiLanguageAsset",
    "DhivehiLanguageEvaluation",
    "DhivehiLanguageSnapshot",
    "DynamicDhivehiLanguage",
    "DynamicDhivehiLanguageBuilder",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = " ".join(value.split())
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _normalise_ratio(value: float) -> float:
    numeric = float(value)
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(str(value).split())
    return cleaned or None


def _coerce_unique_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = " ".join(str(value).split())
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            ordered.append(cleaned)
    return tuple(ordered)


@dataclass(slots=True)
class DhivehiLanguageAsset:
    """Represents a Dhivehi language asset under active stewardship."""

    identifier: str
    name: str
    asset_type: str
    coverage: float
    quality_score: float
    pending_reviews: tuple[str, ...] = field(default_factory=tuple)
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier).lower()
        self.name = _normalise_text(self.name)
        self.asset_type = _normalise_text(self.asset_type)
        self.coverage = _normalise_ratio(self.coverage)
        self.quality_score = _normalise_ratio(self.quality_score)
        self.pending_reviews = _coerce_unique_sequence(self.pending_reviews)
        self.notes = _coerce_unique_sequence(self.notes)

    @property
    def at_risk(self) -> bool:
        """Flag assets that are slipping on coverage or quality."""

        return self.coverage < 0.65 or self.quality_score < 0.6


@dataclass(slots=True)
class DhivehiLanguageEvaluation:
    """Structured evaluation result for a Dhivehi capability."""

    category: str
    metric: str
    score: float
    weight: float = 1.0
    comment: str | None = None

    def __post_init__(self) -> None:
        self.category = _normalise_text(self.category)
        self.metric = _normalise_text(self.metric)
        self.score = _normalise_ratio(self.score)
        self.weight = max(float(self.weight), 0.0)
        self.comment = _normalise_optional_text(self.comment)


@dataclass(slots=True)
class DhivehiLanguageSnapshot:
    """Aggregated state for Dhivehi language operations."""

    generated_at: datetime
    assets: tuple[DhivehiLanguageAsset, ...]
    average_coverage: float
    average_quality: float
    weighted_evaluation_score: float
    category_scores: Mapping[str, float]
    at_risk_assets: tuple[DhivehiLanguageAsset, ...]
    pending_actions: tuple[str, ...]

    def __post_init__(self) -> None:
        self.generated_at = self.generated_at.astimezone(timezone.utc)
        self.category_scores = dict(self.category_scores)
        self.pending_actions = _coerce_unique_sequence(self.pending_actions)


class DynamicDhivehiLanguage:
    """Track Dhivehi language assets, evaluations, and readiness metrics."""

    def __init__(self) -> None:
        self._assets: MutableMapping[str, DhivehiLanguageAsset] = {}
        self._evaluations: list[DhivehiLanguageEvaluation] = []

    # ------------------------------------------------------------------
    # asset lifecycle

    def register_asset(
        self, asset: DhivehiLanguageAsset | Mapping[str, object]
    ) -> DhivehiLanguageAsset:
        record = self._coerce_asset(asset)
        self._assets[record.identifier] = record
        return record

    def update_asset(self, identifier: str, **updates: object) -> DhivehiLanguageAsset:
        key = _normalise_text(identifier).lower()
        if key not in self._assets:
            raise KeyError(f"unknown asset '{identifier}'")
        current = self._assets[key]
        payload: dict[str, object] = {field: getattr(current, field) for field in current.__dataclass_fields__}  # type: ignore[attr-defined]
        payload.update(updates)
        updated = self._coerce_asset(payload)
        self._assets[key] = updated
        return updated

    def list_assets(self) -> tuple[DhivehiLanguageAsset, ...]:
        return tuple(self._assets.values())

    # ------------------------------------------------------------------
    # evaluation lifecycle

    def record_evaluation(
        self, evaluation: DhivehiLanguageEvaluation | Mapping[str, object]
    ) -> DhivehiLanguageEvaluation:
        record = self._coerce_evaluation(evaluation)
        self._evaluations.append(record)
        return record

    def evaluations(self) -> tuple[DhivehiLanguageEvaluation, ...]:
        return tuple(self._evaluations)

    # ------------------------------------------------------------------
    # snapshot generation

    def generate_snapshot(self) -> DhivehiLanguageSnapshot:
        assets = self.list_assets()
        average_coverage = fmean(asset.coverage for asset in assets) if assets else 0.0
        average_quality = fmean(asset.quality_score for asset in assets) if assets else 0.0

        evaluations = self.evaluations()
        total_weight = sum(evaluation.weight for evaluation in evaluations)
        weighted_score = (
            sum(evaluation.score * evaluation.weight for evaluation in evaluations) / total_weight
            if total_weight
            else 0.0
        )

        category_totals: MutableMapping[str, list[float]] = {}
        category_weights: MutableMapping[str, list[float]] = {}
        for evaluation in evaluations:
            category_totals.setdefault(evaluation.category, []).append(evaluation.score * evaluation.weight)
            category_weights.setdefault(evaluation.category, []).append(evaluation.weight)

        category_scores: dict[str, float] = {}
        for category, totals in category_totals.items():
            weights = category_weights[category]
            total = sum(totals)
            weight = sum(weights)
            category_scores[category] = total / weight if weight else 0.0

        at_risk_assets = tuple(asset for asset in assets if asset.at_risk)

        pending_actions = self._collect_pending_actions(assets, evaluations)

        return DhivehiLanguageSnapshot(
            generated_at=_utcnow(),
            assets=assets,
            average_coverage=average_coverage,
            average_quality=average_quality,
            weighted_evaluation_score=weighted_score,
            category_scores=category_scores,
            at_risk_assets=at_risk_assets,
            pending_actions=pending_actions,
        )

    # ------------------------------------------------------------------
    # internal helpers

    def _collect_pending_actions(
        self,
        assets: Sequence[DhivehiLanguageAsset],
        evaluations: Sequence[DhivehiLanguageEvaluation],
    ) -> tuple[str, ...]:
        ordered: list[str] = []
        seen: set[str] = set()

        for asset in assets:
            for entry in asset.pending_reviews:
                lowered = entry.lower()
                if lowered not in seen:
                    seen.add(lowered)
                    ordered.append(entry)

        for evaluation in evaluations:
            if evaluation.comment:
                lowered = evaluation.comment.lower()
                if lowered not in seen:
                    seen.add(lowered)
                    ordered.append(evaluation.comment)

        return tuple(ordered)

    def _coerce_asset(
        self, asset: DhivehiLanguageAsset | Mapping[str, object]
    ) -> DhivehiLanguageAsset:
        if isinstance(asset, DhivehiLanguageAsset):
            return asset
        fields = {
            "identifier": asset.get("identifier"),
            "name": asset.get("name"),
            "asset_type": asset.get("asset_type"),
            "coverage": asset.get("coverage", 0.0),
            "quality_score": asset.get("quality_score", 0.0),
            "pending_reviews": asset.get("pending_reviews"),
            "notes": asset.get("notes"),
        }
        return DhivehiLanguageAsset(**fields)  # type: ignore[arg-type]

    def _coerce_evaluation(
        self, evaluation: DhivehiLanguageEvaluation | Mapping[str, object]
    ) -> DhivehiLanguageEvaluation:
        if isinstance(evaluation, DhivehiLanguageEvaluation):
            return evaluation
        fields = {
            "category": evaluation.get("category"),
            "metric": evaluation.get("metric"),
            "score": evaluation.get("score", 0.0),
            "weight": evaluation.get("weight", 1.0),
            "comment": evaluation.get("comment"),
        }
        return DhivehiLanguageEvaluation(**fields)  # type: ignore[arg-type]


class DynamicDhivehiLanguageBuilder:
    """Fluent builder for configuring Dhivehi language engines."""

    def __init__(self) -> None:
        self._assets: list[DhivehiLanguageAsset] = []
        self._evaluations: list[DhivehiLanguageEvaluation] = []

    def with_default_configuration(self) -> "DynamicDhivehiLanguageBuilder":
        """Seed the builder with opinionated defaults covering core assets."""

        defaults = [
            DhivehiLanguageAsset(
                identifier="translation-memory",
                name="Support Translation Memory",
                asset_type="translation",
                coverage=0.72,
                quality_score=0.78,
                pending_reviews=("Backfill fintech repayment templates",),
            ),
            DhivehiLanguageAsset(
                identifier="glossary",
                name="Dhivehi Financial Glossary",
                asset_type="glossary",
                coverage=0.81,
                quality_score=0.84,
                pending_reviews=("Review new AML terminology",),
            ),
            DhivehiLanguageAsset(
                identifier="transliteration",
                name="Thaana Transliteration Rules",
                asset_type="input",
                coverage=0.9,
                quality_score=0.88,
            ),
            DhivehiLanguageAsset(
                identifier="speech",
                name="Hotline Speech Corpus",
                asset_type="speech",
                coverage=0.6,
                quality_score=0.55,
                pending_reviews=("Label Q3 hotline backlog", "Expand accent coverage"),
            ),
        ]
        evaluations = [
            DhivehiLanguageEvaluation(
                category="translation",
                metric="BLEU",
                score=0.71,
                weight=1.2,
                comment="Prioritise domain-specific sentence pairs",
            ),
            DhivehiLanguageEvaluation(
                category="glossary",
                metric="Term Coverage",
                score=0.82,
            ),
            DhivehiLanguageEvaluation(
                category="transliteration",
                metric="Accuracy",
                score=0.9,
            ),
        ]

        self._assets.extend(defaults)
        self._evaluations.extend(evaluations)
        return self

    def add_asset(
        self, asset: DhivehiLanguageAsset | Mapping[str, object]
    ) -> "DynamicDhivehiLanguageBuilder":
        self._assets.append(self._coerce_asset(asset))
        return self

    def add_evaluation(
        self, evaluation: DhivehiLanguageEvaluation | Mapping[str, object]
    ) -> "DynamicDhivehiLanguageBuilder":
        self._evaluations.append(self._coerce_evaluation(evaluation))
        return self

    def build(self) -> DynamicDhivehiLanguage:
        engine = DynamicDhivehiLanguage()
        for asset in self._assets:
            engine.register_asset(replace(asset))
        for evaluation in self._evaluations:
            engine.record_evaluation(replace(evaluation))
        return engine

    def _coerce_asset(
        self, asset: DhivehiLanguageAsset | Mapping[str, object]
    ) -> DhivehiLanguageAsset:
        if isinstance(asset, DhivehiLanguageAsset):
            return asset
        return DynamicDhivehiLanguage()._coerce_asset(asset)

    def _coerce_evaluation(
        self, evaluation: DhivehiLanguageEvaluation | Mapping[str, object]
    ) -> DhivehiLanguageEvaluation:
        if isinstance(evaluation, DhivehiLanguageEvaluation):
            return evaluation
        return DynamicDhivehiLanguage()._coerce_evaluation(evaluation)
