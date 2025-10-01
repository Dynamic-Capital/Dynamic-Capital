"""Dynamic AI infrastructure scaffolding with role-based module orchestration."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence, Tuple


class Role(Enum):
    """Role palette used to compose Dynamic AI infrastructure stacks."""

    BOT = "bot"
    HELPER = "helper"
    ASSISTANT = "assistant"
    AGENT = "agent"
    KEEPER = "keeper"
    WATCHER = "watcher"
    PLANNER = "planner"
    BUILDER = "builder"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.value


@dataclass(frozen=True, slots=True)
class RoleSpec:
    """Describes the primary focus and outputs of a role."""

    focus: str
    outputs: Tuple[str, ...]


ROLE_PALETTE: Mapping[Role, RoleSpec] = {
    Role.BOT: RoleSpec(
        focus="Deterministic automation and enforcement",
        outputs=("CRUD jobs", "alerts", "policy checks"),
    ),
    Role.HELPER: RoleSpec(
        focus="Structural support and knowledge scaffolding",
        outputs=("schemas", "interface specs", "migrations"),
    ),
    Role.ASSISTANT: RoleSpec(
        focus="Conversational enablement and knowledge sharing",
        outputs=("FAQs", "playbooks", "contextual responses"),
    ),
    Role.AGENT: RoleSpec(
        focus="Autonomous execution with policy awareness",
        outputs=("workflows", "runbooks", "remediation steps"),
    ),
    Role.KEEPER: RoleSpec(
        focus="State stewardship and auditability",
        outputs=("logs", "ledgers", "configuration baselines"),
    ),
    Role.WATCHER: RoleSpec(
        focus="Monitoring and anomaly detection",
        outputs=("drift reports", "dashboards", "signal alerts"),
    ),
    Role.PLANNER: RoleSpec(
        focus="Forward planning and coordination",
        outputs=("roadmaps", "schedules", "scenario models"),
    ),
    Role.BUILDER: RoleSpec(
        focus="Net-new system or workflow generation",
        outputs=("scaffolds", "integrations", "prototype kits"),
    ),
}


class ModuleDomain(Enum):
    """Module domains supported by the Dynamic AI infrastructure blueprint."""

    TECHNOLOGY_INFRASTRUCTURE = "Technology & Infrastructure"
    AI_COGNITION = "AI, Agents & Cognition"
    BUSINESS_OPERATIONS = "Business & Operations"
    FINANCE_MARKETS = "Finance & Markets"
    HUMAN_CREATIVE = "Human & Creative"
    SECURITY_GOVERNANCE = "Security & Governance"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.value


@dataclass(frozen=True, slots=True)
class ModuleBlueprint:
    """Recommended role stack and guardrails for a module domain."""

    domain: ModuleDomain
    role_stack: Tuple[Role, ...]
    success_signals: Tuple[str, ...]
    summary: str


MODULE_BLUEPRINTS: Mapping[ModuleDomain, ModuleBlueprint] = {
    ModuleDomain.TECHNOLOGY_INFRASTRUCTURE: ModuleBlueprint(
        domain=ModuleDomain.TECHNOLOGY_INFRASTRUCTURE,
        role_stack=(
            Role.BOT,
            Role.HELPER,
            Role.KEEPER,
            Role.WATCHER,
            Role.PLANNER,
            Role.BUILDER,
        ),
        success_signals=(
            "99.9% uptime across services",
            "Schema migrations complete without rollback",
            "Alert MTTR under 5 minutes",
        ),
        summary="Automated operations, schema evolution, and deep observability",
    ),
    ModuleDomain.AI_COGNITION: ModuleBlueprint(
        domain=ModuleDomain.AI_COGNITION,
        role_stack=(Role.AGENT, Role.KEEPER, Role.PLANNER, Role.BUILDER),
        success_signals=(
            "Models aligned with governance policies",
            "Memory refresh cadence honoured",
            "Persona upgrades tracked with evaluations",
        ),
        summary="Adaptive policies, curated memory, and evolving learning loops",
    ),
    ModuleDomain.BUSINESS_OPERATIONS: ModuleBlueprint(
        domain=ModuleDomain.BUSINESS_OPERATIONS,
        role_stack=(Role.PLANNER, Role.AGENT, Role.KEEPER, Role.BUILDER),
        success_signals=(
            "Cadence adherence >= 95%",
            "Approvals logged with audit trail",
            "New plays shipped each quarter",
        ),
        summary="Coordinated cadences, governed approvals, and new plays",
    ),
    ModuleDomain.FINANCE_MARKETS: ModuleBlueprint(
        domain=ModuleDomain.FINANCE_MARKETS,
        role_stack=(Role.WATCHER, Role.AGENT, Role.PLANNER, Role.KEEPER),
        success_signals=(
            "Market drift detected within tolerance",
            "Trade execution latency under SLA",
            "Portfolio alignment within guardrails",
        ),
        summary="Market surveillance, decisive execution, and auditability",
    ),
    ModuleDomain.HUMAN_CREATIVE: ModuleBlueprint(
        domain=ModuleDomain.HUMAN_CREATIVE,
        role_stack=(Role.ASSISTANT, Role.PLANNER, Role.BUILDER),
        success_signals=(
            "Learner satisfaction above target",
            "Curricula refreshed on schedule",
            "New assets produced each sprint",
        ),
        summary="Coaching experiences, tailored curricula, and creative assets",
    ),
    ModuleDomain.SECURITY_GOVERNANCE: ModuleBlueprint(
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        role_stack=(Role.BOT, Role.WATCHER, Role.AGENT, Role.KEEPER),
        success_signals=(
            "Policy enforcement incidents resolved quickly",
            "Anomalies triaged with documented response",
            "Compliance posture continuously verified",
        ),
        summary="Policy enforcement, rapid remediation, and compliance",
    ),
}


@dataclass(frozen=True, slots=True)
class ModuleRecord:
    """Read-only snapshot of a registered module."""

    name: str
    domain: ModuleDomain
    role_stack: Tuple[Role, ...]
    responsibilities: Tuple[str, ...]
    success_metrics: Tuple[str, ...]
    notes: Tuple[str, ...]
    owners: Mapping[Role, str]
    instrumentation: Tuple[str, ...]
    iteration_actions: Tuple[str, ...]


@dataclass(slots=True)
class _ModuleState:
    """Mutable state tracked internally for a registered module."""

    name: str
    domain: ModuleDomain
    role_stack: Tuple[Role, ...]
    responsibilities: Tuple[str, ...]
    success_metrics: Tuple[str, ...]
    notes: Tuple[str, ...]
    owners: MutableMapping[Role, str] = field(default_factory=dict)
    instrumentation: Tuple[str, ...] = field(default_factory=tuple)
    iteration_actions: Tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class OperationalStep:
    """Single step inside the operational playbook."""

    name: str
    description: str

    def to_dict(self) -> Dict[str, str]:
        return {"name": self.name, "description": self.description}


@dataclass(frozen=True, slots=True)
class OperationalPlaybook:
    """Operational playbook derived from a module configuration."""

    module: str
    steps: Tuple[OperationalStep, ...]

    def to_dict(self) -> Dict[str, object]:
        return {
            "module": self.module,
            "steps": [step.to_dict() for step in self.steps],
        }


def _normalise_strings(values: Iterable[str]) -> Tuple[str, ...]:
    unique: Dict[str, str] = {}
    for value in values:
        text = str(value).strip()
        if not text:
            continue
        lower = text.lower()
        if lower not in unique:
            unique[lower] = text
    return tuple(unique.values())


class DynamicInfrastructure:
    """Registry managing Dynamic AI modules and their role assignments."""

    def __init__(self, blueprints: Mapping[ModuleDomain, ModuleBlueprint] | None = None) -> None:
        self._blueprints: Mapping[ModuleDomain, ModuleBlueprint] = blueprints or MODULE_BLUEPRINTS
        self._modules: Dict[str, _ModuleState] = {}

    def register_module(
        self,
        name: str,
        domain: ModuleDomain,
        *,
        roles: Sequence[Role] | None = None,
        responsibilities: Sequence[str] = (),
        success_metrics: Sequence[str] | None = None,
        notes: Sequence[str] = (),
    ) -> ModuleRecord:
        if name in self._modules:
            raise ValueError(f"Module '{name}' already registered")

        blueprint = self._blueprints.get(domain)
        if blueprint is None:
            raise ValueError(f"No blueprint registered for domain {domain}")

        if roles is None:
            role_stack = blueprint.role_stack
        else:
            role_stack = tuple(roles)
            for role in role_stack:
                if role not in ROLE_PALETTE:
                    raise ValueError(f"Unknown role {role}")

        if not role_stack:
            raise ValueError("Module requires at least one role")

        blueprint_roles = set(blueprint.role_stack)
        if not set(role_stack).issubset(blueprint_roles):
            invalid = ", ".join(sorted({role.value for role in role_stack if role not in blueprint_roles}))
            raise ValueError(
                f"Roles [{invalid}] are not part of the {domain.value} blueprint"
            )

        resolved_responsibilities = _normalise_strings(responsibilities) or blueprint.success_signals
        if success_metrics is None:
            resolved_metrics = blueprint.success_signals
        else:
            resolved_metrics = _normalise_strings(success_metrics) or blueprint.success_signals

        module_state = _ModuleState(
            name=name,
            domain=domain,
            role_stack=role_stack,
            responsibilities=resolved_responsibilities,
            success_metrics=resolved_metrics,
            notes=_normalise_strings(notes),
        )
        module_state.instrumentation = module_state.success_metrics
        self._modules[name] = module_state
        return self.get_module(name)

    def assign_role_owner(self, module: str, role: Role, owner: str) -> None:
        state = self._get_module_state(module)
        if role not in state.role_stack:
            raise ValueError(f"Role {role.value} is not part of module '{module}'")
        owner_name = owner.strip()
        if not owner_name:
            raise ValueError("Owner name cannot be empty")
        state.owners[role] = owner_name

    def record_instrumentation(self, module: str, metrics: Sequence[str]) -> None:
        state = self._get_module_state(module)
        state.instrumentation = _normalise_strings(metrics) or state.success_metrics

    def record_iteration_plan(self, module: str, actions: Sequence[str]) -> None:
        state = self._get_module_state(module)
        state.iteration_actions = _normalise_strings(actions)

    def get_module(self, name: str) -> ModuleRecord:
        state = self._get_module_state(name)
        return ModuleRecord(
            name=state.name,
            domain=state.domain,
            role_stack=state.role_stack,
            responsibilities=state.responsibilities,
            success_metrics=state.success_metrics,
            notes=state.notes,
            owners=dict(state.owners),
            instrumentation=state.instrumentation,
            iteration_actions=state.iteration_actions,
        )

    def list_modules(self, domain: ModuleDomain | None = None) -> Tuple[ModuleRecord, ...]:
        modules = [
            self.get_module(name)
            for name, state in self._modules.items()
            if domain is None or state.domain is domain
        ]
        modules.sort(key=lambda module: module.name)
        return tuple(modules)

    def generate_operational_playbook(self, module: str) -> OperationalPlaybook:
        state = self._get_module_state(module)
        owners = state.owners

        role_listing = ", ".join(role.value for role in state.role_stack)
        ownership = (
            ", ".join(f"{role.value}: {owner}" for role, owner in owners.items())
            if owners
            else "No owners assigned"
        )
        instrumentation = ", ".join(state.instrumentation) if state.instrumentation else "Use success metrics"
        iteration = (
            ", ".join(state.iteration_actions)
            if state.iteration_actions
            else "Use Builders and Planners to propose improvements and gate via Agents"
        )

        steps = (
            OperationalStep(
                name="map_module",
                description=(
                    f"{state.name} operates in the {state.domain.value} domain with roles {role_listing}."
                ),
            ),
            OperationalStep(
                name="assign_ownership",
                description=(
                    f"Assign ownership for {state.name}: {ownership}."
                ),
            ),
            OperationalStep(
                name="instrument_feedback",
                description=(
                    f"Monitor {instrumentation} so Watchers and Keepers surface drift early."
                ),
            ),
            OperationalStep(
                name="iterate_safely",
                description=(
                    f"Iterate via {iteration}."
                ),
            ),
        )
        return OperationalPlaybook(module=state.name, steps=steps)

    def _get_module_state(self, name: str) -> _ModuleState:
        try:
            return self._modules[name]
        except KeyError as exc:  # pragma: no cover - defensive branch
            raise KeyError(f"Module '{name}' is not registered") from exc


@dataclass(frozen=True, slots=True)
class ModuleRegistration:
    """Descriptor used when building the default infrastructure."""

    name: str
    domain: ModuleDomain
    responsibilities: Tuple[str, ...]
    success_metrics: Tuple[str, ...]
    notes: Tuple[str, ...] = ()


DEFAULT_MODULE_REGISTRATIONS: Tuple[ModuleRegistration, ...] = (
    ModuleRegistration(
        name="dynamic_supabase",
        domain=ModuleDomain.TECHNOLOGY_INFRASTRUCTURE,
        responsibilities=(
            "Provision managed Postgres and storage primitives",
            "Automate migrations and schema drift remediation",
            "Ensure alerting and observability integrations stay healthy",
        ),
        success_metrics=(
            "Replication lag under 200ms",
            "Nightly backups verified",
            "Incident MTTR under 10 minutes",
        ),
        notes=("Supabase service role keys held in secure secrets manager",),
    ),
    ModuleRegistration(
        name="dynamic_memory",
        domain=ModuleDomain.AI_COGNITION,
        responsibilities=(
            "Curate market, research, and governance memories",
            "Publish retrieval embeddings for persona agents",
            "Coordinate memory rotation across trading windows",
        ),
        success_metrics=(
            "Embedding refresh completes daily",
            "Memory relevance score above 0.8",
            "Audit trail retained for 90 days",
        ),
        notes=("Backed by vector store with encryption at rest",),
    ),
    ModuleRegistration(
        name="dynamic_task_manager",
        domain=ModuleDomain.BUSINESS_OPERATIONS,
        responsibilities=(
            "Coordinate operational cadences across teams",
            "Escalate blockers to the appropriate owners",
            "Publish workflow blueprints for repeatable tasks",
        ),
        success_metrics=(
            "Task SLA adherence above 95%",
            "Escalations acknowledged within 30 minutes",
            "Monthly retros capture actionable improvements",
        ),
    ),
    ModuleRegistration(
        name="dynamic_indicators",
        domain=ModuleDomain.FINANCE_MARKETS,
        responsibilities=(
            "Stream technical indicator panels for trading agents",
            "Detect regime shifts across timeframes",
            "Flag conflicting signals for human review",
        ),
        success_metrics=(
            "Indicator updates under 1 minute",
            "Regime detection accuracy above 90%",
            "Conflicts resolved within trading session",
        ),
    ),
    ModuleRegistration(
        name="dynamic_teaching",
        domain=ModuleDomain.HUMAN_CREATIVE,
        responsibilities=(
            "Design skill acceleration paths for operators",
            "Deliver contextual micro-learning moments",
            "Collect feedback loops from learners",
        ),
        success_metrics=(
            "Learner satisfaction above 4.5/5",
            "Curricula refreshed quarterly",
            "New assets shipped each sprint",
        ),
    ),
    ModuleRegistration(
        name="dynamic_validator",
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        responsibilities=(
            "Enforce policy-as-code across automations",
            "Monitor for anomalous access patterns",
            "Coordinate remediation and evidence capture",
        ),
        success_metrics=(
            "Policy drift resolved within 15 minutes",
            "Zero unresolved critical alerts",
            "Compliance attestations issued monthly",
        ),
        notes=("Runbooks mirrored in incident response handbook",),
    ),
)


def build_default_infrastructure() -> DynamicInfrastructure:
    """Return a DynamicInfrastructure pre-populated with canonical modules."""

    infrastructure = DynamicInfrastructure()
    for registration in DEFAULT_MODULE_REGISTRATIONS:
        infrastructure.register_module(
            registration.name,
            registration.domain,
            responsibilities=registration.responsibilities,
            success_metrics=registration.success_metrics,
            notes=registration.notes,
        )
    return infrastructure


__all__ = [
    "Role",
    "RoleSpec",
    "ROLE_PALETTE",
    "ModuleDomain",
    "ModuleBlueprint",
    "MODULE_BLUEPRINTS",
    "ModuleRecord",
    "OperationalStep",
    "OperationalPlaybook",
    "DynamicInfrastructure",
    "ModuleRegistration",
    "DEFAULT_MODULE_REGISTRATIONS",
    "build_default_infrastructure",
]

