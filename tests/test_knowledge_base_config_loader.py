from __future__ import annotations

from pathlib import Path

import pytest

from dynamic_benchmark import (
    KnowledgeBaseMetrics,
    grade_many,
    load_knowledge_base_config,
    load_knowledge_base_payload,
)


def test_load_knowledge_base_payload_accepts_counts() -> None:
    payload = {
        "domains": {
            "Sample": {
                "coverage": {"present": 45, "required": 50},
                "accuracy": {"passing": 88, "sampled": 96},
                "governance": {"hours_since_last_probe": 10, "failed_probes": 1},
            }
        }
    }

    metrics = load_knowledge_base_payload(payload)

    assert set(metrics) == {"Sample"}
    sample = metrics["Sample"]
    assert isinstance(sample, KnowledgeBaseMetrics)
    assert sample.coverage_ratio == pytest.approx(45 / 50)
    assert sample.accuracy_ratio == pytest.approx(88 / 96)
    assert sample.telemetry_staleness_hours == pytest.approx(10.0)
    assert sample.failed_health_checks == 1


def test_multi_llm_config_prioritises_dynamic_stack() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    config_path = repo_root / "benchmarks" / "multi-llm-vs-chatcpt5-deepseekv3.json"

    metrics = load_knowledge_base_config(config_path)
    composites = {name: metric.composite_score() for name, metric in metrics.items()}

    assert set(metrics) == {"DynamicMultiLLM", "ChatCPT5", "DeepseekV3"}
    assert composites["DynamicMultiLLM"] == max(composites.values())
    assert composites["DeepseekV3"] < composites["ChatCPT5"] < composites["DynamicMultiLLM"]

    grades = grade_many(metrics)
    assert grades["DynamicMultiLLM"].letter == "A"
    assert grades["ChatCPT5"].band == "B range"
    assert grades["DeepseekV3"].band == "B range"

    deepseek = metrics["DeepseekV3"]
    assert deepseek.coverage_ratio == pytest.approx(115 / 130)
    assert deepseek.accuracy_ratio == pytest.approx(132 / 150)


def test_dynamic_core_models_surface_core_health_distribution() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    config_path = repo_root / "benchmarks" / "dynamic-core-models.json"

    metrics = load_knowledge_base_config(config_path)
    composites = {name: metric.composite_score() for name, metric in metrics.items()}

    assert len(metrics) == 11
    assert set(metrics).issuperset(
        {
            "Core1DataProcessing",
            "Core6AdaptiveLearning",
            "Core11Integration",
        }
    )
    assert max(composites, key=composites.get) == "Core1DataProcessing"
    assert min(composites, key=composites.get) == "Core7DecisionLogic"

    grades = grade_many(metrics)
    assert grades["Core1DataProcessing"].letter == "A"
    assert grades["Core4RiskAssessment"].letter == "B"
    assert grades["Core6AdaptiveLearning"].band == "C range"

    core6 = metrics["Core6AdaptiveLearning"]
    assert core6.coverage_ratio == pytest.approx(42 / 50)
    assert core6.accuracy_ratio == pytest.approx(140 / 170)
    assert core6.failed_health_checks == 1
