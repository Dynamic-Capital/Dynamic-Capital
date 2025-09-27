from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
from typing import Mapping, Sequence

__all__ = [
    "FactCheckClaim",
    "EvidenceSource",
    "EvidenceInsight",
    "FactCheckResult",
    "FactCheckEngine",
]

_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "from",
    "this",
    "have",
    "has",
    "will",
    "shall",
    "into",
    "about",
    "their",
    "there",
    "here",
    "been",
    "were",
    "are",
    "was",
    "over",
    "such",
    "than",
    "within",
    "against",
    "between",
    "among",
    "after",
    "before",
    "because",
    "could",
    "would",
    "should",
    "might",
    "upon",
    "into",
    "per",
    "via",
    "amid",
    "across",
    "around",
    "near",
    "only",
    "just",
    "very",
    "much",
    "many",
    "more",
    "less",
    "most",
    "least",
    "can",
    "may",
    "any",
    "each",
    "other",
    "others",
    "whose",
    "while",
    "where",
    "when",
    "what",
    "which",
    "who",
    "whom",
    "why",
    "how",
    "does",
    "did",
    "doing",
    "done",
    "said",
    "says",
    "per",
}

_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_']+")


def _clamp(value: float, minimum: float, maximum: float) -> float:
    """Clamp ``value`` to the inclusive range [minimum, maximum]."""

    return max(minimum, min(maximum, value))


@lru_cache(maxsize=4096)
def _cached_keywords(text: str) -> frozenset[str]:
    """Return a cached, immutable keyword set for the provided text."""

    if not text:
        return frozenset()
    tokens = _TOKEN_PATTERN.findall(text.lower())
    return frozenset(token for token in tokens if token not in _STOPWORDS and len(token) > 2)


@dataclass(slots=True)
class FactCheckClaim:
    """Claim submitted for verification."""

    statement: str
    category: str = "general"
    focus_entities: Sequence[str] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)

    def to_dict(self) -> Mapping[str, object]:
        return {
            "statement": self.statement,
            "category": self.category,
            "focus_entities": list(self.focus_entities),
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class EvidenceSource:
    """External source consulted during the fact check."""

    source_id: str
    title: str
    summary: str
    polarity: str
    reliability: float
    published_at: datetime | None = None
    tags: Sequence[str] = field(default_factory=tuple)
    metrics: Mapping[str, float] = field(default_factory=dict)

    def normalised_polarity(self) -> str:
        token = self.polarity.strip().lower()
        if token in {"support", "supports", "confirm", "confirms", "affirm", "true"}:
            return "supports"
        if token in {"refute", "refutes", "contradict", "contradicts", "dispute", "false"}:
            return "refutes"
        if token in {"mixed", "uncertain", "partial", "context"}:
            return "neutral"
        return token or "neutral"

    def to_dict(self) -> Mapping[str, object]:
        payload: dict[str, object] = {
            "source_id": self.source_id,
            "title": self.title,
            "summary": self.summary,
            "polarity": self.polarity,
            "reliability": self.reliability,
            "tags": list(self.tags),
            "metrics": dict(self.metrics),
        }
        if self.published_at is not None:
            payload["published_at"] = self.published_at.isoformat()
        return payload


@dataclass(slots=True)
class EvidenceInsight:
    """Weighted contribution of a piece of evidence."""

    source_id: str
    title: str
    polarity: str
    weight: float
    summary: str

    def to_dict(self) -> Mapping[str, object]:
        return {
            "source_id": self.source_id,
            "title": self.title,
            "polarity": self.polarity,
            "weight": self.weight,
            "summary": self.summary,
        }


@dataclass(slots=True)
class FactCheckResult:
    """Outcome of assessing a claim against supplied evidence."""

    claim: FactCheckClaim
    verdict: str
    confidence: float
    reasoning: str
    supporting_evidence: Sequence[EvidenceInsight]
    contradicting_evidence: Sequence[EvidenceInsight]
    neutral_evidence: Sequence[EvidenceInsight]
    metrics: Mapping[str, float]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "claim": self.claim.to_dict(),
            "verdict": self.verdict,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "supporting_evidence": [insight.to_dict() for insight in self.supporting_evidence],
            "contradicting_evidence": [insight.to_dict() for insight in self.contradicting_evidence],
            "neutral_evidence": [insight.to_dict() for insight in self.neutral_evidence],
            "metrics": dict(self.metrics),
        }


