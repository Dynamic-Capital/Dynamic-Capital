from __future__ import annotations

import pytest

from dynamic_web3 import (
    DynamicWeb3Engine,
    GoLiveBlockedError,
    NetworkTelemetry,
    SmartContract,
    TransactionProfile,
    Web3GoLiveReadiness,
    Web3Network,
)


@pytest.fixture()
def engine() -> DynamicWeb3Engine:
    engine = DynamicWeb3Engine(
        reliability_floor=0.92,
        congestion_threshold=0.7,
        latency_target_ms=180.0,
    )
    engine.register_network(
        Web3Network(
            name="Dynamic Chain",
            chain_id=2040,
            rpc_endpoint="https://rpc.dynamic",
            finality_threshold=8,
            reliability_target=0.98,
        )
    )
    return engine


def _register_contract(engine: DynamicWeb3Engine, *, success_rate: float, latency_ms: float, pending: int) -> None:
    contract = SmartContract(
        address="0xabc123",
        network="Dynamic Chain",
        category="dex router",
        owner="Liquidity Ops",
    )
    engine.register_contract(contract)
    engine.ingest_transaction_profile(
        TransactionProfile(
            contract_address=contract.address,
            success_rate=success_rate,
            average_fee=0.2,
            volume_24h=5_000_000.0,
            average_latency_ms=latency_ms,
            pending_transactions=pending,
        )
    )


def test_evaluate_network_flags_low_uptime(engine: DynamicWeb3Engine) -> None:
    _register_contract(engine, success_rate=0.88, latency_ms=210.0, pending=180)

    summary = engine.evaluate_network(
        "Dynamic Chain",
        NetworkTelemetry(
            block_gap=12,
            uptime_ratio=0.84,
            utilisation=0.76,
            latency_ms=190.0,
            pending_transactions=320,
        ),
    )

    assert summary.reliability_score < 0.92
    assert any(alert.startswith("Reliability score") for alert in summary.alerts)
    assert any(action.category == "stability" for action in summary.actions)
    assert summary.finality_gap == 4


def test_registering_contract_requires_network(engine: DynamicWeb3Engine) -> None:
    with pytest.raises(ValueError):
        engine.register_contract(
            SmartContract(address="0xfeedface", network="Unknown Network")
        )


def test_contract_success_rate_alert(engine: DynamicWeb3Engine) -> None:
    _register_contract(engine, success_rate=0.71, latency_ms=140.0, pending=20)

    summary = engine.evaluate_network(
        "Dynamic Chain",
        NetworkTelemetry(
            block_gap=3,
            uptime_ratio=0.99,
            utilisation=0.35,
            latency_ms=120.0,
            pending_transactions=15,
        ),
    )

    assert any("success rate" in alert for alert in summary.alerts)
    assert any(action.category == "contract" for action in summary.actions)
    assert summary.metadata["profiled_contracts"] == 1


def test_build_unified_status(engine: DynamicWeb3Engine) -> None:
    secondary = Web3Network(
        name="Velocity Chain",
        chain_id=2051,
        rpc_endpoint="https://rpc.velocity",
        finality_threshold=6,
        reliability_target=0.97,
    )
    engine.register_network(secondary)

    _register_contract(engine, success_rate=0.94, latency_ms=150.0, pending=40)

    telemetry_map = {
        "Dynamic Chain": NetworkTelemetry(
            block_gap=2,
            uptime_ratio=0.96,
            utilisation=0.62,
            latency_ms=170.0,
            pending_transactions=120,
        ),
        "Velocity Chain": NetworkTelemetry(
            block_gap=4,
            uptime_ratio=0.99,
            utilisation=0.55,
            latency_ms=160.0,
            pending_transactions=80,
        ),
    }

    build = engine.build_unified_status(telemetry_map)

    assert len(build.summaries) == 2
    assert 0.0 < build.average_reliability <= 1.0
    assert 0.0 <= build.average_utilisation <= 1.0
    assert build.total_pending_transactions >= 200
    assert "Dynamic Chain" in build.metadata["evaluated_networks"]


def test_build_unified_status_requires_all_networks(engine: DynamicWeb3Engine) -> None:
    with pytest.raises(ValueError):
        engine.build_unified_status({})

    telemetry = NetworkTelemetry(
        block_gap=1,
        uptime_ratio=0.99,
        utilisation=0.4,
        latency_ms=100.0,
        pending_transactions=10,
    )

    with pytest.raises(ValueError):
        engine.build_unified_status({"Unknown": telemetry})

    engine.register_network(
        Web3Network(
            name="Atlas Chain",
            chain_id=3050,
            rpc_endpoint="https://rpc.atlas",
            finality_threshold=5,
        )
    )

    with pytest.raises(ValueError):
        engine.build_unified_status({"Dynamic Chain": telemetry})


