from __future__ import annotations

import pytest

from dynamic_language import (
    DynamicLanguageEngine,
    DynamicLanguageModel,
    LanguageCapability,
    LanguageProfile,
)
from dynamic_engines import DynamicLanguageEngine as LegacyLanguageEngine


def test_language_capability_readiness_and_normalisation() -> None:
    capability = LanguageCapability(
        domain="Data Science",
        proficiency=0.9,
        maturity=0.8,
        ecosystem=0.85,
        notes=("Robust libraries", "Strong community"),
    )

    assert capability.domain == "data science"
    assert capability.notes == ("Robust libraries", "Strong community")
    assert capability.readiness == pytest.approx(0.8675, rel=1e-6)


def test_language_profile_adaptability_and_summary() -> None:
    python_profile = LanguageProfile(
        name="Python",
        family="Multi-paradigm",
        runtime="cpython",
        typing="dynamic",
        paradigms=("object-oriented", "functional"),
        primary_use_cases=("Automation", "Data Science"),
        capabilities=(
            LanguageCapability(
                domain="Data Science",
                proficiency=0.92,
                maturity=0.85,
                ecosystem=0.88,
            ),
            LanguageCapability(
                domain="Automation",
                proficiency=0.9,
                maturity=0.83,
                ecosystem=0.86,
            ),
        ),
        community_health=0.92,
        interoperability=0.84,
        stability=0.78,
        release_velocity=0.81,
        strengths=("Large package ecosystem", "Readable syntax"),
        cautions=("Runtime performance",),
    )

    assert python_profile.adaptability_index == pytest.approx(0.8571, rel=1e-6)
    assert python_profile.score_for_domain("Data Science") == pytest.approx(
        0.8847, rel=1e-6
    )
    assert "python" in python_profile.summary().lower()



def test_language_model_recommendation_order() -> None:
    python_profile = LanguageProfile(
        name="Python",
        family="Multi-paradigm",
        runtime="cpython",
        typing="dynamic",
        capabilities=(
            LanguageCapability(
                domain="Data",
                proficiency=0.9,
                maturity=0.82,
                ecosystem=0.88,
            ),
        ),
        community_health=0.9,
        interoperability=0.85,
        stability=0.8,
        release_velocity=0.84,
    )
    ruby_profile = LanguageProfile(
        name="Ruby",
        family="Multi-paradigm",
        runtime="mri",
        typing="dynamic",
        capabilities=(
            LanguageCapability(
                domain="Data",
                proficiency=0.65,
                maturity=0.7,
                ecosystem=0.72,
            ),
        ),
        community_health=0.75,
        interoperability=0.7,
        stability=0.68,
        release_velocity=0.66,
    )

    model = DynamicLanguageModel((python_profile, ruby_profile))
    recommendations = model.recommend("data")

    assert recommendations[0][0].name == "Python"
    assert recommendations[0][1] > recommendations[1][1]



def test_engine_recommendations_include_rationale() -> None:
    engine = DynamicLanguageEngine()
    engine.register_languages(
        [
            {
                "name": "Python",
                "family": "Multi-paradigm",
                "runtime": "cpython",
                "typing": "dynamic",
                "capabilities": [
                    {
                        "domain": "Data",
                        "proficiency": 0.9,
                        "maturity": 0.84,
                        "ecosystem": 0.88,
                    }
                ],
                "community_health": 0.92,
                "interoperability": 0.85,
                "stability": 0.81,
                "release_velocity": 0.8,
                "strengths": ("Library ecosystem",),
                "cautions": ("Runtime performance",),
            }
        ]
    )

    assessments = engine.recommend("Data Engineering", limit=1)

    assert len(assessments) == 1
    assessment = assessments[0]
    assert assessment.language.name == "Python"
    assert assessment.rationale
    assert assessment.as_dict()["language"] == "Python"



def test_dynamic_engines_compatibility_shim() -> None:
    assert LegacyLanguageEngine is DynamicLanguageEngine


def test_model_refine_language_back_to_back() -> None:
    base_profile = LanguageProfile(
        name="Python",
        family="Multi-paradigm",
        runtime="cpython",
        typing="dynamic",
        capabilities=(
            LanguageCapability(
                domain="Automation",
                proficiency=0.88,
                maturity=0.82,
                ecosystem=0.86,
            ),
        ),
        primary_use_cases=("Automation",),
        strengths=("Readable syntax",),
        cautions=(),
        metadata={"created": "2024-Q1"},
        community_health=0.9,
        interoperability=0.84,
        stability=0.8,
        release_velocity=0.79,
    )

    model = DynamicLanguageModel((base_profile,))

    first_refinement = model.refine_language(
        "Python",
        extend_capabilities=(
            {
                "domain": "Machine Learning",
                "proficiency": 0.91,
                "maturity": 0.87,
                "ecosystem": 0.9,
            },
        ),
        extend_strengths=("Extensive ML tooling",),
        metadata_updates={"last_reviewed": "2024-Q4"},
    )

    assert {
        capability.domain for capability in first_refinement.capabilities
    } == {"automation", "machine learning"}
    assert "Extensive ML tooling" in first_refinement.strengths
    assert first_refinement.metadata == {
        "created": "2024-Q1",
        "last_reviewed": "2024-Q4",
    }

    second_refinement = model.refine_language(
        "Python",
        overrides={"release_velocity": 0.88},
        extend_use_cases=("MLOps",),
        extend_cautions=("Requires dependency management",),
    )

    assert second_refinement.release_velocity == pytest.approx(0.88, rel=1e-6)
    assert any(
        use_case.lower() == "mlops" for use_case in second_refinement.primary_use_cases
    )
    assert "Requires dependency management" in second_refinement.cautions
    assert {
        capability.domain for capability in second_refinement.capabilities
    } == {"automation", "machine learning"}
    assert second_refinement.metadata == {
        "created": "2024-Q1",
        "last_reviewed": "2024-Q4",
    }
