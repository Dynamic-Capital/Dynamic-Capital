from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_generator import (
    DynamicGenerator,
    GenerationResult,
    GeneratorContext,
    GeneratorTemplate,
)


def test_template_renders_with_context_variables() -> None:
    template = GeneratorTemplate(
        name="Welcome",
        template="Hello {name}, welcome to {purpose}!",
        tags=("warm", "email"),
    )
    context = GeneratorContext(
        purpose="Liquidity Network",
        audience="Priority partners",
        tone="Warm",
        variables={"name": "Amina"},
        tags=("email",),
    )

    generator = DynamicGenerator()
    generator.register(template)

    result = generator.generate(context)
    artifact = result.best()
    assert artifact is not None
    assert "Amina" in artifact.content
    assert "Liquidity Network" in artifact.content


def test_generation_respects_guardrails_and_history() -> None:
    trusted = GeneratorTemplate(
        name="trusted",
        template="Primary update for {audience}",
        tags=("email", "warm"),
    )
    risky = GeneratorTemplate(
        name="risky",
        template="Legacy recap",
        tags=("legacy",),
    )

    context = GeneratorContext(
        purpose="Treasury alignment",
        audience="Executive desk",
        tone="Warm",
        guardrail_tags=("legacy",),
        tags=("email",),
    )

    generator = DynamicGenerator(history_limit=2)
    generator.register_many([trusted, risky])

    first = generator.generate(context)
    assert first.best() is not None
    assert first.best().template.name == "trusted"

    second = generator.generate(context)
    assert second.best() is not None
    assert second.best().template.name == "trusted"


def test_generation_raises_with_no_templates() -> None:
    generator = DynamicGenerator()
    context = GeneratorContext(purpose="Test", audience="Ops")

    with pytest.raises(ValueError):
        generator.generate(context)


def test_generation_returns_metrics() -> None:
    template = GeneratorTemplate(name="alpha", template="Ping {audience}")
    context = GeneratorContext(
        purpose="Check-in",
        audience="Liquidity team",
        priority=0.8,
        tags=("ops",),
        variables={"window": "48h"},
        timestamp=datetime(2024, 6, 1, tzinfo=timezone.utc),
    )

    generator = DynamicGenerator()
    generator.register(template)

    result = generator.generate(context)
    assert isinstance(result, GenerationResult)
    payload = result.as_payload()
    assert payload["context"]["audience"] == "Liquidity team"
    assert payload["metrics"]["available_templates"] >= 1
