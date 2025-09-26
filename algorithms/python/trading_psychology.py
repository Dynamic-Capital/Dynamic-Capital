"""Trading psychology scoring and narrative insights helpers."""

from __future__ import annotations

import statistics
import textwrap
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import (
    CompletionClient,
    LLMConfig,
    collect_strings,
    parse_json_response,
    serialise_runs,
)

__all__ = [
    "PsychologyObservation",
    "PsychologyScore",
    "TradingPsychologyModel",
    "TradingPsychologyInsights",
]


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


@dataclass(slots=True)
class PsychologyObservation:
    """Raw intraday wellness telemetry captured from the trading desk."""

    timestamp: datetime
    plan_adherence: float
    risk_compliance: float
    recovery_rate: float
    emotional_stability: float
    focus_quality: float
    distraction_events: int
    routine_adherence: float


@dataclass(slots=True)
class PsychologyScore:
    """Aggregated trading psychology readiness score."""

    discipline: float
    resilience: float
    focus: float
    consistency: float
    composite: float
    state: str
    recommendations: list[str] = field(default_factory=list)
    normalized_history: Sequence[Mapping[str, Any]] = field(default_factory=tuple)

    def as_dict(self) -> Dict[str, float]:
        return {
            "discipline": self.discipline,
            "resilience": self.resilience,
            "focus": self.focus,
            "consistency": self.consistency,
            "composite": self.composite,
        }


@dataclass(slots=True)
class TradingPsychologyModel:
    """Compute readiness of the trading desk based on qualitative telemetry."""

    observations: Sequence[PsychologyObservation]
    window: int = 14
    recency_decay: float = 0.85
    readiness_thresholds: Mapping[str, float] = field(
        default_factory=lambda: {"ready": 0.75, "monitor": 0.6}
    )
    _cached_score: Optional[PsychologyScore] = field(init=False, default=None)

    def evaluate(self, *, force: bool = False) -> PsychologyScore:
        if self._cached_score is not None and not force:
            return self._cached_score

        recent = self._select_recent_observations()
        if not recent:
            raise ValueError("observations cannot be empty")

        normalised = self._normalise_observations(recent)
        weights = self._compute_weights(len(normalised))
        sub_scores = self._aggregate_sub_scores(normalised, weights)
        composite = self._blend_composite(sub_scores)
        state = self._determine_state(composite)
        recommendations = self._build_recommendations(sub_scores, composite, state)

        history: list[Dict[str, Any]] = []
        for index, obs in enumerate(recent):
            payload = normalised[index]
            weight = weights[index]
            history.append(
                {
                    "timestamp": obs.timestamp,
                    "weight": weight,
                    "discipline": payload["discipline"],
                    "resilience": payload["resilience"],
                    "focus": payload["focus"],
                    "consistency": payload["consistency"],
                }
            )

        self._cached_score = PsychologyScore(
            discipline=sub_scores["discipline"],
            resilience=sub_scores["resilience"],
            focus=sub_scores["focus"],
            consistency=sub_scores["consistency"],
            composite=composite,
            state=state,
            recommendations=recommendations,
            normalized_history=tuple(history),
        )
        return self._cached_score

    def get_inputs(self) -> Sequence[PsychologyObservation]:
        return tuple(sorted(self.observations, key=lambda obs: obs.timestamp))

    def get_sub_scores(self) -> Dict[str, float]:
        score = self.evaluate()
        return {
            "discipline": score.discipline,
            "resilience": score.resilience,
            "focus": score.focus,
            "consistency": score.consistency,
        }

    def get_recommendations(self) -> list[str]:
        return list(self.evaluate().recommendations)

    def get_normalized_history(self) -> Sequence[Mapping[str, Any]]:
        return self.evaluate().normalized_history

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _select_recent_observations(self) -> Sequence[PsychologyObservation]:
        ordered = sorted(self.observations, key=lambda obs: obs.timestamp)
        if self.window <= 0:
            return tuple(ordered)
        return tuple(ordered[-self.window :])

    def _normalise_observations(
        self, observations: Sequence[PsychologyObservation]
    ) -> list[Dict[str, float]]:
        normalised: list[Dict[str, float]] = []
        for obs in observations:
            discipline = statistics.fmean([obs.plan_adherence, obs.risk_compliance])
            resilience = statistics.fmean([obs.recovery_rate, obs.emotional_stability])
            distraction_penalty = _clamp(obs.distraction_events / 6, 0.0, 1.0)
            focus = statistics.fmean([
                obs.focus_quality,
                1.0 - distraction_penalty,
            ])
            consistency = statistics.fmean([
                obs.routine_adherence,
                obs.plan_adherence,
            ])
            normalised.append(
                {
                    "discipline": _clamp(discipline),
                    "resilience": _clamp(resilience),
                    "focus": _clamp(focus),
                    "consistency": _clamp(consistency),
                }
            )
        return normalised

    def _compute_weights(self, count: int) -> list[float]:
        if count <= 0:
            return []
        decay = _clamp(self.recency_decay, 0.1, 0.999)
        weights = [decay ** (count - index - 1) for index in range(count)]
        return weights

    def _aggregate_sub_scores(
        self,
        normalised: Sequence[Mapping[str, float]],
        weights: Sequence[float],
    ) -> Dict[str, float]:
        totals = {"discipline": 0.0, "resilience": 0.0, "focus": 0.0, "consistency": 0.0}
        total_weight = sum(weights)
        if total_weight == 0:
            raise ValueError("weights cannot sum to zero")
        for index, payload in enumerate(normalised):
            weight = weights[index]
            for key in totals:
                totals[key] += payload[key] * weight
        return {key: totals[key] / total_weight for key in totals}

    def _blend_composite(self, scores: Mapping[str, float]) -> float:
        composite = (
            scores["discipline"] * 0.3
            + scores["resilience"] * 0.25
            + scores["focus"] * 0.25
            + scores["consistency"] * 0.2
        )
        return _clamp(composite)

    def _determine_state(self, composite: float) -> str:
        ready = self.readiness_thresholds.get("ready", 0.75)
        monitor = self.readiness_thresholds.get("monitor", 0.6)
        if composite >= ready:
            return "ready"
        if composite >= monitor:
            return "caution"
        return "recovery"

    def _build_recommendations(
        self,
        scores: Mapping[str, float],
        composite: float,
        state: str,
    ) -> list[str]:
        recommendations: list[str] = []
        if composite < 0.5:
            recommendations.append("Pause discretionary trades until mindset stabilises.")
        if scores["discipline"] < 0.6:
            recommendations.append("Revisit risk rules and pre-trade checklists.")
        if scores["resilience"] < 0.6:
            recommendations.append("Schedule recovery time and review recent setbacks.")
        if scores["focus"] < 0.6:
            recommendations.append("Minimise desk distractions for the next session.")
        if scores["consistency"] < 0.6:
            recommendations.append("Reinforce daily routines and journaling cadence.")
        if not recommendations and state == "ready":
            recommendations.append("Maintain current routines; readiness remains strong.")
        return recommendations


