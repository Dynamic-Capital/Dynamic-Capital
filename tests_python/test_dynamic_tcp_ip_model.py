from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - ensure import path for pytest
    sys.path.append(str(PROJECT_ROOT))

from dynamic_tcp_ip_model import (  # noqa: E402 - import after path mutation
    Protocol,
    TcpIpLayer,
    default_model,
)


def test_default_model_layers_and_protocols() -> None:
    model = default_model()

    assert [layer.layer for layer in model.layers] == [
        TcpIpLayer.APPLICATION,
        TcpIpLayer.TRANSPORT,
        TcpIpLayer.INTERNET,
        TcpIpLayer.NETWORK_ACCESS,
    ]

    assert {protocol.name for protocol in model.protocols()} == {
        "HTTP",
        "HTTPS",
        "FTP",
        "DNS",
        "DHCP",
        "TCP",
        "UDP",
        "IP",
        "ARP",
    }


def test_protocol_lookup_is_case_insensitive() -> None:
    model = default_model()
    assert model.get_protocol("https").secure_by_default is True

    with pytest.raises(KeyError):
        model.get_protocol("smtp")


def test_register_protocol_enriches_layer() -> None:
    model = default_model()
    quic = Protocol(
        name="QUIC",
        layer=TcpIpLayer.TRANSPORT,
        description="Secure, multiplexed transport running over UDP.",
        guarantees=("reduced latency", "stream multiplexing"),
        secure_by_default=True,
    )

    model.register_protocol(quic)
    transport_layer = model.layer(TcpIpLayer.TRANSPORT)

    assert "QUIC" in transport_layer.protocol_names()
    assert model.get_protocol("QUIC").secure_by_default is True


def test_describe_osi_layer_maps_correctly() -> None:
    model = default_model()
    network_mapping = model.describe_osi_layer("network")

    assert network_mapping.label() == "Network"
    assert network_mapping.tcp_ip_layers == (TcpIpLayer.INTERNET,)


def test_lifecycle_iteration_preserves_order() -> None:
    model = default_model()
    stages = list(model.iter_lifecycle())

    assert [stage.label() for stage in stages] == [
        "Address Allocation",
        "Name Resolution",
        "Packet Delivery",
        "Session Continuity",
    ]

    assert stages[0].layers == (
        TcpIpLayer.APPLICATION,
        TcpIpLayer.INTERNET,
    )
