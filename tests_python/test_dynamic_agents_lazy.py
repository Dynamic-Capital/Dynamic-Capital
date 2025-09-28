from __future__ import annotations

import sys
from types import ModuleType

import pytest

from dynamic_agents._lazy import build_lazy_namespace


@pytest.fixture(name="fake_modules")
def fixture_fake_modules() -> dict[str, ModuleType]:
    modules: dict[str, ModuleType] = {}
    for name in ("tests.fake.module_a", "tests.fake.module_b"):
        module = ModuleType(name)
        modules[name] = module
        sys.modules[name] = module
    modules["tests.fake.module_a"].foo = object()
    modules["tests.fake.module_a"].bar = object()
    modules["tests.fake.module_b"].bar = object()
    modules["tests.fake.module_b"].baz = object()
    try:
        yield modules
    finally:
        for name in modules:
            sys.modules.pop(name, None)


def test_build_lazy_namespace_deduplicates_and_overrides(fake_modules: dict[str, ModuleType]) -> None:
    lazy = build_lazy_namespace(
        {
            "tests.fake.module_a": ("foo", "bar"),
            "tests.fake.module_b": ("bar", "baz"),
        },
        default_module="tests.fake.module_a",
    )

    assert lazy.exports == ("foo", "bar", "baz")

    namespace: dict[str, object] = {"__name__": "tests.fake"}
    foo = lazy.resolve("foo", namespace)
    assert foo is fake_modules["tests.fake.module_a"].foo
    assert namespace["foo"] is foo

    bar = lazy.resolve("bar", namespace)
    assert bar is fake_modules["tests.fake.module_b"].bar
    assert namespace["bar"] is bar

    baz = lazy.resolve("baz", namespace)
    assert baz is fake_modules["tests.fake.module_b"].baz


def test_build_lazy_namespace_unknown_symbol(fake_modules: dict[str, ModuleType]) -> None:
    lazy = build_lazy_namespace(
        {"tests.fake.module_a": ("foo",)},
        default_module="tests.fake.module_a",
    )

    with pytest.raises(AttributeError):
        lazy.resolve("missing", {})
