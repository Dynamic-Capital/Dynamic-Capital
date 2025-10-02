from __future__ import annotations

"""Agent orchestrators for the Dynamic developer planning toolkit."""

from dataclasses import dataclass, field
from typing import Any, Mapping, MutableMapping, Sequence

from dynamic_dev_engine import DevelopmentTask, DynamicDevEngine
from dynamic_development_team import (
    DevelopmentAgentResult,
    DevelopmentTeamAgent,
    list_development_agents,
)

from .helpers import (
    ensure_capacity_payload,
    ensure_task_sequence,
    extract_objectives,
    summarise_backlog,
)
from .model import DeveloperModel, build_developer_model

__all__ = [
    "DeveloperAgentResultEnvelope",
    "DeveloperAgent",
    "list_developer_agents",
]


@dataclass(slots=True)
class DeveloperAgentResultEnvelope:
    """Composite result produced by :class:`DeveloperAgent`."""

    model: DeveloperModel
    playbooks: Mapping[str, DevelopmentAgentResult]
    blockers: tuple[str, ...]
    notes: MutableMapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a high level description of the iteration plan."""

        return self.model.summary()

    def to_dict(self) -> MutableMapping[str, Any]:
        """Serialise the result for downstream consumers."""

        return {
            "model": self.model.to_dict(),
            "playbooks": {role: result.to_dict() for role, result in self.playbooks.items()},
            "blockers": list(self.blockers),
            "notes": dict(self.notes),
            "summary": self.summary(),
        }


class DeveloperAgent:
    """Bridge Dynamic dev planning with role-specific playbooks."""

    def __init__(
        self,
        *,
        engine: DynamicDevEngine | None = None,
        team_agents: Mapping[str, DevelopmentTeamAgent] | None = None,
    ) -> None:
        self._engine = engine or DynamicDevEngine()
        self._team_agents = dict(team_agents or list_development_agents())

    def _run_playbooks(
        self, model: DeveloperModel, context: Mapping[str, Any] | None
    ) -> Mapping[str, DevelopmentAgentResult]:
        payload: dict[str, DevelopmentAgentResult] = {}
        base_context = dict(context or {})
        for role, agent in self._team_agents.items():
            role_model = model.roles.get(role)
            role_context = dict(base_context)
            if role_model is not None:
                role_context.setdefault("focus", role_model.focus)
                role_context.setdefault("capacity", role_model.capacity.as_dict())
                role_context.setdefault(
                    "scheduled_tasks",
                    [task.as_dict() for task in role_model.scheduled_tasks],
                )
            payload[role] = agent.run(role_context)
        return payload

    def run(
        self,
        tasks: Sequence[DevelopmentTask | Mapping[str, Any]] | Mapping[str, Any] | DevelopmentTask,
        *,
        capacity: object | None = None,
        iteration: str | None = None,
        objectives: Sequence[str] | object | None = None,
        context: Mapping[str, Any] | None = None,
        horizon_days: int = 5,
    ) -> DeveloperAgentResultEnvelope:
        """Plan the iteration and enrich it with playbook context."""

        task_sequence = ensure_task_sequence(tasks)
        capacity_payload = ensure_capacity_payload(capacity)
        objective_payload = objectives or extract_objectives(context)
        model = build_developer_model(
            task_sequence,
            capacity=capacity_payload,
            iteration=iteration,
            objectives=objective_payload,
            horizon_days=horizon_days,
            engine=self._engine,
        )
        playbooks = self._run_playbooks(model, context)
        notes: MutableMapping[str, Any] = {
            "backlog_summary": summarise_backlog(task_sequence),
            "iteration": model.iteration,
        }
        if context:
            notes["context"] = dict(context)
        return DeveloperAgentResultEnvelope(
            model=model,
            playbooks=playbooks,
            blockers=model.blueprint.blockers,
            notes=notes,
        )


def list_developer_agents() -> Mapping[str, DevelopmentTeamAgent]:
    """Expose the development team agents referenced by the developer agent."""

    return dict(list_development_agents())
