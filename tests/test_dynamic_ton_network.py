import pytest

from dynamic_ton import (
    TON_MAINNET_LITESERVERS,
    TonLiteserver,
    build_tonlib_liteservers,
)


def test_mainnet_liteservers_match_expected_hosts():
    assert len(TON_MAINNET_LITESERVERS) == 2
    hosts = {server.host for server in TON_MAINNET_LITESERVERS}
    assert hosts == {"31.57.199.1", "163.5.62.1"}
    for server in TON_MAINNET_LITESERVERS:
        assert server.port == 5053
        assert (
            server.public_key_base64
            == "Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0="
        )


def test_tonlib_serialisation_matches_signed_ip_expectations():
    records = build_tonlib_liteservers()
    assert len(records) == 2
    encoded_hosts = {
        record["ip"]
        for record in records
    }
    expected = {
        TonLiteserver(
            host="31.57.199.1",
            port=5053,
            public_key_base64="Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=",
        ).to_tonlib_dict()["ip"],
        TonLiteserver(
            host="163.5.62.1",
            port=5053,
            public_key_base64="Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=",
        ).to_tonlib_dict()["ip"],
    }
    assert encoded_hosts == expected


def test_liteserver_trims_host_whitespace():
    server = TonLiteserver(
        host=" 163.5.62.1 ",
        port=5053,
        public_key_base64="Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=",
    )
    assert server.host == "163.5.62.1"


def test_liteserver_accepts_string_port():
    server = TonLiteserver(
        host="31.57.199.1",
        port="5053",
        public_key_base64="Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=",
    )
    assert server.port == 5053


@pytest.mark.parametrize(
    "kwargs,exception",
    [
        ({"host": "example.com"}, ValueError),
        ({"port": 70000}, ValueError),
        ({"public_key_base64": ""}, ValueError),
        ({"public_key_base64": "Zm9v"}, ValueError),
    ],
)
def test_liteserver_invalid_inputs_raise(kwargs, exception):
    base_kwargs = dict(
        host="31.57.199.1",
        port=5053,
        public_key_base64="Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=",
    )
    base_kwargs.update(kwargs)
    with pytest.raises(exception):
        TonLiteserver(**base_kwargs)


def test_build_tonlib_liteservers_deduplicates_entries():
    first = TON_MAINNET_LITESERVERS[0]
    custom = TonLiteserver(
        host="163.5.62.1",
        port=5053,
        public_key_base64="Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=",
    )
    records = build_tonlib_liteservers([first, custom, first])
    assert len(records) == 2
    ips = {record["ip"] for record in records}
    assert ips == {
        first.to_tonlib_dict()["ip"],
        custom.to_tonlib_dict()["ip"],
    }


def test_build_tonlib_liteservers_requires_at_least_one_entry():
    with pytest.raises(ValueError):
        build_tonlib_liteservers([])
