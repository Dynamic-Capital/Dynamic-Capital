#!/usr/bin/env python3
"""Run the quantum resonance benchmark using the grading rubric."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:  # pragma: no cover - import guard
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_benchmark.gradebook import (
    grade_comprehensively,
    grade_many,
    summarise,
)
from dynamic_benchmark.quantum import load_quantum_benchmark


def _parse_reference_time(value: str) -> datetime:
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise argparse.ArgumentTypeError(f"invalid ISO 8601 timestamp: {value}") from exc
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _load_payload(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def run(args: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("benchmarks/quantum-resonance.json"),
        help="Path to the quantum benchmark configuration JSON file.",
    )
    parser.add_argument(
        "--reference-time",
        type=str,
        help="Optional ISO 8601 timestamp overriding the config reference time.",
    )
    parsed = parser.parse_args(args)

    payload = _load_payload(parsed.config)
    config_reference: datetime | None = None
    if payload.get("reference_time"):
        config_reference = _parse_reference_time(str(payload["reference_time"]))

    reference_time = config_reference
    if parsed.reference_time:
        reference_time = _parse_reference_time(parsed.reference_time)

    domains = load_quantum_benchmark(payload, reference_time=reference_time)
    domain_metrics = {name: domain.metrics for name, domain in domains.items()}
    domain_grades = grade_many(domain_metrics)
    ordered = summarise(domain_metrics, precomputed_grades=domain_grades)
    comprehensive = grade_comprehensively(
        domain_metrics, precomputed_grades=domain_grades
    )

    print("Quantum Resonance Benchmark Results\n")
    print(f"Config: {parsed.config}")
    if reference_time is not None:
        print(f"Reference time: {reference_time.isoformat()}")
    print()

    header = (
        f"{'Domain':<14} {'Grade':<6} {'Band':<12} "
        f"{'Coherence':>11} {'Entangle.':>11} {'Staleness':>11} {'Failed':>6}"
    )
    print(header)
    print("-" * len(header))
    for domain, grade in ordered:
        metrics = domain_metrics[domain]
        print(
            f"{domain:<14} {grade.letter:<6} {grade.band:<12} "
            f"{metrics.coverage_ratio:>10.1%} {metrics.accuracy_ratio:>10.1%} "
            f"{metrics.telemetry_staleness_hours:>9.1f}h {metrics.failed_health_checks:>6}"
        )

    print("\nDetected anomalies:")
    for domain, _grade in ordered:
        anomalies = domains[domain].frame.anomalies
        if anomalies:
            print(f"- {domain}: {', '.join(anomalies)}")
        else:
            print(f"- {domain}: none")

    print("\nRecommended actions:")
    for domain, _grade in ordered:
        actions = domains[domain].frame.recommended_actions
        if actions:
            print(f"- {domain}: {'; '.join(actions)}")
        else:  # pragma: no cover - defensive guard
            print(f"- {domain}: maintain equilibrium protocols")

    print("\nComprehensive Grade:")
    print(
        f"Overall {comprehensive.grade.letter} ({comprehensive.grade.band}) — {comprehensive.grade.rationale}"
    )
    weighted = comprehensive.metrics
    print(
        "Weighted Metrics:\n  Coherence: "
        f"{weighted.coverage_ratio:.1%} | Entanglement: "
        f"{weighted.accuracy_ratio:.1%} | Staleness: "
        f"{weighted.telemetry_staleness_hours:.1f}h | Failed checks: "
        f"{weighted.failed_health_checks}"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(run(sys.argv[1:]))
