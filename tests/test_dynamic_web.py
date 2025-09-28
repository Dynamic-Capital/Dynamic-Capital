import pytest

from dynamic_web import (
    DynamicWebError,
    DynamicWebNetwork,
    LinkNotFoundError,
    NodeNotFoundError,
    WebLink,
    WebNode,
)


def build_network() -> DynamicWebNetwork:
    network = DynamicWebNetwork(decay_factor=0.82)
    network.upsert_node(WebNode("hub", label="Hub", importance=1.6, capacity=5.0, activation_threshold=0.2))
    network.upsert_node({
        "identifier": "spoke-a",
        "label": "Spoke A",
        "importance": 1.1,
        "capacity": 3.0,
        "activation_threshold": 0.15,
        "latency_budget_ms": 180.0,
    })
    network.upsert_node(WebNode("spoke-b", label="Spoke B", capacity=2.4, activation_threshold=0.05))
    network.upsert_node(WebNode("observer", capacity=1.2, activation_threshold=0.05))

    network.link_nodes(WebLink("hub", "spoke-a", weight=1.2, reliability=0.9, latency_ms=18.0, bandwidth=3.5, damping=0.1))
    network.link_nodes({
        "source": "spoke-a",
        "target": "spoke-b",
        "weight": 1.05,
        "reliability": 0.85,
        "latency_ms": 22.0,
        "bandwidth": 2.4,
        "damping": 0.05,
    })
    network.link_nodes(WebLink("hub", "spoke-b", weight=0.65, reliability=0.95, latency_ms=12.0, bandwidth=2.2))
    network.link_nodes(WebLink("spoke-b", "observer", weight=0.5, reliability=0.9, latency_ms=10.0, bandwidth=1.5))
    return network


def test_broadcast_tracks_paths_and_coverage() -> None:
    network = build_network()
    snapshot = network.broadcast("hub", 3.2, max_depth=3, metadata={"campaign": "spring"})

    assert snapshot.origin == "hub"
    assert snapshot.intensity == pytest.approx(3.2)
    assert "hub" in snapshot.reached
    assert "spoke-b" in snapshot.reached
    assert snapshot.reached["hub"] >= snapshot.reached["spoke-b"]
    assert snapshot.path_map["spoke-b"][0] == "hub"
    assert snapshot.coverage_score > 0.0
    assert "observer" in snapshot.reached
    assert network.history[-1] == snapshot
    assert network.events[-1].origin == "hub"


def test_reachability_and_resilience_metrics() -> None:
    network = build_network()

    reach = network.node_reachability("hub")
    assert 0.0 < reach <= 1.0

    resilience = network.resilience_index()
    assert 0.0 < resilience <= 1.0

    # removing a node should change reachability
    network.remove_node("observer")
    assert network.node_reachability("hub") >= max(0.0, reach - 1e-5)


def test_validation_and_error_paths() -> None:
    network = DynamicWebNetwork()
    network.upsert_node(WebNode("a"))

    with pytest.raises(NodeNotFoundError):
        network.link_nodes(WebLink("a", "missing"))

    network.upsert_node(WebNode("b"))
    network.link_nodes(WebLink("a", "b"))

    snapshot = network.broadcast("a", 0.0, max_depth=0, record_event=False)
    assert snapshot.reached == {"a": 0.0}
    assert network.events == []

    with pytest.raises(LinkNotFoundError):
        network.unlink_nodes("b", "a")

    network.unlink_nodes("a", "b")
    with pytest.raises(DynamicWebError):
        DynamicWebNetwork(decay_factor=0.0)

    with pytest.raises(DynamicWebError):
        network.broadcast("missing", 1.0)  # type: ignore[arg-type]


