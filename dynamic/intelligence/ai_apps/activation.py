"""Activation utilities for enabling dynamic modules, engines, and tasks."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Iterable, Mapping, Tuple

from dynamic.platform import engines as platform_engines
from dynamic_task_manager.manager import Task

from .infrastructure import (
    DEFAULT_MODULE_REGISTRATIONS,
    DynamicInfrastructure,
    ModuleDomain,
    ModuleRecord,
    build_comprehensive_infrastructure,
)


_DOMAIN_AGENT_RECOMMENDATIONS: Mapping[ModuleDomain, Tuple[str, ...]] = {
    ModuleDomain.TECHNOLOGY_INFRASTRUCTURE: (
        "DynamicEngineerAgent",
        "DynamicArchitectAgent",
    ),
    ModuleDomain.AI_COGNITION: (
        "DynamicQuantumAgent",
        "DynamicChatAgent",
    ),
    ModuleDomain.BUSINESS_OPERATIONS: (
        "DynamicBusinessAgent",
        "DynamicArchitectAgent",
    ),
    ModuleDomain.FINANCE_MARKETS: (
        "DynamicTradingAgent",
        "DynamicRiskAgent",
    ),
    ModuleDomain.HUMAN_CREATIVE: (
        "DynamicPlaybookAgent",
        "DynamicOceanLayerAgent",
    ),
    ModuleDomain.SECURITY_GOVERNANCE: (
        "DynamicSecurityAgent",
        "DynamicRiskAgent",
    ),
}


@dataclass(frozen=True, slots=True)
class ModuleActivationPlan:
    """Activation details for a single module."""

    module: ModuleRecord
    tasks: Tuple[Task, ...]
    recommended_agents: Tuple[str, ...]

    def to_dict(self) -> Dict[str, object]:
        return {
            "module": self.module.name,
            "domain": self.module.domain.value,
            "tasks": [asdict(task) for task in self.tasks],
            "recommended_agents": list(self.recommended_agents),
        }


@dataclass(frozen=True, slots=True)
class ActivationReport:
    """Summary of the activation process covering engines and modules."""

    engines: Mapping[str, object]
    modules: Tuple[ModuleActivationPlan, ...]
    total_engines: int
    total_modules: int

    def to_dict(self) -> Dict[str, object]:
        return {
            "total_engines": self.total_engines,
            "total_modules": self.total_modules,
            "engines": sorted(self.engines),
            "modules": [plan.to_dict() for plan in self.modules],
        }


def _module_tags(module: ModuleRecord) -> Tuple[str, ...]:
    tags = {module.name, module.domain.name.lower()}
    return tuple(sorted(tags))


def _module_tasks(module: ModuleRecord) -> Tuple[Task, ...]:
    display = module.name.replace("_", " ").title()
    joined_responsibilities = ", ".join(module.responsibilities)
    joined_metrics = ", ".join(module.success_metrics)
    tags = _module_tags(module)

    tasks: Iterable[Task] = (
        Task(
            name=f"{display}: confirm responsibilities",
            description=(
                "Review that the module mission remains accurate: "
                f"{joined_responsibilities}."
            ),
            priority=0.7,
            effort_hours=2.0,
            tags=tags,
        ),
        Task(
            name=f"{display}: align instrumentation",
            description=(
                "Verify metrics and instrumentation pipelines: "
                f"{joined_metrics}."
            ),
            priority=0.6,
            effort_hours=1.5,
            tags=tags,
        ),
        Task(
            name=f"{display}: coordinate agent coverage",
            description=(
                "Ensure recommended agents are informed and ready to support this module."
            ),
            priority=0.5,
            effort_hours=1.0,
            tags=tags,
        ),
    )
    return tuple(tasks)


def _recommended_agents(module: ModuleRecord) -> Tuple[str, ...]:
    roster = _DOMAIN_AGENT_RECOMMENDATIONS.get(
        module.domain, _DOMAIN_AGENT_RECOMMENDATIONS[ModuleDomain.TECHNOLOGY_INFRASTRUCTURE]
    )
    return roster


def activate_dynamic_stack(
    *,
    repo_root: str | Path | None = None,
    strict_engines: bool = False,
    include_default_modules: bool = False,
) -> ActivationReport:
    """Enable every engine and register modules with activation tasks."""

    infrastructure: DynamicInfrastructure = build_comprehensive_infrastructure(repo_root)
    engine_exports = platform_engines.enable_all_dynamic_engines(strict=strict_engines)
    engines = dict(engine_exports)

    default_names = (
        set()
        if include_default_modules
        else {registration.name for registration in DEFAULT_MODULE_REGISTRATIONS}
    )

    plans: list[ModuleActivationPlan] = []
    for module in infrastructure.list_modules():
        if module.name in default_names:
            continue
        plans.append(
            ModuleActivationPlan(
                module=module,
                tasks=_module_tasks(module),
                recommended_agents=_recommended_agents(module),
            )
        )

    return ActivationReport(
        engines=engines,
        modules=tuple(plans),
        total_engines=len(engines),
        total_modules=len(infrastructure.list_modules()),
    )


__all__ = [
    "ActivationReport",
    "ModuleActivationPlan",
    "activate_dynamic_stack",
]
