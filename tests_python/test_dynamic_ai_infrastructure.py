from __future__ import annotations

import pytest

from dynamic.intelligence.ai_apps.infrastructure import (
    DEFAULT_MODULE_REGISTRATIONS,
    MODULE_BLUEPRINTS,
    DynamicInfrastructure,
    ModuleDomain,
    Role,
    build_default_infrastructure,
)


def test_default_infrastructure_registers_blueprint_modules() -> None:
    infrastructure = build_default_infrastructure()
    modules = infrastructure.list_modules()

    # Ensure one module per domain is present in the default build.
    domains = {module.domain for module in modules}
    assert domains == set(MODULE_BLUEPRINTS.keys())

    supabase = infrastructure.get_module("dynamic_supabase")
    blueprint = MODULE_BLUEPRINTS[ModuleDomain.TECHNOLOGY_INFRASTRUCTURE]
    assert supabase.role_stack == blueprint.role_stack
    assert "Replication lag under 200ms" in supabase.success_metrics
    assert "Automate migrations and schema drift remediation" in supabase.responsibilities


def test_register_module_rejects_roles_outside_blueprint() -> None:
    infrastructure = DynamicInfrastructure()

    with pytest.raises(ValueError):
        infrastructure.register_module(
            "dynamic_invalid",
            ModuleDomain.BUSINESS_OPERATIONS,
            roles=(Role.BOT,),
        )


def test_operational_playbook_reflects_assignments() -> None:
    infrastructure = build_default_infrastructure()
    infrastructure.assign_role_owner("dynamic_validator", Role.BOT, "policy-bot")
    infrastructure.assign_role_owner("dynamic_validator", Role.WATCHER, "secops")
    infrastructure.record_instrumentation("dynamic_validator", ("critical alert rate",))
    infrastructure.record_iteration_plan(
        "dynamic_validator",
        (
            "Run quarterly chaos drills",
            "Review Sentinel policies",
        ),
    )

    playbook = infrastructure.generate_operational_playbook("dynamic_validator")
    step_descriptions = [step.description for step in playbook.steps]

    assert any("policy-bot" in description for description in step_descriptions)
    assert any("critical alert rate" in description for description in step_descriptions)
    assert any("quarterly chaos drills" in description for description in step_descriptions)


def test_module_registration_uses_notes_and_metrics() -> None:
    infrastructure = build_default_infrastructure()
    memory_module = infrastructure.get_module("dynamic_memory")

    assert "Backed by vector store with encryption at rest" in memory_module.notes
    assert "Memory relevance score above 0.8" in memory_module.success_metrics

    # Instrumentation defaults to success metrics until overridden.
    assert memory_module.instrumentation == memory_module.success_metrics


def test_default_registration_catalog_is_consistent() -> None:
    registered_names = {registration.name for registration in DEFAULT_MODULE_REGISTRATIONS}
    infrastructure = build_default_infrastructure()
    module_names = {module.name for module in infrastructure.list_modules()}

    assert registered_names == module_names


def test_development_modules_expose_dev_focus() -> None:
    infrastructure = build_default_infrastructure()

    expected_domains = {
        "dynamic_dev_engine": ModuleDomain.BUSINESS_OPERATIONS,
        "dynamic_development_team": ModuleDomain.HUMAN_CREATIVE,
        "dynamic_developer": ModuleDomain.AI_COGNITION,
    }

    for module_name, domain in expected_domains.items():
        module = infrastructure.get_module(module_name)
        assert module.domain is domain
        assert module.responsibilities
        assert module.success_metrics
        assert module.notes
