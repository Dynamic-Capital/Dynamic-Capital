#!/usr/bin/env python3
"""Run the DAI/DAGI/DAGS knowledge base benchmark."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:  # pragma: no cover - import guard
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_benchmark.gradebook import (
    KnowledgeBaseMetrics,
    grade_comprehensively,
    grade_many,
    summarise,
)


def _resolve_ratio(payload: dict[str, Any], *, ratio_key: str, numerator_key: str, denominator_key: str) -> float:
    if ratio_key in payload:
        return float(payload[ratio_key])
    try:
        numerator = float(payload[numerator_key])
        denominator = float(payload[denominator_key])
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise KeyError(f"missing keys for ratio calculation: {exc}") from exc
    if denominator <= 0:
        raise ValueError("denominator must be positive for ratio calculation")
    return numerator / denominator


def _load_metrics(domain: str, payload: dict[str, Any]) -> KnowledgeBaseMetrics:
    coverage = payload.get("coverage", {})
    accuracy = payload.get("accuracy", {})
    governance = payload.get("governance", {})

    coverage_ratio = _resolve_ratio(
        coverage,
        ratio_key="ratio",
        numerator_key="present",
        denominator_key="required",
    )
    accuracy_ratio = _resolve_ratio(
        accuracy,
        ratio_key="ratio",
        numerator_key="passing",
        denominator_key="sampled",
    )

    try:
        staleness_hours = float(governance["hours_since_last_probe"])
    except KeyError as exc:
        raise KeyError(f"governance.hours_since_last_probe missing for {domain}") from exc
    failed_health_checks = int(governance.get("failed_probes", 0))

    return KnowledgeBaseMetrics(
        coverage_ratio=coverage_ratio,
        accuracy_ratio=accuracy_ratio,
        telemetry_staleness_hours=staleness_hours,
        failed_health_checks=failed_health_checks,
    )


def _load_config(path: Path) -> dict[str, KnowledgeBaseMetrics]:
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    domains: dict[str, KnowledgeBaseMetrics] = {}
    for domain, domain_payload in payload.get("domains", {}).items():
        domains[domain] = _load_metrics(domain, domain_payload)
    if not domains:
        raise ValueError("benchmark config must define at least one domain")
    return domains


def run(args: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("benchmarks/dai-dagi-dags.json"),
        help="Path to the benchmark configuration JSON file.",
    )
    parsed = parser.parse_args(args)

    metrics = _load_config(parsed.config)
    domain_grades = grade_many(metrics)
    results = summarise(metrics, precomputed_grades=domain_grades)
    comprehensive = grade_comprehensively(
        metrics, precomputed_grades=domain_grades
    )

    print("Knowledge Base Benchmark Results\n")
    print(f"Config: {parsed.config}\n")
    print(f"{'Domain':<8} {'Grade':<6} {'Band':<12} {'Rationale'}")
    print("-" * 80)
    for domain, grade in results:
        print(f"{domain:<8} {grade.letter:<6} {grade.band:<12} {grade.rationale}")
    print("\nRemediation Guidance:")
    for domain, grade in results:
        print(f"- {domain}: {grade.remediation}")
    print("\nComprehensive Grade:")
    print(
        f"Overall {comprehensive.grade.letter} ({comprehensive.grade.band}) — {comprehensive.grade.rationale}"
    )
    print("Weighted Metrics:")
    print(
        "  Coverage: "
        f"{comprehensive.metrics.coverage_ratio:.1%} | Accuracy: "
        f"{comprehensive.metrics.accuracy_ratio:.1%} | Staleness: "
        f"{comprehensive.metrics.telemetry_staleness_hours:.1f}h | Failed checks: "
        f"{comprehensive.metrics.failed_health_checks}"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(run(sys.argv[1:]))
