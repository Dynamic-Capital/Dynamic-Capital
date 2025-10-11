"""Dynamic introspective diagnostics bridging sensing with healing orchestration."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from dynamic_heal import HealingSignal

__all__ = [
    "DiagnosticSignal",
    "DiagnosticContext",
    "DiagnosticHypothesis",
    "SelfDiagnosticReport",
    "DynamicSelfDiagnosing",
]


def _normalise_text(value: str, *, field_name: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} must not be empty")
    return cleaned


def _normalise_tuple(items: Iterable[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = item.strip()
        if not cleaned:
            continue
        if lower:
            cleaned = cleaned.lower()
        if cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


@dataclass(slots=True)
class DiagnosticSignal:
    """Self-diagnostic observation describing tension or drift."""

    identifier: str
    description: str
    intensity: float = 0.5
    disruption: float = 0.5
    frequency: float = 0.5
    domains: tuple[str, ...] = field(default_factory=tuple)
    contributors: tuple[str, ...] = field(default_factory=tuple)
    confidence: float = 0.6
    weight: float = 1.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier, field_name="identifier")
        self.description = _normalise_text(self.description, field_name="description")
        self.intensity = _clamp(self.intensity)
        self.disruption = _clamp(self.disruption)
        self.frequency = _clamp(self.frequency)
        self.domains = _normalise_tuple(self.domains, lower=True)
        self.contributors = _normalise_tuple(self.contributors, lower=True)
        self.confidence = _clamp(self.confidence)
        self.weight = max(float(self.weight), 0.0)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    @property
    def severity(self) -> float:
        """Composite severity used for prioritisation."""

        return _clamp((self.intensity * 0.6) + (self.disruption * 0.3) + (self.frequency * 0.1))

    def to_healing_signal(self) -> HealingSignal:
        """Convert the diagnostic signal into a healing-compatible representation."""

        metadata: MutableMapping[str, object] = dict(self.metadata or {})
        metadata.setdefault("diagnostic", True)
        metadata.setdefault("contributors", self.contributors)
        metadata.setdefault("frequency", round(self.frequency, 4))
        metadata.setdefault("confidence", round(self.confidence, 4))
        severity = _clamp((self.severity * 0.7) + (self.frequency * 0.2))
        blast_radius = _clamp(0.25 + (self.disruption * 0.5))
        return HealingSignal(
            identifier=self.identifier,
            narrative=self.description,
            severity=severity,
            affected_domains=self.domains,
            blast_radius=blast_radius,
            metadata=metadata,
        )


@dataclass(slots=True)
class DiagnosticContext:
    """Context describing the operator's environment and resources."""

    baseline_resilience: float = 0.6
    cognitive_load: float = 0.5
    support_level: float = 0.5
    monitoring_window_hours: float = 72.0
    intentions: tuple[str, ...] = field(default_factory=tuple)
    stressors: tuple[str, ...] = field(default_factory=tuple)
    external_pressure: float = 0.4

    def __post_init__(self) -> None:
        self.baseline_resilience = _clamp(self.baseline_resilience)
        self.cognitive_load = _clamp(self.cognitive_load)
        self.support_level = _clamp(self.support_level)
        self.monitoring_window_hours = max(float(self.monitoring_window_hours), 1.0)
        self.intentions = _normalise_tuple(self.intentions)
        self.stressors = _normalise_tuple(self.stressors, lower=True)
        self.external_pressure = _clamp(self.external_pressure)

    @property
    def resilience_gap(self) -> float:
        """How much additional resilience is required to feel balanced."""

        return _clamp(1.0 - self.baseline_resilience)


@dataclass(slots=True)
class DiagnosticHypothesis:
    """Candidate explanation for the observed diagnostic pattern."""

    focus: str
    likelihood: float
    supporting_signals: tuple[str, ...]
    stabilisers: tuple[str, ...]

    def __post_init__(self) -> None:
        self.focus = _normalise_text(self.focus, field_name="focus")
        self.likelihood = _clamp(self.likelihood)
        self.supporting_signals = _normalise_tuple(self.supporting_signals)
        self.stabilisers = _normalise_tuple(self.stabilisers)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "focus": self.focus,
            "likelihood": self.likelihood,
            "supporting_signals": list(self.supporting_signals),
            "stabilisers": list(self.stabilisers),
        }


