"""Quantum benchmarking helpers built atop the knowledge-base gradebook."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

from dynamic_quantum import (
    DynamicQuantumEngine,
    QuantumEnvironment,
    QuantumPulse,
    QuantumResonanceFrame,
)

from .gradebook import KnowledgeBaseMetrics

__all__ = ["QuantumBenchmarkDomain", "load_quantum_benchmark"]


@dataclass(slots=True)
class QuantumBenchmarkDomain:
    """Bundle of derived metrics and resonance context for a domain."""

    metrics: KnowledgeBaseMetrics
    frame: QuantumResonanceFrame
    environment: QuantumEnvironment
    pulses: tuple[QuantumPulse, ...]


def _parse_timestamp(value: object) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError("timestamp must be a datetime or ISO 8601 string")
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"invalid ISO 8601 timestamp: {value}") from exc
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _load_pulse(payload: Mapping[str, Any]) -> QuantumPulse:
    data = dict(payload)
    timestamp = data.get("timestamp")
    if timestamp is not None:
        data["timestamp"] = _parse_timestamp(timestamp)
    return QuantumPulse(**data)


def _load_environment(payload: Mapping[str, Any] | None) -> QuantumEnvironment:
    if payload is None:
        return QuantumEnvironment(
            vacuum_pressure=0.6,
            background_noise=0.4,
            gravity_gradient=0.3,
            measurement_rate=0.5,
            thermal_load=0.4,
        )
    return QuantumEnvironment(**payload)


def _compute_staleness_hours(
    pulses: Iterable[QuantumPulse],
    reference_time: datetime,
) -> float:
    newest = max(pulse.timestamp for pulse in pulses)
    delta = reference_time - newest
    hours = delta.total_seconds() / 3600.0
    return max(0.0, hours)


def _count_failed_checks(
    pulses: Iterable[QuantumPulse],
    environment: QuantumEnvironment,
    frame: QuantumResonanceFrame,
) -> int:
    failed = len(frame.anomalies)
    cooling_events = sum(1 for pulse in pulses if pulse.requires_cooling)
    failed += cooling_events
    if environment.requires_cooling:
        failed += 1
    if environment.is_noisy:
        failed += 1
    if environment.is_measurement_aggressive and frame.stability_outlook < 0.6:
        failed += 1
    return failed


def load_quantum_benchmark(
    payload: Mapping[str, Any],
    *,
    reference_time: datetime | None = None,
) -> dict[str, QuantumBenchmarkDomain]:
    """Load benchmark inputs and derive grading metrics for each domain."""

    domains_payload = payload.get("domains", {})
    if not domains_payload:
        raise ValueError("benchmark payload must define at least one domain")

    configured_reference = payload.get("reference_time")
    if reference_time is None and configured_reference is not None:
        reference_time = _parse_timestamp(configured_reference)
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    else:
        reference_time = _parse_timestamp(reference_time)

    results: dict[str, QuantumBenchmarkDomain] = {}
    for domain, domain_payload in domains_payload.items():
        pulses_payload = domain_payload.get("pulses", [])
        if not pulses_payload:
            raise ValueError(f"domain '{domain}' must define at least one pulse")
        pulses = tuple(_load_pulse(pulse) for pulse in pulses_payload)

        engine = DynamicQuantumEngine(window=max(len(pulses), 1))
        engine.register_pulses(pulses)

        environment = _load_environment(domain_payload.get("environment"))
        frame = engine.synthesize_frame(environment=environment)
        staleness_hours = _compute_staleness_hours(pulses, reference_time)
        failed_checks = _count_failed_checks(pulses, environment, frame)

        metrics = KnowledgeBaseMetrics(
            coverage_ratio=frame.mean_coherence,
            accuracy_ratio=frame.mean_entanglement,
            telemetry_staleness_hours=staleness_hours,
            failed_health_checks=failed_checks,
        )

        results[domain] = QuantumBenchmarkDomain(
            metrics=metrics,
            frame=frame,
            environment=environment,
            pulses=pulses,
        )

    return results
