"""Configuration loaders for knowledge base benchmarks."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, MutableMapping

from .gradebook import KnowledgeBaseMetrics

__all__ = [
    "load_knowledge_base_config",
    "load_knowledge_base_payload",
]


def _resolve_ratio(
    payload: Mapping[str, Any],
    *,
    ratio_key: str,
    numerator_key: str,
    denominator_key: str,
) -> float:
    """Resolve a ratio value from explicit ratios or numerator/denominator pairs."""

    if ratio_key in payload:
        ratio = float(payload[ratio_key])
        if ratio < 0:
            raise ValueError("ratios must be non-negative")
        return ratio

    try:
        numerator = float(payload[numerator_key])
        denominator = float(payload[denominator_key])
    except KeyError as exc:  # pragma: no cover - defensive guard
        missing = numerator_key if numerator_key not in payload else denominator_key
        raise KeyError(
            f"missing keys for ratio calculation: {missing}"
        ) from exc

    if denominator <= 0:
        raise ValueError("denominator must be positive for ratio calculation")

    return numerator / denominator


def _load_metric(domain: str, payload: Mapping[str, Any]) -> KnowledgeBaseMetrics:
    coverage_payload = payload.get("coverage", {})
    accuracy_payload = payload.get("accuracy", {})
    governance_payload = payload.get("governance", {})

    coverage_ratio = _resolve_ratio(
        coverage_payload,
        ratio_key="ratio",
        numerator_key="present",
        denominator_key="required",
    )

    accuracy_ratio = _resolve_ratio(
        accuracy_payload,
        ratio_key="ratio",
        numerator_key="passing",
        denominator_key="sampled",
    )

    try:
        staleness_hours = float(governance_payload["hours_since_last_probe"])
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise KeyError(
            f"governance.hours_since_last_probe missing for {domain}"
        ) from exc

    failed_health_checks = int(governance_payload.get("failed_probes", 0))

    return KnowledgeBaseMetrics(
        coverage_ratio=coverage_ratio,
        accuracy_ratio=accuracy_ratio,
        telemetry_staleness_hours=staleness_hours,
        failed_health_checks=failed_health_checks,
    )


def load_knowledge_base_payload(
    payload: Mapping[str, Any]
) -> dict[str, KnowledgeBaseMetrics]:
    """Load domain metrics from a configuration payload."""

    domains_payload = payload.get("domains", {})
    if not isinstance(domains_payload, Mapping):
        raise TypeError("payload['domains'] must be a mapping of domain definitions")

    domains: MutableMapping[str, KnowledgeBaseMetrics] = {}
    for domain, domain_payload in domains_payload.items():
        if not isinstance(domain_payload, Mapping):  # pragma: no cover - defensive
            raise TypeError(f"domain '{domain}' configuration must be a mapping")
        domains[domain] = _load_metric(domain, domain_payload)

    if not domains:
        raise ValueError("benchmark config must define at least one domain")

    return dict(domains)


def load_knowledge_base_config(
    path: str | Path,
) -> dict[str, KnowledgeBaseMetrics]:
    """Load domain metrics from a configuration file path."""

    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    return load_knowledge_base_payload(payload)

