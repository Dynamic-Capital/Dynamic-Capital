from __future__ import annotations

import pytest

from dynamic_playbook import (
    DEFAULT_DYNAMIC_AGS_ENTRIES,
    build_dynamic_ags_playbook,
)


def test_build_dynamic_ags_playbook_payload() -> None:
    payload = build_dynamic_ags_playbook()

    blueprint = payload["blueprint"]
    entries = payload["entries"]

    assert payload["language"] == "en"
    assert set(payload["supported_languages"]) == {"en", "dv"}
    assert blueprint["language"] == "en"
    assert set(blueprint["supported_languages"]) == {"en", "dv"}
    assert blueprint["mission_summary"].startswith(
        "Dynamic AGS Multi-Agent Governance Launch"
    )
    assert blueprint["total_entries"] == len(entries) == len(
        DEFAULT_DYNAMIC_AGS_ENTRIES
    )
    assert {entry["title"] for entry in entries} >= {
        "Establish AGS Governance Council",
        "Wire Task DAG Orchestrator",
        "Conduct Integrated Simulation",
    }

    policies_entry = next(
        entry for entry in entries if entry["title"] == "Codify Risk & Approval Policies"
    )
    assert policies_entry["metadata"]["risk_tiers"]["T3"] == [
        "TRADE",
        "PAYMENT",
        "WITHDRAWAL",
    ]
    assert "dry_run_required" in policies_entry["metadata"]["approvals"]["T3"]
    assert {entry["language"] for entry in entries} == {"en"}


@pytest.mark.parametrize("cadence", ["Bi-weekly council sync", "Daily ops review"])
def test_context_overrides_respected(cadence: str) -> None:
    payload = build_dynamic_ags_playbook(context_overrides={"cadence": cadence})

    assert payload["blueprint"]["mission_summary"].endswith(f"({cadence})")


def test_additional_entries_extend_catalogue() -> None:
    extra_entry = {
        "title": "Stand Up Sandbox Environment",
        "objective": "Mirror production agents for experimentation without impacting live flows.",
        "stage": "Enablement",
        "readiness": 0.28,
        "automation": 0.48,
        "risk": 0.41,
        "weight": 0.8,
        "tags": ("sandbox", "testing"),
    }

    payload = build_dynamic_ags_playbook(additional_entries=[extra_entry])

    assert payload["blueprint"]["total_entries"] == len(DEFAULT_DYNAMIC_AGS_ENTRIES) + 1
    titles = {entry["title"] for entry in payload["entries"]}
    assert "Stand Up Sandbox Environment" in titles


def test_build_dynamic_ags_playbook_language_dhivehi() -> None:
    payload = build_dynamic_ags_playbook(language="dv")

    assert payload["language"] == "dv"
    assert payload["blueprint"]["language"] == "dv"
    assert set(payload["supported_languages"]) == {"en", "dv"}
    assert {entry["language"] for entry in payload["entries"]} == {"dv"}

