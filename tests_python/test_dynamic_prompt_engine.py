"""Tests for the dynamic prompt engine utilities."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Mapping

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic.intelligence.ai_apps.prompt_engine import (
    DynamicPromptEngine,
    MissingContextError,
    PromptMessage,
    PromptTemplate,
    compose_context,
)


def test_prompt_template_render_success() -> None:
    template = PromptTemplate(
        name="research",
        description="Research assistant template",
        messages=(
            PromptMessage(role="system", content="You are {persona} reviewing macro drivers."),
            PromptMessage(role="user", content="Analyse {ticker} with a focus on {focus}."),
        ),
    )

    rendered = template.render(
        {"persona": "Strategist", "ticker": "BTC", "focus": "volatility regime"}
    )

    assert rendered.missing_variables == ()
    chat_messages = rendered.to_chat_messages()
    assert chat_messages[0]["content"].startswith("You are Strategist")
    assert "volatility regime" in chat_messages[1]["content"]


def test_prompt_template_missing_context_error() -> None:
    template = PromptTemplate(
        name="summary",
        messages=(
            PromptMessage(role="system", content="Summarise {topic}"),
            PromptMessage(role="user", content="Highlight the {focus}"),
        ),
    )

    with pytest.raises(MissingContextError) as exc:
        template.render({"topic": "liquidity"})

    assert exc.value.missing == ("focus",)


def test_dynamic_prompt_engine_macro_populates_missing_values() -> None:
    template = PromptTemplate(
        name="risk_report",
        messages=(
            PromptMessage(role="system", content="Persona: {persona}"),
            PromptMessage(
                role="assistant",
                content="Provide a risk summary: {summary}",
            ),
        ),
    )

    engine = DynamicPromptEngine(base_context={"persona": "Risk Navigator"})
    engine.register_template(template)

    def build_summary(context: Mapping[str, object]) -> str:
        signal = context.get("signal", "neutral")
        persona = context.get("persona", "Analyst")
        return f"{persona} observes {signal} conditions"

    engine.register_macro("summary", build_summary)

    rendered = engine.build_prompt("risk_report", context={"signal": "elevated"})

    assert rendered.missing_variables == ()
    formatted = rendered.to_formatted_string()
    assert "Risk Navigator observes elevated conditions" in formatted


def test_compose_context_layers_merges_with_precedence() -> None:
    merged = compose_context({"ticker": "BTC", "window": "1h"}, None, {"window": "4h", "limit": 5})
    assert merged == {"ticker": "BTC", "window": "4h", "limit": 5}


def test_rendered_prompt_formatted_string_without_roles() -> None:
    template = PromptTemplate(
        name="formatting",
        messages=(
            PromptMessage(role="system", content="Context {context}"),
            PromptMessage(role="user", content="Question {question}"),
        ),
    )
    rendered = template.render({"context": "macro", "question": "What next?"})

    formatted_with_roles = rendered.to_formatted_string()
    formatted_without_roles = rendered.to_formatted_string(include_roles=False)

    assert "system:" in formatted_with_roles.lower()
    assert "Context macro" in formatted_with_roles
    assert formatted_without_roles == "Context macro\n\nQuestion What next?"
