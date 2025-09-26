"""Trading algo enhancement roadmap orchestration utilities."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Iterator, Literal, Mapping, MutableMapping, Optional, Tuple

from .core_orchestration import (
    OrchestrationBuilder,
    OrchestrationContext,
    OrchestrationObserver,
    OrchestrationPlan,
    OrchestrationStep,
)
from .loop_algorithms import LoopExecutionSummary, StopCondition, run_plan_loop

Category = Literal[
    "telemetry",
    "orchestration",
    "integration",
    "experimentation",
    "governance",
]
Status = Literal["not_started", "in_progress", "blocked", "done"]


@dataclass(slots=True)
class EnhancementTask:
    """Represents a single actionable roadmap item."""

    key: str
    title: str
    summary: str
    category: Category
    depends_on: Tuple[str, ...] = ()
    deliverables: Tuple[str, ...] = ()
    metrics: Tuple[str, ...] = ()

    def to_step(self) -> OrchestrationStep:
        """Convert the task definition into an orchestration step."""

        return OrchestrationStep(
            name=self.key,
            summary=self.summary,
            depends_on=self.depends_on,
            provides=self.deliverables,
            tags=(self.category, *self.metrics),
        )


@dataclass(slots=True)
class EnhancementRoadmap:
    """Collection of roadmap tasks with dependency awareness."""

    tasks: Tuple[EnhancementTask, ...]
    _index: Dict[str, EnhancementTask] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._index = {task.key: task for task in self.tasks}
        counts: Dict[str, int] = {}
        for task in self.tasks:
            counts[task.key] = counts.get(task.key, 0) + 1
        duplicates = sorted(key for key, count in counts.items() if count > 1)
        if duplicates:
            raise ValueError(f"duplicate task keys detected: {', '.join(duplicates)}")

    def as_plan(self, *, name: str = "trading_algo_enhancement", summary: Optional[str] = None) -> OrchestrationPlan:
        """Render the roadmap as an orchestration plan."""

        builder = OrchestrationBuilder(name, summary=summary)
        for task in self.tasks:
            builder.add_step(
                name=task.key,
                summary=task.summary,
                depends_on=task.depends_on,
                provides=task.deliverables,
                tags=(task.category, *task.metrics),
            )
        return builder.build()

    def iter_by_category(self, category: Category) -> Iterator[EnhancementTask]:
        """Yield tasks for the requested category in declaration order."""

        for task in self.tasks:
            if task.category == category:
                yield task

    def categories(self) -> Tuple[Category, ...]:
        """Return an ordered tuple of categories used in the roadmap."""

        seen: list[Category] = []
        for task in self.tasks:
            if task.category not in seen:
                seen.append(task.category)
        return tuple(seen)

    def recommend_next_tasks(
        self,
        progress: Mapping[str, Status] | None = None,
        *,
        limit: Optional[int] = None,
        category: Optional[Category] = None,
    ) -> list[EnhancementTask]:
        """Return tasks whose dependencies are complete and not yet finished."""

        status = dict(progress or {})
        recommendations: list[EnhancementTask] = []

        for task in self.tasks:
            if category is not None and task.category != category:
                continue
            state = status.get(task.key, "not_started")
            if state in {"done", "blocked"}:
                continue
            if any(status.get(dep, "not_started") != "done" for dep in task.depends_on):
                continue
            recommendations.append(task)
            if limit is not None and len(recommendations) >= limit:
                break
        return recommendations


@dataclass(slots=True)
class EnhancementProgress:
    """Mutable tracking structure for roadmap execution."""

    task_status: MutableMapping[str, Status] = field(default_factory=dict)

    def status_for(self, task_key: str) -> Status:
        """Return the stored status for the task or ``"not_started"``."""

        return self.task_status.get(task_key, "not_started")

    def update(self, task_key: str, status: Status) -> None:
        """Set the status for a task."""

        self.task_status[task_key] = status

    def mark_done(self, task_key: str) -> None:
        """Convenience helper for marking a task as completed."""

        self.update(task_key, "done")


def build_default_roadmap() -> EnhancementRoadmap:
    """Create the default enhancement roadmap aligned to the documentation."""

    tasks: Tuple[EnhancementTask, ...] = (
        # Telemetry foundation
        EnhancementTask(
            key="telemetry.asset_inventory",
            title="Catalogue trading and LLM assets",
            summary="Map all multi-LLM studio, algorithm, and worker assets that consume or emit model output.",
            category="telemetry",
            deliverables=("asset_catalogue",),
            metrics=("coverage_ratio",),
        ),
        EnhancementTask(
            key="telemetry.instrumentation",
            title="Instrument provider usage",
            summary="Add latency, token, error, and cost metrics for every provider in Supabase analytics and trading pipelines.",
            category="telemetry",
            depends_on=("telemetry.asset_inventory",),
            deliverables=("telemetry_dashboards",),
            metrics=("latency_ms", "error_rate"),
        ),
        EnhancementTask(
            key="telemetry.outcome_capture",
            title="Capture trade outcomes",
            summary="Link trade decisions to provider mixes, prompt templates, and algo parameters for post-trade analysis.",
            category="telemetry",
            depends_on=("telemetry.instrumentation",),
            deliverables=("trade_outcome_log",),
            metrics=("attribution_coverage",),
        ),
        # Orchestration
        EnhancementTask(
            key="orchestration.capability_matrix",
            title="Build provider capability matrix",
            summary="Score providers on latency, cost, reasoning depth, and domain accuracy to inform routing decisions.",
            category="orchestration",
            depends_on=("telemetry.outcome_capture",),
            deliverables=("provider_matrix",),
            metrics=("latency_ms", "accuracy_score"),
        ),
        EnhancementTask(
            key="orchestration.prompt_library",
            title="Curate provider-aware prompt templates",
            summary="Maintain versioned prompts tuned to provider strengths and compliant with glossary checkpoints.",
            category="orchestration",
            depends_on=("orchestration.capability_matrix",),
            deliverables=("prompt_library",),
            metrics=("template_pass_rate",),
        ),
        EnhancementTask(
            key="orchestration.routing_policy",
            title="Design routing and fallback policy",
            summary="Implement rules engine to route research, execution, and fallback traffic across providers.",
            category="orchestration",
            depends_on=("orchestration.capability_matrix",),
            deliverables=("routing_policy",),
            metrics=("policy_coverage",),
        ),
        EnhancementTask(
            key="orchestration.ensemble_scoring",
            title="Introduce ensemble scoring",
            summary="Develop reranking heuristics that evaluate multi-provider outputs before trading consumption.",
            category="orchestration",
            depends_on=("orchestration.routing_policy",),
            deliverables=("ensemble_scoring",),
            metrics=("confidence_score", "agreement_rate"),
        ),
        EnhancementTask(
            key="orchestration.human_override",
            title="Enable human-in-the-loop overrides",
            summary="Expose low-confidence outputs for analyst review in the studio and feed overrides back into weights.",
            category="orchestration",
            depends_on=("orchestration.ensemble_scoring",),
            deliverables=("override_workflow",),
            metrics=("override_latency",),
        ),
        # Integration
        EnhancementTask(
            key="integration.glossary_alignment",
            title="Align glossary checkpoints",
            summary="Ensure prompts emit terminology compatible with MarketSnapshot and analyzer expectations.",
            category="integration",
            depends_on=("orchestration.prompt_library",),
            deliverables=("glossary_checks",),
            metrics=("glossary_compliance",),
        ),
        EnhancementTask(
            key="integration.shadow_deployments",
            title="Run shadow deployments",
            summary="Evaluate multi-LLM assisted strategies alongside existing automation before full cutover.",
            category="integration",
            depends_on=(
                "integration.glossary_alignment",
                "orchestration.ensemble_scoring",
            ),
            deliverables=("shadow_reports",),
            metrics=("performance_delta",),
        ),
        EnhancementTask(
            key="integration.guardrails",
            title="Automate guardrails for live orders",
            summary="Gate execution on ensemble consensus thresholds before Supabase workers or EAs submit orders.",
            category="integration",
            depends_on=("integration.shadow_deployments",),
            deliverables=("guardrail_rules",),
            metrics=("false_positive_rate",),
        ),
        # Experimentation
        EnhancementTask(
            key="experimentation.replay_harness",
            title="Build historical replay harness",
            summary="Replay market sessions through the multi-LLM stack to benchmark signal precision and recall.",
            category="experimentation",
            depends_on=("telemetry.outcome_capture",),
            deliverables=("replay_suite",),
            metrics=("precision", "recall"),
        ),
        EnhancementTask(
            key="experimentation.ab_pipeline",
            title="Launch A/B pipeline",
            summary="Randomise signal batches between baseline and enhanced stacks and measure performance deltas.",
            category="experimentation",
            depends_on=(
                "experimentation.replay_harness",
                "integration.guardrails",
            ),
            deliverables=("ab_reports",),
            metrics=("win_rate", "drawdown"),
        ),
        EnhancementTask(
            key="experimentation.closed_loop",
            title="Activate closed-loop learning",
            summary="Feed tagged outcomes into prompt and weight tuning jobs to reinforce profitable behaviours.",
            category="experimentation",
            depends_on=("experimentation.ab_pipeline",),
            deliverables=("tuning_jobs",),
            metrics=("profit_factor",),
        ),
        # Governance
        EnhancementTask(
            key="governance.vendor_assessment",
            title="Complete vendor and regulatory assessment",
            summary="Document provider data policies and align controls with global and Maldivian regulatory requirements.",
            category="governance",
            depends_on=("telemetry.asset_inventory",),
            deliverables=("vendor_risk_register",),
            metrics=("risk_score",),
        ),
        EnhancementTask(
            key="governance.secrets_management",
            title="Enforce secrets governance",
            summary="Centralise provider API keys with environment-specific rotation and access reviews.",
            category="governance",
            depends_on=("governance.vendor_assessment",),
            deliverables=("secrets_runbook",),
            metrics=("rotation_cadence",),
        ),
        EnhancementTask(
            key="governance.incident_response",
            title="Harden incident response playbooks",
            summary="Update trading runbooks with escalation, rollback, and provider outage handling procedures.",
            category="governance",
            depends_on=(
                "integration.guardrails",
                "governance.secrets_management",
            ),
            deliverables=("incident_runbook",),
            metrics=("mttr",),
        ),
    )

    return EnhancementRoadmap(tasks)


def build_trading_algo_enhancement_plan() -> OrchestrationPlan:
    """Create the orchestration plan for the default enhancement roadmap."""

    roadmap = build_default_roadmap()
    summary = (
        "Telemetry, orchestration, integration, experimentation, and governance "
        "steps for evolving the multi-LLM ensemble and trading stack."
    )
    return roadmap.as_plan(summary=summary)


def loop_trading_algo_enhancement_plan(
    iterations: int,
    *,
    context: Optional[OrchestrationContext] = None,
    strict: bool = True,
    observers: Optional[Iterable[OrchestrationObserver]] = None,
    break_on_failure: bool = True,
    stop_condition: Optional[StopCondition] = None,
) -> LoopExecutionSummary:
    """Execute the trading algo enhancement plan repeatedly as a loop."""

    plan = build_trading_algo_enhancement_plan()
    return run_plan_loop(
        plan,
        iterations=iterations,
        context=context,
        strict=strict,
        observers=observers,
        break_on_failure=break_on_failure,
        stop_condition=stop_condition,
    )


__all__ = [
    "Category",
    "Status",
    "EnhancementTask",
    "EnhancementRoadmap",
    "EnhancementProgress",
    "build_default_roadmap",
    "build_trading_algo_enhancement_plan",
    "loop_trading_algo_enhancement_plan",
]

