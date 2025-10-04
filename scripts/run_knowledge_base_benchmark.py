#!/usr/bin/env python3
"""Run knowledge base benchmarks with optional fine-tuning support."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:  # pragma: no cover - import guard
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_benchmark.gradebook import (
    ComprehensiveGrade,
    KnowledgeBaseGrade,
    grade_comprehensively,
    grade_many,
    summarise,
)
from dynamic_benchmark.tuning import fine_tune_until_average
from dynamic_benchmark.config import load_knowledge_base_config


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
        help=(
            "Path to the benchmark configuration JSON file ("
            "e.g. benchmarks/multi-llm-vs-chatcpt5-deepseekv3.json)."
        ),
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

    metrics = load_knowledge_base_config(parsed.config)
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