@dataclass(slots=True)
class SelfDiagnosticReport:
    """Structured report summarising self-diagnostic insights."""

    overall_pressure: float
    instability_risk: float
    confidence: float
    dominant_domains: tuple[str, ...]
    key_contributors: tuple[str, ...]
    hypotheses: tuple[DiagnosticHypothesis, ...]
    healing_signals: tuple[HealingSignal, ...]
    recommended_checks: tuple[str, ...]
    narrative: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "overall_pressure": self.overall_pressure,
            "instability_risk": self.instability_risk,
            "confidence": self.confidence,
            "dominant_domains": list(self.dominant_domains),
            "key_contributors": list(self.key_contributors),
            "hypotheses": [hypothesis.as_dict() for hypothesis in self.hypotheses],
            "healing_signals": [
                {
                    "identifier": signal.identifier,
                    "narrative": signal.narrative,
                    "severity": signal.severity,
                    "affected_domains": list(signal.affected_domains),
                    "blast_radius": signal.blast_radius,
                    "metadata": dict(signal.metadata or {}),
                }
                for signal in self.healing_signals
            ],
            "recommended_checks": list(self.recommended_checks),
            "narrative": self.narrative,
        }


class DynamicSelfDiagnosing:
    """Aggregate diagnostic signals and translate them into structured insights."""

    def __init__(self, *, history: int = 80) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[DiagnosticSignal] = deque(maxlen=history)

    # --------------------------------------------------------------- intake
    def capture(self, signal: DiagnosticSignal | Mapping[str, object]) -> DiagnosticSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[DiagnosticSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    @property
    def signal_count(self) -> int:
        return len(self._signals)

    def signals(self) -> tuple[DiagnosticSignal, ...]:
        return tuple(self._signals)

    def _coerce_signal(self, signal: DiagnosticSignal | Mapping[str, object]) -> DiagnosticSignal:
        if isinstance(signal, DiagnosticSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "identifier" not in payload:
                raise KeyError("mapping must include an identifier")
            return DiagnosticSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be DiagnosticSignal or mapping")

    # --------------------------------------------------------------- analysis
    def diagnose(self, context: DiagnosticContext, *, limit: int = 3) -> SelfDiagnosticReport:
        if not self._signals:
            raise RuntimeError("no diagnostic signals captured")

        overall_pressure = _clamp(
            (self._weighted_average("intensity") * 0.45)
            + (self._weighted_average("disruption") * 0.35)
            + (context.cognitive_load * 0.2)
        )
        instability_risk = _clamp(
            overall_pressure * (0.6 + context.resilience_gap * 0.4)
            + (context.external_pressure * 0.25)
        )
        confidence = _clamp(
            (self._weighted_average("confidence") * 0.7)
            + (min(context.support_level + 0.1, 1.0) * 0.3)
        )

        dominant_domains = self._top_domains(limit=limit)
        key_contributors = self._top_contributors(limit=limit)
        hypotheses = self._build_hypotheses(
            context,
            overall_pressure,
            dominant_domains,
            key_contributors,
            limit=limit,
        )
        healing_signals = self._healing_signals(limit=limit)
        recommended_checks = self._recommended_checks(context, overall_pressure, instability_risk)
        narrative = self._narrative(
            context,
            overall_pressure,
            instability_risk,
            dominant_domains,
            key_contributors,
        )

        return SelfDiagnosticReport(
            overall_pressure=overall_pressure,
            instability_risk=instability_risk,
            confidence=confidence,
            dominant_domains=dominant_domains,
            key_contributors=key_contributors,
            hypotheses=hypotheses,
            healing_signals=healing_signals,
            recommended_checks=recommended_checks,
            narrative=narrative,
        )

    # --------------------------------------------------------------- helpers
    def _weighted_average(self, field_name: str) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight == 0.0:
            return 0.0
        value = sum(getattr(signal, field_name) * signal.weight for signal in self._signals)
        return _clamp(value / total_weight)

    def _top_domains(self, *, limit: int) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            weight = signal.severity * (0.7 + signal.frequency * 0.3)
            for domain in signal.domains:
                counter[domain] += weight
        if not counter:
            return ()
        return tuple(domain for domain, _ in counter.most_common(limit))

    def _top_contributors(self, *, limit: int) -> tuple[str, ...]:
        counter: Counter[str] = Counter()
        for signal in self._signals:
            weight = (signal.intensity * 0.5) + (signal.disruption * 0.5)
            for contributor in signal.contributors:
                counter[contributor] += weight
        if not counter:
            return ()
        return tuple(contributor for contributor, _ in counter.most_common(limit))

    def _focus_score(self, focus: str) -> float:
        score = 0.0
        for signal in self._signals:
            if focus in signal.domains or focus in signal.contributors:
                score += signal.severity * max(signal.weight, 0.2)
        normaliser = max(len(self._signals), 1)
        return _clamp(score / normaliser)

    def _build_hypotheses(
        self,
        context: DiagnosticContext,
        overall_pressure: float,
        domains: Sequence[str],
        contributors: Sequence[str],
        *,
        limit: int,
    ) -> tuple[DiagnosticHypothesis, ...]:
        hypotheses: list[DiagnosticHypothesis] = []
        seen: set[str] = set()
        focus_order = list(domains) + [contributor for contributor in contributors if contributor not in domains]

        for focus in focus_order:
            if focus in seen:
                continue
            seen.add(focus)
            supporting = tuple(
                signal.identifier
                for signal in self._signals
                if focus in signal.domains or focus in signal.contributors
            )
            if not supporting:
                continue
            likelihood = _clamp(self._focus_score(focus) * (0.8 + context.resilience_gap * 0.2))
            stabilisers = self._stabilisers_for_focus(focus, context)
            hypotheses.append(
                DiagnosticHypothesis(
                    focus=focus,
                    likelihood=likelihood,
                    supporting_signals=supporting,
                    stabilisers=stabilisers,
                )
            )
            if len(hypotheses) >= limit:
                break

        if not hypotheses:
            stabilisers = self._stabilisers_for_focus("systemic", context)
            hypotheses.append(
                DiagnosticHypothesis(
                    focus="systemic strain",
                    likelihood=overall_pressure,
                    supporting_signals=tuple(signal.identifier for signal in self._signals),
                    stabilisers=stabilisers,
                )
            )

        return tuple(hypotheses)

    def _stabilisers_for_focus(self, focus: str, context: DiagnosticContext) -> tuple[str, ...]:
        prompts: list[str] = []
        window = max(int(context.monitoring_window_hours // 6), 4)
        prompts.append(f"Schedule focused review of {focus} signals within {window}h")
        if context.baseline_resilience < 0.55:
            prompts.append("Allocate a restorative micro-cycle before deeper analysis")
        else:
            prompts.append("Maintain short recovery breaks while monitoring the signal")
        if context.support_level < 0.4:
            prompts.append("Signal for support or accountability to prevent silent escalation")
        else:
            prompts.append("Share a quick status update with trusted support partners")
        if context.stressors:
            prompts.append(f"Map current stressors impacting {focus}: {', '.join(context.stressors[:3])}")
        return tuple(prompts)

    def _healing_signals(self, *, limit: int) -> tuple[HealingSignal, ...]:
        ordered = sorted(self._signals, key=lambda signal: signal.severity, reverse=True)
        converted: list[HealingSignal] = []
        seen: set[str] = set()
        for signal in ordered:
            if signal.identifier in seen:
                continue
            converted.append(signal.to_healing_signal())
            seen.add(signal.identifier)
            if len(converted) >= limit:
                break
        return tuple(converted)

    def _recommended_checks(
        self,
        context: DiagnosticContext,
        overall_pressure: float,
        instability_risk: float,
    ) -> tuple[str, ...]:
        checks: list[str] = []
        cadence = max(int(context.monitoring_window_hours // 8), 3)
        checks.append(f"Run a lightweight status scan every {cadence}h on dominant domains")
        if overall_pressure > 0.6:
            checks.append("Capture a narrative log for each high-severity signal")
        if instability_risk > 0.55:
            checks.append("Draft contingency options with a trusted collaborator")
        if context.intentions:
            checks.append(f"Align upcoming actions with intention: {context.intentions[0]}")
        return tuple(checks)

    def _narrative(
        self,
        context: DiagnosticContext,
        overall_pressure: float,
        instability_risk: float,
        domains: Sequence[str],
        contributors: Sequence[str],
    ) -> str:
        domain_text = ", ".join(domains) if domains else "general systems"
        contributor_text = ", ".join(contributors) if contributors else "diffuse patterns"
        tone = "steady" if instability_risk < 0.4 else ("cautious" if instability_risk < 0.7 else "elevated")
        return (
            "Diagnostic scan indicates "
            f"{overall_pressure:.2f} systemic pressure with {tone} stability risk. "
            f"Attention is clustering around {domain_text} driven by {contributor_text}. "
            "Use the stabilisers to slow escalation, then convert the highlighted signals into healing actions."
        )
