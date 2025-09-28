"""Utility bot bridging architecture personas into conversational flows."""

from __future__ import annotations

from typing import Mapping

from .agent import DynamicArchitectAgent

__all__ = ["DynamicArchitectBot"]


class DynamicArchitectBot:
    """Convenience layer for deploying the architect agent."""

    def __init__(self, agent: DynamicArchitectAgent | None = None) -> None:
        self.agent = agent or DynamicArchitectAgent()

    def generate(self, payload: Mapping[str, object]) -> dict[str, object]:
        result = self.agent.run(payload)
        blueprint = result.blueprint.as_dict()
        recommendations = blueprint.get("recommendations", [])
        message = result.rationale
        if recommendations:
            highlights = "; ".join(recommendations[:2])
            message += f" Key recommendations: {highlights}."
        return {
            "message": message,
            "agent": result.to_dict(),
        }
