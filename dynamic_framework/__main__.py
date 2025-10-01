"""Command line interface for the :mod:`dynamic_framework` engine."""

from __future__ import annotations

import argparse
import copy
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence, TextIO

from dynamic.intelligence.agi.fine_tune import DynamicAGIFineTuner
from dynamic.intelligence.agi.self_improvement import ImprovementSignal, LearningSnapshot

from .engine import (
    DynamicFrameworkEngine,
    FrameworkNode,
    FrameworkPulse,
    FrameworkReport,
    FrameworkSnapshot,
)

DEFAULT_SCENARIO: Mapping[str, Any] = {
    "history": 12,
    "decay": 0.1,
    "nodes": [
        {
            "key": "orchestration",
            "title": "Orchestration",
            "description": "Aligns delivery rhythms across product workstreams.",
            "weight": 1.4,
            "minimum_maturity": 0.45,
            "target_maturity": 0.75,
            "practices": ["standups", "retrospectives"],
        },
        {
            "key": "automation",
            "title": "Automation",
            "description": "Captures the automation posture for platform capabilities.",
            "weight": 1.2,
            "minimum_maturity": 0.4,
            "target_maturity": 0.7,
            "dependencies": ["orchestration"],
            "practices": ["runbooks", "observability"],
        },
        {
            "key": "platform",
            "title": "Platform",
            "description": "Governs shared platform enablement and resilience.",
            "weight": 1.0,
            "minimum_maturity": 0.5,
            "target_maturity": 0.8,
            "practices": ["discovery", "enablement"],
        },
    ],
    "pulses": [
        {
            "node": "orchestration",
            "maturity": 0.82,
            "confidence": 0.74,
            "enablement": 0.71,
            "resilience": 0.69,
            "momentum": 0.22,
            "timestamp": "2024-04-01T09:00:00Z",
            "tags": ["cadence", "governance"],
            "narrative": "Operational rhythms producing consistent lift.",
        },
        {
            "node": "orchestration",
            "maturity": 0.78,
            "confidence": 0.72,
            "enablement": 0.7,
            "resilience": 0.68,
            "momentum": 0.18,
            "timestamp": "2024-03-15T09:00:00Z",
            "tags": ["cadence"],
        },
        {
            "node": "automation",
            "maturity": 0.46,
            "confidence": 0.61,
            "enablement": 0.5,
            "resilience": 0.44,
            "momentum": -0.12,
            "timestamp": "2024-03-30T09:00:00Z",
            "tags": ["tooling"],
            "narrative": "Deployment pipeline is partially automated with gaps.",
        },
        {
            "node": "automation",
            "maturity": 0.41,
            "confidence": 0.58,
            "enablement": 0.47,
            "resilience": 0.4,
            "momentum": -0.18,
            "timestamp": "2024-03-20T09:00:00Z",
            "tags": ["tooling", "observability"],
        },
        {
            "node": "platform",
            "maturity": 0.6,
            "confidence": 0.67,
            "enablement": 0.55,
            "resilience": 0.52,
            "momentum": 0.08,
            "timestamp": "2024-03-28T09:00:00Z",
            "tags": ["enablement"],
        },
        {
            "node": "platform",
            "maturity": 0.58,
            "confidence": 0.65,
            "enablement": 0.52,
            "resilience": 0.5,
            "momentum": 0.05,
            "timestamp": "2024-03-18T09:00:00Z",
            "tags": ["enablement", "resilience"],
        },
    ],
}


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        moment = datetime.fromisoformat(cleaned)
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        return moment.astimezone(timezone.utc)
    raise TypeError("timestamp must be datetime, ISO string, or epoch seconds")


def _ensure_mapping(payload: Mapping[str, Any] | Iterable[tuple[str, Any]]) -> Mapping[str, Any]:
    if isinstance(payload, Mapping):
        return payload
    return dict(payload)


def _build_nodes(definitions: Iterable[Mapping[str, Any] | FrameworkNode]) -> list[FrameworkNode]:
    nodes: list[FrameworkNode] = []
    for definition in definitions:
        if isinstance(definition, FrameworkNode):
            nodes.append(definition)
            continue
        mapping = _ensure_mapping(definition)
        nodes.append(FrameworkNode(**mapping))
    return nodes


def _build_pulses(definitions: Iterable[Mapping[str, Any] | FrameworkPulse]) -> list[FrameworkPulse]:
    pulses: list[FrameworkPulse] = []
    for definition in definitions:
        if isinstance(definition, FrameworkPulse):
            pulses.append(definition)
            continue
        mapping = dict(_ensure_mapping(definition))
        if "timestamp" in mapping:
            mapping["timestamp"] = _parse_timestamp(mapping["timestamp"])
        pulses.append(FrameworkPulse(**mapping))
    return pulses


