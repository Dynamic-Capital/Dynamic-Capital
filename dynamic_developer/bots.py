from __future__ import annotations

"""Automation bots that wrap the developer agent for quick usage."""

from dataclasses import dataclass
from typing import Any, Mapping, MutableMapping, Sequence

from dynamic_dev_engine import DevelopmentTask

from .agents import DeveloperAgentResultEnvelope
from .keepers import DeveloperKeeper

__all__ = ["DeveloperBotReport", "DeveloperBot"]


@dataclass(slots=True)
class DeveloperBotReport:
    """Human friendly report prepared by :class:`DeveloperBot`."""

    summary: str
    blockers: tuple[str, ...]
    playbook_highlights: Mapping[str, tuple[str, ...]]
    notes: MutableMapping[str, Any]

    def to_dict(self) -> MutableMapping[str, Any]:
        return {
            "summary": self.summary,
            "blockers": list(self.blockers),
            "playbook_highlights": {
                role: list(items) for role, items in self.playbook_highlights.items()
            },
            "notes": dict(self.notes),
        }


class DeveloperBot:
    """Convenience wrapper that exposes a one-shot planning interface."""

    def __init__(self, keeper: DeveloperKeeper | None = None) -> None:
        self._keeper = keeper or DeveloperKeeper()

    def plan(
        self,
        tasks: Sequence[DevelopmentTask | Mapping[str, Any]] | Mapping[str, Any] | DevelopmentTask,
        *,
        capacity: object | None = None,
        iteration: str | None = None,
        objectives: Sequence[str] | object | None = None,
        context: Mapping[str, Any] | None = None,
        horizon_days: int = 5,
    ) -> DeveloperBotReport:
        """Run the planning workflow and generate a textual report."""

        result = self._keeper.sync(
            tasks,
            capacity=capacity,
            iteration=iteration,
            objectives=objectives,
            context=context,
            horizon_days=horizon_days,
        )
        return self._build_report(result)

    def _build_report(self, result: DeveloperAgentResultEnvelope) -> DeveloperBotReport:
        highlights: MutableMapping[str, tuple[str, ...]] = {}
        for role, playbook in result.playbooks.items():
            highlights[role] = playbook.workflow
        notes = dict(result.notes)
        notes.setdefault("roles", list(result.model.roles.keys()))
        return DeveloperBotReport(
            summary=result.summary(),
            blockers=result.blockers,
            playbook_highlights=highlights,
            notes=notes,
        )

    @property
    def history(self):
        """Expose the underlying keeper history."""

        return self._keeper.history
