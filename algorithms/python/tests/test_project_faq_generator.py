import json
from dataclasses import replace
from typing import Any, Dict, Iterable, Sequence

import pytest

from algorithms.python.project_faq_generator import (
    FAQEntry,
    FAQRequest,
    FAQSource,
    ProjectFAQGenerator,
)
from algorithms.python.multi_llm import LLMConfig


class StubClient:
    def __init__(self, responses: Sequence[str]) -> None:
        self.responses = list(responses)
        self.calls: list[Dict[str, Any]] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self.responses:
            raise RuntimeError("No responses queued")
        return self.responses.pop(0)


@pytest.fixture()
def faq_request() -> FAQRequest:
    return FAQRequest(
        project_name="Dynamic Capital Intelligence Cloud",
        project_summary="An orchestration layer that blends human desks with autonomous agents",
        target_audience=("institutional investors", "internal quant desks"),
        differentiators=("multi-LLM routing", "real-time macro telemetry"),
        objectives=("shorten onboarding", "increase transparency"),
        tone="pragmatic and trustworthy",
        sources=(
            FAQSource(
                title="README",
                content="""Dynamic Capital unlocks an institutional operating system with autonomous strategy pods.""",
            ),
            FAQSource(
                title="Product Vision",
                content="""Our roadmap emphasises explainable AI, compliance-first automation, and liquidity-aware execution.""",
            ),
        ),
        seed_questions=("How does governance work?",),
        existing_faq={"What is Dynamic Capital?": "Dynamic Capital is a next-gen asset manager."},
        priority_topics=("How do autonomous agents collaborate",),
    )


def _config(client: StubClient) -> LLMConfig:
    return LLMConfig(name="stub", client=client, temperature=0.2, nucleus_p=0.9, max_tokens=512)


def test_generator_coalesces_multi_llm_workflow(faq_request: FAQRequest) -> None:
    ideation_payload = {
        "summary": "FAQ focuses on onboarding, automation, and oversight.",
        "questions": [
            {
                "question": "How does Dynamic Capital orchestrate multiple LLMs?",
                "audience": "investors",
                "intent": "Explain the platform architecture",
                "tags": ["architecture", "ai"],
                "priority": 0.9,
            },
            {"question": "What safeguards are in place for compliance?", "priority": 0.8},
        ],
    }

    answer_payloads = [
        {
            "answer": "Dynamic Capital routes prompts through specialised Grok and DeepSeek models.",
            "tags": ["architecture"],
            "audience": "technology leaders",
            "source_notes": ["README"],
        },
        {"answer": "Compliance is embedded via audit logs and policy-aware agents."},
        {"answer": "Governance combines human sign-off with automated guardrails."},
        {"answer": "Agents collaborate via shared telemetry and escalation protocols."},
    ]

    review_payload = {
        "faqs": [
            {
                "question": "How does Dynamic Capital orchestrate multiple LLMs?",
                "answer": "Dynamic Capital ensembles Grok and DeepSeek with routing heuristics.",
                "tags": ["architecture", "automation"],
                "audience": "technology leaders",
            },
            {
                "question": "What safeguards are in place for compliance?",
                "answer": "Policy-aware agents enforce approvals and surface audit-ready trails.",
            },
            {
                "question": "How does governance work?",
                "answer": "Governance combines human committees with smart-contract guardrails.",
            },
            {
                "question": "How do autonomous agents collaborate?",
                "answer": "Agents exchange telemetry through the intelligence cloud and escalate to humans when thresholds trigger.",
            },
        ],
        "summary": "The FAQ highlights orchestration, compliance, governance, and collaboration pillars.",
        "callouts": ["Review regulatory messaging with legal"],
    }

    ideation_client = StubClient([json.dumps(ideation_payload)])
    answer_client = StubClient([json.dumps(payload) for payload in answer_payloads])
    review_client = StubClient([json.dumps(review_payload)])

    generator = ProjectFAQGenerator(
        ideation=_config(ideation_client),
        answer=_config(answer_client),
        review=_config(review_client),
        max_questions=6,
    )

    package = generator.generate(faq_request)

    assert package.summary == review_payload["summary"]
    assert package.callouts == review_payload["callouts"]
    assert len(package.entries) == 4
    questions = [entry.question for entry in package.entries]
    assert "How does Dynamic Capital orchestrate multiple LLMs?" in questions
    assert "What safeguards are in place for compliance?" in questions
    assert "How does governance work?" in questions
    assert "How do autonomous agents collaborate?" in questions

    prompt = ideation_client.calls[0]["prompt"]
    assert "Project dossier" in prompt
    assert "Dynamic Capital Intelligence Cloud" in prompt
    assert "Supplemental knowledge base" in prompt

    answer_prompts = [call["prompt"] for call in answer_client.calls]
    assert any("Draft a crisp FAQ answer" in prompt for prompt in answer_prompts)
    assert any("How does Dynamic Capital orchestrate multiple LLMs?" in prompt for prompt in answer_prompts)

    review_prompt = review_client.calls[0]["prompt"]
    assert "Review the drafted entries" in review_prompt
    assert "Draft FAQ package" in review_prompt

    assert package.metadata["existing_faq_count"] == 1
    assert package.metadata["question_count"] == 4
    assert package.metadata["ideation_payload"]["summary"].startswith("FAQ focuses")
    assert package.raw_response is not None


