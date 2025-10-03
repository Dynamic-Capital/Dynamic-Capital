"""Dynamic grading framework for adaptive rubric management."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from .model import (
    GradingCriterion,
    GradingReport,
    GradingSignal,
    GradingSnapshot,
    _clamp,
    _normalise_key,
    _utcnow,
)

__all__ = [
    "DynamicGradingEngine",
    "GradingCriterion",
    "GradingSignal",
    "GradingSnapshot",
    "GradingReport",
]


def _coerce_mapping(payload: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if payload is None:
        return None
    if not isinstance(payload, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(payload)


def _unique(sequence: Sequence[str]) -> tuple[str, ...]:
    """Return the elements of ``sequence`` while preserving their order."""

    seen: set[str] = set()
    ordered: list[str] = []
    for item in sequence:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return tuple(ordered)


@dataclass(slots=True)
class _CriterionState:
    """Internal bookkeeping for each criterion."""

    criterion: GradingCriterion
    signals: Deque[GradingSignal]
    is_sorted: bool = True


class DynamicGradingEngine:
    """Aggregate grading signals and propose rubric adjustments."""

    def __init__(
        self,
        criteria: Iterable[GradingCriterion | Mapping[str, object]] | None = None,
        *,
        history: int = 24,
        smoothing: float = 0.35,
        coverage_target: int = 20,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if coverage_target <= 0:
            raise ValueError("coverage_target must be positive")
        self._history = history
        self._smoothing = _clamp(smoothing)
        self._coverage_target = coverage_target
        self._criteria: MutableMapping[str, _CriterionState] = {}
        if criteria:
            self.register_many(criteria)

    # ----------------------------------------------------------------- accessors
    @property
    def history(self) -> int:
        return self._history

    @property
    def smoothing(self) -> float:
        return self._smoothing

    @property
    def coverage_target(self) -> int:
        return self._coverage_target

    @property
    def criteria(self) -> Mapping[str, GradingCriterion]:
        return {key: state.criterion for key, state in self._criteria.items()}

    def signals_for(self, key: str) -> tuple[GradingSignal, ...]:
        normalised = _normalise_key(key)
        state = self._criteria.get(normalised)
        if not state:
            return ()
        if not state.is_sorted:
            ordered = sorted(state.signals, key=lambda sig: sig.timestamp)
            state.signals = deque(ordered, maxlen=self._history)
            state.is_sorted = True
        return tuple(state.signals)

    # ------------------------------------------------------------------- registry
    def register(self, criterion: GradingCriterion | Mapping[str, object]) -> GradingCriterion:
        if isinstance(criterion, Mapping):
            resolved = GradingCriterion(**dict(criterion))
        elif isinstance(criterion, GradingCriterion):
            resolved = criterion
        else:  # pragma: no cover - defensive guard
            raise TypeError("criterion must be GradingCriterion or mapping")
        key = resolved.key
        existing = self._criteria.get(key)
        if existing:
            existing.criterion = resolved
            if existing.signals.maxlen != self._history:
                existing.signals = deque(existing.signals, maxlen=self._history)
        else:
            self._criteria[key] = _CriterionState(
                criterion=resolved,
                signals=deque(maxlen=self._history),
                is_sorted=True,
            )
        return resolved

    def register_many(self, criteria: Iterable[GradingCriterion | Mapping[str, object]]) -> None:
        for criterion in criteria:
            self.register(criterion)

    # --------------------------------------------------------------------- signals
    def capture(self, signal: GradingSignal | Mapping[str, object]) -> GradingSignal:
        resolved = self._coerce_signal(signal)
        state = self._criteria.get(resolved.criterion)
        if state is None:
            raise KeyError(f"unknown grading criterion: {resolved.criterion}")
        if state.signals and resolved.timestamp < state.signals[-1].timestamp:
            state.is_sorted = False
        state.signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[GradingSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self, *, criterion: str | None = None) -> None:
        if criterion is None:
            for state in self._criteria.values():
                state.signals.clear()
                state.is_sorted = True
        else:
            normalised = _normalise_key(criterion)
            try:
                state = self._criteria[normalised]
                state.signals.clear()
                state.is_sorted = True
            except KeyError as exc:
                raise KeyError(f"unknown grading criterion: {normalised}") from exc

    # --------------------------------------------------------------------- reports
    def snapshot(self, key: str) -> GradingSnapshot:
        normalised = _normalise_key(key)
        state = self._criteria.get(normalised)
        if state is None:
            raise KeyError(f"unknown grading criterion: {normalised}")
        return self._build_snapshot(state)

    def build_report(
        self,
        objective: str = "dynamic-grading-cycle",
        *,
        metadata: Mapping[str, object] | None = None,
    ) -> GradingReport:
        if not self._criteria:
            raise RuntimeError("no grading criteria registered")

        snapshots: list[GradingSnapshot] = []
        recommended_weights: dict[str, float] = {}
        weighted_mastery = 0.0
        coverage_total = 0.0
        focus: list[str] = []
        alerts: list[str] = []

        for state in self._criteria.values():
            snapshot = self._build_snapshot(state)
            snapshots.append(snapshot)
            recommended_weights[snapshot.key] = snapshot.recommended_weight
            weighted_mastery += snapshot.mastery * snapshot.recommended_weight
            coverage_total += snapshot.coverage
            if snapshot.status in {"needs_support", "insufficient_coverage"}:
                focus.append(snapshot.title)
            alerts.extend(snapshot.warnings)
            alerts.extend(
                f"{snapshot.title}: {adjustment}"
                for adjustment in snapshot.adjustments
                if adjustment.lower().startswith("increase")
                or adjustment.lower().startswith("reduce")
            )

        total_weight = sum(recommended_weights.values())
        if total_weight <= 0:
            divisor = float(len(snapshots)) or 1.0
            overall_mastery = sum(snapshot.mastery for snapshot in snapshots) / divisor
            total_weight = divisor
        else:
            overall_mastery = weighted_mastery / total_weight
        mean_coverage = coverage_total / len(snapshots)

        focus_titles = _unique(focus)
        if focus_titles:
            summary = (
                f"Overall mastery {overall_mastery:.2f} with mean coverage {mean_coverage:.2f}. "
                + "Focus on "
                + ", ".join(focus_titles)
                + " to stabilise outcomes."
            )
        else:
            summary = (
                f"Overall mastery {overall_mastery:.2f} with mean coverage {mean_coverage:.2f}. "
                "Rubric weighting remains balanced."
            )

        return GradingReport(
            objective=objective,
            generated_at=_utcnow(),
            overall_mastery=round(overall_mastery, 4),
            mean_coverage=round(mean_coverage, 4),
            summary=summary,
            snapshots=tuple(snapshots),
            recommended_weights=dict(recommended_weights),
            alerts=_unique(alerts),
            metadata=_coerce_mapping(metadata),
        )

    # ------------------------------------------------------------------- internals
    def _coerce_signal(self, signal: GradingSignal | Mapping[str, object]) -> GradingSignal:
        if isinstance(signal, GradingSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "criterion" not in payload or not payload["criterion"]:
                raise KeyError("signal must declare a criterion")
            if "mastery" not in payload:
                raise KeyError("signal must declare mastery")
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return GradingSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be GradingSignal or mapping")

    def _build_snapshot(self, state: _CriterionState) -> GradingSnapshot:
        criterion = state.criterion
        if not state.signals:
            summary = f"No mastery signals captured for {criterion.title}."
            return GradingSnapshot(
                key=criterion.key,
                title=criterion.title,
                baseline_weight=criterion.baseline_weight,
                recommended_weight=criterion.baseline_weight,
                mastery=0.0,
                coverage=0.0,
                status="no_data",
                summary=summary,
                adjustments=("Capture mastery signals to enable dynamic weighting.",),
                warnings=(f"{criterion.title}: insufficient mastery coverage.",),
            )

        if not state.is_sorted:
            ordered_signals = sorted(state.signals, key=lambda sig: sig.timestamp)
            state.signals = deque(ordered_signals, maxlen=self._history)
            state.is_sorted = True
        else:
            ordered_signals = list(state.signals)

        total_samples = sum(max(signal.sample_size, 1) for signal in ordered_signals)
        total_weight = float(total_samples) or 1.0
        weighted_average = (
            sum(signal.mastery * max(signal.sample_size, 1) for signal in ordered_signals)
            / total_weight
        )

        if self._smoothing <= 0.0:
            mastery = weighted_average
        else:
            ema = ordered_signals[0].mastery
            for signal in ordered_signals[1:]:
                ema = (1 - self._smoothing) * ema + self._smoothing * signal.mastery
            mastery = self._smoothing * weighted_average + (1 - self._smoothing) * ema

        mastery = _clamp(mastery)
        coverage = min(1.0, total_samples / float(self._coverage_target))

        target = criterion.target_mastery
        tolerance = criterion.tolerance
        delta = target - mastery
        baseline_weight = criterion.baseline_weight
        proposed = baseline_weight + criterion.learning_rate * delta
        recommended = _clamp(
            proposed,
            lower=criterion.min_weight,
            upper=criterion.max_weight,
        )
        weight_delta = recommended - baseline_weight

        adjustments: list[str] = []
        warnings: list[str] = []

        if weight_delta > tolerance:
            adjustments.append(
                f"Increase weight by +{weight_delta:.2f} to {recommended:.2f} to emphasise {criterion.title}."
            )
        elif weight_delta < -tolerance:
            adjustments.append(
                f"Reduce weight by {weight_delta:.2f} to {recommended:.2f} to balance {criterion.title}."
            )
        else:
            adjustments.append(f"Maintain baseline weight at {baseline_weight:.2f}.")

        if coverage < 0.25:
            warnings.append(f"{criterion.title}: mastery coverage is limited ({coverage:.2f}).")

        if mastery >= target + tolerance:
            status = "exceeding"
            summary = (
                f"{criterion.title} exceeds mastery expectations at {mastery:.2f}. "
                f"Recommended weight {recommended:.2f}."
            )
        elif mastery >= target - tolerance:
            status = "on_track"
            summary = (
                f"{criterion.title} is on track with mastery {mastery:.2f}. "
                f"Recommended weight {recommended:.2f}."
            )
        elif coverage < 0.25:
            status = "insufficient_coverage"
            summary = (
                f"{criterion.title} lacks sufficient coverage ({coverage:.2f}); collect additional assessments."
            )
        else:
            status = "needs_support"
            summary = (
                f"{criterion.title} trails mastery targets ({mastery:.2f} < {target:.2f}); "
                f"proposed weight {recommended:.2f}."
            )

        return GradingSnapshot(
            key=criterion.key,
            title=criterion.title,
            baseline_weight=baseline_weight,
            recommended_weight=recommended,
            mastery=round(mastery, 4),
            coverage=round(coverage, 4),
            status=status,
            summary=summary,
            adjustments=_unique(adjustments),
            warnings=_unique(warnings),
        )
