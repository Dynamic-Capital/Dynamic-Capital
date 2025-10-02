"""Cognitive alignment utilities linking thinking, consciousness, and psychology."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_consciousness.consciousness import ConsciousnessState
from dynamic_persona.persona import PersonaDimension, PersonaProfile
from dynamic_thinking.engine import ThinkingFrame
from dynamic.trading.algo.dynamic_psychology import PsychologySnapshot

__all__ = [
    "CognitiveAlignmentReport",
    "CognitiveAlignmentEngine",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _deduplicate(items: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        text = str(item).strip()
        if text and text not in seen:
            seen.add(text)
            ordered.append(text)
    return tuple(ordered)


def _tokenise(values: Iterable[str]) -> tuple[str, ...]:
    tokens: list[str] = []
    seen: set[str] = set()
    for raw in values:
        text = str(raw).strip().lower()
        if not text or text in seen:
            continue
        tokens.append(text)
        seen.add(text)
        normalised = text.replace("/", " ").replace("-", " ").replace("_", " ")
        for chunk in normalised.split():
            if chunk and chunk not in seen:
                seen.add(chunk)
                tokens.append(chunk)
    return tuple(tokens)


def _normalise_psychology(value: float, *, upper: float = 10.0) -> float:
    if upper <= 0:
        return 0.0
    return _clamp(value / upper)


def _build_knowledge_index(
    index: Mapping[str, Sequence[str]] | None,
) -> Mapping[str, tuple[str, ...]]:
    if not index:
        return {}
    resolved: MutableMapping[str, list[str]] = {}
    for raw_tag, resources in index.items():
        if resources is None:
            continue
        tokens = _tokenise((raw_tag,))
        cleaned_resources = _deduplicate(resources)
        if not cleaned_resources:
            continue
        for token in tokens:
            resolved.setdefault(token, [])
            bucket = resolved[token]
            for resource in cleaned_resources:
                if resource not in bucket:
                    bucket.append(resource)
    return {key: tuple(values) for key, values in resolved.items()}


@dataclass(slots=True)
class CognitiveAlignmentReport:
    """Aggregated cognition posture across thinking, consciousness, and psychology."""

    persona_identifier: str
    alignment_score: float
    resilience_score: float
    persona_resonance: float
    clarity_index: float
    risk_pressure: float
    idea_velocity: float
    awareness_index: float
    readiness_index: float
    stability_index: float
    psychology_readiness: float
    psychology_caution: float
    psychology_recovery: float
    emphasis_tags: tuple[str, ...]
    knowledge_gaps: tuple[str, ...]
    knowledgebase_recommendations: tuple[str, ...]
    action_recommendations: tuple[str, ...]
    insight_streams: tuple[str, ...]
    summary: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "persona_identifier": self.persona_identifier,
            "alignment_score": self.alignment_score,
            "resilience_score": self.resilience_score,
            "persona_resonance": self.persona_resonance,
            "clarity_index": self.clarity_index,
            "risk_pressure": self.risk_pressure,
            "idea_velocity": self.idea_velocity,
            "awareness_index": self.awareness_index,
            "readiness_index": self.readiness_index,
            "stability_index": self.stability_index,
            "psychology_readiness": self.psychology_readiness,
            "psychology_caution": self.psychology_caution,
            "psychology_recovery": self.psychology_recovery,
            "emphasis_tags": list(self.emphasis_tags),
            "knowledge_gaps": list(self.knowledge_gaps),
            "knowledgebase_recommendations": list(
                self.knowledgebase_recommendations
            ),
            "action_recommendations": list(self.action_recommendations),
            "insight_streams": list(self.insight_streams),
            "summary": self.summary,
        }


class CognitiveAlignmentEngine:
    """Integrate cognition streams to surface alignment and knowledge insights."""

    def __init__(
        self,
        *,
        knowledge_index: Mapping[str, Sequence[str]] | None = None,
    ) -> None:
        self._knowledge_index = _build_knowledge_index(knowledge_index)

    def synthesise(
        self,
        *,
        thinking: ThinkingFrame,
        consciousness: ConsciousnessState,
        psychology: PsychologySnapshot,
        persona: PersonaProfile,
    ) -> CognitiveAlignmentReport:
        clarity = _clamp(thinking.clarity_index)
        risk = _clamp(thinking.risk_pressure)
        idea_velocity = _clamp(thinking.idea_velocity)
        awareness = _clamp(consciousness.awareness_index)
        readiness = _clamp(consciousness.readiness_index)
        stability = _clamp(consciousness.stability_index)

        psychology_readiness = _normalise_psychology(psychology.readiness_score)
        psychology_caution = _normalise_psychology(psychology.caution_score)
        psychology_recovery = _normalise_psychology(psychology.recovery_score)
        psychology_stability = _normalise_psychology(
            psychology.stability_index
        )

        alignment_components = (
            clarity,
            1.0 - risk,
            idea_velocity,
            awareness,
            readiness,
            stability,
            psychology_readiness,
            1.0 - psychology_caution,
        )
        alignment_score = round(
            sum(alignment_components) / len(alignment_components), 3
        )

        resilience_components = (
            1.0 - risk,
            stability,
            readiness,
            psychology_recovery,
            psychology_stability,
        )
        resilience_score = round(
            sum(resilience_components) / len(resilience_components), 3
        )

        context_tokens = _tokenise(
            [
                *thinking.dominant_themes,
                *thinking.recommended_models,
                *consciousness.modal_dominance,
                psychology.dominant_element,
            ]
        )
        persona_resonance = self._persona_resonance(
            persona.dimensions, context_tokens
        )
        knowledge_tokens = _deduplicate(
            (*context_tokens, *_tokenise(persona.expertise))
        )

        knowledge_recommendations = self._recommend_knowledge(knowledge_tokens)
        knowledge_gaps = self._identify_gaps(
            clarity,
            awareness,
            readiness,
            stability,
            psychology_readiness,
            psychology_caution,
            persona_resonance,
            bool(knowledge_recommendations),
        )
        action_recommendations = self._action_recommendations(
            thinking,
            consciousness,
            psychology_caution,
            persona_resonance,
        )
        insight_streams = self._insight_streams(
            thinking, consciousness, psychology
        )
        summary = self._summarise(
            persona,
            alignment_score,
            resilience_score,
            persona_resonance,
            thinking,
            consciousness,
            psychology,
        )

        return CognitiveAlignmentReport(
            persona_identifier=persona.identifier,
            alignment_score=alignment_score,
            resilience_score=resilience_score,
            persona_resonance=round(persona_resonance, 3),
            clarity_index=round(clarity, 3),
            risk_pressure=round(risk, 3),
            idea_velocity=round(idea_velocity, 3),
            awareness_index=round(awareness, 3),
            readiness_index=round(readiness, 3),
            stability_index=round(stability, 3),
            psychology_readiness=round(psychology_readiness, 3),
            psychology_caution=round(psychology_caution, 3),
            psychology_recovery=round(psychology_recovery, 3),
            emphasis_tags=knowledge_tokens,
            knowledge_gaps=knowledge_gaps,
            knowledgebase_recommendations=knowledge_recommendations,
            action_recommendations=action_recommendations,
            insight_streams=insight_streams,
            summary=summary,
        )

    def _persona_resonance(
        self,
        dimensions: Sequence[PersonaDimension],
        emphasis_tags: Sequence[str],
    ) -> float:
        if not dimensions:
            return 0.0
        emphasis = set(emphasis_tags)
        total_weight = sum(max(dimension.weight, 0.0) for dimension in dimensions)
        if total_weight <= 0:
            return 0.0
        max_resonant = total_weight * 1.25
        matched = 0.0
        for dimension in dimensions:
            dimension_tokens = set(
                _tokenise((dimension.name, *dimension.tags))
            )
            overlap = bool(dimension_tokens & emphasis)
            modifier = 1.25 if overlap else 0.75
            matched += max(dimension.weight, 0.0) * modifier
        return _clamp(matched / max_resonant)

    def _recommend_knowledge(
        self, emphasis_tags: Sequence[str]
    ) -> tuple[str, ...]:
        if not self._knowledge_index:
            return ()
        recommendations: list[str] = []
        for tag in emphasis_tags:
            resources = self._knowledge_index.get(tag, ())
            for resource in resources:
                recommendations.append(f"{tag}: {resource}")
        return _deduplicate(recommendations)

    def _identify_gaps(
        self,
        clarity: float,
        awareness: float,
        readiness: float,
        stability: float,
        psychology_readiness: float,
        psychology_caution: float,
        persona_resonance: float,
        has_knowledge: bool,
    ) -> tuple[str, ...]:
        gaps: list[str] = []
        if clarity < 0.6:
            gaps.append(
                "Clarity index below 0.60; reinforce fact patterns and assumptions."
            )
        if awareness < 0.55:
            gaps.append(
                "Awareness index below 0.55; expand sensory inputs and context loops."
            )
        if readiness < 0.5:
            gaps.append(
                "Readiness index below 0.50; delay high-leverage moves until stabilised."
            )
        if stability < 0.5:
            gaps.append(
                "Stability index below 0.50; prioritise regulation rituals and guardrails."
            )
        if psychology_readiness < 0.5:
            gaps.append(
                "Psychology readiness below 0.50; rebalance workload and recovery cadence."
            )
        if psychology_caution > 0.5:
            gaps.append(
                "Caution load above 0.50; neutralise risk triggers before escalation."
            )
        if persona_resonance < 0.65:
            gaps.append(
                "Persona resonance under 0.65; reconnect daily rituals with active themes."
            )
        if not has_knowledge:
            gaps.append(
                "No knowledge base recommendations matched the current emphasis tags."
            )
        return _deduplicate(gaps)

    def _action_recommendations(
        self,
        thinking: ThinkingFrame,
        consciousness: ConsciousnessState,
        psychology_caution: float,
        persona_resonance: float,
    ) -> tuple[str, ...]:
        actions = list(thinking.action_steps)
        actions.extend(consciousness.recommended_focus)
        actions.extend(consciousness.stabilisation_rituals)
        if psychology_caution > 0.5:
            actions.append(
                "Throttle execution tempo until caution indicators subside."
            )
        if persona_resonance < 0.65:
            actions.append(
                "Schedule a persona reset workshop to realign expectations."
            )
        if (
            not thinking.action_steps
            and not consciousness.recommended_focus
            and not consciousness.stabilisation_rituals
        ):
            actions.append("Document next experiment and schedule review")
        if not actions:
            actions.append("Document next experiment and schedule review")
        return _deduplicate(actions)

    def _insight_streams(
        self,
        thinking: ThinkingFrame,
        consciousness: ConsciousnessState,
        psychology: PsychologySnapshot,
    ) -> tuple[str, ...]:
        streams: list[str] = []
        streams.extend(f"Bias: {alert}" for alert in thinking.bias_alerts)
        streams.extend(consciousness.critical_signals)
        streams.append(
            f"Psychology dominant element: {psychology.dominant_element}"
            f" ({psychology.dominant_level})"
        )
        return _deduplicate(streams)

    def _summarise(
        self,
        persona: PersonaProfile,
        alignment_score: float,
        resilience_score: float,
        persona_resonance: float,
        thinking: ThinkingFrame,
        consciousness: ConsciousnessState,
        psychology: PsychologySnapshot,
    ) -> str:
        themes = ", ".join(thinking.dominant_themes) or "no dominant themes"
        modalities = (
            ", ".join(consciousness.modal_dominance) or "no primary modalities"
        )
        return (
            f"{persona.display_name} alignment at {int(round(alignment_score * 100))}% "
            f"with resilience {int(round(resilience_score * 100))}%. "
            f"Persona resonance {int(round(persona_resonance * 100))}%. "
            f"Dominant themes: {themes}. Modal focus: {modalities}. "
            f"Psychology anchor: {psychology.dominant_element} "
            f"({psychology.dominant_level})."
        )
