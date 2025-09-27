from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable, Mapping, Sequence

__all__ = [
    "DQAContext",
    "DQAPrinciple",
    "DQARule",
    "DQAQuestion",
    "DQAAnswer",
    "DQAPair",
    "DynamicQuestionAnswerAlgo",
]

_QUESTION_ORDER: tuple[str, ...] = ("what", "why", "how", "when", "where", "who")
_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9']+")


def _normalise_tokens(values: Iterable[str | None]) -> frozenset[str]:
    tokens: set[str] = set()
    for value in values:
        if not value:
            continue
        for token in _TOKEN_PATTERN.findall(value.lower()):
            tokens.add(token)
    return frozenset(tokens)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


@dataclass(slots=True)
class DQAContext:
    """Describes the operational scenario used to generate QA guidance."""

    theme: str
    scenario: str
    stakeholders: Sequence[str] = field(default_factory=tuple)
    objectives: Sequence[str] = field(default_factory=tuple)
    constraints: Sequence[str] = field(default_factory=tuple)
    timeframe: str | None = None
    environment: str | None = None
    metadata: Mapping[str, object] = field(default_factory=dict)

    def keywords(self) -> frozenset[str]:
        """Return a deduplicated keyword set used for relevance scoring."""

        segments: list[str] = [self.theme, self.scenario]
        if self.environment:
            segments.append(self.environment)
        if self.timeframe:
            segments.append(self.timeframe)
        segments.extend(self.stakeholders)
        segments.extend(self.objectives)
        segments.extend(self.constraints)
        segments.extend(map(str, self.metadata.keys()))
        return _normalise_tokens(segments)

    def primary_actor(self) -> str:
        return self.stakeholders[0] if self.stakeholders else "the team"

    def primary_objective(self) -> str:
        return self.objectives[0] if self.objectives else "the stated objectives"

    def primary_constraint(self) -> str:
        return self.constraints[0] if self.constraints else "the existing constraints"

    def describe_theme(self) -> str:
        return self.theme or "the current initiative"

    def describe_scenario(self) -> str:
        return self.scenario or "the situation at hand"


@dataclass(slots=True)
class DQAPrinciple:
    """High-level guiding principle that frames an answer."""

    identifier: str
    summary: str
    tags: Sequence[str] = field(default_factory=tuple)
    priority: float = 1.0
    guardrails: Sequence[str] = field(default_factory=tuple)

    def relevance(self, keywords: frozenset[str]) -> float:
        if not self.tags:
            base_score = 0.6
        else:
            matches = sum(1 for tag in self.tags if tag.lower() in keywords)
            base_score = matches / len(self.tags)
        priority_boost = 0.05 * (self.priority - 1.0)
        return _clamp(base_score + priority_boost)

    def to_dict(self) -> Mapping[str, object]:
        return {
            "identifier": self.identifier,
            "summary": self.summary,
            "tags": list(self.tags),
            "priority": self.priority,
            "guardrails": list(self.guardrails),
        }


@dataclass(slots=True)
class DQARule:
    """Operational rule that translates a principle into concrete action."""

    identifier: str
    description: str
    tags: Sequence[str] = field(default_factory=tuple)
    priority: float = 1.0

    def relevance(self, keywords: frozenset[str]) -> float:
        if not self.tags:
            base_score = 0.55
        else:
            matches = sum(1 for tag in self.tags if tag.lower() in keywords)
            base_score = matches / len(self.tags)
        priority_boost = 0.04 * (self.priority - 1.0)
        return _clamp(base_score + priority_boost)

    def to_dict(self) -> Mapping[str, object]:
        return {
            "identifier": self.identifier,
            "description": self.description,
            "tags": list(self.tags),
            "priority": self.priority,
        }


@dataclass(slots=True)
class DQAQuestion:
    """WH-style question produced by the algorithm."""

    question_type: str
    prompt: str

    def to_dict(self) -> Mapping[str, str]:
        return {"type": self.question_type, "prompt": self.prompt}


@dataclass(slots=True)
class DQAAnswer:
    """Principle and rule backed answer for a generated question."""

    principle: DQAPrinciple
    rules: Sequence[DQARule]
    synthesis: str
    confidence: float

    def to_dict(self) -> Mapping[str, object]:
        return {
            "principle": self.principle.to_dict(),
            "rules": [rule.to_dict() for rule in self.rules],
            "synthesis": self.synthesis,
            "confidence": self.confidence,
        }


@dataclass(slots=True)
class DQAPair:
    """Convenience container for a generated question-answer pair."""

    question: DQAQuestion
    answer: DQAAnswer

    def to_dict(self) -> Mapping[str, object]:
        return {
            "question": self.question.to_dict(),
            "answer": self.answer.to_dict(),
        }


