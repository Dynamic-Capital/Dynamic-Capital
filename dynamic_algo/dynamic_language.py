"""Localisation planning heuristics for Dynamic Capital surfaces.

This module introduces the Dynamic Language Algo which evaluates the
readiness of language launches.  It digests heterogeneous localisation
telemetry (translation coverage, QA quality, support pressure, and
regulatory constraints) and surfaces a prioritised rollout plan so that
operations and product teams can sequence sprints with confidence.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, MutableMapping, Sequence, Tuple

__all__ = ["LanguageAssessment", "DynamicLanguageAlgo"]


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` into the inclusive ``[lower, upper]`` interval."""

    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_language(language: str) -> str:
    """Return an uppercase language key free of leading/trailing spaces."""

    return str(language or "").strip().upper() or "UNKNOWN"


@dataclass(slots=True)
class LanguageAssessment:
    """Structured assessment describing the readiness of a locale."""

    language: str
    coverage: float
    quality: float
    support_pressure: float
    status: str
    priority: float
    notes: Tuple[str, ...] = ()
    regulatory_risk: bool = False

    def as_dict(self) -> MutableMapping[str, Any]:
        """Return a serialisable payload for downstream consumers."""

        return {
            "language": self.language,
            "coverage": round(self.coverage, 4),
            "quality": round(self.quality, 4),
            "support_pressure": round(self.support_pressure, 4),
            "status": self.status,
            "priority": round(self.priority, 4),
            "notes": list(self.notes),
            "regulatory_risk": self.regulatory_risk,
        }


