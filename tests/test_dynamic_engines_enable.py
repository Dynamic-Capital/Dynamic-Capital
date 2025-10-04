import importlib

import dynamic.platform.engines as engines


def test_enable_all_dynamic_engines_populates_namespace(recwarn) -> None:
    loaded = engines.enable_all_dynamic_engines()

    assert not recwarn.list

    exported_names = {
        name for name in engines.__all__ if name != "enable_all_dynamic_engines"
    }
    assert exported_names, "expected exported engine names"

    missing = [name for name in exported_names if not hasattr(engines, name)]
    assert not missing, f"missing exports: {missing}"

    assert set(loaded) == exported_names

    second = engines.enable_all_dynamic_engines()
    assert set(second) == exported_names
    for name in exported_names:
        assert second[name] is getattr(engines, name)


def test_enable_all_dynamic_engines_covers_requested_modules() -> None:
    modules = [
        "dynamic_branch",
        "dynamic_bridge",
        "dynamic_cycle",
        "dynamic_effect",
        "dynamic_hierarchy",
        "dynamic_mantra",
        "dynamic_method",
        "dynamic_playbook",
        "dynamic_routine",
    ]

    loaded = engines.enable_all_dynamic_engines()

    for module_name in modules:
        module = importlib.import_module(module_name)
        for symbol in getattr(module, "__all__", ()):  # defensive: only check declared
            assert symbol in loaded, f"{symbol} from {module_name} was not enabled"
            assert getattr(engines, symbol) is getattr(module, symbol)
