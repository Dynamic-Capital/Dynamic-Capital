from datetime import datetime, timezone

import pytest

from dynamic_cap_theorem import (
    CapAssessment,
    CapContext,
    CapEvent,
    CapVector,
    DynamicCapTheorem,
)


def test_cap_event_normalises_inputs() -> None:
    event = CapEvent(
        label="  Regional Outage ",
        consistency_delta="-0.25",
        availability_delta=-0.3,
        partition_delta=-0.2,
        criticality=0.9,
        persistence=0.8,
        narrative=" Partition risk increases ",
        tags=("Network", "network", " Incident "),
        timestamp=datetime(2024, 5, 1, 12, 30),
        metadata={"region": 3},
    )

    assert event.label == "Regional Outage"
    assert event.narrative == "Partition risk increases"
    assert event.tags == ("network", "incident")
    assert event.timestamp.tzinfo == timezone.utc
    assert event.weight == pytest.approx(0.792)
    c_delta, a_delta, p_delta = event.weighted_deltas()
    assert c_delta == pytest.approx(-0.198)
    assert a_delta == pytest.approx(-0.2376)
    assert p_delta == pytest.approx(-0.1584)
    assert event.metadata == {"region": 3}


def test_dynamic_cap_theorem_snapshot_produces_assessment() -> None:
    baseline = CapVector(
        consistency=0.6,
        availability=0.62,
        partition_tolerance=0.58,
        narrative=" Baseline posture ",
    )
    assert baseline.narrative == "Baseline posture"

    context = CapContext(
        read_bias=0.7,
        write_criticality=0.55,
        latency_sensitivity=0.6,
        geographic_dispersal=0.7,
        regulatory_risk=0.65,
        resilience_budget=0.3,
        narratives=("  Maintain uptime  ",),
    )
    assert context.narratives == ("Maintain uptime",)

    theorem = DynamicCapTheorem(window=5)
    theorem.register(
        CapEvent(
            label="Global transit incident",
            consistency_delta=-0.25,
            availability_delta=-0.3,
            partition_delta=-0.2,
            criticality=0.9,
            persistence=0.8,
            tags=("network", "Incident"),
        )
    )
    theorem.register(
        CapEvent(
            label="Cache warmup",
            consistency_delta=0.1,
            availability_delta=0.2,
            partition_delta=0.05,
            criticality=0.5,
            persistence=0.4,
        )
    )

    assessment = theorem.snapshot(baseline=baseline, context=context)

    assert isinstance(assessment, CapAssessment)
    vector = assessment.vector
    assert 0.0 <= vector.consistency <= 1.0
    assert 0.0 <= vector.availability <= 1.0
    assert 0.0 <= vector.partition_tolerance <= 1.0
    assert assessment.dominant_focus in {
        "consistency",
        "availability",
        "partition_tolerance",
        "balanced",
    }
    assert assessment.alerts
    assert any("partition" in alert for alert in assessment.alerts)
    assert assessment.recommendations
    assert set(assessment.event_pressure) == {
        "consistency",
        "availability",
        "partition_tolerance",
    }


def test_platform_engines_exposes_dynamic_cap_theorem() -> None:
    from dynamic.platform import engines as platform_engines

    assert platform_engines.DynamicCapTheorem is DynamicCapTheorem
