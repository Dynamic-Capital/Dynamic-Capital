"""Dynamic AI infrastructure scaffolding with role-based module orchestration."""

from __future__ import annotations

from dataclasses import dataclass, field

from enum import Enum

from pathlib import Path
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


MEMORY_MODULE_REGISTRATIONS: Tuple[ModuleRegistration, ...] = (
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
        name="dynamic_implicit_memory",
        domain=ModuleDomain.AI_COGNITION,
        responsibilities=(
            "Capture somatic cues and implicit memory traces",
            "Recommend regulation and reconsolidation protocols",
            "Track integration anchors for practitioner handoffs",
        ),
        success_metrics=(
            "Priming index recalculated after every session",
            "Regulation need trends below 0.4 on rolling basis",
            "Integration readiness improves week over week",
        ),
        notes=(
            "Powered by DynamicImplicitMemory reports and MemoryContext scoring",
        ),
    ),
    ModuleRegistration(
        name="dynamic_memory_reconsolidation",
        domain=ModuleDomain.AI_COGNITION,
        responsibilities=(
            "Design reconsolidation plans for memory fragments",
            "Sequence retrieval, rehearsal, and integration steps",
            "Surface keeper-ready guidance for consolidation rituals",
        ),
        success_metrics=(
            "Reconsolidation plans issued for each consolidation cycle",
            "Trace integration success averages above 0.7",
            "Keeper feedback loops processed within 48 hours",
        ),
        notes=(
            "Runs on DynamicMemoryReconsolidation planning engine and MemoryTrace models",
        ),
    ),
)


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
        name="dynamic_adapters",
        domain=ModuleDomain.TECHNOLOGY_INFRASTRUCTURE,
        responsibilities=(
            "Maintain multi-provider LLM adapter roster with hot failovers",
            "Rotate adapter credentials and runtime configuration safely",
            "Exercise regression suites across prompt templates and transports",
        ),
        success_metrics=(
            "Adapter uptime above 99.5%",
            "Failover drills executed each week",
            "Configuration drift resolved within 1 business day",
        ),
        notes=(
            "Backed by Dolphin, Ollama, and Kimi K2 adapter implementations",
        ),
    ),
    *MEMORY_MODULE_REGISTRATIONS,
    ModuleRegistration(
        name="dynamic_datasets",
        domain=ModuleDomain.AI_COGNITION,
        responsibilities=(
            "Transform learning telemetry into rolling fine-tune datasets",
            "Publish dataset exports for downstream training pipelines",
            "Track tag coverage and dataset lineage for governance",
        ),
        success_metrics=(
            "Dataset refresh cadence within 24 hours",
            "Average example size under 4KB",
            "Tag coverage above 90% across active datasets",
        ),
        notes=(
            "Powered by DynamicFineTuneDataset and DynamicAGIFineTuner primitives",
        ),
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
        name="dynamic_dev_engine",
        domain=ModuleDomain.BUSINESS_OPERATIONS,
        responsibilities=(
            "Plan engineering iterations across full-stack roles",
            "Surface dependency chains and unblock development work",
            "Balance capacity allocations across focus lanes",
        ),
        success_metrics=(
            "Iteration coverage maintained above 90%",
            "Critical blockers resolved within one business day",
            "Role utilisation variance kept under 15%",
        ),
        notes=(
            "Backed by DevelopmentTask and DevelopmentCapacity primitives for automation",
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
        name="dynamic_stake",
        domain=ModuleDomain.FINANCE_MARKETS,
        responsibilities=(
            "Operate staking pools with dynamic reward distribution",
            "Surface stake concentration and liquidity telemetry",
            "Coordinate slashing and withdrawal guardrails",
        ),
        success_metrics=(
            "Reward cycles posted within configured cadence",
            "Stake concentration alerts resolved within one business day",
            "Withdrawal requests settled inside 24 hours",
        ),
        notes=("Backed by DynamicStakePool for balance and reward tracking",),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_stake",
        domain=ModuleDomain.FINANCE_MARKETS,
        responsibilities=(
            "Model validator incentives and stake-weighted selection",
            "Publish slashing and reward policy updates",
            "Stress test network security against stake churn",
        ),
        success_metrics=(
            "Validator selection simulations refreshed each day",
            "Slashing policy changes broadcast with audit trail",
            "Stake churn risk maintained within tolerance band",
        ),
        notes=("Leverages DynamicProofOfStake consensus primitives",),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_work",
        domain=ModuleDomain.TECHNOLOGY_INFRASTRUCTURE,
        responsibilities=(
            "Track hash power, difficulty, and energy telemetry",
            "Detect anomalous mining pools and double-spend attempts",
            "Coordinate difficulty retargeting workflows",
        ),
        success_metrics=(
            "Difficulty adjustments computed every epoch",
            "Hash rate anomalies triaged within 5 minutes",
            "No unresolved double-spend investigations",
        ),
        notes=("Powered by DynamicProofOfWork verification toolkit",),
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
        name="dynamic_development_team",
        domain=ModuleDomain.HUMAN_CREATIVE,
        responsibilities=(
            "Publish role-specific playbooks for product delivery",
            "Capture focus areas and broadcast onboarding packets",
            "Keep cross-functional collaboration rituals aligned",
        ),
        success_metrics=(
            "Playbook satisfaction above 4.5/5",
            "Focus updates issued at least weekly",
            "Onboarding packets prepared before each iteration",
        ),
        notes=(
            "Derived from TEAM_DEVELOPMENT_PLAYBOOKS to accelerate new contributors",
        ),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_authority",
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        responsibilities=(
            "Govern authority sets and signer credential rotations",
            "Publish block attestations and consensus transcripts",
            "Alert on double-signs and misbehaving validators",
        ),
        success_metrics=(
            "Authority rotations executed with zero downtime",
            "Consensus finality achieved within target slots",
            "Double-sign incidents resolved inside 30 minutes",
        ),
        notes=("Runs on DynamicProofOfAuthority slot scheduling engine",),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_burn",
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        responsibilities=(
            "Ingest burn proofs and verify destruction events",
            "Reconcile burn windows with supply analytics",
            "Expose attestations for treasury and compliance teams",
        ),
        success_metrics=(
            "Burn proofs verified within 5 minutes of submission",
            "Supply dashboards reflect burns within reporting cycle",
            "Compliance attestations generated for every burn window",
        ),
        notes=("Built on DynamicProofOfBurn event ledger",),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_history",
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        responsibilities=(
            "Maintain verifiable event sequencing ledgers",
            "Issue time-stamped proofs to downstream services",
            "Audit historical forks and reconcile divergences",
        ),
        success_metrics=(
            "Historical proofs generated every block interval",
            "Timestamp verification latency under 2 seconds",
            "Fork audits completed within designated SLA",
        ),
        notes=("Backed by DynamicProofOfHistory verifiable delay engine",),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_reputation",
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        responsibilities=(
            "Aggregate validator behavior into rolling reputation scores",
            "Distribute penalties and incentives based on reputation",
            "Surface governance insights for policy adjustments",
        ),
        success_metrics=(
            "Reputation indices recalculated hourly",
            "Policy updates informed by reputation analytics each sprint",
            "No unresolved validator escalations beyond SLA",
        ),
        notes=("Utilises DynamicProofOfReputation scoring heuristics",),
    ),
    ModuleRegistration(
        name="dynamic_proof_of_space",
        domain=ModuleDomain.SECURITY_GOVERNANCE,
        responsibilities=(
            "Validate storage commitments across operators",
            "Monitor capacity pledges and challenge responses",
            "Coordinate seal proofs with redundancy policies",
        ),
        success_metrics=(
            "Capacity challenges resolved within 15 minutes",
            "Storage pledge coverage kept above redundancy threshold",
            "Challenge failures remediated before next epoch",
        ),
        notes=("Powered by DynamicProofOfSpace commitment verifier",),
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
    ModuleRegistration(
        name="dynamic_developer",
        domain=ModuleDomain.AI_COGNITION,
        responsibilities=(
            "Translate development engine outputs into iteration blueprints",
            "Expose role utilisation, focus, and dependency status",
            "Circulate summaries for automation and copilots to consume",
        ),
        success_metrics=(
            "Iteration summaries refreshed alongside every plan run",
            "Utilisation forecasts within 10% of realised effort",
            "Actionable notes captured for each development role",
        ),
        notes=(
            "Synthesises DynamicDevEngine blueprints for downstream agents",
        ),
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


_KEYWORD_DOMAIN_RULES: Tuple[Tuple[ModuleDomain, Tuple[str, ...]], ...] = (
    (
        ModuleDomain.FINANCE_MARKETS,
        (
            "alpha",
            "asset",
            "finance",
            "hedge",
            "liquidity",
            "market",
            "portfolio",
            "quant",
            "stake",
            "token",
            "trade",
            "trading",
            "treasury",
            "wallet",
        ),
    ),
    (
        ModuleDomain.SECURITY_GOVERNANCE,
        (
            "authority",
            "compliance",
            "governance",
            "kyc",
            "policy",
            "proof",
            "risk",
            "security",
            "validator",
            "watcher",
        ),
    ),
    (
        ModuleDomain.BUSINESS_OPERATIONS,
        (
            "account",
            "business",
            "cadence",
            "demand",
            "ops",
            "operation",
            "process",
            "schedule",
            "supply",
            "task",
            "workflow",
        ),
    ),
    (
        ModuleDomain.HUMAN_CREATIVE,
        (
            "artist",
            "creative",
            "culture",
            "persona",
            "playbook",
            "teaching",
            "mentor",
            "development_team",
        ),
    ),
    (
        ModuleDomain.AI_COGNITION,
        (
            "agent",
            "ai",
            "brain",
            "cognition",
            "conscious",
            "learning",
            "memory",
            "mind",
            "model",
            "quantum",
            "thinking",
        ),
    ),
)


def _humanise_module_name(name: str) -> str:
    tokens = [token for token in name.split("_") if token]
    return " ".join(token.capitalize() for token in tokens)


def discover_dynamic_module_names(repo_root: str | Path | None = None) -> Tuple[str, ...]:
    """Return all repository directories starting with ``dynamic_``.

    The helper prefers explicit ``repo_root`` overrides but falls back to the
    repository root inferred from this file's location.  Only directories that
    expose an ``__init__.py`` file are returned so the results are importable as
    packages.
    """

    file_path = Path(__file__).resolve()
    inferred_root = file_path.parents[3]
    root_path = Path(repo_root) if repo_root is not None else inferred_root

    modules: list[str] = []
    for entry in sorted(root_path.iterdir(), key=lambda path: path.name):
        if not entry.is_dir():
            continue
        if not entry.name.startswith("dynamic_"):
            continue
        init_file = entry / "__init__.py"
        if not init_file.exists():
            continue
        modules.append(entry.name)
    return tuple(modules)


def guess_module_domain(name: str) -> ModuleDomain:
    """Best-effort domain inference for a dynamic module name."""

    lowered = name.lower()
    tokens = set(lowered.split("_"))
    for domain, keywords in _KEYWORD_DOMAIN_RULES:
        for keyword in keywords:
            if keyword in lowered or keyword in tokens:
                return domain
    return ModuleDomain.TECHNOLOGY_INFRASTRUCTURE


def _build_auto_registration(name: str, domain: ModuleDomain) -> ModuleRegistration:
    """Construct a :class:`ModuleRegistration` stub for ``name``."""

    friendly = _humanise_module_name(name)
    prefix = friendly.replace("Dynamic ", "").strip() or friendly

    if domain is ModuleDomain.FINANCE_MARKETS:
        responsibilities = (
            f"Govern {friendly} execution guardrails across trading cycles",
            f"Publish telemetry so finance teams can evaluate {prefix} health",
            f"Coordinate with risk agents when {prefix} deviates from policy",
        )
        success_metrics = (
            f"{friendly} telemetry refreshed each session",
            f"Risk escalations for {prefix} resolved within trading SLA",
            f"Portfolio alignment for {prefix} maintained inside guardrails",
        )
    elif domain is ModuleDomain.SECURITY_GOVERNANCE:
        responsibilities = (
            f"Enforce governance controls for {friendly}",
            f"Surface anomalies and compliance drift tied to {prefix}",
            f"Maintain incident response runbooks for {prefix}",
        )
        success_metrics = (
            f"Security alerts for {prefix} triaged within target window",
            f"Audit evidence for {prefix} stored with provenance",
            f"Governance reviews of {prefix} logged every sprint",
        )
    elif domain is ModuleDomain.BUSINESS_OPERATIONS:
        responsibilities = (
            f"Coordinate cadences that depend on {friendly}",
            f"Track workflow dependencies around {prefix}",
            f"Report enablement status for {prefix} stakeholders",
        )
        success_metrics = (
            f"Operational reviews for {prefix} completed on schedule",
            f"Blocked work related to {prefix} resolved within SLA",
            f"Stakeholder updates for {prefix} shared each reporting cycle",
        )
    elif domain is ModuleDomain.HUMAN_CREATIVE:
        responsibilities = (
            f"Deliver learning and creative assets for {friendly}",
            f"Curate narratives that clarify the value of {prefix}",
            f"Facilitate rituals that sustain {prefix} adoption",
        )
        success_metrics = (
            f"Learner satisfaction for {prefix} initiatives above target",
            f"Knowledge base entries for {prefix} refreshed monthly",
            f"Creative outputs linked to {prefix} shipped each sprint",
        )
    elif domain is ModuleDomain.AI_COGNITION:
        responsibilities = (
            f"Advance cognitive capabilities delivered by {friendly}",
            f"Align {prefix} behaviours with governance policies",
            f"Document model upgrades and memory refreshes for {prefix}",
        )
        success_metrics = (
            f"Evaluation suites for {prefix} pass with agreed thresholds",
            f"Memory refresh cadence for {prefix} honoured every cycle",
            f"Alignment reviews for {prefix} logged with owners",
        )
    else:
        responsibilities = (
            f"Operate the {friendly} stack with resilient infrastructure",
            f"Keep observability and automation healthy for {prefix}",
            f"Coordinate deployments and rollbacks impacting {prefix}",
        )
        success_metrics = (
            f"Operational metrics for {prefix} remain within tolerance",
            f"Instrumentation for {prefix} covers critical pathways",
            f"Incidents touching {prefix} resolved within platform SLA",
        )

    notes = (
        "Auto-generated registration to ensure comprehensive module coverage.",
        "Refine responsibilities and metrics with the owning team.",
    )

    return ModuleRegistration(
        name=name,
        domain=domain,
        responsibilities=responsibilities,
        success_metrics=success_metrics,
        notes=notes,
    )


def build_comprehensive_infrastructure(
    repo_root: str | Path | None = None,
) -> DynamicInfrastructure:
    """Return an infrastructure instance registering every dynamic module."""

    infrastructure = build_default_infrastructure()
    registered = {module.name for module in infrastructure.list_modules()}

    for module_name in discover_dynamic_module_names(repo_root):
        if module_name in registered:
            continue
        domain = guess_module_domain(module_name)
        registration = _build_auto_registration(module_name, domain)
        infrastructure.register_module(
            registration.name,
            registration.domain,
            responsibilities=registration.responsibilities,
            success_metrics=registration.success_metrics,
            notes=registration.notes,
        )
        registered.add(module_name)

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
    "MEMORY_MODULE_REGISTRATIONS",
    "DEFAULT_MODULE_REGISTRATIONS",
    "discover_dynamic_module_names",
    "guess_module_domain",
    "build_default_infrastructure",
    "build_comprehensive_infrastructure",
]

