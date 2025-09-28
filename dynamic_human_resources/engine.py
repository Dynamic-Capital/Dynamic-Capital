"""Lightweight planning primitives for human resources operations."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CandidateProfile",
    "HumanResourcesAction",
    "HumanResourcesPlan",
    "DynamicHumanResourcesEngine",
    "DynamicHumanResources",
]

_STAGE_ORDER = {
    "applied": 1,
    "screen": 2,
    "interview": 3,
    "offer": 4,
    "hired": 0,
    "archived": -1,
}

_STAGE_ACTION = {
    "applied": ("review_application", 1.0, "Review the application and shortlist candidates."),
    "screen": ("schedule_screen", 1.5, "Schedule a screening call and prepare rubric."),
    "interview": ("coordinate_interviews", 2.5, "Coordinate interviews with the hiring panel."),
    "offer": ("prepare_offer", 1.0, "Prepare offer details and alignment meeting."),
    "hired": ("onboard", 1.5, "Kick off onboarding and welcome logistics."),
}

_VALID_STAGES = tuple(_STAGE_ORDER)

_DEFAULT_STAGE_AGENTS = {
    "applied": "ResearchAgent",
    "screen": "DynamicChatAgent",
    "interview": "DynamicArchitectAgent",
    "offer": "RiskAgent",
    "hired": "ExecutionAgent",
}


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback is not None:
        fallback_text = (fallback or "").strip()
        if fallback_text:
            return fallback_text
    raise ValueError("text value must not be empty")


def _normalise_identifier(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _normalise_stage(value: str | None) -> str:
    text = (value or "").strip().lower().replace("-", "_")
    if not text:
        return "applied"
    if text in _STAGE_ORDER:
        return text
    if text in {"screening", "phone_screen"}:
        return "screen"
    if text in {"interviews", "onsite"}:
        return "interview"
    if text in {"offer_extended", "negotiation"}:
        return "offer"
    if text in {"joined", "started"}:
        return "hired"
    if text in {"rejected", "withdrawn"}:
        return "archived"
    return "applied"


def _normalise_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for value in values:
        item = value.strip()
        if not item:
            continue
        if item not in seen:
            seen.add(item)
            normalised.append(item)
    return tuple(normalised)


def _coerce_candidate(payload: CandidateProfile | Mapping[str, object]) -> CandidateProfile:
    if isinstance(payload, CandidateProfile):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("candidate payload must be a CandidateProfile or mapping")
    data = dict(payload)
    identifier = _normalise_identifier(
        str(data.get("identifier") or data.get("id") or data.get("email") or "")
    )
    return CandidateProfile(
        identifier=identifier,
        name=_normalise_text(str(data.get("name") or data.get("full_name") or ""), fallback=identifier),
        role=_normalise_text(str(data.get("role") or data.get("position") or ""), fallback="Generalist"),
        stage=_normalise_stage(str(data.get("stage"))),
        score=float(data.get("score", data.get("rating", 0.0)) or 0.0),
        availability=_normalise_sequence(data.get("availability")),
        tags=_normalise_sequence(data.get("tags")),
    )


def _sorted_candidates(candidates: Iterable[CandidateProfile]) -> list[CandidateProfile]:
    return sorted(
        candidates,
        key=lambda candidate: (
            -_STAGE_ORDER.get(candidate.stage, 0),
            -candidate.score,
            candidate.name.lower(),
        ),
    )


@dataclass(slots=True)
class CandidateProfile:
    """Structured representation of a candidate in the pipeline."""

    identifier: str
    name: str
    role: str
    stage: str = "applied"
    score: float = 0.0
    availability: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.name = _normalise_text(self.name, fallback=self.identifier)
        self.role = _normalise_text(self.role, fallback="Generalist")
        self.stage = _normalise_stage(self.stage)
        self.score = max(0.0, min(1.0, float(self.score)))
        self.availability = _normalise_sequence(self.availability)
        self.tags = _normalise_sequence(self.tags)

    @property
    def requires_action(self) -> bool:
        return self.stage in _STAGE_ACTION


@dataclass(slots=True)
class HumanResourcesAction:
    """Atomic unit of work recommended for a candidate."""

    candidate_id: str
    candidate_name: str
    role: str
    stage: str
    action: str
    effort_hours: float
    agent: str | None = None
    notes: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, object]:
        return {
            "candidate_id": self.candidate_id,
            "candidate_name": self.candidate_name,
            "role": self.role,
            "stage": self.stage,
            "action": self.action,
            "effort_hours": round(self.effort_hours, 2),
            "agent": self.agent,
            "notes": list(self.notes),
        }


@dataclass(slots=True)
class HumanResourcesPlan:
    """Structured plan returned by :class:`DynamicHumanResourcesEngine`."""

    objectives: tuple[str, ...]
    actions: tuple[HumanResourcesAction, ...]
    deferred: tuple[str, ...]
    metrics: Mapping[str, float | int]
    notes: Mapping[str, object]

    def as_dict(self) -> dict[str, object]:
        return {
            "objectives": list(self.objectives),
            "actions": [action.as_dict() for action in self.actions],
            "deferred": list(self.deferred),
            "metrics": dict(self.metrics),
            "notes": dict(self.notes),
        }


class DynamicHumanResourcesEngine:
    """Heuristic engine that organises candidate pipeline work."""

    def __init__(
        self,
        *,
        default_capacity_hours: float = 12.0,
        default_stage_agents: Mapping[str, str] | None = None,
    ) -> None:
        self.default_capacity_hours = max(1.0, float(default_capacity_hours))
        self._default_stage_agents = self._prepare_stage_agents(default_stage_agents)

    def _summarise_stage_counts(self, candidates: Sequence[CandidateProfile]) -> dict[str, int]:
        summary: MutableMapping[str, int] = {stage: 0 for stage in _VALID_STAGES}
        summary.update({"hired": 0, "archived": 0})
        for candidate in candidates:
            stage = candidate.stage
            summary[stage] = summary.get(stage, 0) + 1
        return dict(summary)

    def _prepare_stage_agents(
        self, overrides: Mapping[str, str] | None
    ) -> dict[str, str]:
        stage_agents: dict[str, str] = dict(_DEFAULT_STAGE_AGENTS)
        if overrides:
            for stage, agent in overrides.items():
                stage_key = _normalise_stage(stage)
                agent_name = (str(agent or "").strip())
                if not agent_name:
                    continue
                stage_agents[stage_key] = agent_name
        return stage_agents

    def _resolve_agent_for_candidate(
        self,
        candidate: CandidateProfile,
        *,
        stage_agents: Mapping[str, str] | None = None,
        tag_agents: Mapping[str, str] | None = None,
        default_agent: str | None = None,
    ) -> str | None:
        candidate_tag_agents = tag_agents or {}
        for tag in candidate.tags:
            agent_name = (str(candidate_tag_agents.get(tag) or "").strip())
            if agent_name:
                return agent_name

        combined_stage_agents = dict(self._default_stage_agents)
        if stage_agents:
            for stage, agent in stage_agents.items():
                stage_key = _normalise_stage(stage)
                agent_name = (str(agent or "").strip())
                if agent_name:
                    combined_stage_agents[stage_key] = agent_name

        agent_name = combined_stage_agents.get(candidate.stage)
        if agent_name:
            return agent_name

        fallback_agent = (default_agent or "").strip()
        return fallback_agent or None

    def plan_pipeline(
        self,
        candidates: Iterable[CandidateProfile | Mapping[str, object]],
        *,
        objectives: Sequence[str] | None = None,
        capacity_hours: float | None = None,
        stage_agents: Mapping[str, str] | None = None,
        tag_agents: Mapping[str, str] | None = None,
        default_agent: str | None = None,
    ) -> HumanResourcesPlan:
        candidate_objects = [_coerce_candidate(candidate) for candidate in candidates]
        objectives_tuple = tuple(
            text
            for text in (str(item).strip() for item in objectives or ())
            if text
        )

        capacity = self.default_capacity_hours if capacity_hours is None else max(1.0, float(capacity_hours))

        ordered_candidates = _sorted_candidates(candidate_objects)

        actions: list[HumanResourcesAction] = []
        deferred: list[str] = []
        utilised = 0.0
        agent_allocations: MutableMapping[str, list[str]] = defaultdict(list)
        unassigned_candidates: list[str] = []

        for candidate in ordered_candidates:
            if not candidate.requires_action:
                continue
            action_id, effort, note = _STAGE_ACTION[candidate.stage]
            if utilised + effort > capacity:
                deferred.append(candidate.identifier)
                continue
            notes: list[str] = [note]
            if candidate.availability:
                notes.append(f"Availability: {', '.join(candidate.availability)}")
            if candidate.tags:
                notes.append(f"Tags: {', '.join(candidate.tags)}")
            agent_name = self._resolve_agent_for_candidate(
                candidate,
                stage_agents=stage_agents,
                tag_agents=tag_agents,
                default_agent=default_agent,
            )
            actions.append(
                HumanResourcesAction(
                    candidate_id=candidate.identifier,
                    candidate_name=candidate.name,
                    role=candidate.role,
                    stage=candidate.stage,
                    action=action_id,
                    effort_hours=effort,
                    agent=agent_name,
                    notes=tuple(notes),
                )
            )
            utilised += effort
            if agent_name:
                agent_allocations[agent_name].append(candidate.identifier)
            else:
                unassigned_candidates.append(candidate.identifier)

        metrics: dict[str, float | int] = self._summarise_stage_counts(candidate_objects)
        metrics.update(
            {
                "actions_planned": len(actions),
                "candidates_reviewed": len(candidate_objects),
                "capacity_hours": capacity,
                "capacity_utilised": round(utilised, 2),
            }
        )

        outstanding = len(actions) + len(deferred)
        progress = (len(actions) / outstanding) if outstanding else 1.0

        notes: dict[str, object] = {
            "progress_ratio": round(progress, 3),
            "capacity_remaining": round(max(0.0, capacity - utilised), 2),
            "focus_roles": sorted({candidate.role for candidate in candidate_objects}),
            "agent_allocations": {agent: tuple(ids) for agent, ids in agent_allocations.items()},
        }
        if unassigned_candidates:
            notes["unassigned_candidates"] = tuple(unassigned_candidates)
        if stage_agents:
            notes["stage_agent_overrides"] = {
                _normalise_stage(stage): str(agent).strip()
                for stage, agent in stage_agents.items()
                if str(agent or "").strip()
            }
        if tag_agents:
            notes["tag_agent_overrides"] = {
                str(tag): str(agent).strip()
                for tag, agent in tag_agents.items()
                if str(agent or "").strip()
            }
        if default_agent:
            notes["default_agent"] = default_agent

        return HumanResourcesPlan(
            objectives=objectives_tuple,
            actions=tuple(actions),
            deferred=tuple(deferred),
            metrics=metrics,
            notes=notes,
        )


class DynamicHumanResources:
    """Facade exposing a friendlier API for human resources planning."""

    def __init__(self, engine: DynamicHumanResourcesEngine | None = None) -> None:
        self.engine = engine or DynamicHumanResourcesEngine()

    def assess_pipeline(
        self,
        candidates: Iterable[CandidateProfile | Mapping[str, object]],
        *,
        objectives: Sequence[str] | None = None,
        capacity_hours: float | None = None,
        stage_agents: Mapping[str, str] | None = None,
        tag_agents: Mapping[str, str] | None = None,
        default_agent: str | None = None,
    ) -> HumanResourcesPlan:
        return self.engine.plan_pipeline(
            candidates,
            objectives=objectives,
            capacity_hours=capacity_hours,
            stage_agents=stage_agents,
            tag_agents=tag_agents,
            default_agent=default_agent,
        )
