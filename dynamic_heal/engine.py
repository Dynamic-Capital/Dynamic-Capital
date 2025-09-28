"""Resilience heuristics for coordinating recovery and healing responses."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "HealingSignal",
    "HealingCapability",
    "HealingAction",
    "HealingPlan",
    "DynamicHealEngine",
]


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _normalise_tuple(items: Iterable[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
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


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class HealingSignal:
    """Indicator describing an incident or health degradation."""

    identifier: str
    narrative: str
    severity: float
    affected_domains: tuple[str, ...] = field(default_factory=tuple)
    blast_radius: float = 0.3
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier)
        self.narrative = _normalise_text(self.narrative)
        self.severity = _clamp(self.severity)
        self.affected_domains = _normalise_tuple(self.affected_domains, lower=True)
        self.blast_radius = _clamp(self.blast_radius)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class HealingCapability:
    """Capability resource that can participate in healing."""

    name: str
    domains: tuple[str, ...]
    capacity: float = 1.0
    response_time: float = 0.5

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.domains = _normalise_tuple(self.domains, lower=True)
        if not self.domains:
            raise ValueError("healing capability must cover at least one domain")
        self.capacity = _clamp(self.capacity)
        self.response_time = _clamp(self.response_time)

    def coverage(self, domains: Iterable[str]) -> float:
        affected = set(domain.lower() for domain in domains)
        if not affected:
            return 1.0
        matches = affected.intersection(self.domains)
        return len(matches) / len(affected)


@dataclass(slots=True)
class HealingAction:
    """Single action within a healing plan."""

    owner: str
    description: str
    priority: float
    confidence: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "owner": self.owner,
            "description": self.description,
            "priority": self.priority,
            "confidence": self.confidence,
        }


@dataclass(slots=True)
class HealingPlan:
    """Structured response plan for orchestrating healing actions."""

    actions: tuple[HealingAction, ...]
    overall_priority: float
    severity_index: float
    issued_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "actions": [action.as_dict() for action in self.actions],
            "overall_priority": self.overall_priority,
            "severity_index": self.severity_index,
            "issued_at": self.issued_at.isoformat(),
        }


class DynamicHealEngine:
    """Coordinate recovery by translating signals into actionable steps."""

    def orchestrate(
        self,
        signals: Sequence[HealingSignal],
        capabilities: Sequence[HealingCapability],
    ) -> HealingPlan:
        if not signals:
            raise ValueError("at least one healing signal is required")
        if not capabilities:
            raise ValueError("healing requires available capabilities")

        highest_severity = max(signal.severity for signal in signals)
        severity_index = _clamp(
            sum(signal.severity * (0.6 + signal.blast_radius * 0.4) for signal in signals)
            / len(signals)
        )

        actions: list[HealingAction] = []
        for signal in sorted(signals, key=lambda item: item.severity, reverse=True):
            best_capability: tuple[float, HealingCapability] | None = None
            for capability in capabilities:
                coverage = capability.coverage(signal.affected_domains)
                urgency = 1.0 - capability.response_time
                score = (coverage * 0.7) + (urgency * 0.2) + (capability.capacity * 0.1)
                if best_capability is None or score > best_capability[0]:
                    best_capability = (score, capability)
            if best_capability is None:
                continue
            score, capability = best_capability
            description = (
                f"Stabilise {', '.join(signal.affected_domains) or 'core systems'}"
                f" in response to {signal.identifier}: {signal.narrative}"
            )
            action = HealingAction(
                owner=capability.name,
                description=description,
                priority=_clamp(signal.severity * 0.7 + signal.blast_radius * 0.3),
                confidence=_clamp(score),
            )
            actions.append(action)

        overall_priority = _clamp((highest_severity * 0.8) + (severity_index * 0.2))
        return HealingPlan(
            actions=tuple(actions),
            overall_priority=overall_priority,
            severity_index=severity_index,
        )