def load_scenario(source: Path | str | None, *, stdin: TextIO | None = None) -> Mapping[str, Any]:
    """Load a scenario definition from disk or standard input.

    The historical CLI accepted only filesystem paths which made it awkward to
    pipe generated scenarios (for example, from `jq` or a monitoring agent)
    directly into the evaluation engine.  Supporting a ``-`` sentinel keeps the
    original behaviour for real files while enabling `stdin` driven workflows.
    """

    if source is None:
        return copy.deepcopy(DEFAULT_SCENARIO)

    if isinstance(source, Path):
        path = source
    else:
        if source == "-":
            stream = stdin or sys.stdin
            payload = stream.read()
            if not payload.strip():
                raise ValueError("stdin did not contain any scenario JSON")
            data = json.loads(payload)
            if not isinstance(data, Mapping):
                raise TypeError("scenario JSON must be an object")
            return data
        path = Path(source).expanduser()

    payload = path.read_text(encoding="utf-8")
    data = json.loads(payload)
    if not isinstance(data, Mapping):
        raise TypeError("scenario JSON must be an object")
    return data


def build_engine(payload: Mapping[str, Any]) -> DynamicFrameworkEngine:
    history = int(payload.get("history", 64))
    decay = float(payload.get("decay", 0.08))
    nodes = _build_nodes(payload.get("nodes", ()))
    engine = DynamicFrameworkEngine(nodes=nodes, history=history, decay=decay)
    pulses = _build_pulses(payload.get("pulses", ()))
    if pulses:
        engine.ingest(pulses)
    return engine


def _serialise_snapshot(snapshot: FrameworkSnapshot) -> dict[str, Any]:
    return {
        "key": snapshot.key,
        "title": snapshot.title,
        "maturity": snapshot.maturity,
        "confidence": snapshot.confidence,
        "enablement": snapshot.enablement,
        "resilience": snapshot.resilience,
        "momentum": snapshot.momentum,
        "status": snapshot.status,
        "summary": snapshot.summary,
        "tags": list(snapshot.tags),
        "recommendations": list(snapshot.recommendations),
        "alerts": list(snapshot.alerts),
    }


def serialise_report(
    engine: DynamicFrameworkEngine,
    *,
    report: FrameworkReport | None = None,
) -> dict[str, Any]:
    report = report or engine.report()
    snapshots = report.snapshots
    if not snapshots:
        snapshots = tuple(engine.snapshot(key) for key in sorted(engine.nodes))
    nodes = [
        _serialise_snapshot(snapshot)
        for snapshot in sorted(snapshots, key=lambda snap: snap.key)
    ]
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "generated_at": now,
        "history": engine.history,
        "decay": engine.decay,
        "summary": report.summary,
        "overall_maturity": report.overall_maturity,
        "execution_health": report.execution_health,
        "momentum": report.momentum,
        "focus_areas": list(report.focus_areas),
        "alerts": list(report.alerts),
        "nodes": nodes,
    }


def _build_signal(
    snapshot: FrameworkSnapshot,
    metric: str,
    *,
    value: float,
    direction: str,
    weight: float,
    notes: str,
) -> ImprovementSignal:
    return ImprovementSignal(
        metric=f"{snapshot.key}.{metric}",
        value=value,
        direction=direction,
        weight=weight,
        notes=notes,
    )


def _maturity_signal(snapshot: FrameworkSnapshot, node: FrameworkNode) -> ImprovementSignal:
    value = snapshot.maturity
    if value >= node.target_maturity:
        direction = "positive"
        notes = (
            f"Maturity {value:.2f} meets or exceeds target {node.target_maturity:.2f}."
        )
    elif value >= node.minimum_maturity:
        direction = "neutral"
        notes = (
            f"Maturity {value:.2f} above guardrail {node.minimum_maturity:.2f} but below "
            f"target {node.target_maturity:.2f}."
        )
    else:
        direction = "negative"
        notes = (
            f"Maturity {value:.2f} below guardrail {node.minimum_maturity:.2f}."
        )
    return _build_signal(
        snapshot,
        "maturity",
        value=value,
        direction=direction,
        weight=node.weight,
        notes=notes,
    )


