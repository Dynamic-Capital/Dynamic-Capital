"""Lightweight orchestration utilities for coordinating multiple LLMs."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Callable, Iterable, Mapping, Sequence

__all__ = [
    "LLModelDescriptor",
    "MultiLLModel",
    "MultiLLPrompt",
    "MultiLLResponse",
    "MultiLLAggregate",
    "MultiLLResult",
    "DynamicMultiLLEngine",
    "AggregateBuilder",
    "Adapter",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, float(value)))


def _ensure_text(value: str, *, field: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError(f"{field} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field} must not be empty")
    return cleaned


def _ensure_lower(value: str, *, field: str) -> str:
    return _ensure_text(value, field=field).lower()


def _ensure_tuple(values: Iterable[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for entry in values:
        cleaned = str(entry).strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _ensure_mapping(mapping: Mapping[str, object] | None, *, field: str) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError(f"{field} must be a mapping if provided")
    return dict(mapping)


@dataclass(slots=True)
class LLModelDescriptor:
    """Static description of an underlying LLM endpoint."""

    name: str
    provider: str
    weight: float = 1.0
    temperature: float = 0.7
    max_tokens: int = 1024
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _ensure_text(self.name, field="name")
        self.provider = _ensure_lower(self.provider, field="provider")
        if self.weight <= 0.0:
            raise ValueError("weight must be positive")
        self.weight = float(self.weight)
        self.temperature = _clamp(self.temperature, lower=0.0, upper=2.0)
        if self.max_tokens <= 0:
            raise ValueError("max_tokens must be positive")
        self.max_tokens = int(self.max_tokens)
        self.metadata = _ensure_mapping(self.metadata, field="metadata")


@dataclass(slots=True)
class MultiLLModel:
    """Describes the ensemble of language models."""

    models: Sequence[LLModelDescriptor]
    aggregation_strategy: str = "weighted_confidence"
    fallback_language: str = "en"
    consensus_threshold: float = 0.6

    def __post_init__(self) -> None:
        if not self.models:
            raise ValueError("at least one model descriptor is required")
        self.models = tuple(self.models)
        self.aggregation_strategy = _ensure_lower(
            self.aggregation_strategy, field="aggregation_strategy"
        )
        self.fallback_language = _ensure_lower(
            self.fallback_language, field="fallback_language"
        )
        self.consensus_threshold = _clamp(self.consensus_threshold)

    @property
    def model_names(self) -> tuple[str, ...]:
        return tuple(descriptor.name for descriptor in self.models)

    def descriptor_for(self, name: str) -> LLModelDescriptor:
        lookup = {descriptor.name: descriptor for descriptor in self.models}
        try:
            return lookup[name]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown model: {name}") from exc

    def reweighted(self, adjustments: Mapping[str, float]) -> "MultiLLModel":
        if not adjustments:
            return self
        updated: list[LLModelDescriptor] = []
        for descriptor in self.models:
            delta = float(adjustments.get(descriptor.name, 0.0))
            new_weight = max(0.1, descriptor.weight + delta)
            updated.append(replace(descriptor, weight=new_weight))
        return MultiLLModel(
            updated,
            aggregation_strategy=self.aggregation_strategy,
            fallback_language=self.fallback_language,
            consensus_threshold=self.consensus_threshold,
        )


@dataclass(slots=True)
class MultiLLPrompt:
    """Prompt shared across the ensemble."""

    task: str
    context: str | None = None
    language: str = "en"
    hints: Iterable[str] | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.task = _ensure_text(self.task, field="task")
        self.context = self.context.strip() if isinstance(self.context, str) else None
        self.language = _ensure_lower(self.language, field="language")
        self.hints = _ensure_tuple(self.hints)
        self.metadata = _ensure_mapping(self.metadata, field="metadata")


@dataclass(slots=True)
class MultiLLResponse:
    """Response produced by an underlying model."""

    model_name: str
    provider: str
    content: str
    confidence: float = 0.5
    latency: float | None = None
    tokens_used: int | None = None
    annotations: Iterable[str] | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.model_name = _ensure_text(self.model_name, field="model_name")
        self.provider = _ensure_lower(self.provider, field="provider")
        self.content = _ensure_text(self.content, field="content")
        self.confidence = _clamp(self.confidence)
        if self.latency is not None:
            latency = float(self.latency)
            if latency < 0.0:
                raise ValueError("latency must be non-negative")
            self.latency = latency
        if self.tokens_used is not None:
            tokens_used = int(self.tokens_used)
            if tokens_used <= 0:
                raise ValueError("tokens_used must be positive")
            self.tokens_used = tokens_used
        self.annotations = _ensure_tuple(self.annotations)
        self.metadata = _ensure_mapping(self.metadata, field="metadata")


@dataclass(slots=True)
class MultiLLAggregate:
    """Aggregate interpretation of the ensemble responses."""

    content: str
    confidence: float
    strategy: str
    supporting_models: Iterable[str]
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.content = _ensure_text(self.content, field="content")
        self.confidence = _clamp(self.confidence)
        self.strategy = _ensure_lower(self.strategy, field="strategy")
        self.supporting_models = tuple(dict.fromkeys(_ensure_tuple(self.supporting_models)))
        self.metadata = _ensure_mapping(self.metadata, field="metadata")


@dataclass(slots=True)
class MultiLLResult:
    """Full record for an ensemble generation cycle."""

    prompt: MultiLLPrompt
    responses: tuple[MultiLLResponse, ...]
    aggregate: MultiLLAggregate
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.responses = tuple(self.responses)
        if not self.responses:
            raise ValueError("at least one response is required")
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:  # pragma: no cover - defensive guard
            self.timestamp = self.timestamp.astimezone(timezone.utc)

    @property
    def supporting_models(self) -> tuple[str, ...]:
        return self.aggregate.supporting_models


AggregateBuilder = Callable[[Sequence[MultiLLResponse], MultiLLModel], MultiLLAggregate]
Adapter = Callable[[LLModelDescriptor, MultiLLPrompt], MultiLLResponse]


class DynamicMultiLLEngine:
    """Coordinates multiple LLMs to produce a single narrative."""

    def __init__(self, model: MultiLLModel, *, aggregator: AggregateBuilder | None = None) -> None:
        self._model = model
        self._aggregator = aggregator or self._default_aggregator

    @property
    def model(self) -> MultiLLModel:
        return self._model

    def calibrate(self, feedback: Mapping[str, float]) -> MultiLLModel:
        """Adjust the stored ensemble weights using external feedback."""

        self._model = self._model.reweighted(feedback)
        return self._model

    def aggregate(self, responses: Sequence[MultiLLResponse]) -> MultiLLAggregate:
        return self._aggregator(tuple(responses), self._model)

    def generate(self, prompt: MultiLLPrompt, adapter: Adapter) -> MultiLLResult:
        if not callable(adapter):  # pragma: no cover - defensive guard
            raise TypeError("adapter must be callable")

        responses: list[MultiLLResponse] = []
        for descriptor in self._model.models:
            response = adapter(descriptor, prompt)
            if not isinstance(response, MultiLLResponse):
                raise TypeError("adapter must return MultiLLResponse instances")
            responses.append(response)

        aggregate = self.aggregate(responses)
        return MultiLLResult(prompt=prompt, responses=tuple(responses), aggregate=aggregate)

    # ------------------------------------------------------------------
    # default aggregation strategy

    def _default_aggregator(
        self, responses: Sequence[MultiLLResponse], model: MultiLLModel
    ) -> MultiLLAggregate:
        if not responses:
            return MultiLLAggregate(
                content="No responses available.",
                confidence=0.0,
                strategy="empty",
                supporting_models=(),
                metadata={"reason": "no responses"},
            )

        weights = {
            descriptor.name: max(float(descriptor.weight), 0.0) or 1.0
            for descriptor in model.models
        }

        total_weight = sum(weights.get(response.model_name, 1.0) for response in responses)
        if total_weight <= 0.0:  # pragma: no cover - defensive guard
            total_weight = float(len(responses)) or 1.0

        weighted_confidence = sum(
            weights.get(response.model_name, 1.0) * _clamp(response.confidence)
            for response in responses
        ) / total_weight

        grouped: dict[str, dict[str, object]] = {}
        for index, response in enumerate(responses):
            text = response.content.strip()
            entry = grouped.setdefault(
                text,
                {
                    "weight": 0.0,
                    "models": [],
                    "first_index": index,
                    "text": text,
                },
            )
            weight = weights.get(response.model_name, 1.0) * _clamp(response.confidence)
            entry["weight"] = float(entry["weight"]) + weight
            entry["models"].append(response)

        ordered = sorted(
            grouped.values(),
            key=lambda item: (-float(item["weight"]), int(item["first_index"])),
        )

        best = ordered[0]
        consensus_weight = float(best["weight"])
        consensus_ratio = consensus_weight / total_weight

        if consensus_ratio >= model.consensus_threshold:
            strategy = "consensus"
            aggregate_content = str(best["text"])
            supporting = tuple(response.model_name for response in best["models"])
            confidence = max(weighted_confidence, consensus_ratio)
        else:
            strategy = "blended"
            snippets: list[str] = []
            supporting_names: list[str] = []
            for entry in ordered[:3]:
                models = [response.model_name for response in entry["models"]]
                for name in models:
                    if name not in supporting_names:
                        supporting_names.append(name)
                snippet = str(entry["text"])
                snippet_line = snippet.replace("\n", " ").strip()
                snippets.append(f"- {snippet_line} (via {', '.join(models)})")
            aggregate_content = "\n".join(snippets)
            confidence = (weighted_confidence + consensus_ratio) / 2.0
            supporting = tuple(supporting_names)

        confidence = _clamp(confidence)

        metadata = {
            "consensus_ratio": round(consensus_ratio, 3),
            "weighted_confidence": round(weighted_confidence, 3),
            "aggregation_strategy": model.aggregation_strategy,
            "responses": [
                {
                    "model": response.model_name,
                    "provider": response.provider,
                    "confidence": round(_clamp(response.confidence), 3),
                    "weight": round(weights.get(response.model_name, 1.0), 3),
                }
                for response in responses
            ],
        }

        return MultiLLAggregate(
            content=aggregate_content,
            confidence=confidence,
            strategy=strategy,
            supporting_models=supporting,
            metadata=metadata,
        )
