"""Tests for the Dynamic dependency engine."""

from __future__ import annotations

import pytest

from dynamic_dependency import (
    DependencyEdge,
    DependencyImpulse,
    DependencyNode,
    DynamicDependencyEngine,
)


def build_engine() -> DynamicDependencyEngine:
    engine = DynamicDependencyEngine()
    engine.register_nodes(
        [
            {"name": "Identity Service", "readiness": 0.9, "resilience": 0.7, "criticality": 0.8},
            {"name": "Risk Scoring", "readiness": 0.6, "resilience": 0.5, "criticality": 0.6},
            {"name": "Settlement", "readiness": 0.75, "resilience": 0.4, "criticality": 0.9},
        ]
    )
    engine.connect_many(
        [
            {"upstream": "Identity Service", "downstream": "Risk Scoring", "weight": 0.9, "coupling": 0.8},
            {
                "upstream": "Risk Scoring",
                "downstream": "Settlement",
                "weight": 0.85,
                "coupling": 0.7,
                "latency_penalty": 0.2,
            },
        ]
    )
    return engine


class TestDependencyNode:
    def test_normalises_node_inputs(self) -> None:
        node = DependencyNode(
            name="  Core Ledger  ",
            readiness=1.2,
            resilience=-0.1,
            criticality=2.0,
            tags=(" finance ", "core"),
            metadata={"team": "ops"},
        )
        assert node.name == "Core Ledger"
        assert node.readiness == pytest.approx(1.0)
        assert node.resilience == pytest.approx(0.0)
        assert node.criticality == pytest.approx(1.0)
        assert node.tags == ("finance", "core")
        assert node.metadata == {"team": "ops"}


class TestDependencyEdge:
    def test_rejects_self_referential_edges(self) -> None:
        with pytest.raises(ValueError):
            DependencyEdge(upstream="Ledger", downstream="ledger")

    def test_influence_combines_weight_and_latency(self) -> None:
        edge = DependencyEdge(
            upstream="Ledger",
            downstream="Risk",
            weight=0.8,
            coupling=0.5,
            latency_penalty=0.25,
        )
        assert edge.influence == pytest.approx(0.8 * 0.5 * (1 - 0.25))


class TestDynamicDependencyEngine:
    def test_readiness_blends_intrinsic_and_dependencies(self) -> None:
        engine = build_engine()
        settlement = engine.readiness("Settlement")
        risk = engine.readiness("Risk Scoring")
        identity = engine.readiness("Identity Service")

        assert identity == pytest.approx(0.9, rel=1e-6)
        assert 0.55 < risk < identity
        assert settlement < risk

    def test_readiness_detects_cycles(self) -> None:
        engine = build_engine()
        engine.register_node({"name": "Reconciliation"})
        engine.connect({"upstream": "Settlement", "downstream": "Reconciliation", "weight": 0.7})
        engine.connect({"upstream": "Reconciliation", "downstream": "Identity Service", "weight": 0.6})
        with pytest.raises(RuntimeError):
            engine.readiness("Identity Service")

    def test_topological_order_detects_cycles(self) -> None:
        engine = build_engine()
        assert tuple(node.name for node in engine.topological_order()) == (
            "Identity Service",
            "Risk Scoring",
            "Settlement",
        )
        engine.connect({"upstream": "Settlement", "downstream": "Identity Service", "weight": 0.3})
        with pytest.raises(RuntimeError):
            engine.topological_order()

    def test_propagation_accumulates_impacts(self) -> None:
        engine = build_engine()
        impulse = DependencyImpulse(origin="Identity Service", amplitude=0.9, urgency=0.8, confidence=0.75)
        impact = engine.propagate(impulse, attenuation=0.9, max_depth=4)
        assert impact["Identity Service"] == pytest.approx(0.9 * 0.8 * 0.75)
        assert impact["Risk Scoring"] > impact["Settlement"]
        assert "Settlement" in impact

    def test_propagate_rejects_invalid_parameters(self) -> None:
        engine = build_engine()
        impulse = DependencyImpulse(origin="Identity Service")
        with pytest.raises(ValueError):
            engine.propagate(impulse, attenuation=0.0)
        with pytest.raises(ValueError):
            engine.propagate(impulse, max_depth=0)
        with pytest.raises(KeyError):
            engine.propagate(DependencyImpulse(origin="Unknown"))