def _confidence_signal(snapshot: FrameworkSnapshot, node: FrameworkNode) -> ImprovementSignal:
    value = snapshot.confidence
    if value >= 0.7:
        direction = "positive"
        notes = f"Confidence {value:.2f} signals strong telemetry reliability."
    elif value >= 0.5:
        direction = "neutral"
        notes = f"Confidence {value:.2f} acceptable but could strengthen."
    else:
        direction = "negative"
        notes = f"Confidence {value:.2f} below healthy guardrail (0.50)."
    return _build_signal(
        snapshot,
        "confidence",
        value=value,
        direction=direction,
        weight=node.weight,
        notes=notes,
    )


def _enablement_signal(snapshot: FrameworkSnapshot, node: FrameworkNode) -> ImprovementSignal:
    value = snapshot.enablement
    if value >= 0.6:
        direction = "positive"
        notes = f"Enablement {value:.2f} supports integrated workflows."
    elif value >= 0.55:
        direction = "neutral"
        notes = f"Enablement {value:.2f} within guardrails but shy of momentum thresholds."
    else:
        direction = "negative"
        notes = f"Enablement {value:.2f} below healthy threshold (0.55)."
    return _build_signal(
        snapshot,
        "enablement",
        value=value,
        direction=direction,
        weight=node.weight,
        notes=notes,
    )


def _resilience_signal(snapshot: FrameworkSnapshot, node: FrameworkNode) -> ImprovementSignal:
    value = snapshot.resilience
    if value >= 0.6:
        direction = "positive"
        notes = f"Resilience {value:.2f} buffers platform stability."
    elif value >= 0.5:
        direction = "neutral"
        notes = f"Resilience {value:.2f} meets baseline expectations."
    else:
        direction = "negative"
        notes = f"Resilience {value:.2f} below stability guardrail (0.50)."
    return _build_signal(
        snapshot,
        "resilience",
        value=value,
        direction=direction,
        weight=node.weight,
        notes=notes,
    )


def _momentum_signal(snapshot: FrameworkSnapshot, node: FrameworkNode) -> ImprovementSignal:
    value = snapshot.momentum
    if value >= 0.1:
        direction = "positive"
        notes = f"Momentum {value:.2f} accelerating integration."
    elif value <= -0.1:
        direction = "negative"
        notes = f"Momentum {value:.2f} signals regression risk."
    else:
        direction = "neutral"
        notes = f"Momentum {value:.2f} within neutral band (-0.10 to 0.10)."
    return _build_signal(
        snapshot,
        "momentum",
        value=value,
        direction=direction,
        weight=node.weight,
        notes=notes,
    )


def _learning_snapshot_from_framework(
    snapshot: FrameworkSnapshot,
    node: FrameworkNode,
) -> LearningSnapshot:
    output = {
        "node": snapshot.key,
        "title": snapshot.title,
        "status": snapshot.status,
        "summary": snapshot.summary,
        "tags": list(snapshot.tags),
    }
    performance = {
        "maturity": snapshot.maturity,
        "confidence": snapshot.confidence,
        "enablement": snapshot.enablement,
        "resilience": snapshot.resilience,
        "momentum": snapshot.momentum,
    }
    feedback = tuple(dict.fromkeys((*snapshot.recommendations, *snapshot.alerts)))
    signals = (
        _maturity_signal(snapshot, node),
        _confidence_signal(snapshot, node),
        _enablement_signal(snapshot, node),
        _resilience_signal(snapshot, node),
        _momentum_signal(snapshot, node),
    )
    return LearningSnapshot(
        output=output,
        performance=performance,
        feedback=feedback,
        signals=signals,
    )


def build_fine_tune_dataset(
    engine: DynamicFrameworkEngine,
    *,
    report: FrameworkReport | None = None,
    default_tags: Sequence[str] | None = None,
) -> dict[str, Any]:
    report = report or engine.report()
    serialised = serialise_report(engine, report=report)
    snapshots = report.snapshots
    if not snapshots:
        snapshots = tuple(engine.snapshot(key) for key in sorted(engine.nodes))
    snapshots = tuple(sorted(snapshots, key=lambda snap: snap.key))
    tuner = DynamicAGIFineTuner(default_tags=default_tags)
    learning_snapshots: list[LearningSnapshot] = []
    for snapshot in snapshots:
        node = engine.nodes.get(snapshot.key)
        if node is None:
            continue
        learning_snapshots.append(_learning_snapshot_from_framework(snapshot, node))
    if learning_snapshots:
        tuner.ingest_snapshots(learning_snapshots)
    dataset_summary = tuner.dataset_summary()
    return {
        "generated_at": serialised["generated_at"],
        "report": serialised,
        "dataset": {
            "summary": dataset_summary,
            "examples": tuner.dataset.export(),
        },
    }


