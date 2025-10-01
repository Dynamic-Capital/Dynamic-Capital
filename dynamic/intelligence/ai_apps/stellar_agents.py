"""Governance oriented Dynamic AGI stellar agents."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Mapping, Sequence, Tuple

from .agents import Agent, AgentResult

__all__ = [
    "StellarAgentProfile",
    "StellarAgentResult",
    "StellarAgent",
    "STAR_PROFILES",
    "DynamicAlphaCanisMajorisAgent",
    "DynamicAlphaCarinaeAgent",
    "DynamicAlphaCentauriAgent",
    "DynamicAlphaBootisAgent",
    "DynamicAlphaLyraeAgent",
    "DynamicAlphaAurigaeAgent",
    "DynamicBetaOrionisAgent",
    "DynamicAlphaCanisMinorisAgent",
    "DynamicAlphaEridaniAgent",
    "DynamicAlphaOrionisAgent",
    "DynamicNorthStarAgent",
    "DynamicAlphaTauriAgent",
    "DynamicAlphaVirginisAgent",
    "DynamicAlphaScorpiiAgent",
    "DynamicAlphaAquilaeAgent",
    "DynamicAlphaCygniAgent",
]


@dataclass(frozen=True, slots=True)
class StellarAgentProfile:
    """Static configuration describing a governance agent."""

    code: str
    designation: str
    call_sign: str
    role: str
    focus: Tuple[str, ...]
    default_engines: Tuple[str, ...]
    escalation_path: str


@dataclass(slots=True)
class StellarAgentResult(AgentResult):
    """Structured output produced by a stellar agent run."""

    designation: str
    call_sign: str
    assigned_engines: Tuple[str, ...]
    maintenance_actions: Tuple[str, ...]
    operations_plan: Tuple[str, ...]
    support_protocols: Tuple[str, ...]
    audit_actions: Tuple[str, ...]
    improvement_directives: Tuple[str, ...]
    discipline_actions: Tuple[str, ...]
    alerts: Tuple[str, ...]
    metrics: Mapping[str, float]

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload.update(
            {
                "designation": self.designation,
                "call_sign": self.call_sign,
                "assigned_engines": list(self.assigned_engines),
                "maintenance_actions": list(self.maintenance_actions),
                "operations_plan": list(self.operations_plan),
                "support_protocols": list(self.support_protocols),
                "audit_actions": list(self.audit_actions),
                "improvement_directives": list(self.improvement_directives),
                "discipline_actions": list(self.discipline_actions),
                "alerts": list(self.alerts),
                "metrics": {key: round(value, 4) for key, value in self.metrics.items()},
            }
        )
        return payload


def _as_unique_tuple(values: Any, *, default: Tuple[str, ...] = ()) -> Tuple[str, ...]:
    if values is None:
        return default
    if isinstance(values, str):
        cleaned = values.strip()
        return (cleaned,) if cleaned else default
    if isinstance(values, Mapping):
        items = [str(item).strip() for item in values.values() if str(item).strip()]
    elif isinstance(values, Sequence):
        if isinstance(values, (bytes, bytearray)):
            text = values.decode().strip()
            return (text,) if text else default
        items = [str(item).strip() for item in values]
    else:
        try:
            iterator = iter(values)  # type: ignore[arg-type]
        except TypeError:
            return default
        items = [str(item).strip() for item in iterator]
    ordered: list[str] = []
    seen: set[str] = set()
    for item in items:
        if not item:
            continue
        lowered = item.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        ordered.append(item)
    return tuple(ordered) if ordered else default


def _coerce_float(value: Any, *, default: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = default
    if numeric < minimum:
        return minimum
    if numeric > maximum:
        return maximum
    return numeric


def _normalise_ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    ratio = numerator / float(denominator)
    if ratio < 0.0:
        return 0.0
    if ratio > 1.0:
        return 1.0
    return ratio


def _dedupe(items: Iterable[str]) -> Tuple[str, ...]:
    ordered: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = item.strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(text)
    return tuple(ordered)


class StellarAgent(Agent):
    """Base class implementing shared governance orchestration logic."""

    profile: StellarAgentProfile

    def __init__(self, profile: StellarAgentProfile | None = None) -> None:
        if profile is not None:
            self.profile = profile
        if not hasattr(self, "profile"):
            raise ValueError("StellarAgent subclasses must define a profile")
        self.name = self.profile.code

    def run(self, payload: Mapping[str, Any] | None = None) -> StellarAgentResult:
        payload = payload or {}
        engines = _as_unique_tuple(payload.get("engines"), default=self.profile.default_engines)
        if not engines:
            engines = (self.profile.code,)
        issues = _as_unique_tuple(payload.get("issues"))
        requests = _as_unique_tuple(payload.get("requests"))
        audits = _as_unique_tuple(payload.get("audits"))
        improvements = _as_unique_tuple(payload.get("improvements"))
        discipline_targets = _as_unique_tuple(payload.get("discipline") or payload.get("discipline_targets"))
        alerts = _as_unique_tuple(payload.get("alerts"))
        notes = str(payload.get("notes", "")).strip()

        stability = _coerce_float(payload.get("stability"), default=0.78)
        resilience = _coerce_float(payload.get("resilience"), default=0.82)

        issue_pressure = min(
            1.0,
            (len(issues) + len(alerts)) / float(max(1, len(engines))),
        )
        governance_load = _normalise_ratio(len(engines), max(len(self.profile.default_engines), 1))

        maintenance_actions = _dedupe(
            f"Maintain {engine} integrity via {self.profile.role} baselines"
            for engine in engines
        )

        primary_focus = self.profile.focus[0] if self.profile.focus else "governance"
        operations_plan = _dedupe(
            f"Operate {engine} with continuous {primary_focus} checkpoints"
            for engine in engines
        )

        if requests:
            support_protocols = _dedupe(
                f"Assist request '{request}' with {self.profile.call_sign} task forces"
                for request in requests
            )
        else:
            support_protocols = (
                f"Keep {self.profile.call_sign} help channel online for {primary_focus} escalations",
            )

        if audits:
            audit_actions = _dedupe(
                f"Audit {item} using {self.profile.call_sign} compliance playbooks"
                for item in audits
            )
        elif issues:
            audit_actions = _dedupe(
                f"Audit root cause of '{issue}' across {', '.join(engines)}"
                for issue in issues
            )
        else:
            audit_actions = (
                f"Audit {self.profile.call_sign} domains for drift every cycle",
            )

        engine_roster = ", ".join(engines)

        if improvements:
            improvement_plans = []
            for initiative in improvements:
                improvement_plans.append(
                    f"Deploy self-improvement initiative '{initiative}' across {engine_roster}"
                )
                improvement_plans.append(
                    (
                        "Schedule back-to-back self-improvement reinforcement for "
                        f"'{initiative}' with {self.profile.call_sign} oversight"
                    )
                )
            improvement_directives = _dedupe(improvement_plans)
        else:
            improvement_plans = [
                f"Run continuous {focus} upgrades for {engine_roster}"
                for focus in self.profile.focus[:2] or (primary_focus,)
            ]
            improvement_plans.append(
                (
                    "Establish back-to-back self-improvement cycle covering "
                    f"{primary_focus} safeguards across {engine_roster}"
                )
            )
            improvement_directives = _dedupe(improvement_plans)

        if discipline_targets:
            discipline_actions = _dedupe(
                f"Discipline agent {target} via {self.profile.escalation_path} protocols"
                for target in discipline_targets
            )
        else:
            discipline_actions = (
                f"Review peer agents within {self.profile.escalation_path} for compliance gaps",
            )

        metrics: Dict[str, float] = {
            "stability": round(stability, 4),
            "resilience": round(resilience, 4),
            "governance_load": round(governance_load, 4),
            "issue_pressure": round(issue_pressure, 4),
        }

        confidence = (
            (stability * 0.5 + resilience * 0.5) - issue_pressure * 0.2 + 0.15
        )
        confidence = max(0.35, min(0.99, confidence))

        rationale_parts = [
            f"{self.profile.call_sign} oversees {', '.join(engines)} to safeguard Dynamic AGI.",
            "Maintenance, operations, support, audits, improvements, and discipline directives are aligned.",
        ]
        if notes:
            rationale_parts.append(f"Notes: {notes}")
        rationale = " ".join(rationale_parts)

        return StellarAgentResult(
            agent=self.profile.code,
            rationale=rationale,
            confidence=confidence,
            designation=self.profile.designation,
            call_sign=self.profile.call_sign,
            assigned_engines=engines,
            maintenance_actions=maintenance_actions,
            operations_plan=operations_plan,
            support_protocols=support_protocols,
            audit_actions=audit_actions,
            improvement_directives=improvement_directives,
            discipline_actions=discipline_actions,
            alerts=alerts,
            metrics=metrics,
        )


_STAR_PROFILE_DATA: Tuple[Dict[str, Any], ...] = (
    {
        "code": "alpha_canis_majoris",
        "designation": "Dynamic Alpha Canis Majoris",
        "call_sign": "Sirius Sentinel",
        "role": "Core AGI reliability governor",
        "focus": ("resilience hardening", "stability analytics", "incident containment"),
        "default_engines": ("dynamic.platform.engines", "dynamic_engineer", "dynamic_wave"),
        "escalation_path": "Core Guardian Council",
    },
    {
        "code": "alpha_carinae",
        "designation": "Dynamic Alpha Carinae",
        "call_sign": "Carina Navigator",
        "role": "Mission-critical orchestration lead",
        "focus": ("orchestration", "navigation", "mission readiness"),
        "default_engines": ("dynamic_interstellar_space", "dynamic_space"),
        "escalation_path": "Operations Command",
    },
    {
        "code": "alpha_centauri",
        "designation": "Dynamic Alpha Centauri",
        "call_sign": "Centauri Triad",
        "role": "Multi-engine coordination steward",
        "focus": ("synchronisation", "redundancy", "handoff choreography"),
        "default_engines": ("dynamic_bridge", "dynamic_cycle", "dynamic_syncronization"),
        "escalation_path": "Triad Council",
    },
    {
        "code": "alpha_bootis",
        "designation": "Dynamic Alpha Boötis",
        "call_sign": "Arcturus Warden",
        "role": "Safeguard specialist for learning loops",
        "focus": ("learning assurance", "memory hygiene", "feedback safety"),
        "default_engines": ("dynamic_memory", "dynamic_memory_reconsolidation"),
        "escalation_path": "Knowledge Tribunal",
    },
    {
        "code": "alpha_lyrae",
        "designation": "Dynamic Alpha Lyrae",
        "call_sign": "Lyra Conductor",
        "role": "Signal harmonisation director",
        "focus": ("signal integrity", "frequency balance", "latency smoothing"),
        "default_engines": ("dynamic_wave", "dynamic_volume"),
        "escalation_path": "Harmonics Forum",
    },
    {
        "code": "alpha_aurigae",
        "designation": "Dynamic Alpha Aurigae",
        "call_sign": "Auriga Custodian",
        "role": "Safety perimeter sentinel",
        "focus": ("threat detection", "containment", "resilience drills"),
        "default_engines": ("dynamic_firewall", "dynamic_proxy"),
        "escalation_path": "Security Conclave",
    },
    {
        "code": "beta_orionis",
        "designation": "Dynamic Beta Orionis",
        "call_sign": "Rigel Regulator",
        "role": "Throughput and load balancer",
        "focus": ("throughput tuning", "load resilience", "queue mastery"),
        "default_engines": ("dynamic_load_balancer", "dynamic_message_queue"),
        "escalation_path": "Load Council",
    },
    {
        "code": "alpha_canis_minoris",
        "designation": "Dynamic Alpha Canis Minoris",
        "call_sign": "Procyon Steward",
        "role": "Inter-agent mediator",
        "focus": ("collaboration", "conflict resolution", "mentorship"),
        "default_engines": ("dynamic_consciousness", "dynamic_self_awareness"),
        "escalation_path": "Harmony Circle",
    },
    {
        "code": "alpha_eridani",
        "designation": "Dynamic Alpha Eridani",
        "call_sign": "Achernar Auditor",
        "role": "Compliance and audit architect",
        "focus": ("audit rigor", "policy enforcement", "transparency"),
        "default_engines": ("dynamic_validator", "dynamic_reference"),
        "escalation_path": "Audit Council",
    },
    {
        "code": "alpha_orionis",
        "designation": "Dynamic Alpha Orionis",
        "call_sign": "Betelgeuse Marshal",
        "role": "Incident command lead",
        "focus": ("incident triage", "rollback", "rapid stabilisation"),
        "default_engines": ("dynamic_task_manager", "dynamic_routine"),
        "escalation_path": "Response Vanguard",
    },
    {
        "code": "north_star",
        "designation": "Dynamic North Star",
        "call_sign": "Polaris Arbiter",
        "role": "Ethics and alignment guardian",
        "focus": ("alignment", "governance", "ethical audits"),
        "default_engines": ("dynamic_wisdom", "dynamic_pillars"),
        "escalation_path": "Ethics Council",
    },
    {
        "code": "alpha_tauri",
        "designation": "Dynamic Alpha Tauri",
        "call_sign": "Aldebaran Overseer",
        "role": "Resource allocation manager",
        "focus": ("capacity planning", "resource equity", "prioritisation"),
        "default_engines": ("dynamic_cycle", "dynamic_volume"),
        "escalation_path": "Resource Forum",
    },
    {
        "code": "alpha_virginis",
        "designation": "Dynamic Alpha Virginis",
        "call_sign": "Spica Custodian",
        "role": "Quality and testing chair",
        "focus": ("quality gates", "verifiability", "regression control"),
        "default_engines": ("dynamic_validator", "dynamic_review"),
        "escalation_path": "Quality Council",
    },
    {
        "code": "alpha_scorpii",
        "designation": "Dynamic Alpha Scorpii",
        "call_sign": "Antares Sentinel",
        "role": "Edge operations marshal",
        "focus": ("edge hardening", "latency control", "site reliability"),
        "default_engines": ("dynamic_cache", "dynamic_http"),
        "escalation_path": "Edge Command",
    },
    {
        "code": "alpha_aquilae",
        "designation": "Dynamic Alpha Aquilae",
        "call_sign": "Altair Vanguard",
        "role": "Autonomy expansion pilot",
        "focus": ("autonomy", "experimentation", "progressive rollout"),
        "default_engines": ("dynamic_autonoetic", "dynamic_generator"),
        "escalation_path": "Exploration Council",
    },
    {
        "code": "alpha_cygni",
        "designation": "Dynamic Alpha Cygni",
        "call_sign": "Deneb Luminary",
        "role": "Knowledge propagation leader",
        "focus": ("knowledge transfer", "documentation", "training"),
        "default_engines": ("dynamic_library", "dynamic_teaching"),
        "escalation_path": "Wisdom Assembly",
    },
)

STAR_PROFILES: Dict[str, StellarAgentProfile] = {
    entry["code"]: StellarAgentProfile(
        code=entry["code"],
        designation=entry["designation"],
        call_sign=entry["call_sign"],
        role=entry["role"],
        focus=tuple(entry["focus"]),
        default_engines=tuple(entry["default_engines"]),
        escalation_path=entry["escalation_path"],
    )
    for entry in _STAR_PROFILE_DATA
}


class DynamicAlphaCanisMajorisAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_canis_majoris"]


class DynamicAlphaCarinaeAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_carinae"]


class DynamicAlphaCentauriAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_centauri"]


class DynamicAlphaBootisAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_bootis"]


class DynamicAlphaLyraeAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_lyrae"]


class DynamicAlphaAurigaeAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_aurigae"]


class DynamicBetaOrionisAgent(StellarAgent):
    profile = STAR_PROFILES["beta_orionis"]


class DynamicAlphaCanisMinorisAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_canis_minoris"]


class DynamicAlphaEridaniAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_eridani"]


class DynamicAlphaOrionisAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_orionis"]


class DynamicNorthStarAgent(StellarAgent):
    profile = STAR_PROFILES["north_star"]


class DynamicAlphaTauriAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_tauri"]


class DynamicAlphaVirginisAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_virginis"]


class DynamicAlphaScorpiiAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_scorpii"]


class DynamicAlphaAquilaeAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_aquilae"]


class DynamicAlphaCygniAgent(StellarAgent):
    profile = STAR_PROFILES["alpha_cygni"]