@dataclass(slots=True)
class FactCheckEngine:
    """Dynamic fact-checking engine blending reliability, freshness, and relevance."""

    support_margin: float = 0.2
    min_reliability: float = 0.3
    freshness_half_life_days: float = 180.0
    weak_evidence_floor: float = 0.05

    def __post_init__(self) -> None:
        if self.freshness_half_life_days > 0:
            seconds = self.freshness_half_life_days * 24 * 60 * 60
            self._decay_lambda = math.log(2.0) / seconds
        else:
            self._decay_lambda = 0.0

    def assess(self, claim: FactCheckClaim, sources: Sequence[EvidenceSource]) -> FactCheckResult:
        """Assess a claim using the provided evidence sources."""

        claim_terms = self._claim_terms(claim)

        supporting: list[tuple[EvidenceInsight, float]] = []
        refuting: list[tuple[EvidenceInsight, float]] = []
        neutral: list[tuple[EvidenceInsight, float]] = []

        for source in sources:
            weight = self._evidence_weight(source, claim_terms)
            if weight < self.weak_evidence_floor:
                continue

            insight = EvidenceInsight(
                source_id=source.source_id,
                title=source.title,
                polarity=source.normalised_polarity(),
                weight=round(weight, 4),
                summary=source.summary,
            )

            polarity = insight.polarity
            if polarity == "supports":
                supporting.append((insight, weight))
            elif polarity == "refutes":
                refuting.append((insight, weight))
            else:
                neutral.append((insight, weight))

        support_score = sum(weight for _, weight in supporting)
        refute_score = sum(weight for _, weight in refuting)
        neutral_score = sum(weight for _, weight in neutral)
        total_weight = support_score + refute_score + neutral_score
        margin = support_score - refute_score

        considered_count = len(supporting) + len(refuting) + len(neutral)

        verdict = self._derive_verdict(
            total_weight,
            margin,
            support_score,
            refute_score,
            considered_count,
        )
        confidence = self._confidence(
            total_weight,
            margin,
            support_score,
            refute_score,
            considered_count,
            len(sources),
        )
        reasoning = self._reasoning(
            verdict,
            total_weight,
            margin,
            support_score,
            refute_score,
            len(sources),
            considered_count,
        )

        metrics = {
            "support_score": round(support_score, 4),
            "refute_score": round(refute_score, 4),
            "neutral_score": round(neutral_score, 4),
            "total_sources": float(len(sources)),
            "considered_sources": float(considered_count),
            "supporting_count": float(len(supporting)),
            "contradicting_count": float(len(refuting)),
            "neutral_count": float(len(neutral)),
            "margin": round(margin, 4),
            "coverage_ratio": round(
                considered_count / len(sources), 4
            )
            if sources
            else 0.0,
            "adaptive_margin": round(
                self._adaptive_support_margin(total_weight, considered_count), 4
            ),
        }

        return FactCheckResult(
            claim=claim,
            verdict=verdict,
            confidence=confidence,
            reasoning=reasoning,
            supporting_evidence=self._finalise_insights(supporting),
            contradicting_evidence=self._finalise_insights(refuting),
            neutral_evidence=self._finalise_insights(neutral),
            metrics=metrics,
        )

    def _finalise_insights(
        self, entries: Sequence[tuple[EvidenceInsight, float]]
    ) -> Sequence[EvidenceInsight]:
        ordered = sorted(entries, key=lambda item: item[1], reverse=True)
        return [insight for insight, _ in ordered[:5]]

    def _derive_verdict(
        self,
        total_weight: float,
        margin: float,
        support_score: float,
        refute_score: float,
        considered_sources: int,
    ) -> str:
        if total_weight <= self.weak_evidence_floor:
            return "INSUFFICIENT_EVIDENCE"

        threshold = self._adaptive_support_margin(total_weight, considered_sources) * total_weight
        if margin >= threshold:
            return "SUPPORTED"
        if margin <= -threshold:
            return "REFUTED"
        if max(support_score, refute_score) < 0.25 * total_weight:
            return "UNCERTAIN"
        return "CONTESTED"

    def _confidence(
        self,
        total_weight: float,
        margin: float,
        support_score: float,
        refute_score: float,
        considered_sources: int,
        total_sources: int,
    ) -> float:
        if total_weight <= self.weak_evidence_floor:
            return 0.2

        dominance = max(support_score, refute_score) / total_weight if total_weight else 0.0
        balance = abs(margin) / total_weight if total_weight else 0.0
        density = min(1.0, total_weight / (total_weight + 1.0))
        coverage = considered_sources / total_sources if total_sources else 0.0

        confidence = 0.35 * dominance + 0.3 * balance + 0.2 * density + 0.15 * coverage
        return round(max(0.05, min(confidence, 0.98)), 4)

    def _adaptive_support_margin(self, total_weight: float, considered_sources: int) -> float:
        """Dynamically scale the support margin threshold based on evidence quality."""

        if total_weight <= 0:
            return self.support_margin

        diversity_factor = 1.0 + math.log1p(max(0, considered_sources - 1)) / 6
        weight_pressure = 1.0 - 0.35 * math.exp(-total_weight)
        adaptive_margin = self.support_margin * weight_pressure / diversity_factor
        return _clamp(adaptive_margin, self.support_margin * 0.35, self.support_margin * 1.15)

    def _reasoning(
        self,
        verdict: str,
        total_weight: float,
        margin: float,
        support_score: float,
        refute_score: float,
        total_sources: int,
        considered_sources: int,
    ) -> str:
        parts: list[str] = []
        parts.append(
            f"Processed {considered_sources} of {total_sources} sources after reliability checks."
        )
        if total_sources:
            coverage = considered_sources / total_sources
            parts.append(f"Coverage after screening: {coverage:.0%}.")
        if total_weight:
            parts.append(
                f"Aggregate evidence weight {total_weight:.2f} with margin {margin:.2f} (support {support_score:.2f} vs refute {refute_score:.2f})."
            )
            threshold = self._adaptive_support_margin(total_weight, considered_sources) * total_weight
            parts.append(f"Adaptive margin threshold set at {threshold:.2f}.")
        else:
            parts.append("No evidence passed relevance and reliability thresholds.")

        verdict_descriptions = {
            "SUPPORTED": "Supporting evidence materially outweighs contradictions.",
            "REFUTED": "Contradicting sources dominate despite counter-claims.",
            "CONTESTED": "Evidence is split; additional corroboration recommended.",
            "UNCERTAIN": "Signals are weak on both sides; claim remains unproven.",
            "INSUFFICIENT_EVIDENCE": "Not enough high-quality sources met the screening criteria.",
        }
        parts.append(verdict_descriptions.get(verdict, verdict))
        return " ".join(parts)

    def _evidence_weight(self, source: EvidenceSource, claim_terms: set[str]) -> float:
        reliability = self._reliability_factor(source.reliability)
        freshness = self._freshness_weight(source.published_at)
        relevance = self._relevance_score(source, claim_terms)
        metric_boost = self._metric_boost(source.metrics)

        relevance_factor = 0.25 + 0.75 * relevance
        return reliability * freshness * relevance_factor * metric_boost

    def _reliability_factor(self, reliability: float) -> float:
        reliability = _clamp(reliability, 0.0, 1.0)
        if reliability < self.min_reliability:
            penalty = (self.min_reliability - reliability) / max(self.min_reliability, 1e-6)
            reliability *= 1.0 - 0.6 * penalty
        else:
            headroom = 1.0 - self.min_reliability
            if headroom > 0:
                reliability *= 0.85 + 0.15 * (reliability - self.min_reliability) / headroom
        return max(self.weak_evidence_floor, reliability)

    def _metric_boost(self, metrics: Mapping[str, float]) -> float:
        if not metrics:
            return 1.0
        values = [_clamp(value, 0.0, 1.0) for value in metrics.values()]
        if not values:
            return 1.0
        quality = sum(values) / len(values)
        return 1.0 + 0.3 * quality

    def _freshness_weight(self, published_at: datetime | None) -> float:
        if published_at is None or self._decay_lambda == 0.0:
            return 1.0
        timestamp = published_at
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta_seconds = max(0.0, (now - timestamp).total_seconds())
        return math.exp(-self._decay_lambda * delta_seconds)

    def _relevance_score(self, source: EvidenceSource, claim_terms: set[str]) -> float:
        if not claim_terms:
            return 0.5

        evidence_terms = self._keywords(source.summary)
        evidence_terms.update(self._keywords(source.title))
        for tag in source.tags:
            evidence_terms.update(self._keywords(tag))

        if not evidence_terms:
            return 0.3

        overlap = claim_terms.intersection(evidence_terms)
        union = claim_terms.union(evidence_terms)
        if not union:
            return 0.3

        jaccard = len(overlap) / len(union)
        focus_bonus = 0.05 * min(len(overlap), 5)
        return _clamp(jaccard + focus_bonus, 0.0, 1.0)

    def _claim_terms(self, claim: FactCheckClaim) -> set[str]:
        terms = self._keywords(claim.statement)
        if claim.category:
            terms.add(claim.category.lower())
        for entity in claim.focus_entities:
            terms.update(self._keywords(entity))
        for value in claim.metadata.values():
            if isinstance(value, str):
                terms.update(self._keywords(value))
        return terms

    def _keywords(self, text: str) -> set[str]:
        if not text:
            return set()
        return set(_cached_keywords(text))