def _normalise_indent(indent: int | None) -> int | None:
    """Normalize JSON indentation requests for :func:`json.dumps`."""

    if indent is None:
        return None
    if indent < 0:
        return None
    return indent


def render_report(
    engine: DynamicFrameworkEngine,
    *,
    format: str = "text",
    indent: int | None = 2,
    report: FrameworkReport | None = None,
) -> str:
    if format not in {"text", "json"}:
        raise ValueError(f"unsupported render format: {format}")

    payload = serialise_report(engine, report=report)

    if format == "json":
        return json.dumps(payload, indent=_normalise_indent(indent))

    lines: list[str] = [payload["summary"]]
    focus_areas = tuple(payload.get("focus_areas", ()))
    alerts = tuple(payload.get("alerts", ()))

    if focus_areas:
        lines.append("")
        lines.append("Focus areas:")
        for title in focus_areas:
            lines.append(f"  - {title}")
    if alerts:
        lines.append("")
        lines.append("Alerts:")
        for alert in alerts:
            lines.append(f"  - {alert}")

    lines.append("")
    lines.append("Node snapshots:")
    for snapshot in payload.get("nodes", []):
        lines.append(
            f"- {snapshot['title']} [{snapshot['status']}] maturity {snapshot['maturity']:.2f} "
            f"(confidence {snapshot['confidence']:.2f}, enablement {snapshot['enablement']:.2f}, "
            f"resilience {snapshot['resilience']:.2f}, momentum {snapshot['momentum']:.2f})"
        )
        recommendations = snapshot.get("recommendations", ())
        if recommendations:
            lines.append("    Recommendations:")
            for recommendation in recommendations:
                lines.append(f"      • {recommendation}")
        alerts_for_node = snapshot.get("alerts", ())
        if alerts_for_node:
            lines.append("    Alerts:")
            for alert in alerts_for_node:
                lines.append(f"      • {alert}")
    return "\n".join(lines)


def run(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the Dynamic Framework engine against a scenario file or STDIN.",
    )
    parser.add_argument(
        "--scenario",
        type=str,
        help="Path to a JSON scenario describing nodes and pulses, or '-' for STDIN.",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json", "fine-tune"],
        default="text",
        help=(
            "Control how the report is rendered (default: text). Use 'fine-tune' to emit "
            "a Dynamic AGI training dataset."
        ),
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Indentation to use for JSON output (ignored for text format).",
    )
    parser.add_argument(
        "--fine-tune-dataset",
        type=str,
        help=(
            "Optional path to write the Dynamic AGI fine-tuning dataset as JSON. Provide '-' "
            "to stream it to stdout."
        ),
    )
    parser.add_argument(
        "--fine-tune-tag",
        dest="fine_tune_tags",
        action="append",
        default=None,
        help="Default tag to apply to generated fine-tuning examples (repeatable).",
    )
    args = parser.parse_args(argv)
    try:
        scenario = load_scenario(args.scenario, stdin=sys.stdin)
        engine = build_engine(scenario)
    except Exception as exc:  # pragma: no cover - exercised via CLI
        parser.exit(2, f"error: {exc}\n")
    report: FrameworkReport | None = None
    dataset_payload: dict[str, Any] | None = None
    indent_value = _normalise_indent(args.indent)

    if args.format == "fine-tune":
        report = engine.report()
        dataset_payload = build_fine_tune_dataset(
            engine,
            report=report,
            default_tags=args.fine_tune_tags,
        )
        output = json.dumps(dataset_payload, indent=indent_value)
    else:
        if args.fine_tune_dataset:
            report = engine.report()
        output = render_report(
            engine,
            format=args.format,
            indent=args.indent,
            report=report,
        )
        if args.fine_tune_dataset:
            dataset_payload = build_fine_tune_dataset(
                engine,
                report=report,
                default_tags=args.fine_tune_tags,
            )

    print(output)

    if args.fine_tune_dataset:
        dataset_payload = dataset_payload or build_fine_tune_dataset(
            engine,
            report=report,
            default_tags=args.fine_tune_tags,
        )
        dataset_json = json.dumps(dataset_payload, indent=indent_value)
        destination = args.fine_tune_dataset
        if destination == "-":
            if args.format != "fine-tune":
                print("")
                print(dataset_json)
        else:
            destination_path = Path(destination).expanduser()
            destination_path.parent.mkdir(parents=True, exist_ok=True)
            destination_path.write_text(f"{dataset_json}\n", encoding="utf-8")
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    return run(argv)


__all__ = [
    "DEFAULT_SCENARIO",
    "build_engine",
    "build_fine_tune_dataset",
    "load_scenario",
    "render_report",
    "serialise_report",
    "run",
    "main",
]


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

