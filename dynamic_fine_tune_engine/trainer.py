"""Training orchestration utilities for dynamic fine-tuning cycles."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Mapping, Optional, Sequence

from dynamic.intelligence.agi.fine_tune import DynamicAGIFineTuner, FineTuneExample
from dynamic.intelligence.agi.self_improvement import LearningSnapshot

from dynamic_benchmark.gradebook import (
    KnowledgeBaseMetrics,
    grade_comprehensively,
    grade_many,
)

from .agent import DynamicFineTuneAgent
from dynamic.intelligence.agi.tuning_primitives import (
    DEFAULT_ACCURACY_TARGET,
    DEFAULT_COVERAGE_TARGET,
    DEFAULT_FAILED_CHECKS_TARGET,
    DEFAULT_STALENESS_TARGET,
    compute_deficits,
    focus_metric,
    priority_multiplier_from_severity,
    quality_floor_from_severity,
    severity_from_grade,
    severity_label,
)

from dynamic.intelligence.agi.benchmarking import prepare_benchmark_plan_from_source

__all__ = ["FineTuneTrainer"]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_score(value: float) -> float:
    if value > 1.0:
        return _clamp(value / 100.0)
    if value < 0.0:
        return 0.0
    return value


def _extract_signals(metadata: Mapping[str, object]) -> Sequence[Mapping[str, object]]:
    raw_signals = metadata.get("signals", ())
    extracted: List[Mapping[str, object]] = []
    if isinstance(raw_signals, Mapping):  # pragma: no cover - defensive guard
        raw_signals = (raw_signals,)
    for signal in raw_signals or ():
        if isinstance(signal, Mapping):
            extracted.append(dict(signal))
    return tuple(extracted)


def _signal_quality(signals: Sequence[Mapping[str, object]]) -> float:
    if not signals:
        return 0.5
    weighted_total = 0.0
    weight_sum = 0.0
    for signal in signals:
        weight = float(signal.get("weight", 1.0) or 0.0)
        if weight <= 0:
            continue
        direction = str(signal.get("direction", "neutral")).lower()
        value = float(signal.get("value", 0.0) or 0.0)
        magnitude = abs(value)
        signed_value = magnitude if direction != "negative" else -magnitude
        weighted_total += signed_value * weight
        weight_sum += weight
    if weight_sum == 0:
        return 0.5
    normalised = weighted_total / weight_sum
    return 0.5 + (_clamp(normalised, lower=-1.0, upper=1.0) / 2.0)


def _signal_priority(signals: Sequence[Mapping[str, object]]) -> float:
    if not signals:
        return 0.5
    negative_weight = 0.0
    positive_weight = 0.0
    for signal in signals:
        weight = float(signal.get("weight", 1.0) or 0.0)
        if weight <= 0:
            continue
        direction = str(signal.get("direction", "neutral")).lower()
        if direction == "negative":
            negative_weight += weight
        elif direction == "positive":
            positive_weight += weight
    total = negative_weight + positive_weight
    if total == 0:
        return 0.5
    balance = (negative_weight - positive_weight) / (2.0 * total)
    return _clamp(0.5 + balance)


def _quality_from_metadata(metadata: Mapping[str, object]) -> float:
    signals = _extract_signals(metadata)
    performance_score = _normalise_score(float(metadata.get("performance_score", 0.0) or 0.0))
    signal_score = _signal_quality(signals)
    return _clamp((performance_score + signal_score) / 2.0)


def _priority_from_metadata(metadata: Mapping[str, object]) -> float:
    signals = _extract_signals(metadata)
    return _signal_priority(signals)


def _collect_new_examples(
    tuner: DynamicAGIFineTuner, snapshots: Sequence[LearningSnapshot]
) -> tuple[FineTuneExample, ...]:
    if not snapshots:
        return ()
    added = tuner.ingest_snapshots(snapshots)
    if added <= 0:
        return ()
    return tuner.dataset.tail(added)


def _payload_from_example(
    example: FineTuneExample,
    *,
    source: str,
    metadata_overrides: Mapping[str, object] | None = None,
    priority_multiplier: float = 1.0,
    quality_floor: float | None = None,
    extra_tags: Sequence[str] | None = None,
) -> Mapping[str, object]:
    metadata = dict(example.metadata)
    quality = _quality_from_metadata(metadata)
    priority = _priority_from_metadata(metadata)
    metadata.setdefault("source", source)
    if metadata_overrides:
        metadata.update(metadata_overrides)
    if quality_floor is not None:
        quality = max(quality, _clamp(quality_floor))
    priority = _clamp(priority * float(priority_multiplier))
    tags = list(example.tags)
    if extra_tags:
        seen = {str(tag) for tag in tags}
        for tag in extra_tags:
            candidate = str(tag).strip()
            if not candidate or candidate in seen:
                continue
            seen.add(candidate)
            tags.append(candidate)
    return {
        "prompt": example.prompt,
        "completion": example.completion,
        "source": metadata.get("source", source),
        "tags": tuple(tags),
        "metadata": metadata,
        "quality": _clamp(quality),
        "priority": priority,
    }


@dataclass(slots=True)
class FineTuneTrainer:
    """Bridge Dynamic AGI telemetry into the fine-tune dataset engine."""

    agent: DynamicFineTuneAgent
    tuner: DynamicAGIFineTuner = field(default_factory=DynamicAGIFineTuner)
    source: str = "agi.self_improvement"

    def fine_tune(
        self,
        snapshots: Iterable[LearningSnapshot],
        *,
        batch_size: int = 32,
        minimum_quality: float = 0.6,
        remove: bool = False,
        notes: Optional[str] = None,
    ) -> Mapping[str, object]:
        """Ingest snapshots, build the dataset, and return harvest artefacts."""

        snapshots = tuple(snapshots)
        if not snapshots:
            batches = tuple(self.tuner.build_batches(batch_size=batch_size, notes=notes))
            summary = self.tuner.dataset_summary()
            batch = self.agent.harvest(
                batch_size=batch_size,
                minimum_quality=minimum_quality,
                remove=remove,
                notes=notes,
            )
            return {
                "ingested": 0,
                "harvest": batch,
                "batches": batches,
                "summary": summary,
            }

        new_examples = _collect_new_examples(self.tuner, snapshots)

        payloads = [
            _payload_from_example(example, source=self.source)
            for example in new_examples
        ]
        ingested = self.agent.ingest_payloads(payloads) if payloads else 0

        batch = self.agent.harvest(
            batch_size=batch_size,
            minimum_quality=minimum_quality,
            remove=remove,
            notes=notes,
        )
        batches = tuple(self.tuner.build_batches(batch_size=batch_size, notes=notes))
        summary = self.tuner.dataset_summary()
        return {
            "ingested": ingested,
            "harvest": batch,
            "batches": batches,
            "summary": summary,
        }

    def fine_tune_for_grades(
        self,
        domain_snapshots: Mapping[str, Iterable[LearningSnapshot]],
        domain_metrics: Mapping[str, KnowledgeBaseMetrics],
        *,
        batch_size: int = 32,
        minimum_quality: float = 0.6,
        remove: bool = False,
        notes: Optional[str] = None,
    ) -> Mapping[str, object]:
        if not domain_metrics:
            raise ValueError("domain_metrics must not be empty")

        normalised_snapshots = {
            domain: tuple(snapshots)
            for domain, snapshots in domain_snapshots.items()
        }
        unknown_domains = set(normalised_snapshots) - set(domain_metrics)
        if unknown_domains:
            raise KeyError(
                "snapshots provided for unknown domain(s): "
                + ", ".join(sorted(unknown_domains))
            )

        domain_grades = grade_many(domain_metrics)
        comprehensive_grade = grade_comprehensively(
            domain_metrics, precomputed_grades=domain_grades
        ).as_dict()

        final_notes = notes or "grade remediation cycle"
        total_ingested = 0
        domain_reports: dict[str, Mapping[str, object]] = {}
        quality_floors: list[float] = []

        for domain, grade in domain_grades.items():
            snapshots = normalised_snapshots.get(domain, ())
            severity = severity_from_grade(grade.letter)
            severity_label_text = severity_label(severity)
            quality_floor = quality_floor_from_severity(minimum_quality, severity)
            quality_floors.append(quality_floor)
            priority_multiplier = priority_multiplier_from_severity(severity)
            metrics = domain_metrics[domain]
            deficits = compute_deficits(
                metrics,
                coverage_target=DEFAULT_COVERAGE_TARGET,
                accuracy_target=DEFAULT_ACCURACY_TARGET,
                staleness_target=DEFAULT_STALENESS_TARGET,
                failed_checks_target=DEFAULT_FAILED_CHECKS_TARGET,
            )
            focus = focus_metric(deficits)

            metadata_overrides = {
                "domain": domain,
                "grade_letter": grade.letter,
                "grade_band": grade.band,
                "grade_rationale": grade.rationale,
                "grade_remediation": grade.remediation,
                "grade_severity": severity,
                "grade_severity_label": severity_label_text,
                "focus_metric": focus,
                "deficits": deficits,
                "metrics": metrics.as_dict(),
                "remediation_notes": final_notes,
            }

            extra_tags = (
                "grade-remediation",
                f"domain:{domain.lower()}",
                f"grade:{grade.letter.lower()}",
                f"focus:{focus}",
                f"severity:{severity_label_text}",
            )

            new_examples = _collect_new_examples(self.tuner, snapshots)
            payloads = [
                _payload_from_example(
                    example,
                    source=self.source,
                    metadata_overrides=metadata_overrides,
                    priority_multiplier=priority_multiplier,
                    quality_floor=quality_floor,
                    extra_tags=extra_tags,
                )
                for example in new_examples
            ]
            accepted = self.agent.ingest_payloads(payloads) if payloads else 0
            total_ingested += accepted

            domain_reports[domain] = {
                "grade": grade.as_dict(),
                "severity": severity,
                "severity_label": severity_label_text,
                "focus": focus,
                "deficits": deficits,
                "quality_floor": quality_floor,
                "priority_multiplier": priority_multiplier,
                "payloads": len(payloads),
                "accepted": accepted,
            }

        harvest_quality = max(quality_floors) if quality_floors else minimum_quality
        batch = self.agent.harvest(
            batch_size=batch_size,
            minimum_quality=harvest_quality,
            remove=remove,
            notes=final_notes,
        )
        batches = tuple(self.tuner.build_batches(batch_size=batch_size, notes=final_notes))
        summary = self.tuner.dataset_summary()

        return {
            "ingested": total_ingested,
            "harvest": batch,
            "batches": batches,
            "summary": summary,
            "domain_reports": domain_reports,
            "comprehensive_grade": comprehensive_grade,
        }

    def fine_tune_from_benchmark(
        self,
        benchmark: Mapping[str, object] | str | Path,
        *,
        knowledge_base: Mapping[str, Sequence[Mapping[str, object]]] | None = None,
        batch_size: int = 32,
        minimum_quality: float = 0.6,
        remove: bool = False,
        notes: Optional[str] = None,
        coverage_target: float | None = None,
        accuracy_target: float | None = None,
        staleness_target: float | None = None,
        failed_checks_target: int | None = None,
        learning_rate: float = 0.35,
        max_cycles: int = 12,
    ) -> Mapping[str, object]:
        """Benchmark domains, prepare enrichment data, and fine-tune."""

        coverage_goal = (
            DEFAULT_COVERAGE_TARGET if coverage_target is None else float(coverage_target)
        )
        accuracy_goal = (
            DEFAULT_ACCURACY_TARGET if accuracy_target is None else float(accuracy_target)
        )
        staleness_goal = (
            DEFAULT_STALENESS_TARGET if staleness_target is None else float(staleness_target)
        )
        failed_goal = (
            DEFAULT_FAILED_CHECKS_TARGET if failed_checks_target is None else int(failed_checks_target)
        )

        preparation = prepare_benchmark_plan_from_source(
            benchmark,
            knowledge_base=knowledge_base,
            minimum_quality=minimum_quality,
            coverage_target=coverage_goal,
            accuracy_target=accuracy_goal,
            staleness_target=staleness_goal,
            failed_checks_target=failed_goal,
            learning_rate=learning_rate,
            max_cycles=max_cycles,
        )

        domain_snapshots = {
            domain: plan.snapshots for domain, plan in preparation.domain_plans.items()
        }
        final_notes = notes or "benchmark remediation cycle"

        result = self.fine_tune_for_grades(
            domain_snapshots,
            preparation.metrics,
            batch_size=batch_size,
            minimum_quality=minimum_quality,
            remove=remove,
            notes=final_notes,
        )
        result["benchmark_plan"] = preparation.as_dict()
        return result
