"""Dynamic knowledge library curation primitives."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LibraryAsset",
    "LibraryContext",
    "LibraryDigest",
    "DynamicLibrary",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_title(value: str) -> str:
    return _normalise_text(value)


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _weighted_average(values: Sequence[float], weights: Sequence[float]) -> float:
    if not values:
        raise ValueError("values must not be empty")
    total_weight = sum(weights)
    if total_weight <= 0:
        return fmean(values)
    return sum(value * weight for value, weight in zip(values, weights)) / total_weight


def _top_items(counter: Counter[str], *, limit: int) -> tuple[str, ...]:
    if limit <= 0:
        return ()
    return tuple(item for item, _ in counter.most_common(limit))


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class LibraryAsset:
    """Single knowledge asset tracked inside the dynamic library."""

    title: str
    summary: str
    category: str
    importance: float = 0.5
    freshness: float = 0.5
    usage_frequency: float = 0.5
    confidence: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    authors: tuple[str, ...] = field(default_factory=tuple)
    source: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.title = _normalise_title(self.title)
        self.summary = _normalise_text(self.summary)
        self.category = _normalise_lower(self.category)
        self.importance = _clamp(float(self.importance))
        self.freshness = _clamp(float(self.freshness))
        self.usage_frequency = _clamp(float(self.usage_frequency))
        self.confidence = _clamp(float(self.confidence))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.authors = _normalise_tuple(self.authors)
        self.source = _normalise_optional_text(self.source)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def is_aging(self) -> bool:
        return self.freshness < 0.4

    @property
    def is_low_usage(self) -> bool:
        return self.usage_frequency < 0.3


@dataclass(slots=True)
class LibraryContext:
    """Context describing the portfolio and consumption of the library."""

    portfolio: str
    review_cadence: str
    refresh_pressure: float
    adoption_pressure: float
    operational_load: float
    collaboration_level: float
    focus_topics: tuple[str, ...] = field(default_factory=tuple)
    retiring_themes: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 3

    def __post_init__(self) -> None:
        self.portfolio = _normalise_text(self.portfolio)
        self.review_cadence = _normalise_text(self.review_cadence)
        self.refresh_pressure = _clamp(float(self.refresh_pressure))
        self.adoption_pressure = _clamp(float(self.adoption_pressure))
        self.operational_load = _clamp(float(self.operational_load))
        self.collaboration_level = _clamp(float(self.collaboration_level))
        self.focus_topics = _normalise_tuple(self.focus_topics)
        self.retiring_themes = _normalise_tuple(self.retiring_themes)
        self.highlight_limit = max(int(self.highlight_limit), 0)

    @property
    def is_overloaded(self) -> bool:
        return self.operational_load >= 0.7

    @property
    def needs_refresh(self) -> bool:
        return self.refresh_pressure >= 0.6 or self.adoption_pressure >= 0.6

    @property
    def is_highly_collaborative(self) -> bool:
        return self.collaboration_level >= 0.6


@dataclass(slots=True)
class LibraryDigest:
    """Structured digest representing the state of the dynamic library."""

    catalogue_size: int
    curation_focus: str
    stability_score: float
    refresh_priority: float
    highlight_topics: tuple[str, ...]
    maintenance_actions: tuple[str, ...]
    share_prompts: tuple[str, ...]
    risk_flags: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "catalogue_size": self.catalogue_size,
            "curation_focus": self.curation_focus,
            "stability_score": self.stability_score,
            "refresh_priority": self.refresh_priority,
            "highlight_topics": list(self.highlight_topics),
            "maintenance_actions": list(self.maintenance_actions),
            "share_prompts": list(self.share_prompts),
            "risk_flags": list(self.risk_flags),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# dynamic library engine


class DynamicLibrary:
    """Aggregate knowledge assets and produce a curated digest."""

    def __init__(self, *, history: int = 200) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._assets: Deque[LibraryAsset] = deque(maxlen=history)

    # ------------------------------------------------------------------ intake
    def capture(self, asset: LibraryAsset | Mapping[str, object]) -> LibraryAsset:
        resolved = self._coerce_asset(asset)
        self._assets.append(resolved)
        return resolved

    def extend(self, assets: Iterable[LibraryAsset | Mapping[str, object]]) -> None:
        for asset in assets:
            self.capture(asset)

    def reset(self) -> None:
        self._assets.clear()

    def _coerce_asset(self, asset: LibraryAsset | Mapping[str, object]) -> LibraryAsset:
        if isinstance(asset, LibraryAsset):
            return asset
        if isinstance(asset, Mapping):
            payload: MutableMapping[str, object] = dict(asset)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return LibraryAsset(**payload)  # type: ignore[arg-type]
        raise TypeError("asset must be LibraryAsset or mapping")

    # -------------------------------------------------------------- diagnostics
    def catalogue_size(self) -> int:
        return len(self._assets)

    def snapshot(self) -> tuple[LibraryAsset, ...]:
        return tuple(self._assets)

    # ---------------------------------------------------------------- reporting
    def generate_digest(
        self, context: LibraryContext, *, limit: int | None = None
    ) -> LibraryDigest:
        if limit is not None and limit <= 0:
            raise ValueError("limit must be positive")

        if not self._assets:
            raise RuntimeError("no assets captured")

        assets: Sequence[LibraryAsset]
        if limit is not None:
            assets = tuple(self._assets)[-limit:]
        else:
            assets = tuple(self._assets)

        catalogue_size = len(assets)
        weights = [asset.weight or 0.0 for asset in assets]

        importance_scores = [asset.importance for asset in assets]
        freshness_scores = [asset.freshness for asset in assets]
        usage_scores = [asset.usage_frequency for asset in assets]
        confidence_scores = [asset.confidence for asset in assets]

        average_importance = _weighted_average(importance_scores, weights)
        average_freshness = _weighted_average(freshness_scores, weights)
        average_usage = _weighted_average(usage_scores, weights)
        average_confidence = _weighted_average(confidence_scores, weights)

        stability_score = _clamp(
            1.0
            - 0.35 * context.refresh_pressure
            - 0.25 * (1.0 - average_confidence)
            - 0.2 * context.operational_load
        )

        refresh_priority = _clamp(
            0.5 * (1.0 - average_freshness)
            + 0.3 * context.refresh_pressure
            + 0.2 * average_importance
        )

        utilisation_health = _clamp(
            0.6 * average_usage + 0.4 * context.adoption_pressure
        )

        category_counter: Counter[str] = Counter(
            asset.category for asset in assets if asset.category
        )
        tag_counter: Counter[str] = Counter(
            tag for asset in assets for tag in asset.tags if tag
        )

        highlight_limit = context.highlight_limit or 3
        highlight_topics = _top_items(category_counter, limit=highlight_limit)
        if len(highlight_topics) < highlight_limit:
            remaining = highlight_limit - len(highlight_topics)
            highlight_topics = highlight_topics + _top_items(tag_counter, limit=remaining)

        if context.focus_topics and highlight_limit:
            for topic in context.focus_topics:
                if topic not in highlight_topics and len(highlight_topics) < highlight_limit:
                    highlight_topics = highlight_topics + (topic,)

        maintenance_actions: list[str] = []
        if refresh_priority >= 0.55:
            maintenance_actions.append(
                "Schedule refresh cycle for aging strategic assets."
            )
        if any(asset.is_low_usage for asset in assets) and utilisation_health < 0.5:
            maintenance_actions.append(
                "Promote underused assets during upcoming knowledge share."
            )
        if context.retiring_themes:
            retiring = ", ".join(context.retiring_themes)
            maintenance_actions.append(
                f"Refresh or reframe materials tied to retiring themes: {retiring}."
            )
        if not maintenance_actions:
            maintenance_actions.append("Library steady — maintain monitoring cadence.")

        share_prompts: list[str] = []
        if context.is_highly_collaborative:
            share_prompts.append(
                "Host a collaborative review to surface emerging insights."
            )
        if average_importance >= 0.7:
            share_prompts.append(
                "Circulate a highlight reel of mission-critical knowledge assets."
            )
        if average_confidence < 0.55:
            share_prompts.append(
                "Pair subject matter experts with stewards to raise documentation confidence."
            )
        if not share_prompts:
            share_prompts.append("Publish weekly digest to sustain engagement.")

        risk_flags: list[str] = []
        if any(asset.is_aging for asset in assets):
            risk_flags.append("Aging material detected across the catalogue.")
        if context.is_overloaded:
            risk_flags.append("Operational load may limit curation capacity.")
        if utilisation_health < 0.4:
            risk_flags.append("Knowledge adoption is trailing expectations.")
        if not risk_flags:
            risk_flags.append("No acute risks detected — continue routine governance.")

        curation_focus = (
            "Stabilise adoption" if utilisation_health < 0.5 else "Amplify momentum"
        )
        if refresh_priority > 0.65:
            curation_focus = "Refresh critical canon"

        narrative = (
            "Library snapshot: {size} curated assets with stability {stability:.2f}. "
            "Refresh priority sits at {refresh:.2f} while utilisation health is {usage:.2f}."
        ).format(
            size=catalogue_size,
            stability=stability_score,
            refresh=refresh_priority,
            usage=utilisation_health,
        )

        return LibraryDigest(
            catalogue_size=catalogue_size,
            curation_focus=curation_focus,
            stability_score=stability_score,
            refresh_priority=refresh_priority,
            highlight_topics=highlight_topics,
            maintenance_actions=tuple(maintenance_actions),
            share_prompts=tuple(share_prompts),
            risk_flags=tuple(risk_flags),
            narrative=narrative,
        )
