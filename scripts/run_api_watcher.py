#!/usr/bin/env python3
"""CLI utility to analyse API watcher "context canceled" logs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Mapping

from dynamic_watchers import ApiWatcherResult, run_api_watcher


def _load_events(buffer: str) -> list[Mapping[str, object]]:
    if not buffer.strip():
        return []

    try:
        data = json.loads(buffer)
    except json.JSONDecodeError:
        events: list[Mapping[str, object]] = []
        for line in buffer.splitlines():
            line = line.strip()
            if not line:
                continue
            events.append(json.loads(line))
        return events

    if isinstance(data, list):
        return [item for item in data if isinstance(item, Mapping)]
    if isinstance(data, Mapping):
        return [data]
    raise ValueError("input JSON must be an object, list, or newline-delimited objects")


def _print_text(result: ApiWatcherResult) -> None:
    report = result.report
    print(f"Processed {result.processed_events} events across {len(result.hosts)} hosts.")
    print(f"Window size: {report.window}")

    if report.alerts:
        print("\nAlerts:")
        for alert in report.alerts:
            threshold = ", ".join(
                f"{name}={value:.2f}" if value is not None else f"{name}=n/a"
                for name, value in (("lower", alert.threshold[0]), ("upper", alert.threshold[1]))
            )
            print(
                f"- [{alert.severity.upper()}] {alert.metric} value={alert.value:.2f} "
                f"({threshold}) at {alert.timestamp.isoformat()} :: {alert.message}"
            )
    else:
        print("\nAlerts: none detected")

    print("\nMetric summaries:")
    for summary in report.metrics:
        print(
            f"- {summary.metric}: samples={summary.samples}, last={summary.last:.2f}, "
            f"min={summary.minimum:.2f}, max={summary.maximum:.2f}, "
            f"avg={summary.average:.2f}, trend={summary.trend:.2f}"
        )


def _print_json(result: ApiWatcherResult) -> None:
    report = result.report
    payload = {
        "processed_events": result.processed_events,
        "hosts": list(result.hosts),
        "window": report.window,
        "generated_at": report.generated_at.isoformat(),
        "alerts": [
            {
                "metric": alert.metric,
                "severity": alert.severity,
                "message": alert.message,
                "value": alert.value,
                "threshold": {
                    "lower": alert.threshold[0],
                    "upper": alert.threshold[1],
                },
                "timestamp": alert.timestamp.isoformat(),
            }
            for alert in report.alerts
        ],
        "metrics": [
            {
                "metric": summary.metric,
                "samples": summary.samples,
                "minimum": summary.minimum,
                "maximum": summary.maximum,
                "average": summary.average,
                "last": summary.last,
                "trend": summary.trend,
            }
            for summary in report.metrics
        ],
    }
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        "-i",
        help="Path to a JSON file or '-' to read from stdin",
        default="-",
    )
    parser.add_argument(
        "--history",
        type=int,
        default=288,
        help="Number of events to retain when computing summaries",
    )
    parser.add_argument(
        "--min-gap-seconds",
        type=float,
        default=300.0,
        help="Minimum seconds allowed between exits on the same host before alerting",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=None,
        help="Optional window override passed to the watcher report",
    )
    parser.add_argument(
        "--severity",
        default="critical",
        help="Severity label to use for generated alerts",
    )
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format for the report",
    )

    args = parser.parse_args(argv)

    if args.input == "-":
        buffer = sys.stdin.read()
    else:
        buffer = Path(args.input).read_text()

    try:
        events = _load_events(buffer)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if not events:
        print("No API watcher events found in input.", file=sys.stderr)
        return 1

    try:
        result = run_api_watcher(
            events,
            history=args.history,
            min_gap_seconds=args.min_gap_seconds,
            severity=args.severity,
            window=args.window,
        )
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if args.format == "json":
        _print_json(result)
    else:
        _print_text(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

