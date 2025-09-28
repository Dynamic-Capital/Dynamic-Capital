"""Command line interface for the :mod:`dynamic_framework` engine."""

from __future__ import annotations

import argparse
import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from .engine import DynamicFrameworkEngine, FrameworkNode, FrameworkPulse

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


def load_scenario(path: Path | None) -> Mapping[str, Any]:
    if path is None:
        return copy.deepcopy(DEFAULT_SCENARIO)
    data = json.loads(path.read_text(encoding="utf-8"))
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


def render_report(engine: DynamicFrameworkEngine) -> str:
    report = engine.report()
    lines: list[str] = [report.summary]
    if report.focus_areas:
        lines.append("")
        lines.append("Focus areas:")
        for title in report.focus_areas:
            lines.append(f"  - {title}")
    if report.alerts:
        lines.append("")
        lines.append("Alerts:")
        for alert in report.alerts:
            lines.append(f"  - {alert}")

    lines.append("")
    lines.append("Node snapshots:")
    for key in sorted(engine.nodes):
        snapshot = engine.snapshot(key)
        lines.append(
            f"- {snapshot.title} [{snapshot.status}] maturity {snapshot.maturity:.2f} "
            f"(confidence {snapshot.confidence:.2f}, enablement {snapshot.enablement:.2f}, "
            f"resilience {snapshot.resilience:.2f}, momentum {snapshot.momentum:.2f})"
        )
        if snapshot.recommendations:
            lines.append("    Recommendations:")
            for recommendation in snapshot.recommendations:
                lines.append(f"      • {recommendation}")
        if snapshot.alerts:
            lines.append("    Alerts:")
            for alert in snapshot.alerts:
                lines.append(f"      • {alert}")
    return "\n".join(lines)


def run(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the Dynamic Framework engine against a scenario file.",
    )
    parser.add_argument(
        "--scenario",
        type=Path,
        help="Path to a JSON scenario describing nodes and pulses.",
    )
    args = parser.parse_args(argv)
    try:
        scenario = load_scenario(args.scenario)
        engine = build_engine(scenario)
    except Exception as exc:  # pragma: no cover - exercised via CLI
        parser.exit(2, f"error: {exc}\n")
    print(render_report(engine))
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    return run(argv)


__all__ = ["DEFAULT_SCENARIO", "build_engine", "render_report", "run", "main"]


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

