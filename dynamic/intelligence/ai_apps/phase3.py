"""Phase 3 Dynamic AI planning utilities for agent assignment and cadences."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "BacklogItem",
    "AgentProfile",
    "Assignment",
    "OnboardingPacket",
    "CommunicationLine",
    "PhaseThreePlan",
    "build_phase_three_plan",
]


def _normalise_strings(values: Iterable[object]) -> Tuple[str, ...]:
    """Return a tuple of unique, trimmed string values."""

    seen: Dict[str, str] = {}
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        key = text.lower()
        if key not in seen:
            seen[key] = text
    return tuple(seen.values())


def _ensure_positive(value: float, *, label: str) -> float:
    if value <= 0:
        raise ValueError(f"{label} must be positive")
    return value


@dataclass(frozen=True, slots=True)
class BacklogItem:
    """Work package awaiting assignment during Dynamic AI Phase 3."""

    id: str
    title: str
    required_skills: Tuple[str, ...]
    effort: float = 1.0
    tags: Tuple[str, ...] = ()
    _skill_tokens: Tuple[str, ...] = field(init=False, repr=False)
    _skill_lookup: Dict[str, str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        identifier = self.id.strip()
        if not identifier:
            raise ValueError("BacklogItem requires a non-empty id")
        title = self.title.strip()
        if not title:
            raise ValueError("BacklogItem requires a non-empty title")
        object.__setattr__(self, "id", identifier)
        object.__setattr__(self, "title", title)

        skills = _normalise_strings(self.required_skills)
        object.__setattr__(self, "required_skills", skills)
        object.__setattr__(self, "_skill_tokens", tuple(skill.lower() for skill in skills))
        object.__setattr__(
            self,
            "_skill_lookup",
            {skill.lower(): skill for skill in skills},
        )

        object.__setattr__(self, "effort", float(_ensure_positive(self.effort, label="effort")))
        object.__setattr__(self, "tags", _normalise_strings(self.tags))

    @property
    def skill_tokens(self) -> Tuple[str, ...]:
        return self._skill_tokens

    def resolve_skill(self, token: str) -> str:
        return self._skill_lookup.get(token, token)

    @classmethod
    def from_payload(cls, payload: Mapping[str, object]) -> "BacklogItem":
        identifier = str(payload.get("id") or payload.get("key") or payload.get("slug") or "").strip()
        if not identifier:
            raise ValueError("BacklogItem payload missing id/key")
        title = str(payload.get("title") or payload.get("name") or identifier)
        required = payload.get("required_skills") or payload.get("skills") or ()
        tags = payload.get("tags") or ()
        effort_value = float(payload.get("effort", 1.0))
        return cls(
            id=identifier,
            title=title,
            required_skills=tuple(required if isinstance(required, Iterable) else (required,)),
            effort=effort_value,
            tags=tuple(tags if isinstance(tags, Iterable) else (tags,)),
        )


@dataclass(frozen=True, slots=True)
class AgentProfile:
    """Agent capacity and skills participating in Phase 3 planning."""

    name: str
    skills: Tuple[str, ...]
    capacity: float
    onboarded: bool = True
    channels: Tuple[str, ...] = ()
    preferred_cadence: str | None = None
    escalation_contacts: Tuple[str, ...] = ()
    timezone: str | None = None
    _skill_tokens: Tuple[str, ...] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        name = self.name.strip()
        if not name:
            raise ValueError("AgentProfile requires a non-empty name")
        object.__setattr__(self, "name", name)

        skills = _normalise_strings(self.skills)
        if not skills:
            raise ValueError("AgentProfile requires at least one skill")
        object.__setattr__(self, "skills", skills)
        object.__setattr__(self, "_skill_tokens", tuple(skill.lower() for skill in skills))

        object.__setattr__(self, "capacity", float(_ensure_positive(self.capacity, label="capacity")))
        object.__setattr__(self, "channels", _normalise_strings(self.channels) or ("async_status",))
        object.__setattr__(self, "escalation_contacts", _normalise_strings(self.escalation_contacts))

        cadence = self.preferred_cadence.strip() if isinstance(self.preferred_cadence, str) else None
        object.__setattr__(self, "preferred_cadence", cadence if cadence else None)

        if self.timezone is not None:
            tz = self.timezone.strip()
            object.__setattr__(self, "timezone", tz or None)

    @property
    def skill_tokens(self) -> Tuple[str, ...]:
        return self._skill_tokens

    @classmethod
    def from_payload(cls, payload: Mapping[str, object]) -> "AgentProfile":
        name = str(payload.get("name") or payload.get("agent") or "").strip()
        if not name:
            raise ValueError("AgentProfile payload missing name")
        skills = payload.get("skills") or payload.get("capabilities") or ()
        channels = payload.get("channels") or payload.get("communication") or ()
        contacts = payload.get("contacts") or payload.get("escalation_contacts") or ()
        return cls(
            name=name,
            skills=tuple(skills if isinstance(skills, Iterable) else (skills,)),
            capacity=float(payload.get("capacity", 1.0)),
            onboarded=bool(payload.get("onboarded", True)),
            channels=tuple(channels if isinstance(channels, Iterable) else (channels,)),
            preferred_cadence=(
                str(payload.get("preferred_cadence"))
                if payload.get("preferred_cadence") is not None
                else None
            ),
            escalation_contacts=tuple(contacts if isinstance(contacts, Iterable) else (contacts,)),
            timezone=(
                str(payload.get("timezone")).strip() if payload.get("timezone") is not None else None
            ),
        )


@dataclass(frozen=True, slots=True)
class Assignment:
    """Primary and secondary staffing decision for a backlog item."""

    item_id: str
    title: str
    primary_agent: str
    secondary_agent: str | None
    coverage: float
    skill_match: float
    missing_skills: Tuple[str, ...] = ()
    notes: Tuple[str, ...] = ()

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "item_id": self.item_id,
            "title": self.title,
            "primary_agent": self.primary_agent,
            "coverage": round(self.coverage, 3),
            "skill_match": round(self.skill_match, 3),
        }
        if self.secondary_agent:
            payload["secondary_agent"] = self.secondary_agent
        if self.missing_skills:
            payload["missing_skills"] = list(self.missing_skills)
        if self.notes:
            payload["notes"] = list(self.notes)
        return payload


@dataclass(frozen=True, slots=True)
class OnboardingPacket:
    """Checklist issued to newly assigned or returning agents."""

    agent: str
    checklist: Tuple[str, ...]

    def to_dict(self) -> Dict[str, object]:
        return {"agent": self.agent, "checklist": list(self.checklist)}


@dataclass(frozen=True, slots=True)
class CommunicationLine:
    """Communication matrix entry for an agent."""

    agent: str
    cadence: str
    channels: Tuple[str, ...]
    stakeholders: Tuple[str, ...] = ()

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "agent": self.agent,
            "cadence": self.cadence,
            "channels": list(self.channels),
        }
        if self.stakeholders:
            payload["stakeholders"] = list(self.stakeholders)
        return payload


@dataclass(frozen=True, slots=True)
class PhaseThreePlan:
    """Aggregated output for Dynamic AI Phase 3 planning."""

    assignments: Tuple[Assignment, ...]
    onboarding_packets: Tuple[OnboardingPacket, ...]
    communication_matrix: Tuple[CommunicationLine, ...]
    coverage_ratio: float
    summary: str

    def to_dict(self) -> Dict[str, object]:
        return {
            "assignments": [assignment.to_dict() for assignment in self.assignments],
            "onboarding_packets": [packet.to_dict() for packet in self.onboarding_packets],
            "communication_matrix": [line.to_dict() for line in self.communication_matrix],
            "coverage_ratio": round(self.coverage_ratio, 3),
            "summary": self.summary,
        }


def _coerce_backlog_items(backlog_items: Sequence[BacklogItem | Mapping[str, object]]) -> Tuple[BacklogItem, ...]:
    normalised: list[BacklogItem] = []
    for item in backlog_items:
        if isinstance(item, BacklogItem):
            normalised.append(item)
        elif isinstance(item, Mapping):
            normalised.append(BacklogItem.from_payload(item))
        else:  # pragma: no cover - defensive branch
            raise TypeError("backlog items must be BacklogItem instances or mappings")
    return tuple(normalised)


def _coerce_agents(agents: Sequence[AgentProfile | Mapping[str, object]]) -> Tuple[AgentProfile, ...]:
    roster: list[AgentProfile] = []
    for agent in agents:
        if isinstance(agent, AgentProfile):
            roster.append(agent)
        elif isinstance(agent, Mapping):
            roster.append(AgentProfile.from_payload(agent))
        else:  # pragma: no cover - defensive branch
            raise TypeError("agents must be AgentProfile instances or mappings")
    return tuple(roster)


def _score_agent(
    agent: AgentProfile,
    item: BacklogItem,
    remaining_capacity: float,
) -> Tuple[float, float, float, set[str]]:
    item_tokens = set(item.skill_tokens)
    agent_tokens = set(agent.skill_tokens)
    overlap = item_tokens & agent_tokens
    overlap_ratio = 1.0 if not item_tokens else len(overlap) / len(item_tokens)
    if remaining_capacity <= 0:
        capacity_ratio = 0.0
    else:
        capacity_ratio = min(1.0, remaining_capacity / item.effort)
    score = overlap_ratio * 0.7 + capacity_ratio * 0.3
    if overlap and not agent.onboarded:
        score += 0.05
    return score, overlap_ratio, capacity_ratio, overlap


def build_phase_three_plan(
    backlog_items: Sequence[BacklogItem | Mapping[str, object]],
    agents: Sequence[AgentProfile | Mapping[str, object]],
    *,
    default_cadence: str = "Weekly sync",
) -> PhaseThreePlan:
    """Return staffing, onboarding, and communication guidance for Phase 3."""

    items = _coerce_backlog_items(backlog_items)
    roster = _coerce_agents(agents)

    if not items:
        return PhaseThreePlan(
            assignments=(),
            onboarding_packets=(),
            communication_matrix=(),
            coverage_ratio=float("inf"),
            summary="No backlog items provided; roster remains idle.",
        )

    total_effort = sum(item.effort for item in items)
    total_capacity = sum(agent.capacity for agent in roster)
    coverage_ratio = (total_capacity / total_effort) if total_effort else float("inf")

    remaining_capacity: MutableMapping[str, float] = {agent.name: agent.capacity for agent in roster}
    agent_skill_gaps: Dict[str, set[str]] = {agent.name: set() for agent in roster}
    assigned_agents: set[str] = set()

    assignments: list[Assignment] = []

    for item in items:
        candidates: list[Tuple[float, float, float, AgentProfile, set[str], float]] = []
        for agent in roster:
            available = remaining_capacity.get(agent.name, 0.0)
            score, overlap_ratio, capacity_ratio, overlap = _score_agent(agent, item, available)
            candidates.append((score, overlap_ratio, capacity_ratio, agent, overlap, available))

        candidates.sort(key=lambda entry: (entry[0], entry[5]), reverse=True)
        primary_entry = candidates[0]
        primary_agent = primary_entry[3]
        primary_overlap = primary_entry[4]
        primary_available = primary_entry[5]

        secondary_agent: AgentProfile | None = None
        secondary_overlap: set[str] = set()
        for candidate in candidates[1:]:
            agent = candidate[3]
            if agent.name == primary_agent.name:
                continue
            secondary_agent = agent
            secondary_overlap = candidate[4]
            break

        item_tokens = set(item.skill_tokens)
        combined_overlap = primary_overlap | secondary_overlap
        missing_tokens = item_tokens - combined_overlap
        missing_skills = tuple(sorted(item.resolve_skill(token) for token in missing_tokens))

        assigned_agents.add(primary_agent.name)
        agent_skill_gaps[primary_agent.name].update(item_tokens - primary_overlap)

        if secondary_agent is not None:
            assigned_agents.add(secondary_agent.name)
            agent_skill_gaps[secondary_agent.name].update(item_tokens - secondary_overlap)

        secondary_available = (
            remaining_capacity.get(secondary_agent.name, 0.0) if secondary_agent is not None else 0.0
        )

        if item.effort:
            combined_capacity = max(primary_available, 0.0) + max(secondary_available, 0.0)
            item_coverage = min(1.0, combined_capacity / item.effort) if item.effort else 1.0
        else:
            item_coverage = 1.0

        notes: list[str] = []
        if item_coverage < 1.0:
            shortfall = 1.0 - item_coverage
            notes.append(f"Capacity shortfall of {shortfall:.2f} against required effort.")
        if missing_skills:
            notes.append("Supplement coverage for: " + ", ".join(missing_skills))

        assignments.append(
            Assignment(
                item_id=item.id,
                title=item.title,
                primary_agent=primary_agent.name,
                secondary_agent=secondary_agent.name if secondary_agent else None,
                coverage=item_coverage,
                skill_match=primary_entry[1],
                missing_skills=missing_skills,
                notes=tuple(notes),
            )
        )

        primary_remaining = max(primary_available - item.effort, 0.0)
        remaining_capacity[primary_agent.name] = primary_remaining
        shortfall = item.effort - primary_available
        if shortfall > 0 and secondary_agent is not None:
            remaining_capacity[secondary_agent.name] = max(
                remaining_capacity.get(secondary_agent.name, 0.0) - shortfall,
                0.0,
            )

    onboarding_packets: list[OnboardingPacket] = []
    for agent in roster:
        if agent.name not in assigned_agents:
            continue
        tasks: list[str] = []
        gaps = agent_skill_gaps.get(agent.name) or set()
        if not agent.onboarded:
            tasks.append("Complete onboarding orientation and confirm SLA acceptance.")
        if gaps:
            unresolved = ", ".join(sorted(gap for gap in gaps if gap))
            if unresolved:
                tasks.append(f"Schedule enablement sessions for: {unresolved}.")
        if tasks:
            tasks.append("Acknowledge communication cadence and escalation contacts in Dynamic_Task_Manager.")
            onboarding_packets.append(
                OnboardingPacket(agent=agent.name, checklist=tuple(tasks))
            )

    communication_matrix: list[CommunicationLine] = []
    for agent in roster:
        if agent.name not in assigned_agents:
            continue
        cadence = agent.preferred_cadence or default_cadence
        communication_matrix.append(
            CommunicationLine(
                agent=agent.name,
                cadence=cadence,
                channels=agent.channels,
                stakeholders=agent.escalation_contacts,
            )
        )

    shortfall_items = [assignment for assignment in assignments if assignment.coverage < 1.0]
    summary_parts = [
        f"{len(assignments)} backlog items staffed",
        f"coverage ratio {coverage_ratio:.2f}",
    ]
    if onboarding_packets:
        summary_parts.append(f"{len(onboarding_packets)} onboarding packets issued")
    if shortfall_items:
        ids = ", ".join(assignment.item_id for assignment in shortfall_items)
        summary_parts.append(f"Resolve capacity gaps for: {ids}")
    summary = "; ".join(summary_parts) + "."

    return PhaseThreePlan(
        assignments=tuple(assignments),
        onboarding_packets=tuple(onboarding_packets),
        communication_matrix=tuple(communication_matrix),
        coverage_ratio=coverage_ratio,
        summary=summary,
    )
