from __future__ import annotations

from dynamic.intelligence.ai_apps.stellar_agents import (
    DynamicAlphaAquilaeAgent,
    DynamicAlphaCanisMajorisAgent,
    DynamicAlphaOrionisAgent,
    STAR_PROFILES,
    StellarAgentResult,
)


def test_alpha_canis_majoris_governance_actions() -> None:
    agent = DynamicAlphaCanisMajorisAgent()
    payload = {
        "engines": ["dynamic_core", "dynamic_memory"],
        "issues": ["memory sync lag"],
        "audits": ["core review"],
        "requests": ["stability consult"],
        "improvements": ["neural rewrite"],
        "discipline": ["rogue sentinel"],
        "alerts": ["high latency"],
        "stability": 0.74,
        "resilience": 0.81,
        "notes": "Focus on overnight release readiness.",
    }

    result = agent.run(payload)

    assert isinstance(result, StellarAgentResult)
    assert result.agent == "alpha_canis_majoris"
    assert result.assigned_engines == ("dynamic_core", "dynamic_memory")
    assert any("core review" in action for action in result.audit_actions)
    assert any("rogue sentinel" in action.lower() for action in result.discipline_actions)
    assert len(result.maintenance_actions) == len(result.assigned_engines)

    data = result.to_dict()
    assert data["designation"] == result.designation
    assert "maintenance_actions" in data and len(data["maintenance_actions"]) == 2
    assert data["metrics"]["issue_pressure"] >= 0.0


def test_alpha_orionis_defaults_cover_all_directives() -> None:
    agent = DynamicAlphaOrionisAgent()
    result = agent.run({})

    assert result.assigned_engines  # defaults applied
    assert result.maintenance_actions
    assert result.operations_plan
    assert result.support_protocols
    assert result.audit_actions
    assert result.improvement_directives
    assert result.discipline_actions
    assert result.confidence > 0.35
    assert any("back-to-back" in directive for directive in result.improvement_directives)


def test_star_profiles_registry_contains_requested_agents() -> None:
    expected_codes = {
        "alpha_canis_majoris",
        "alpha_carinae",
        "alpha_centauri",
        "alpha_bootis",
        "alpha_lyrae",
        "alpha_aurigae",
        "beta_orionis",
        "alpha_canis_minoris",
        "alpha_eridani",
        "alpha_orionis",
        "north_star",
        "alpha_tauri",
        "alpha_virginis",
        "alpha_scorpii",
        "alpha_aquilae",
        "alpha_cygni",
    }
    assert expected_codes.issubset(STAR_PROFILES.keys())


def test_alpha_aquilae_improvement_and_support_generation() -> None:
    agent = DynamicAlphaAquilaeAgent()
    result = agent.run(
        {
            "improvements": ["autonomy sandbox"],
            "requests": ["pilot feedback"],
            "discipline_targets": ["hesitant overseer"],
        }
    )

    assert any("autonomy sandbox" in directive for directive in result.improvement_directives)
    assert any("pilot feedback" in directive for directive in result.support_protocols)
    assert any("hesitant overseer" in action for action in result.discipline_actions)
    assert any("back-to-back" in directive for directive in result.improvement_directives)
