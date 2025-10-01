"""Dynamic AGS governance orchestration for the multi-LLM ensemble engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Protocol, Sequence

from dynamic_multi_ll import (
    DynamicMultiLLEngine,
    LLModelDescriptor,
    MultiLLAggregate,
    MultiLLModel,
    MultiLLPrompt,
    MultiLLResponse,
)

__all__ = [
    "AGSAdapter",
    "AGSGovernanceBriefing",
    "DynamicAGSMultiLLCoordinator",
]


def _coerce_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):  # pragma: no cover - defensive guard
        return default


class AGSAdapter(Protocol):
    """Protocol describing the adapter signature for AGS governance prompts."""

    def __call__(self, descriptor: LLModelDescriptor, prompt: MultiLLPrompt) -> MultiLLResponse:
        ...


@dataclass(slots=True)
class AGSGovernanceBriefing:
    """Briefing synthesised by the ensemble for Dynamic AGS governance."""

    briefing: str
    aggregate: MultiLLAggregate
    responses: tuple[MultiLLResponse, ...]
    tags: tuple[str, ...]
    escalations: tuple[str, ...]
    agenda: tuple[str, ...]
    metrics: Mapping[str, float]

    def to_dict(self) -> Mapping[str, object]:
        payload: MutableMapping[str, object] = {
            "briefing": self.briefing,
            "aggregate": {
                "content": self.aggregate.content,
                "confidence": self.aggregate.confidence,
                "strategy": self.aggregate.strategy,
                "supporting_models": list(self.aggregate.supporting_models),
            },
            "tags": list(self.tags),
            "escalations": list(self.escalations),
            "agenda": list(self.agenda),
            "metrics": dict(self.metrics),
        }
        return payload


class DynamicAGSMultiLLCoordinator:
    """Coordinates the ensemble for Dynamic AGS governance decision making."""

    def __init__(self, ensemble: MultiLLModel, *, engine: DynamicMultiLLEngine | None = None) -> None:
        self._engine = engine or DynamicMultiLLEngine(ensemble)

    @property
    def engine(self) -> DynamicMultiLLEngine:
        return self._engine

    def calibrate(self, feedback: Mapping[str, float]) -> MultiLLModel:
        return self._engine.calibrate(feedback)

    def build_prompt(
        self,
        *,
        governance_context: str,
        focus: Iterable[str] | None = None,
        agenda: Iterable[str] | None = None,
        language: str = "en",
    ) -> MultiLLPrompt:
        hints: list[str] = ["Provide governance-ready guidance with clear escalation paths."]
        if focus:
            hints.append(
                "Governance focus: " + ", ".join(sorted(str(item).strip() for item in focus if item))
            )
        if agenda:
            hints.append("Agenda items: " + "; ".join(str(item).strip() for item in agenda if item))
        metadata: Mapping[str, object] | None = None
        if agenda:
            metadata = {"agenda": [str(item) for item in agenda if item]}
        return MultiLLPrompt(
            task="Synthesize an AGS governance briefing.",
            context=governance_context,
            hints=hints,
            language=language,
            metadata=metadata,
        )

    def generate_briefing(
        self,
        *,
        governance_context: str,
        adapter: AGSAdapter,
        focus: Iterable[str] | None = None,
        agenda: Iterable[str] | None = None,
        language: str = "en",
    ) -> AGSGovernanceBriefing:
        prompt = self.build_prompt(
            governance_context=governance_context,
            focus=focus,
            agenda=agenda,
            language=language,
        )
        result = self._engine.generate(prompt, adapter)
        tags = self._collect_unique(result.responses, key="tags")
        escalations = self._collect_unique(result.responses, key="escalations")
        agenda_items = self._collect_unique(result.responses, key="agenda")
        aggregate_metadata = dict(result.aggregate.metadata or {})
        metrics = {
            "consensus_ratio": round(
                _coerce_float(aggregate_metadata.get("consensus_ratio"), 0.0), 4
            ),
            "weighted_confidence": round(
                _coerce_float(aggregate_metadata.get("weighted_confidence"), 0.0), 4
            ),
        }
        return AGSGovernanceBriefing(
            briefing=result.aggregate.content,
            aggregate=result.aggregate,
            responses=result.responses,
            tags=tags,
            escalations=escalations,
            agenda=agenda_items,
            metrics=metrics,
        )

    @staticmethod
    def _collect_unique(
        responses: Sequence[MultiLLResponse], *, key: str
    ) -> tuple[str, ...]:
        collected: list[str] = []
        for response in responses:
            metadata = dict(response.metadata or {})
            values = metadata.get(key)
            if values is None:
                continue
            if isinstance(values, str):
                candidates = [values]
            else:
                candidates = [str(value) for value in values]
            for candidate in candidates:
                cleaned = candidate.strip()
                if not cleaned:
                    continue
                if cleaned not in collected:
                    collected.append(cleaned)
        return tuple(collected)
