"""Assignment heuristics for routing initiatives to the best owners."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "AssignableTask",
    "AgentProfile",
    "AssignmentDecision",
    "DynamicAssignEngine",
]


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _normalise_tuple(items: Iterable[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if not cleaned:
            continue
        if lower:
            cleaned = cleaned.lower()
        if cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class AssignableTask:
    """Unit of work that requires an accountable owner."""

    identifier: str
    description: str
    priority: float = 0.5
    required_skills: tuple[str, ...] = field(default_factory=tuple)
    estimated_effort_hours: float = 4.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier)
        self.description = _normalise_text(self.description)
        self.priority = _clamp(float(self.priority))
        self.required_skills = _normalise_tuple(self.required_skills, lower=True)
        self.estimated_effort_hours = max(float(self.estimated_effort_hours), 0.0)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class AgentProfile:
    """Capability profile describing an execution owner."""

    name: str
    skills: tuple[str, ...]
    available_hours: float
    focus_areas: tuple[str, ...] = field(default_factory=tuple)
    confidence: float = 0.5

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.skills = _normalise_tuple(self.skills, lower=True)
        if not self.skills:
            raise ValueError("an agent must expose at least one skill")
        self.available_hours = max(float(self.available_hours), 0.0)
        self.focus_areas = _normalise_tuple(self.focus_areas, lower=True)
        self.confidence = _clamp(float(self.confidence))

    def skill_overlap(self, requirements: Iterable[str]) -> float:
        required = set(requirements)
        if not required:
            return 1.0
        matched = len(required.intersection(self.skills))
        return matched / len(required)


@dataclass(slots=True)
class AssignmentDecision:
    """Engine output describing a recommended assignment."""

    task_id: str
    agent: str
    rationale: str
    confidence: float
    skill_match: float
    load_factor: float
    issued_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "task_id": self.task_id,
            "agent": self.agent,
            "rationale": self.rationale,
            "confidence": self.confidence,
            "skill_match": self.skill_match,
            "load_factor": self.load_factor,
            "issued_at": self.issued_at.isoformat(),
        }


class DynamicAssignEngine:
    """Heuristic planner that pairs tasks with accountable agents."""

    def __init__(self) -> None:
        self._history: list[AssignmentDecision] = []

    @staticmethod
    def _score(agent: AgentProfile, task: AssignableTask) -> tuple[float, float, float]:
        skill_match = agent.skill_overlap(task.required_skills)
        if agent.available_hours <= 0:
            return (0.0, skill_match, 1.0)
        load_factor = min(task.estimated_effort_hours / agent.available_hours, 1.0)
        availability_score = 1.0 - load_factor
        overall = (skill_match * 0.6) + (availability_score * 0.3) + (agent.confidence * 0.1)
        return overall, skill_match, load_factor

    def recommend_assignments(
        self,
        tasks: Sequence[AssignableTask],
        agents: Sequence[AgentProfile],
        *,
        limit: int | None = None,
    ) -> list[AssignmentDecision]:
        if not tasks:
            return []
        if not agents:
            raise ValueError("at least one agent is required to generate assignments")

        working_agents = [replace(agent) for agent in agents]
        # Sort tasks from highest to lowest priority.
        ordered_tasks = sorted(tasks, key=lambda task: task.priority, reverse=True)
        decisions: list[AssignmentDecision] = []

        for task in ordered_tasks:
            best: tuple[float, AgentProfile, float, float] | None = None
            for agent in working_agents:
                score, skill_match, load = self._score(agent, task)
                if best is None or score > best[0]:
                    best = (score, agent, skill_match, load)
            if best is None:
                continue

            score, agent, skill_match, load_factor = best
            rationale_parts = [
                f"Matched by {agent.name} with {skill_match:.0%} skill coverage",
                f"priority {task.priority:.0%}",
            ]
            if task.required_skills:
                rationale_parts.append(
                    "skills: " + ", ".join(sorted(task.required_skills))
                )
            rationale = "; ".join(rationale_parts)
            decision = AssignmentDecision(
                task_id=task.identifier,
                agent=agent.name,
                rationale=rationale,
                confidence=_clamp(score),
                skill_match=skill_match,
                load_factor=load_factor,
            )
            decisions.append(decision)
            agent.available_hours = max(agent.available_hours - task.estimated_effort_hours, 0.0)
            if limit is not None and len(decisions) >= limit:
                break

        self._history.extend(decisions)
        return decisions

    @property
    def history(self) -> tuple[AssignmentDecision, ...]:
        return tuple(self._history)
