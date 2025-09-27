from __future__ import annotations

from algorithms.python.dynamic_question_answer_algo import (
    DQAContext,
    DQAPrinciple,
    DQARule,
    DynamicQuestionAnswerAlgo,
)


def test_dynamic_question_answer_algo_generates_structured_pairs() -> None:
    principles = (
        DQAPrinciple(
            identifier="risk-alignment",
            summary="Balance exposure with liquidity buffers during volatile regimes.",
            tags=("risk", "liquidity", "volatility"),
            priority=1.2,
            guardrails=("No single desk exceeds 25% exposure",),
        ),
        DQAPrinciple(
            identifier="communication",
            summary="Keep counterparties informed to prevent coordination gaps.",
            tags=("communication", "stakeholders"),
        ),
    )
    rules = (
        DQARule(
            identifier="hedge-rebalance",
            description="Rebalance hedges when liquidity coverage ratio drops below 1.2x.",
            tags=("liquidity", "rebalance"),
            priority=1.1,
        ),
        DQARule(
            identifier="war-room",
            description="Schedule hourly war-room reviews whenever volatility spikes above 40%.",
            tags=("volatility", "communication"),
        ),
        DQARule(
            identifier="counterparty-brief",
            description="Share updated exposure maps with all stakeholders after each review cycle.",
            tags=("stakeholders", "communication"),
        ),
    )
    context = DQAContext(
        theme="Treasury risk management",
        scenario="a sudden market drawdown",
        stakeholders=("Risk team", "Treasury leads"),
        objectives=("capital preservation", "maintain trading optionality"),
        constraints=("liquidity coverage ratio", "counterparty obligations"),
        timeframe="the next 48 hours",
        environment="the DeFi treasury stack",
    )

    engine = DynamicQuestionAnswerAlgo(principles=principles, rules=rules)
    pairs = engine.generate_pairs(context, limit=4)

    assert len(pairs) == 4
    for pair in pairs:
        assert pair.question.question_type in engine.question_types
        assert pair.question.prompt.endswith("?")
        assert "Principle" in pair.answer.synthesis
        assert "Rules" in pair.answer.synthesis
        assert 0.4 <= pair.answer.confidence <= 1.0
        payload = pair.to_dict()
        assert payload["question"]["type"] == pair.question.question_type
        assert payload["answer"]["principle"]["identifier"]
        assert payload["answer"]["rules"]


def test_dynamic_question_answer_algo_fallback_paths() -> None:
    context = DQAContext(theme="New initiative", scenario="unique situation")

    engine = DynamicQuestionAnswerAlgo(principles=(), rules=())
    pairs = engine.generate_pairs(context, limit=1)

    assert len(pairs) == 1
    pair = pairs[0]
    assert pair.answer.principle.identifier == "context-alignment"
    assert pair.answer.rules[0].identifier == "establish-feedback-loop"
    assert "New initiative" in pair.answer.principle.summary
