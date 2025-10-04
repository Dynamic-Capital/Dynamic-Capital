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
    ComprehensiveGrade,
    KnowledgeBaseGrade,
    KnowledgeBaseMetrics,
    grade_comprehensively,
    grade_many,
    summarise,
)
from dynamic_benchmark.tuning import fine_tune_until_average


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


def _print_report(
    title: str,
    config: Path | None,
    results: list[tuple[str, KnowledgeBaseGrade]],
    comprehensive: ComprehensiveGrade,
) -> None:
    print(f"{title}\n")
    if config is not None:
        print(f"Config: {config}\n")
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


def run(args: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("benchmarks/dai-dagi-dags.json"),
        help="Path to the benchmark configuration JSON file.",
    )
    parser.add_argument(
        "--max-cycles",
        type=int,
        default=12,
        help="Maximum number of fine-tuning cycles to run when remediation is required.",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.35,
        help="Learning rate applied during automatic fine-tuning.",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=1e-4,
        help="Tolerance when comparing composite scores against the baseline average.",
    )
    parser.add_argument(
        "--no-fine-tune",
        action="store_true",
        help="Disable automatic fine-tuning when domains fall below the baseline average.",
    )
    parsed = parser.parse_args(args)

    metrics = _load_config(parsed.config)
    domain_grades = grade_many(metrics)
    results = summarise(metrics, precomputed_grades=domain_grades)
    comprehensive = grade_comprehensively(
        metrics, precomputed_grades=domain_grades
    )

    _print_report("Knowledge Base Benchmark Results", parsed.config, results, comprehensive)

    composite_scores = {
        domain: metric.composite_score() for domain, metric in metrics.items()
    }
    baseline_average = sum(composite_scores.values()) / len(composite_scores)
    below_average = [
        domain
        for domain, score in composite_scores.items()
        if score + parsed.tolerance < baseline_average
    ]

    if not below_average:
        print(
            "\nAll domains meet or exceed the baseline composite average; no fine-tuning required."
        )
        return 0

    if parsed.no_fine_tune:
        print(
            "\nAutomatic fine-tuning disabled. Domains below the baseline average: "
            + ", ".join(sorted(below_average))
        )
        return 0

    tuning = fine_tune_until_average(
        metrics,
        learning_rate=parsed.learning_rate,
        max_cycles=parsed.max_cycles,
        tolerance=parsed.tolerance,
    )

    print(f"\nBaseline composite average: {tuning.baseline_average:.4f}")

    if len(tuning.cycles) > 1:
        print("\nFine-tuning cycles:")
        for cycle in tuning.cycles[1:]:
            print(
                f"Cycle {cycle.iteration}: average score {cycle.average_score:.4f}"
            )
            for domain, score in cycle.domain_scores.items():
                grade = cycle.grades[domain]
                print(
                    f"  {domain:<8} {score:.4f} → {grade.letter} ({grade.band})"
                )
    else:
        print(
            "\nMetrics already satisfied the baseline average; no additional fine-tuning applied."
        )

    if not tuning.converged:
        print(
            "\nWarning: Maximum fine-tuning cycles reached before clearing the baseline average."
        )

    metrics = tuning.metrics
    domain_grades = tuning.grades
    results = summarise(metrics, precomputed_grades=domain_grades)
    comprehensive = tuning.comprehensive

    _print_report("Post Fine-Tuning Benchmark Results", None, results, comprehensive)
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(run(sys.argv[1:]))
