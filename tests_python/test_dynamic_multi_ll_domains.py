from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_multi_ll import LLModelDescriptor, MultiLLModel, MultiLLResponse  # noqa: E402
from dynamic_ai import DynamicAIMultiLLCoordinator  # noqa: E402
from dynamic_ai.core import AISignal  # noqa: E402
from dynamic_agi import DynamicAGIMultiLLCoordinator, ImprovementPlan  # noqa: E402
from dynamic_playbook import DynamicAGSMultiLLCoordinator  # noqa: E402


@pytest.fixture()
def ensemble() -> MultiLLModel:
    return MultiLLModel(
        (
            LLModelDescriptor(name="Atlas", provider="openai", weight=1.0),
            LLModelDescriptor(name="Zephyr", provider="anthropic", weight=0.9),
            LLModelDescriptor(name="Nova", provider="google", weight=1.1),
        ),
        consensus_threshold=0.55,
    )


def test_dynamic_ai_multi_ll_generates_signal(ensemble: MultiLLModel) -> None:
    coordinator = DynamicAIMultiLLCoordinator(ensemble)

    def adapter(descriptor: LLModelDescriptor, _: object) -> MultiLLResponse:
        metadata = {
            "score": 0.8 if descriptor.name != "Zephyr" else 0.6,
            "weight": descriptor.weight,
        }
        return MultiLLResponse(
            model_name=descriptor.name,
            provider=descriptor.provider,
            content="BUY signal with strong positive catalysts.",
            confidence=0.75,
            metadata=metadata,
        )

    result = coordinator.generate_signal(
        task="Decide whether to increase exposure to the growth basket.",
        market_context="Momentum improving across revenue leaders with low volatility.",
        adapter=adapter,  # type: ignore[arg-type]
        signals=("BUY", "HOLD"),
        base_action="NEUTRAL",
        risk_overrides={"max_position": 0.35},
    )

    assert isinstance(result.signal, AISignal)
    assert result.signal.action == "BUY"
    assert result.metrics["weighted_score"] > 0.0
    assert "BUY signal" in result.signal.reasoning
    assert pytest.approx(result.metrics["ensemble_weight"], rel=1e-6) == 3.0


def test_dynamic_agi_multi_ll_builds_improvement_plan(ensemble: MultiLLModel) -> None:
    coordinator = DynamicAGIMultiLLCoordinator(ensemble)

    def adapter(descriptor: LLModelDescriptor, _: object) -> MultiLLResponse:
        metadata = {
            "focus": ("research infrastructure", "evaluation"),
            "actions": [f"Implement {descriptor.name} self-play harness"],
            "feedback": ["Balance exploration and exploitation"],
            "metrics": {"reliability": 0.72, "alignment": 0.68},
            "introspection": {"confidence": 0.7},
            "roadmap": (
                {"step": "Deploy harness", "owner": "research"},
            ),
        }
        return MultiLLResponse(
            model_name=descriptor.name,
            provider=descriptor.provider,
            content="Prioritise self-play evaluation and reinforce governance checks.",
            confidence=0.7,
            metadata=metadata,
        )

    result = coordinator.generate_plan(
        mission_brief="Evolve Dynamic AGI towards higher reliability and autonomy.",
        adapter=adapter,  # type: ignore[arg-type]
        telemetry={"sessions": 42, "incidents": 1},
        focus=("reliability", "safety"),
        feedback=("Improve evaluation depth",),
    )

    assert isinstance(result.plan, ImprovementPlan)
    assert "self-play" in " ".join(result.plan.actions).lower()
    assert result.plan.metrics["reliability"] == pytest.approx(0.72)
    assert result.plan.summary["confidence"] == pytest.approx(result.aggregate.confidence)


def test_dynamic_ags_multi_ll_briefing(ensemble: MultiLLModel) -> None:
    coordinator = DynamicAGSMultiLLCoordinator(ensemble)

    def adapter(descriptor: LLModelDescriptor, _: object) -> MultiLLResponse:
        metadata = {
            "tags": ["governance", "risk"],
            "escalations": ["operator", "owner"],
            "agenda": [f"Review {descriptor.name} deployment"],
        }
        return MultiLLResponse(
            model_name=descriptor.name,
            provider=descriptor.provider,
            content="Codify rollout sequencing with explicit escalation owners.",
            confidence=0.65,
            metadata=metadata,
        )

    result = coordinator.generate_briefing(
        governance_context="Coordinate AGS governance council expansion.",
        adapter=adapter,  # type: ignore[arg-type]
        focus=("escalation", "policy"),
        agenda=("Control plane readiness",),
    )

    assert "escalation" in result.briefing.lower()
    assert set(result.tags) == {"governance", "risk"}
    assert any(item.startswith("Review") for item in result.agenda)
    assert result.metrics["consensus_ratio"] >= 0.0
