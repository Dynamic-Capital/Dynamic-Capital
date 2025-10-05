from dynamic.intelligence.ai_apps.activation import activate_dynamic_stack
from dynamic.intelligence.ai_apps.infrastructure import DEFAULT_MODULE_REGISTRATIONS


def test_activate_dynamic_stack_produces_activation_plans() -> None:
    report = activate_dynamic_stack()

    assert report.engines
    assert report.total_engines == len(report.engines)
    assert report.total_modules >= len(DEFAULT_MODULE_REGISTRATIONS)

    module_names = {plan.module.name for plan in report.modules}
    assert "dynamic_accounting" in module_names
    assert "dynamic_supabase" not in module_names  # defaults excluded by default

    accounting_plan = next(plan for plan in report.modules if plan.module.name == "dynamic_accounting")
    assert accounting_plan.tasks
    assert all(task.tags for task in accounting_plan.tasks)
    assert accounting_plan.recommended_agents


def test_activate_dynamic_stack_includes_defaults_when_requested() -> None:
    report = activate_dynamic_stack(include_default_modules=True)

    module_names = {plan.module.name for plan in report.modules}
    assert "dynamic_supabase" in module_names