def test_compile_project_build_ready_state(engine: DynamicWeb3Engine) -> None:
    secondary = Web3Network(
        name="Velocity Chain",
        chain_id=2051,
        rpc_endpoint="https://rpc.velocity",
        finality_threshold=6,
        reliability_target=0.97,
    )
    engine.register_network(secondary)

    _register_contract(engine, success_rate=0.95, latency_ms=140.0, pending=15)

    telemetry_map = {
        "Dynamic Chain": NetworkTelemetry(
            block_gap=2,
            uptime_ratio=0.99,
            utilisation=0.55,
            latency_ms=150.0,
            pending_transactions=40,
        ),
        "Velocity Chain": NetworkTelemetry(
            block_gap=2,
            uptime_ratio=0.98,
            utilisation=0.5,
            latency_ms=140.0,
            pending_transactions=35,
        ),
    }

    readiness = engine.compile_project_build(
        telemetry_map,
        project_name="Launch",
        metadata={"owner": "Ops"},
    )

    assert isinstance(readiness, Web3GoLiveReadiness)
    assert readiness.status == "ready"
    assert set(readiness.ready_networks) == {"Dynamic Chain", "Velocity Chain"}
    assert readiness.networks_requiring_attention == ()
    assert readiness.blocking_alerts == ()
    assert readiness.critical_actions == ()
    assert readiness.metadata["project"] == "Launch"
    assert readiness.metadata["owner"] == "Ops"
    assert readiness.total_pending_transactions >= 75


def test_compile_project_build_flags_attention(engine: DynamicWeb3Engine) -> None:
    _register_contract(engine, success_rate=0.7, latency_ms=320.0, pending=160)

    telemetry_map = {
        "Dynamic Chain": NetworkTelemetry(
            block_gap=15,
            uptime_ratio=0.82,
            utilisation=0.88,
            latency_ms=340.0,
            pending_transactions=600,
        )
    }

    readiness = engine.compile_project_build(telemetry_map)

    assert readiness.status == "blocked"
    assert readiness.ready_networks == ()
    assert readiness.networks_requiring_attention == ("Dynamic Chain",)
    assert readiness.blocking_alerts
    assert any(action.priority == "high" for action in readiness.critical_actions)
    assert readiness.total_pending_transactions >= 600


def test_go_live_returns_ready_summary(engine: DynamicWeb3Engine) -> None:
    secondary = Web3Network(
        name="Velocity Chain",
        chain_id=2051,
        rpc_endpoint="https://rpc.velocity",
        finality_threshold=6,
        reliability_target=0.97,
    )
    engine.register_network(secondary)

    _register_contract(engine, success_rate=0.95, latency_ms=140.0, pending=15)

    telemetry_map = {
        "Dynamic Chain": NetworkTelemetry(
            block_gap=2,
            uptime_ratio=0.99,
            utilisation=0.55,
            latency_ms=150.0,
            pending_transactions=40,
        ),
        "Velocity Chain": NetworkTelemetry(
            block_gap=2,
            uptime_ratio=0.98,
            utilisation=0.5,
            latency_ms=140.0,
            pending_transactions=35,
        ),
    }

    readiness = engine.go_live(
        telemetry_map,
        project_name="Launch",
        metadata={"owner": "Ops"},
    )

    assert readiness.status == "ready"
    assert set(readiness.ready_networks) == {"Dynamic Chain", "Velocity Chain"}
    assert readiness.metadata["project"] == "Launch"
    assert readiness.metadata["owner"] == "Ops"


def test_go_live_raises_when_not_ready(engine: DynamicWeb3Engine) -> None:
    _register_contract(engine, success_rate=0.7, latency_ms=320.0, pending=160)

    telemetry_map = {
        "Dynamic Chain": NetworkTelemetry(
            block_gap=15,
            uptime_ratio=0.82,
            utilisation=0.88,
            latency_ms=340.0,
            pending_transactions=600,
        )
    }

    with pytest.raises(GoLiveBlockedError) as exc_info:
        engine.go_live(telemetry_map)

    readiness = exc_info.value.readiness
    assert readiness.status == "blocked"
    assert readiness.blocking_alerts
    assert any(action.priority == "high" for action in readiness.critical_actions)
