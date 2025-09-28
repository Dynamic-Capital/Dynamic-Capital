"""Utility bot that exposes :class:`dynamic_engineer.agent.DynamicEngineerAgent`."""

from __future__ import annotations

from typing import Mapping

from .agent import DynamicEngineerAgent

__all__ = ["DynamicEngineerBot"]


class DynamicEngineerBot:
    """Minimal façade for driving the engineer agent from chat interfaces."""

    def __init__(self, agent: DynamicEngineerAgent | None = None) -> None:
        self.agent = agent or DynamicEngineerAgent()

    def generate(self, payload: Mapping[str, object]) -> dict[str, object]:
        """Return a conversational response and structured agent output."""

        result = self.agent.run(payload)
        blueprint = result.blueprint.as_dict()
        schedule = blueprint.get("scheduled_tasks", [])
        summary = result.rationale
        if schedule:
            scheduled_tasks = ", ".join(f"{task[0]} ({task[1]}h)" for task in schedule[:3])
            summary += f" Upcoming focus: {scheduled_tasks}."
        response = {
            "message": summary,
            "agent": result.to_dict(),
        }
        return response