class DynamicQuestionAnswerAlgo:
    """Generate dynamic WH questions with principle and rule backed answers."""

    def __init__(
        self,
        *,
        principles: Sequence[DQAPrinciple] | None = None,
        rules: Sequence[DQARule] | None = None,
        question_types: Sequence[str] | None = None,
        max_rules: int = 3,
    ) -> None:
        ordered_types = tuple(question_types) if question_types else _QUESTION_ORDER
        filtered_types = []
        for q_type in ordered_types:
            token = q_type.lower()
            if token in _QUESTION_ORDER and token not in filtered_types:
                filtered_types.append(token)
        self.question_types: tuple[str, ...] = tuple(filtered_types) or _QUESTION_ORDER
        self.principles: tuple[DQAPrinciple, ...] = tuple(principles or ())
        self.rules: tuple[DQARule, ...] = tuple(rules or ())
        self.max_rules = max(1, max_rules)

    def generate_pairs(self, context: DQAContext, *, limit: int | None = None) -> list[DQAPair]:
        if limit is not None and limit <= 0:
            return []

        keywords = context.keywords()
        ranked_principles = self._rank_principles(keywords)
        ranked_rules = self._rank_rules(keywords)

        question_types = self.question_types[:limit] if limit else self.question_types
        pairs: list[DQAPair] = []

        for q_type in question_types:
            question = self._build_question(q_type, context)
            answer = self._build_answer(q_type, context, ranked_principles, ranked_rules)
            pairs.append(DQAPair(question=question, answer=answer))

        return pairs

    def _rank_principles(self, keywords: frozenset[str]) -> list[tuple[DQAPrinciple, float]]:
        ranked = [(principle, principle.relevance(keywords)) for principle in self.principles]
        ranked.sort(key=lambda item: (item[1], item[0].priority), reverse=True)
        return ranked

    def _rank_rules(self, keywords: frozenset[str]) -> list[tuple[DQARule, float]]:
        ranked = [(rule, rule.relevance(keywords)) for rule in self.rules]
        ranked.sort(key=lambda item: (item[1], item[0].priority), reverse=True)
        return ranked

    def _build_question(self, question_type: str, context: DQAContext) -> DQAQuestion:
        actor = context.primary_actor()
        theme = context.describe_theme()
        scenario = context.describe_scenario()
        objective = context.primary_objective()
        constraint = context.primary_constraint()
        environment = context.environment or "the operating environment"
        timeframe = context.timeframe or "the appropriate cadence"

        if question_type == "what":
            prompt = (
                f"What should {actor} prioritise within {theme} to accomplish {objective}?"
            )
        elif question_type == "why":
            prompt = (
                f"Why is it critical for {actor} to anchor decisions on guiding principles when navigating {scenario}?"
            )
        elif question_type == "how":
            prompt = (
                f"How can {actor} translate principle-driven intent into actionable rules while respecting {constraint}?"
            )
        elif question_type == "when":
            prompt = (
                f"When should {actor} revisit or escalate the rule-set during {theme} initiatives to stay aligned with {timeframe}?"
            )
        elif question_type == "where":
            prompt = (
                f"Where within {environment} do the defined rules create the most leverage for {actor}?"
            )
        elif question_type == "who":
            prompt = (
                f"Who is accountable for applying the recommended rules so that {objective} remains on track?"
            )
        else:
            prompt = f"What is the optimal approach for {actor} given {scenario}?"
        return DQAQuestion(question_type=question_type, prompt=prompt)

    def _build_answer(
        self,
        question_type: str,
        context: DQAContext,
        ranked_principles: Sequence[tuple[DQAPrinciple, float]],
        ranked_rules: Sequence[tuple[DQARule, float]],
    ) -> DQAAnswer:
        principle, principle_score = self._select_principle(context, ranked_principles)
        rules, rule_score = self._select_rules(context, ranked_rules)
        confidence = self._calculate_confidence(principle_score, rule_score)

        synthesis_parts = [
            f"Principle – {principle.identifier}: {principle.summary}.",
            "Rules – "
            + "; ".join(f"{rule.identifier}: {rule.description}" for rule in rules),
        ]

        if principle.guardrails:
            synthesis_parts.append(
                "Guardrails: " + ", ".join(principle.guardrails)
            )

        if question_type == "why":
            synthesis_parts.append(
                f"This ensures {context.primary_actor()} defends {context.primary_objective()} despite {context.primary_constraint()}."
            )
        elif question_type == "how":
            synthesis_parts.append(
                "Apply each rule sequentially, monitoring feedback loops for drift."
            )
        else:
            synthesis_parts.append(
                f"Align these steps with {context.describe_theme()} to sustain accountability."
            )

        synthesis = " ".join(synthesis_parts)
        return DQAAnswer(principle=principle, rules=rules, synthesis=synthesis, confidence=confidence)

    def _select_principle(
        self,
        context: DQAContext,
        ranked_principles: Sequence[tuple[DQAPrinciple, float]],
    ) -> tuple[DQAPrinciple, float]:
        if ranked_principles:
            return ranked_principles[0]
        fallback = DQAPrinciple(
            identifier="context-alignment",
            summary=f"Align decisions with {context.describe_theme()} goals while keeping accountability clear.",
            tags=(),
            priority=1.0,
            guardrails=("Document rationale for each decision", "Review outcomes frequently"),
        )
        return fallback, 0.5

    def _select_rules(
        self,
        context: DQAContext,
        ranked_rules: Sequence[tuple[DQARule, float]],
    ) -> tuple[tuple[DQARule, ...], float]:
        if ranked_rules:
            top_rules = tuple(rule for rule, _ in ranked_rules[: self.max_rules])
            average_score = sum(score for _, score in ranked_rules[: self.max_rules]) / min(
                len(ranked_rules), self.max_rules
            )
            return top_rules, average_score
        fallback_rule = DQARule(
            identifier="establish-feedback-loop",
            description=(
                f"Set measurable checkpoints for {context.primary_objective()} and adjust when {context.primary_constraint()} is threatened."
            ),
            tags=(),
            priority=1.0,
        )
        return (fallback_rule,), 0.5

    def _calculate_confidence(self, principle_score: float, rule_score: float) -> float:
        baseline = 0.4
        return round(_clamp(baseline + 0.3 * principle_score + 0.3 * rule_score), 2)
