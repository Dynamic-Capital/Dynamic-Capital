"""Dynamic grading framework for adaptive rubric management."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Iterable, Mapping, MutableMapping

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


@dataclass(slots=True)
class _CriterionState:
    """Internal bookkeeping for each criterion."""

    criterion: GradingCriterion
    signals: Deque[GradingSignal]


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
        self._criteria[key] = _CriterionState(
            criterion=resolved,
            signals=deque(maxlen=self._history),
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
        state.signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[GradingSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self, *, criterion: str | None = None) -> None:
        if criterion is None:
            for state in self._criteria.values():
                state.signals.clear()
        else:
            normalised = _normalise_key(criterion)
            if normalised in self._criteria:
                self._criteria[normalised].signals.clear()

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

        snapshots = [self._build_snapshot(state) for state in self._criteria.values()]
        recommended_weights = {snap.key: snap.recommended_weight for snap in snapshots}
        total_weight = sum(recommended_weights.values()) or 1.0
        overall_mastery = sum(
            snap.mastery * recommended_weights[snap.key] for snap in snapshots
        ) / total_weight
        mean_coverage = sum(snap.coverage for snap in snapshots) / len(snapshots)

        focus = [snap.title for snap in snapshots if snap.status in {"needs_support", "insufficient_coverage"}]
        alerts: list[str] = []
        for snap in snapshots:
            alerts.extend(snap.warnings)
            for adjustment in snap.adjustments:
                if adjustment.lower().startswith("increase") or adjustment.lower().startswith("reduce"):
                    alerts.append(f"{snap.title}: {adjustment}")

        if focus:
            summary = (
                f"Overall mastery {overall_mastery:.2f} with mean coverage {mean_coverage:.2f}. "
                + "Focus on "
                + ", ".join(focus)
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
            recommended_weights=recommended_weights,
            alerts=tuple(dict.fromkeys(alerts)),
            metadata=_coerce_mapping(metadata),
        )

    # ------------------------------------------------------------------- internals
    def _coerce_signal(self, signal: GradingSignal | Mapping[str, object]) -> GradingSignal:
        if isinstance(signal, GradingSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return GradingSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be GradingSignal or mapping")

    def _build_snapshot(self, state: _CriterionState) -> GradingSnapshot:
        criterion = state.criterion
        signals = tuple(state.signals)
        if not signals:
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

        ordered = sorted(signals, key=lambda sig: sig.timestamp)
        total_samples = sum(max(signal.sample_size, 1) for signal in ordered)
        total_weight = float(total_samples) or 1.0
        weighted_average = sum(signal.mastery * max(signal.sample_size, 1) for signal in ordered) / total_weight

        if self._smoothing <= 0.0:
            mastery = weighted_average
        else:
            ema = ordered[0].mastery
            for signal in ordered[1:]:
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
            adjustments=tuple(dict.fromkeys(adjustments)),
            warnings=tuple(dict.fromkeys(warnings)),
        )
