import dynamic.platform.routers as routers


EXPECTED_ROUTERS = {
    "MinimalRouter",
    "Phase4Router",
    "DynamicGatewayEngine",
    "DynamicHttp",
}


def test_enable_all_dynamic_routers_populates_namespace(recwarn) -> None:
    loaded = routers.enable_all_dynamic_routers()

    assert not recwarn.list

    exported_names = {
        name for name in routers.__all__ if name != "enable_all_dynamic_routers"
    }
    assert exported_names == EXPECTED_ROUTERS

    assert set(loaded) == EXPECTED_ROUTERS

    second = routers.enable_all_dynamic_routers()
    assert set(second) == EXPECTED_ROUTERS

    for name in EXPECTED_ROUTERS:
        assert hasattr(routers, name)
        assert loaded[name] is getattr(routers, name)
        assert second[name] is getattr(routers, name)
