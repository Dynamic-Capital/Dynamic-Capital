"""Conversational bot wrapper for the architecture agent."""

from __future__ import annotations

from typing import Mapping

from .agent import DynamicArchitectureAgent

__all__ = ["DynamicArchitectureBot"]


class DynamicArchitectureBot:
    """Generate conversational payloads using :class:`DynamicArchitectureAgent`."""

    def __init__(self, agent: DynamicArchitectureAgent | None = None) -> None:
        self.agent = agent or DynamicArchitectureAgent()

    def generate(self, payload: Mapping[str, object]) -> Mapping[str, object]:
        result = self.agent.run(payload)
        message = result.summary
        if result.highlights:
            message += " Highlights: " + "; ".join(result.highlights[:2]) + "."
        return {
            "message": message,
            "agent": result.to_dict(),
        }

