"""Adaptive generator engine for Dynamic Capital content systems."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from random import Random
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicGenerator",
    "GenerationResult",
    "GeneratorContext",
    "GeneratorTemplate",
    "GeneratedArtifact",
]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tz(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _safe_weight(value: float | int) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("weight must be numeric") from exc
    if numeric <= 0.0:
        raise ValueError("weight must be positive")
    return numeric


class _SafeDict(dict[str, object]):
    """Dictionary that preserves placeholders when keys are missing."""

    def __missing__(self, key: str) -> str:  # pragma: no cover - trivial
        return "{" + key + "}"


# ---------------------------------------------------------------------------
# dataclasses
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class GeneratorTemplate:
    """Definition for a reusable generation template."""

    name: str
    template: str
    description: str | None = None
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    guardrail_tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_lower(self.name)
        self.template = _normalise_text(self.template)
        self.description = (
            _normalise_text(self.description) if self.description is not None else None
        )
        self.weight = _safe_weight(self.weight)
        self.tags = _normalise_tags(self.tags)
        self.guardrail_tags = _normalise_tags(self.guardrail_tags)
        self.metadata = _coerce_mapping(self.metadata)

    def render(self, context: "GeneratorContext") -> str:
        payload = _SafeDict(context.variables)
        payload.update(
            {
                "purpose": context.purpose,
                "audience": context.audience,
                "tone": context.tone,
                "timeframe": context.timeframe or "",
                "timestamp": context.timestamp.isoformat(),
            }
        )
        return self.template.format_map(payload)


@dataclass(slots=True)
class GeneratorContext:
    """Context for a generator request."""

    purpose: str
    audience: str
    tone: str = "neutral"
    timeframe: str | None = None
    priority: float = 0.5
    variables: Mapping[str, object] | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    guardrail_tags: tuple[str, ...] = field(default_factory=tuple)
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.purpose = _normalise_text(self.purpose)
        self.audience = _normalise_text(self.audience)
        self.tone = _normalise_lower(self.tone)
        self.timeframe = _normalise_text(self.timeframe) if self.timeframe else None
        self.priority = _clamp(float(self.priority))
        self.variables = _coerce_mapping(self.variables) or {}
        self.tags = _normalise_tags(self.tags)
        self.guardrail_tags = _normalise_tags(self.guardrail_tags)
        self.timestamp = _ensure_tz(self.timestamp)

    def as_payload(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "purpose": self.purpose,
            "audience": self.audience,
            "tone": self.tone,
            "timeframe": self.timeframe,
            "priority": self.priority,
            "tags": list(self.tags),
            "guardrail_tags": list(self.guardrail_tags),
            "timestamp": self.timestamp.isoformat(),
        }
        payload.update(self.variables)
        return payload


@dataclass(slots=True)
class GeneratedArtifact:
    """Concrete output from a generation request."""

    template: GeneratorTemplate
    content: str
    score: float
    variables: Mapping[str, object]
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.score = float(self.score)
        if self.score < 0.0:
            raise ValueError("score must be non-negative")
        self.variables = _coerce_mapping(self.variables) or {}
        self.timestamp = _ensure_tz(self.timestamp)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "template": self.template.name,
            "content": self.content,
            "score": self.score,
            "timestamp": self.timestamp.isoformat(),
            "variables": dict(self.variables),
        }


@dataclass(slots=True)
class GenerationResult:
    """Container for generated artifacts and metrics."""

    context: GeneratorContext
    artifacts: tuple[GeneratedArtifact, ...]
    metrics: Mapping[str, float]

    def __post_init__(self) -> None:
        self.metrics = dict(self.metrics)
        self.artifacts = tuple(self.artifacts)

    def best(self) -> GeneratedArtifact | None:
        if not self.artifacts:
            return None
        return max(self.artifacts, key=lambda artifact: artifact.score)

    def as_payload(self) -> MutableMapping[str, object]:
        return {
            "context": self.context.as_payload(),
            "artifacts": [artifact.as_dict() for artifact in self.artifacts],
            "metrics": dict(self.metrics),
        }


# ---------------------------------------------------------------------------
# engine
# ---------------------------------------------------------------------------


class DynamicGenerator:
    """Rank templates and produce adaptive content artifacts."""

    def __init__(
        self,
        *,
        history_limit: int = 32,
        random_source: Random | None = None,
        time_provider: callable[[], datetime] | None = None,
    ) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._templates: dict[str, GeneratorTemplate] = {}
        self._history: Deque[str] = deque(maxlen=history_limit)
        self._random = random_source or Random()
        self._time_provider = time_provider or _utcnow

    # ------------------------------------------------------------------
    # template management
    # ------------------------------------------------------------------

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._templates)

    def __contains__(self, name: str) -> bool:  # pragma: no cover - trivial
        return _normalise_lower(name) in self._templates

    def templates(self) -> tuple[GeneratorTemplate, ...]:
        return tuple(self._templates.values())

    def register(self, template: GeneratorTemplate) -> None:
        self._templates[template.name] = template

    def register_many(self, templates: Iterable[GeneratorTemplate]) -> None:
        for template in templates:
            self.register(template)

    def deregister(self, name: str) -> bool:
        return self._templates.pop(_normalise_lower(name), None) is not None

    def clear_history(self) -> None:
        self._history.clear()

    # ------------------------------------------------------------------
    # generation logic
    # ------------------------------------------------------------------

    def generate(
        self,
        context: GeneratorContext,
        *,
        sample_size: int = 1,
        allow_repeats: bool = False,
    ) -> GenerationResult:
        if sample_size <= 0:
            raise ValueError("sample_size must be positive")
        if not self._templates:
            raise ValueError("no templates registered")

        scored = [
            (template, self._score_template(template, context, allow_repeats))
            for template in self._templates.values()
        ]
        eligible = [(template, score) for template, score in scored if score > 0.0]
        eligible.sort(key=lambda item: item[1], reverse=True)

        selected: list[GeneratedArtifact] = []

        for template, score in eligible:
            if len(selected) >= sample_size:
                break
            if not allow_repeats and template.name in self._history:
                continue
            artifact = GeneratedArtifact(
                template=template,
                content=template.render(context),
                score=score,
                variables=context.as_payload(),
                timestamp=self._time_provider(),
            )
            selected.append(artifact)
            self._history.append(template.name)

        if not selected and eligible:
            # fallback to highest scored even if it was in history
            template, score = eligible[0]
            artifact = GeneratedArtifact(
                template=template,
                content=template.render(context),
                score=score,
                variables=context.as_payload(),
                timestamp=self._time_provider(),
            )
            selected.append(artifact)
            self._history.append(template.name)

        metrics = {
            "available_templates": float(len(self._templates)),
            "eligible_templates": float(len(eligible)),
            "selected_templates": float(len(selected)),
            "history_size": float(len(self._history)),
            "mean_score": (
                sum(score for _, score in eligible) / len(eligible) if eligible else 0.0
            ),
            "repeat_guard_enabled": 0.0 if allow_repeats else 1.0,
        }

        return GenerationResult(context=context, artifacts=tuple(selected), metrics=metrics)

    # ------------------------------------------------------------------
    # scoring
    # ------------------------------------------------------------------

    def _score_template(
        self,
        template: GeneratorTemplate,
        context: GeneratorContext,
        allow_repeats: bool,
    ) -> float:
        base = template.weight

        if template.guardrail_tags and set(template.guardrail_tags) & set(context.tags):
            return 0.0
        if set(template.tags) & set(context.guardrail_tags):
            return 0.0

        if template.tags:
            overlap = len(set(template.tags) & set(context.tags))
            base *= 1.0 + 0.25 * overlap

        if context.tone in template.tags:
            base *= 1.1

        base *= 0.6 + 0.8 * context.priority

        if not allow_repeats and template.name in self._history:
            base *= 0.15

        return max(base, 0.0)
