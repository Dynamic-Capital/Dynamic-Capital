from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dynamic_architect.engine import ArchitectureComponent, DynamicArchitectEngine
from dynamic_architecture import DynamicArchitectureEngine


def build_blueprint() -> object:
    components = (
        ArchitectureComponent(
            name="API Gateway",
            description="Routes authenticated traffic to downstream services",
            criticality=0.8,
            reliability_target=0.999,
            latency_budget_ms=120.0,
            dependencies=("Identity Service",),
            interfaces=("rest", "webhooks"),
            tags=("edge", "api"),
        ),
        ArchitectureComponent(
            name="Identity Service",
            description="Manages OAuth tokens and session state",
            criticality=0.9,
            reliability_target=0.998,
            latency_budget_ms=150.0,
            dependencies=(),
            interfaces=("grpc", "internal"),
            tags=("core", "security"),
        ),
        ArchitectureComponent(
            name="Event Bus",
            description="Broadcasts portfolio updates to subscribers",
            criticality=0.6,
            reliability_target=0.995,
            latency_budget_ms=250.0,
            dependencies=("API Gateway",),
            interfaces=("events", "stream"),
            tags=("data", "realtime"),
        ),
    )
    engine = DynamicArchitectEngine(components)
    return engine.design("Dynamic Capital Architecture", focus=("API", "Data"))


def test_compile_document_from_blueprint() -> None:
    blueprint = build_blueprint()
    engine = DynamicArchitectureEngine(
        "Dynamic Capital Architecture",
        narrative="Unified operational blueprint",
    )
    engine.register_layer("Edge", intent="Trader ingress and egress", focus=("api",))
    engine.register_layer("Core Services", intent="High-trust transactional logic", focus=("security", "identity"))
    engine.register_layer("Data", intent="Streaming analytics and storage", focus=("data", "realtime"))

    engine.ingest_blueprint(
        blueprint,
        layer_map={
            "edge": "Edge",
            "api": "Edge",
            "security": "Core Services",
            "core": "Core Services",
            "data": "Data",
            "realtime": "Data",
        },
        default_layer="Shared",
    )

    document = engine.compile()

    assert document.metrics["node_count"] == 3
    assert document.metrics["flow_count"] == 2
    assert document.metrics["layer_count"] >= 3
    assert document.metrics["capability_count"] == 6

    layers = {layer.name: layer for layer in document.layers}
    assert "Edge" in layers
    assert any(node.name == "API Gateway" for node in layers["Edge"].nodes)

    flows = {f"{flow.source}->{flow.target}" for flow in document.flows}
    assert "Identity Service->API Gateway" in flows
    assert "API Gateway->Event Bus" in flows

    markdown = document.to_markdown()
    assert "## Edge" in markdown
    assert "API Gateway" in markdown
    assert "Flows" in markdown