@dataclass(slots=True)
class TradingPsychologyInsights:
    """Optional LLM-assisted narrative builder for psychology scores."""

    model: TradingPsychologyModel
    grok_client: CompletionClient | None = None
    deepseek_client: CompletionClient | None = None
    grok_temperature: float = 0.25
    grok_nucleus_p: float = 0.85
    grok_max_tokens: int = 320
    deepseek_temperature: float = 0.2
    deepseek_nucleus_p: float = 0.9
    deepseek_max_tokens: int = 320

    def generate(self, score: Optional[PsychologyScore] = None) -> Dict[str, Any]:
        score = score or self.model.evaluate()
        score_summary = textwrap.dedent(
            f"""
            Composite readiness: {score.composite:.2%}
            Discipline: {score.discipline:.2%}
            Resilience: {score.resilience:.2%}
            Focus: {score.focus:.2%}
            Consistency: {score.consistency:.2%}
            State: {score.state}
            """
        ).strip()

        runs = []
        insights: list[str] = []
        metadata: Dict[str, Any] = {"score": score.as_dict()}
        grok_payload: Mapping[str, Any] | None = None

        if self.grok_client is not None:
            prompt = self._build_grok_prompt(score_summary, score.recommendations)
            grok_run = LLMConfig(
                name="grok-1",
                client=self.grok_client,
                temperature=self.grok_temperature,
                nucleus_p=self.grok_nucleus_p,
                max_tokens=self.grok_max_tokens,
            ).run(prompt)
            runs.append(grok_run)
            grok_payload = parse_json_response(grok_run.response, fallback_key="narrative")
            metadata["grok"] = grok_payload
            insights.extend(
                collect_strings(
                    grok_payload.get("insights") if isinstance(grok_payload, Mapping) else None,
                    grok_payload.get("narrative") if isinstance(grok_payload, Mapping) else None,
                    grok_run.response if not grok_payload else None,
                )
            )

        if self.deepseek_client is not None:
            prompt = self._build_deepseek_prompt(score_summary, insights)
            deepseek_run = LLMConfig(
                name="deepseek-v3",
                client=self.deepseek_client,
                temperature=self.deepseek_temperature,
                nucleus_p=self.deepseek_nucleus_p,
                max_tokens=self.deepseek_max_tokens,
            ).run(prompt)
            runs.append(deepseek_run)
            deepseek_payload = parse_json_response(
                deepseek_run.response, fallback_key="narrative"
            )
            metadata["deepseek"] = deepseek_payload
            insights.extend(
                collect_strings(
                    deepseek_payload.get("insights") if isinstance(deepseek_payload, Mapping) else None,
                    deepseek_payload.get("narrative") if isinstance(deepseek_payload, Mapping) else None,
                    deepseek_run.response if not deepseek_payload else None,
                )
            )

        narrative = " ".join(insights) if insights else None
        raw_response = serialise_runs(runs)

        return {
            "score": score,
            "insights": insights,
            "narrative": narrative,
            "metadata": metadata,
            "raw_response": raw_response,
        }

    def _build_grok_prompt(
        self, score_summary: str, recommendations: Iterable[str]
    ) -> str:
        recs = "\n".join(f"- {item}" for item in recommendations) or "- No immediate actions logged."
        return textwrap.dedent(
            f"""
            You are the trading desk psychologist for Dynamic Capital.
            Review the quantitative readiness summary and craft a JSON object with keys
            "insights" (array of short sentences), "narrative" (a concise paragraph),
            and "actions" (array of tactical adjustments).

            Readiness summary:
            {score_summary}

            Existing recommendations:
            {recs}
            """
        ).strip()

    def _build_deepseek_prompt(self, score_summary: str, insights: Iterable[str]) -> str:
        prior = "\n".join(f"- {item}" for item in insights) or "- No Grok guidance provided."
        return textwrap.dedent(
            f"""
            You are DeepSeek-V3 acting as a performance coach.
            Given the readiness summary and the initial Grok insights, produce a JSON
            response reinforcing the key psychological themes and highlight any
            emerging risks to monitor over the next session. Use the keys "insights"
            and "narrative".

            Readiness summary:
            {score_summary}

            Grok insights to build upon:
            {prior}
            """
        ).strip()
