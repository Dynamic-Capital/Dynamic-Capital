import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_heal import HealingSignal
from dynamic_self_diagnosing import (
    DiagnosticContext,
    DiagnosticSignal,
    DynamicSelfDiagnosing,
    SelfDiagnosticReport,
)
from dynamic.platform.engines import DynamicSelfDiagnosing as LegacySelfDiagnosing


def test_diagnostic_signal_translates_to_healing_signal() -> None:
    signal = DiagnosticSignal(
        identifier="focus-fragmentation",
        description="Attention split across too many threads",
        intensity=0.72,
        disruption=0.68,
        frequency=0.55,
        domains=("cognitive", "strategic"),
        contributors=("context-switching", "notifications"),
        confidence=0.8,
    )

    converted = signal.to_healing_signal()

    assert isinstance(converted, HealingSignal)
    assert converted.identifier == "focus-fragmentation"
    assert converted.severity == pytest.approx(0.5937, rel=1e-6)
    assert converted.metadata["diagnostic"] is True
    assert converted.metadata["contributors"] == ("context-switching", "notifications")


def test_dynamic_self_diagnosing_generates_report() -> None:
    engine = DynamicSelfDiagnosing(history=5)
    engine.extend(
        [
            {
                "identifier": "emotional-friction",
                "description": "Lingering tension after difficult collaboration",
                "intensity": 0.58,
                "disruption": 0.6,
                "frequency": 0.42,
                "domains": ("emotional", "relational"),
                "contributors": ("feedback-loop", "ambiguity"),
                "confidence": 0.75,
            },
            DiagnosticSignal(
                identifier="somatic-fatigue",
                description="Low-grade fatigue through afternoon block",
                intensity=0.63,
                disruption=0.52,
                frequency=0.47,
                domains=("physical", "cognitive"),
                contributors=("sleep-debt",),
                confidence=0.7,
            ),
            {
                "identifier": "strategy-noise",
                "description": "Macro narrative unclear causing hesitation",
                "intensity": 0.66,
                "disruption": 0.64,
                "frequency": 0.58,
                "domains": ("strategic", "cognitive"),
                "contributors": ("information-load", "ambiguity"),
                "confidence": 0.78,
            },
        ]
    )

    context = DiagnosticContext(
        baseline_resilience=0.52,
        cognitive_load=0.61,
        support_level=0.43,
        monitoring_window_hours=48,
        intentions=("Preserve strategic clarity",),
        stressors=("market-volatility", "compressed-timelines"),
        external_pressure=0.35,
    )

    report = engine.diagnose(context)

    assert isinstance(report, SelfDiagnosticReport)
    assert report.healing_signals and all(isinstance(sig, HealingSignal) for sig in report.healing_signals)
    assert report.hypotheses
    assert report.dominant_domains
    assert report.key_contributors
    assert 0.0 <= report.overall_pressure <= 1.0
    assert 0.0 <= report.instability_risk <= 1.0

    payload = report.as_dict()
    assert payload["dominant_domains"]
    assert payload["hypotheses"]
    assert payload["healing_signals"][0]["identifier"] in {"emotional-friction", "somatic-fatigue", "strategy-noise"}
    assert "strategic" in report.narrative or "cognitive" in report.narrative


def test_dynamic_engines_legacy_self_diagnosing_entrypoint() -> None:
    legacy = LegacySelfDiagnosing()
    assert isinstance(legacy, DynamicSelfDiagnosing)

    legacy.capture(
        {
            "identifier": "baseline-signal",
            "description": "General diagnostic pulse",
            "intensity": 0.4,
            "disruption": 0.35,
            "frequency": 0.3,
            "domains": ("general",),
        }
    )
    report = legacy.diagnose(
        DiagnosticContext(),
        limit=1,
    )
    assert isinstance(report, SelfDiagnosticReport)

    with pytest.raises(RuntimeError):
        # Resetting should make diagnose fail without signals
        legacy.reset()
        legacy.diagnose(DiagnosticContext())