def test_generator_handles_text_fallbacks(faq_request: FAQRequest) -> None:
    ideation_payload = {"questions": ["What is the pricing model?", "How secure is the platform?"]}

    answer_responses = [
        "Pricing is usage-based with enterprise tiers.",
        json.dumps({"response": "We secure workloads with SOC2-aligned controls."}),
    ]

    ideation_client = StubClient([json.dumps(ideation_payload)])
    answer_client = StubClient(answer_responses)

    generator = ProjectFAQGenerator(
        ideation=_config(ideation_client),
        answer=_config(answer_client),
        max_questions=5,
    )

    package = generator.generate(replace(faq_request, seed_questions=(), priority_topics=()))

    assert any(entry.answer.startswith("Pricing is usage-based") for entry in package.entries)
    assert any("SOC2-aligned" in entry.answer for entry in package.entries)
    assert package.summary is None
    assert package.callouts == []


def test_review_payload_optional_fields(faq_request: FAQRequest) -> None:
    ideation_payload = {"questions": ["What data sources fuel the agents?"]}
    answer_payload = {"answer": "Agents monitor FX, equities, and on-chain feeds."}
    review_payload = {"callouts": ["Validate data licensing"]}

    ideation_client = StubClient([json.dumps(ideation_payload)])
    answer_client = StubClient([json.dumps(answer_payload)])
    review_client = StubClient([json.dumps(review_payload)])

    generator = ProjectFAQGenerator(
        ideation=_config(ideation_client),
        answer=_config(answer_client),
        review=_config(review_client),
    )

    package = generator.generate(replace(faq_request, seed_questions=(), priority_topics=()))

    assert isinstance(package.summary, type(None))
    assert package.callouts == ["Validate data licensing"]
    assert len(package.entries) == 2  # includes existing FAQ
    assert any(isinstance(entry, FAQEntry) for entry in package.entries)


@pytest.mark.parametrize(
    "raw_questions",
    [
        None,
        [],
        ["  "],
        [{"question": ""}],
    ],
)
def test_normalise_questions_handles_empty_payload(raw_questions: Iterable[Any], faq_request: FAQRequest) -> None:
    ideation_client = StubClient([json.dumps({"questions": raw_questions})])
    answer_client = StubClient([json.dumps({"answer": "Placeholder"})])

    generator = ProjectFAQGenerator(
        ideation=_config(ideation_client),
        answer=_config(answer_client),
    )

    package = generator.generate(replace(faq_request, seed_questions=(), priority_topics=()))

    # Only existing FAQ should be present when no new questions are generated
    assert [entry.question for entry in package.entries] == ["What is Dynamic Capital?"]

