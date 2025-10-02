from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dynamic_architect.engine import ArchitectureComponent, DynamicArchitectEngine
from dynamic_architecture import (
    ArchitectureTraversalStep,
    DynamicArchitectureAgent,
    DynamicArchitectureBot,
    DynamicArchitectureBuilder,
    DynamicArchitectureCrawler,
    DynamicArchitectureEngine,
    DynamicArchitectureHelper,
    DynamicArchitectureKeeper,
)


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


def test_builder_compiles_payload() -> None:
    builder = DynamicArchitectureBuilder(
        "Dynamic Architecture",
        "Coherent blueprint",
    )
    builder.add_layer({"name": "Edge", "intent": "Ingress", "focus": ("api",)})
    builder.add_nodes(
        (
            {
                "name": "Gateway",
                "description": "Routes client requests",
                "layer": "Edge",
                "capabilities": ("rest", "webhooks"),
            },
            {
                "name": "Identity",
                "description": "Authenticates users",
                "layer": "Core",
                "dependencies": ("Gateway",),
            },
        )
    )
    builder.add_flow({"source": "Gateway", "target": "Identity", "intent": "auth"})
    builder.merge_metrics({"latency_budget": 120.0})

    document = builder.compile()

    assert document.metrics["node_count"] == 2
    assert any(layer.name == "Edge" for layer in document.layers)
    assert any(flow.target == "Identity" for flow in document.flows)


def test_agent_generates_summary_and_highlights() -> None:
    blueprint = build_blueprint()
    agent = DynamicArchitectureAgent()
    result = agent.run(
        {
            "vision": "Dynamic Capital Architecture",
            "narrative": "Unifies trading capabilities",
            "blueprint": blueprint,
            "layer_map": {
                "edge": "Edge",
                "api": "Edge",
                "core": "Core",
                "security": "Core",
                "data": "Data",
                "realtime": "Data",
            },
            "default_layer": "Shared",
        }
    )

    assert "Dynamic Capital Architecture" in result.summary
    assert result.confidence > 0
    assert result.highlights


def test_helper_digest_and_highlights() -> None:
    blueprint = build_blueprint()
    builder = DynamicArchitectureBuilder("Vision")
    builder.apply_payload(
        {
            "blueprint": blueprint,
            "layer_map": {"edge": "Edge", "core": "Core", "data": "Data"},
            "default_layer": "Shared",
        }
    )
    document = builder.compile()

    helper = DynamicArchitectureHelper(highlight_limit=2)
    digest = helper.digest(document)

    assert digest["vision"] == document.vision
    assert len(digest["highlights"]) <= 2


def test_keeper_tracks_history_and_trends() -> None:
    builder = DynamicArchitectureBuilder("Vision")
    builder.add_nodes(
        (
            {
                "name": "A",
                "description": "A",
                "layer": "Layer",
            },
        )
    )
    first = builder.compile()

    builder.add_nodes(
        (
            {
                "name": "B",
                "description": "B",
                "layer": "Layer",
            },
        )
    )
    second = builder.compile()

    keeper = DynamicArchitectureKeeper()
    keeper.record("baseline", first)
    keeper.record("iteration", second)

    assert keeper.latest() is not None
    assert keeper.get("baseline") is not None
    trend = keeper.metrics_trend("node_count")
    assert trend[-1] >= trend[0]
    assert keeper.summarise_latest()


def test_bot_generates_message_with_highlights() -> None:
    blueprint = build_blueprint()
    bot = DynamicArchitectureBot()
    payload = {
        "vision": "Dynamic Capital Architecture",
        "blueprint": blueprint,
        "layer_map": {"edge": "Edge", "core": "Core", "data": "Data"},
        "default_layer": "Shared",
    }
    message = bot.generate(payload)

    assert "Highlights" in message["message"]
    assert "agent" in message


def test_crawler_walks_flows() -> None:
    builder = DynamicArchitectureBuilder("Vision")
    builder.add_nodes(
        (
            {
                "name": "Source",
                "description": "Start",
                "layer": "Edge",
            },
            {
                "name": "Target",
                "description": "End",
                "layer": "Core",
                "dependencies": ("Source",),
            },
        )
    )
    builder.add_flow({"source": "Source", "target": "Target", "intent": "dependency"})
    document = builder.compile()

    crawler = DynamicArchitectureCrawler(document)
    steps = crawler.crawl(["Source"])

    assert isinstance(steps[0], ArchitectureTraversalStep)
    assert {step.node.name for step in steps} == {"Source", "Target"}
