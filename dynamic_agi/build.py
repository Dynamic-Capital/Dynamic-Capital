"""Command helpers for building Dynamic AGI artefacts and datasets."""

from __future__ import annotations

import argparse
import copy
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, MutableMapping, Sequence

from dynamic_framework.__main__ import (
    DEFAULT_SCENARIO,
    build_engine,
    build_fine_tune_dataset,
    load_scenario,
    render_report,
)

__all__ = [
    "BuildResult",
    "build_dynamic_agi_payload",
    "run_cli",
    "main",
]


@dataclass(slots=True)
class BuildResult:
    """Container summarising Dynamic AGI build artefacts."""

    report: str
    dataset: Mapping[str, Any]


def _normalise_indent(indent: int | None) -> int | None:
    if indent is None:
        return None
    if indent < 0:
        return None
    return indent


def _load_scenario_payload(
    scenario: Mapping[str, Any] | str | None,
) -> MutableMapping[str, Any]:
    if scenario is None:
        return copy.deepcopy(DEFAULT_SCENARIO)
    if isinstance(scenario, Mapping):
        return dict(scenario)
    return dict(load_scenario(scenario, stdin=sys.stdin))


def build_dynamic_agi_payload(
    scenario: Mapping[str, Any] | str | None = None,
    *,
    report_format: str = "text",
    indent: int | None = 2,
    default_tags: Sequence[str] | None = None,
) -> BuildResult:
    """Produce a report string and fine-tune dataset for the provided scenario."""

    indent_value = _normalise_indent(indent)
    scenario_payload = _load_scenario_payload(scenario)
    engine = build_engine(scenario_payload)
    report = engine.report()
    dataset_payload = build_fine_tune_dataset(
        engine,
        report=report,
        default_tags=default_tags,
    )

    if report_format == "fine-tune":
        report_output = json.dumps(dataset_payload, indent=indent_value)
    else:
        report_output = render_report(
            engine,
            format=report_format,
            indent=indent_value if indent_value is not None else 2,
            report=report,
        )

    return BuildResult(report=report_output, dataset=dataset_payload)


def run_cli(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build Dynamic AGI reports and fine-tuning datasets.",
    )
    parser.add_argument(
        "--scenario",
        type=str,
        help="Path to a scenario JSON file or '-' for STDIN. Omitting uses the default scenario.",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json", "fine-tune"],
        default="text",
        help="Choose text, JSON, or fine-tune dataset output for the primary report.",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Indentation level for JSON outputs (negative values collapse indentation).",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        help="Optional destination for the fine-tune dataset JSON. Use '-' to stream to stdout.",
    )
    parser.add_argument(
        "--fine-tune-tag",
        dest="fine_tune_tags",
        action="append",
        default=None,
        help="Default tag applied to generated fine-tune examples (repeatable).",
    )
    args = parser.parse_args(argv)

    try:
        result = build_dynamic_agi_payload(
            args.scenario,
            report_format=args.format,
            indent=args.indent,
            default_tags=args.fine_tune_tags,
        )
    except Exception as exc:  # pragma: no cover - exercised via CLI
        parser.exit(2, f"error: {exc}\n")

    print(result.report)

    if args.dataset:
        dataset_indent = _normalise_indent(args.indent)
        dataset_json = json.dumps(result.dataset, indent=dataset_indent)
        if args.dataset == "-":
            if args.format != "fine-tune":
                print("")
                print(dataset_json)
            else:
                # Report output already emitted the fine-tune dataset
                pass
        else:
            destination = Path(args.dataset).expanduser()
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(f"{dataset_json}\n", encoding="utf-8")

    return 0


def main(argv: Sequence[str] | None = None) -> int:
    return run_cli(argv)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
