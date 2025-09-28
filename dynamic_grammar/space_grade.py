"""Space-grade mission readiness evaluation for grammar analysis."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, MutableMapping

from .engine import DynamicGrammarEngine, GrammarAnalysis, GrammarIssue

__all__ = [
    "SpaceGradeModel",
    "SpaceGradeReport",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value != value:  # NaN check
        return lower
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _severity_weight(issue: GrammarIssue, weights: Mapping[str, float]) -> float:
    base = weights.get(issue.severity, 0.35)
    return max(base, 0.0) * _clamp(issue.confidence)


@dataclass(slots=True)
class SpaceGradeReport:
    """Mission-readiness report for grammar quality."""

    analysis: GrammarAnalysis
    grade: str
    mission_readiness: float
    reliability_index: float
    clarity_index: float
    stability_index: float
    advisory: str = ""
    metadata: Mapping[str, object] | None = None

    def summary(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "grade": self.grade,
            "mission_readiness": self.mission_readiness,
            "reliability_index": self.reliability_index,
            "clarity_index": self.clarity_index,
            "stability_index": self.stability_index,
            "advisory": self.advisory,
            "analysis": self.analysis.summary(),
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


class SpaceGradeModel:
    """Evaluate text using the grammar engine with a space-grade rubric."""

    _DEFAULT_SEVERITY_WEIGHTS: Mapping[str, float] = {
        "critical": 1.0,
        "high": 0.75,
        "medium": 0.45,
        "low": 0.2,
        "info": 0.1,
    }

    def __init__(
        self,
        engine: DynamicGrammarEngine | None = None,
        *,
        severity_weights: Mapping[str, float] | None = None,
    ) -> None:
        self._engine = engine or DynamicGrammarEngine()
        self._weights = dict(self._DEFAULT_SEVERITY_WEIGHTS)
        if severity_weights:
            for name, weight in severity_weights.items():
                self._weights[str(name).lower()] = max(float(weight), 0.0)

    @property
    def engine(self) -> DynamicGrammarEngine:
        return self._engine

    @property
    def severity_weights(self) -> Mapping[str, float]:
        return dict(self._weights)

    def grade(
        self,
        text: str,
        *,
        context: Mapping[str, object] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> SpaceGradeReport:
        analysis = self._engine.analyse(text, context=context, metadata=metadata)
        reliability_index = self._calculate_reliability(analysis)
        clarity_index = self._calculate_clarity(analysis)
        stability_index = self._calculate_stability(analysis, reliability_index, clarity_index)
        mission_readiness = _clamp(
            round((reliability_index * 0.5) + (clarity_index * 0.3) + (stability_index * 0.2), 6)
        )
        grade = self._grade_from_score(mission_readiness)
        advisory = self._build_advisory(grade, analysis)
        return SpaceGradeReport(
            analysis=analysis,
            grade=grade,
            mission_readiness=mission_readiness,
            reliability_index=reliability_index,
            clarity_index=clarity_index,
            stability_index=stability_index,
            advisory=advisory,
            metadata=metadata,
        )

    def _calculate_reliability(self, analysis: GrammarAnalysis) -> float:
        token_count = max(len(analysis.text.split()), 1)
        total_weight = 0.0
        for issue in analysis.issues:
            total_weight += _severity_weight(issue, self._weights)
        penalty = total_weight / token_count
        return _clamp(1.0 - penalty)

    def _calculate_clarity(self, analysis: GrammarAnalysis) -> float:
        token_count = max(len(analysis.text.split()), 1)
        density = len(analysis.issues) / token_count
        return _clamp(1.0 - density)

    def _calculate_stability(
        self,
        analysis: GrammarAnalysis,
        reliability_index: float,
        clarity_index: float,
    ) -> float:
        suggestion_bonus = sum(len(issue.suggestions) for issue in analysis.issues) * 0.01
        stability = (reliability_index * 0.6) + (clarity_index * 0.4) + suggestion_bonus
        return _clamp(stability)

    @staticmethod
    def _grade_from_score(score: float) -> str:
        if score >= 0.9:
            return "S"
        if score >= 0.8:
            return "A"
        if score >= 0.65:
            return "B"
        if score >= 0.5:
            return "C"
        if score >= 0.35:
            return "D"
        return "E"

    @staticmethod
    def _build_advisory(grade: str, analysis: GrammarAnalysis) -> str:
        if grade in {"S", "A"}:
            return "Text is mission-ready with minimal adjustments required."
        if grade == "B":
            return "Minor improvements recommended before mission certification."
        if grade == "C":
            return "Review highlighted issues to reach mission-ready standards."
        if grade == "D":
            return "Significant revisions required; mission launch not advised."
        if not analysis.issues:
            return "No issues detected; review mission telemetry for external factors."
        return "Critical issues detected; halt mission until grammar faults are resolved."

    def history(self) -> tuple[GrammarAnalysis, ...]:
        return self._engine.history

    def clear_history(self) -> None:
        self._engine.clear_history()
