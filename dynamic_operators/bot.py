"""Utility bot bridging the operator persona into conversational flows."""

from __future__ import annotations

from typing import Mapping

from .agent import DynamicOperatorAgent

__all__ = ["DynamicOperatorBot"]


class DynamicOperatorBot:
    """Convenience layer for deploying the operations agent."""

    def __init__(self, agent: DynamicOperatorAgent | None = None) -> None:
        self.agent = agent or DynamicOperatorAgent()

    def generate(self, payload: Mapping[str, object]) -> dict[str, object]:
        result = self.agent.run(payload)
        plan = result.plan.as_dict()
        recommendations = plan.get("recommendations", [])
        message = result.rationale
        if recommendations:
            highlights = "; ".join(recommendations[:2])
            message += f" Key recommendations: {highlights}."
        return {
            "message": message,
            "agent": result.to_dict(),
        }
