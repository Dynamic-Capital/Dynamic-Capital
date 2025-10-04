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
