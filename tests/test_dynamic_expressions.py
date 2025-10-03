import pytest

from dynamic_expressions import (
    DynamicExpressions,
    ExpressionContext,
    ExpressionDigest,
    ExpressionElement,
    MissingVariablesError,
)


def test_expression_element_normalisation_and_environment() -> None:
    element = ExpressionElement(
        name="  Revenue Momentum  ",
        expression=" (base_revenue + uplift) * (1 + growth_rate) ",
        description="  Blended revenue projection  ",
        weight=-2.5,
        tags=(" Core ", "core", "Growth"),
        baselines={"base_revenue": 120.0},
        metadata={"owner": " RevOps "},
    )

    assert element.name == "Revenue Momentum"
    assert element.expression == "(base_revenue + uplift) * (1 + growth_rate)"
    assert element.description == "Blended revenue projection"
    assert element.weight == 0.0
    assert element.tags == ("core", "growth")
    assert element.baselines == {"base_revenue": 120.0}
    assert element.metadata == {"owner": " RevOps "}
    assert element.dependencies == ("base_revenue", "growth_rate", "uplift")

    value, env = element.evaluate_with_env({"uplift": 30, "growth_rate": 0.25})
    assert pytest.approx(value, rel=1e-6) == 187.5
    assert env["base_revenue"] == pytest.approx(120.0)
    assert env["uplift"] == pytest.approx(30.0)
    assert env["growth_rate"] == pytest.approx(0.25)

    with pytest.raises(MissingVariablesError) as exc:
        element.evaluate({})
    assert exc.value.missing == ("growth_rate", "uplift")


def test_generate_digest_prioritises_emphasis_and_sensitivity() -> None:
    engine = DynamicExpressions(history=5)
    engine.extend(
        [
            {
                "name": "Revenue Lift",
                "expression": "base_revenue * (1 + growth_rate)",
                "description": "Projected revenue under growth scenario",
                "weight": 1.4,
                "tags": ("growth", "core"),
                "baselines": {"base_revenue": 100},
            },
            {
                "name": "Risk Buffer",
                "expression": "volatility_buffer + risk_score",
                "description": "Risk guardrail tracking",
                "weight": 0.9,
                "tags": ("risk",),
            },
            {
                "name": "Efficiency Index",
                "expression": "momentum / drag",
                "description": "Operational efficiency signal",
                "weight": 1.1,
                "tags": ("efficiency",),
                "baselines": {"drag": 2},
            },
            {
                "name": "Pending Metric",
                "expression": "absent_metric + 2",
                "description": "Requires upstream input",
                "tags": ("backlog",),
            },
        ]
    )

    context = ExpressionContext(
        scenario="Growth sprint",
        variables={
            "growth_rate": 0.25,
            "volatility_buffer": 4.0,
            "risk_score": 1.5,
            "momentum": 12.0,
        },
        emphasis_tags=("growth",),
        guardrail_tags=("risk",),
        sensitivity=0.6,
        highlight_limit=2,
        precision=3,
    )

    digest = engine.generate_digest(context)

    assert isinstance(digest, ExpressionDigest)
    assert digest.highlights and len(digest.highlights) <= context.highlight_limit
    assert digest.highlights[0][0] == "Revenue Lift"
    assert "absent_metric" in digest.missing_variables
    assert digest.sensitivity_flags
    assert "Growth sprint" in digest.narrative


def test_generate_digest_validations() -> None:
    engine = DynamicExpressions(history=2)
    context = ExpressionContext(
        scenario="Baseline",
        variables={"x": 3.0},
        highlight_limit=1,
    )

    with pytest.raises(RuntimeError):
        engine.generate_digest(context)

    engine.capture(
        {
            "name": "Simple Expression",
            "expression": "x * 2",
            "description": "Simple doubling",
        }
    )

    with pytest.raises(ValueError):
        engine.generate_digest(context, limit=0)

    digest = engine.generate_digest(context)
    assert isinstance(digest, ExpressionDigest)
    assert digest.highlights


def test_dynamic_expressions_unbounded_history() -> None:
    engine = DynamicExpressions(history=None)

    for index in range(40):
        engine.capture(
            {
                "name": f"Expression {index}",
                "expression": f"x + {index}",
                "description": "Historical expression",
            }
        )

    assert len(engine) == 40


def test_dynamic_expressions_history_validation() -> None:
    with pytest.raises(TypeError):
        DynamicExpressions(history="invalid")  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        DynamicExpressions(history=0)


def test_dynamic_expressions_extend_bulk_capture() -> None:
    payloads = (
        {
            "name": "Alpha",
            "expression": "x + 1",
            "description": "alpha",
        },
        {
            "name": "Beta",
            "expression": "x + 2",
            "description": "beta",
        },
    )

    engine = DynamicExpressions(history=4)
    engine.capture(payloads[0])
    engine.extend(item for item in payloads[1:])

    assert len(engine) == 2
