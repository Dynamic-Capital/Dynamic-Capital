"""Dynamic AGI domain orchestration for the multi-LLM ensemble engine."""

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

from .self_improvement import ImprovementPlan

__all__ = [
    "AGIAdapter",
    "EnsembleAGIPlan",
    "DynamicAGIMultiLLCoordinator",
]


class AGIAdapter(Protocol):
    """Protocol describing the adapter signature for AGI ensemble prompts."""

    def __call__(self, descriptor: LLModelDescriptor, prompt: MultiLLPrompt) -> MultiLLResponse:
        ...


@dataclass(slots=True)
class EnsembleAGIPlan:
    """Aggregate improvement plan synthesised by the ensemble."""

    plan: ImprovementPlan
    aggregate: MultiLLAggregate
    responses: tuple[MultiLLResponse, ...]

    def to_dict(self) -> Mapping[str, object]:
        payload: MutableMapping[str, object] = {
            "plan": self.plan.to_dict(),
            "aggregate": {
                "content": self.aggregate.content,
                "confidence": self.aggregate.confidence,
                "strategy": self.aggregate.strategy,
                "supporting_models": list(self.aggregate.supporting_models),
            },
        }
        return payload


class DynamicAGIMultiLLCoordinator:
    """Coordinates the ensemble to produce Dynamic AGI improvement plans."""

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
        mission_brief: str,
        telemetry: Mapping[str, object] | None = None,
        focus: Iterable[str] | None = None,
        feedback: Iterable[str] | None = None,
        language: str = "en",
    ) -> MultiLLPrompt:
        hints: list[str] = ["Propose measurable improvements across focus areas."]
        if focus:
            hints.append(
                "Priority focus: " + ", ".join(sorted(str(item).strip() for item in focus if item))
            )
        if feedback:
            hints.append(
                "Incorporate feedback: "
                + "; ".join(str(item).strip() for item in feedback if item)
            )
        metadata: Mapping[str, object] | None = None
        if telemetry:
            metadata = {"telemetry": dict(telemetry)}
        return MultiLLPrompt(
            task="Formulate an AGI improvement plan.",
            context=mission_brief,
            hints=hints,
            language=language,
            metadata=metadata,
        )

    def generate_plan(
        self,
        *,
        mission_brief: str,
        adapter: AGIAdapter,
        telemetry: Mapping[str, object] | None = None,
        focus: Iterable[str] | None = None,
        feedback: Iterable[str] | None = None,
        language: str = "en",
    ) -> EnsembleAGIPlan:
        prompt = self.build_prompt(
            mission_brief=mission_brief,
            telemetry=telemetry,
            focus=focus,
            feedback=feedback,
            language=language,
        )
        result = self._engine.generate(prompt, adapter)
        plan = self._build_plan(result.aggregate, result.responses)
        return EnsembleAGIPlan(plan=plan, aggregate=result.aggregate, responses=result.responses)

    @staticmethod
    def _build_plan(
        aggregate: MultiLLAggregate, responses: Sequence[MultiLLResponse]
    ) -> ImprovementPlan:
        focus: list[str] = []
        metrics: MutableMapping[str, float] = {}
        actions: list[str] = []
        feedback_items: list[str] = []
        introspection: MutableMapping[str, object] = {}
        roadmap_steps: list[Mapping[str, object]] = []

        for response in responses:
            metadata = dict(response.metadata or {})
            DynamicAGIMultiLLCoordinator._extend_unique(focus, metadata.get("focus"))
            DynamicAGIMultiLLCoordinator._extend_unique(actions, metadata.get("actions"))
            DynamicAGIMultiLLCoordinator._extend_unique(feedback_items, metadata.get("feedback"))
            for key, value in dict(metadata.get("metrics") or {}).items():
                try:
                    metrics[key] = float(value)
                except (TypeError, ValueError):  # pragma: no cover - defensive guard
                    continue
            for key, value in dict(metadata.get("introspection") or {}).items():
                introspection.setdefault(key, value)
            for step in metadata.get("roadmap", []) or []:
                if isinstance(step, Mapping):
                    roadmap_steps.append(dict(step))

        summary: Mapping[str, object] = {
            "narrative": aggregate.content,
            "strategy": aggregate.strategy,
            "confidence": aggregate.confidence,
        }

        return ImprovementPlan(
            focus=tuple(focus),
            metrics=dict(metrics),
            actions=tuple(actions) if actions else (aggregate.content,),
            feedback=tuple(feedback_items),
            introspection=dict(introspection),
            summary=dict(summary),
            roadmap=tuple(roadmap_steps),
        )

    @staticmethod
    def _extend_unique(container: list[str], values: Iterable[str] | str | None) -> None:
        if values is None:
            return
        if isinstance(values, str):
            candidates = [values]
        else:
            candidates = [str(value) for value in values]
        for candidate in candidates:
            cleaned = candidate.strip()
            if not cleaned:
                continue
            if cleaned not in container:
                container.append(cleaned)