class DynamicLanguageAlgo:
    """Evaluate localisation telemetry and propose rollout plans."""

    def __init__(
        self,
        *,
        coverage_threshold: float = 0.8,
        quality_threshold: float = 0.85,
        support_tolerance: float = 0.4,
    ) -> None:
        self.coverage_threshold = _clamp(float(coverage_threshold))
        self.quality_threshold = _clamp(float(quality_threshold))
        self.support_tolerance = _clamp(float(support_tolerance))

    # ------------------------------------------------------------------ public
    def evaluate(self, payload: Mapping[str, Mapping[str, Any]]) -> MutableMapping[str, Any]:
        """Return readiness insights for the supplied localisation ``payload``."""

        if not payload:
            return self._empty_evaluation()

        assessments: list[LanguageAssessment] = []
        coverage_sum = 0.0
        quality_sum = 0.0
        regulatory_risk_languages: list[str] = []
        statuses: set[str] = set()

        for language, metrics in payload.items():
            if not isinstance(metrics, Mapping):
                continue

            language_code = _normalise_language(language)
            coverage = self._derive_coverage(metrics)
            quality = self._coerce_float(metrics.get("qa_score"), default=None)
            if quality is None:
                quality = self._coerce_float(metrics.get("quality"), default=0.0)
            quality = _clamp(quality)
            support_pressure = self._derive_support_pressure(metrics)
            regulatory_risk = bool(metrics.get("regulatory_blocker"))

            notes = self._collect_notes(
                coverage,
                quality,
                support_pressure,
                metrics.get("regulatory_notes"),
                regulatory_risk,
            )

            priority = self._calculate_priority(coverage, quality, support_pressure, regulatory_risk)
            status = self._determine_status(coverage, quality, support_pressure, regulatory_risk)

            coverage_sum += coverage
            quality_sum += quality
            if regulatory_risk:
                regulatory_risk_languages.append(language_code)
            statuses.add(status)

            assessments.append(
                LanguageAssessment(
                    language=language_code,
                    coverage=coverage,
                    quality=quality,
                    support_pressure=support_pressure,
                    status=status,
                    priority=priority,
                    notes=tuple(notes),
                    regulatory_risk=regulatory_risk,
                )
            )

        if not assessments:
            return self._empty_evaluation()

        count = len(assessments)
        coverage_average = coverage_sum / count
        quality_average = quality_sum / count

        ordered = sorted(assessments, key=lambda a: (a.priority, a.language), reverse=True)
        priority_order = [a.language for a in ordered]
        overall_status = self._summarise_status(statuses)

        return {
            "overall_status": overall_status,
            "languages": [assessment.as_dict() for assessment in assessments],
            "coverage_average": round(coverage_average, 4),
            "quality_average": round(quality_average, 4),
            "priority_order": priority_order,
            "regulatory_risk": regulatory_risk_languages,
        }

    def build_rollout_plan(
        self,
        evaluation: Mapping[str, Any],
        *,
        sprint_capacity: int = 3,
    ) -> list[MutableMapping[str, Any]]:
        """Derive a sprint-by-sprint rollout plan from an ``evaluation`` result."""

        if sprint_capacity <= 0:
            raise ValueError("sprint_capacity must be a positive integer")

        languages = evaluation.get("languages")
        if not isinstance(languages, Iterable):
            return []

        normalised_entries: list[tuple[str, MutableMapping[str, Any]]] = []
        for entry in languages:
            if not isinstance(entry, Mapping):
                continue
            language_code = _normalise_language(entry.get("language", ""))
            normalised_entry: MutableMapping[str, Any] = dict(entry)
            normalised_entry["language"] = language_code
            normalised_entries.append((language_code, normalised_entry))

        if not normalised_entries:
            return []

        ordered = self._order_languages_for_rollout(evaluation, normalised_entries)

        plan: list[MutableMapping[str, Any]] = []
        for idx in range(0, len(ordered), sprint_capacity):
            chunk = ordered[idx : idx + sprint_capacity]
            plan.append(
                {
                    "sprint": (idx // sprint_capacity) + 1,
                    "languages": [str(item.get("language", "")) for item in chunk],
                    "focus": self._derive_sprint_focus(chunk),
                }
            )

        return plan

    # ----------------------------------------------------------------- helpers
    def _empty_evaluation(self) -> MutableMapping[str, Any]:
        return {
            "overall_status": "NO_DATA",
            "languages": [],
            "coverage_average": 0.0,
            "quality_average": 0.0,
            "priority_order": [],
            "regulatory_risk": [],
        }

    def _order_languages_for_rollout(
        self,
        evaluation: Mapping[str, Any],
        entries: Sequence[tuple[str, MutableMapping[str, Any]]],
    ) -> list[MutableMapping[str, Any]]:
        order_hint = evaluation.get("priority_order")
        ordered: list[MutableMapping[str, Any]] = []

        if isinstance(order_hint, Iterable) and not isinstance(order_hint, (str, bytes)):
            lookup = {code: entry for code, entry in entries}
            seen: set[str] = set()
            for code in order_hint:
                normalised_code = _normalise_language(code)
                if normalised_code in lookup and normalised_code not in seen:
                    ordered.append(lookup[normalised_code])
                    seen.add(normalised_code)

            if len(seen) != len(lookup):
                remaining = [entry for code, entry in entries if code not in seen]
                remaining.sort(key=self._priority_sort_key, reverse=True)
                ordered.extend(remaining)

            if ordered:
                return ordered

        ordered = [entry for _, entry in entries]
        ordered.sort(key=self._priority_sort_key, reverse=True)
        return ordered

    def _derive_coverage(self, metrics: Mapping[str, Any]) -> float:
        coverage_value = self._coerce_float(metrics.get("coverage"), default=None)
        if coverage_value is not None:
            return _clamp(coverage_value)

        translated = self._coerce_float(metrics.get("translated_strings"), default=0.0)
        total = self._coerce_float(metrics.get("total_strings"), default=0.0)
        if total <= 0:
            return 0.0
        return _clamp(translated / total)

    def _derive_support_pressure(self, metrics: Mapping[str, Any]) -> float:
        tickets = self._coerce_float(metrics.get("open_support_tickets"), default=0.0)
        active_users = self._coerce_float(metrics.get("active_users"), default=0.0)
        baseline = max(active_users * 0.02, 1.0)
        pressure = tickets / baseline
        return _clamp(pressure)

    def _collect_notes(
        self,
        coverage: float,
        quality: float,
        support_pressure: float,
        regulatory_notes: Any,
        regulatory_risk: bool,
    ) -> list[str]:
        notes: list[str] = []

        if coverage < self.coverage_threshold:
            notes.append(
                f"Coverage below target ({coverage:.0%} < {self.coverage_threshold:.0%})."
            )
        if quality < self.quality_threshold:
            notes.append(
                f"Quality score below goal ({quality:.0%} < {self.quality_threshold:.0%})."
            )
        if support_pressure > self.support_tolerance:
            notes.append("Elevated support pressure from users.")
        if regulatory_risk:
            notes.append("Regulatory approval outstanding.")
        if isinstance(regulatory_notes, str) and regulatory_notes.strip():
            notes.append(regulatory_notes.strip())

        return notes

    def _calculate_priority(
        self,
        coverage: float,
        quality: float,
        support_pressure: float,
        regulatory_risk: bool,
    ) -> float:
        coverage_gap = max(0.0, self.coverage_threshold - coverage)
        quality_gap = max(0.0, self.quality_threshold - quality)
        support_gap = max(0.0, support_pressure - self.support_tolerance)

        priority = (coverage_gap * 0.5) + (quality_gap * 0.3) + (support_gap * 0.2)
        if regulatory_risk:
            priority += 0.4

        return round(priority, 4)

    def _determine_status(
        self,
        coverage: float,
        quality: float,
        support_pressure: float,
        regulatory_risk: bool,
    ) -> str:
        if regulatory_risk:
            return "BLOCKED"
        if (
            coverage >= self.coverage_threshold
            and quality >= self.quality_threshold
            and support_pressure <= self.support_tolerance
        ):
            return "READY"
        if (
            coverage >= self.coverage_threshold * 0.85
            and quality >= self.quality_threshold * 0.75
        ):
            return "IN_PROGRESS"
        return "BACKLOG"

    def _summarise_status(self, statuses: Sequence[str]) -> str:
        unique = set(statuses)
        if "BLOCKED" in unique:
            return "BLOCKED"
        if unique == {"READY"}:
            return "READY"
        if unique <= {"READY", "IN_PROGRESS"}:
            return "IN_PROGRESS"
        return "DISCOVERY"

    def _derive_sprint_focus(self, chunk: Sequence[Mapping[str, Any]]) -> str:
        if any(bool(item.get("regulatory_risk")) for item in chunk):
            return "Resolve regulatory approvals and compliance blockers."

        if any(self._coerce_float(item.get("coverage"), default=1.0) < self.coverage_threshold for item in chunk):
            return "Accelerate translation coverage and parity."

        if any(self._coerce_float(item.get("quality"), default=1.0) < self.quality_threshold for item in chunk):
            return "Improve localisation QA and linguistic review." 

        if any(
            self._coerce_float(item.get("support_pressure"), default=0.0) > self.support_tolerance
            for item in chunk
        ):
            return "Reduce support burden through targeted content fixes."

        return "Maintain readiness and monitor post-launch telemetry."

    @staticmethod
    def _coerce_float(value: Any, *, default: float | None) -> float | None:
        if value is None:
            return default
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _priority_sort_key(self, entry: Mapping[str, Any]) -> Tuple[float, str]:
        priority = self._coerce_float(entry.get("priority"), default=0.0)
        return (priority if priority is not None else 0.0, str(entry.get("language", "")))
