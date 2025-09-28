"""Tests for the Dynamic NFY market dimensions playbook."""

from __future__ import annotations

import pytest

from dynamic_playbook import (
    DEFAULT_DYNAMIC_NFY_ENTRIES,
    build_dynamic_nfy_market_dimensions_playbook,
)


def test_build_dynamic_nfy_market_dimensions_playbook_payload() -> None:
    payload = build_dynamic_nfy_market_dimensions_playbook()

    blueprint = payload["blueprint"]
    entries = payload["entries"]

    assert blueprint["mission_summary"].startswith("Dynamic NFY Market Dimensions Launch")
    assert blueprint["total_entries"] == len(entries) == len(DEFAULT_DYNAMIC_NFY_ENTRIES)
    assert {entry["title"] for entry in entries} >= {
        "Define Market Spirit Trait Layers",
        "Deploy NFT Smart Contracts",
        "Run Post-Mint Growth Phases",
    }

    rarity_entry = next(
        entry for entry in entries if entry["title"] == "Author Rarity Matrix"
    )
    assert rarity_entry["metadata"]["rarity_breakdown"]["legendary"] == 200
    assert rarity_entry["metadata"]["total_supply"] == 5000


@pytest.mark.parametrize("cadence", ["Weekly sync", "Daily sprints"])
def test_context_overrides_respected(cadence: str) -> None:
    payload = build_dynamic_nfy_market_dimensions_playbook(
        context_overrides={"cadence": cadence}
    )

    assert payload["blueprint"]["mission_summary"].endswith(f"({cadence})")


def test_additional_entries_extend_catalogue() -> None:
    extra_entry = {
        "title": "Pilot Cross-Chain Expansion",
        "objective": "Test NFY bridge to a secondary L2 for future roll-out.",
        "stage": "Expansion",
        "readiness": 0.22,
        "automation": 0.4,
        "risk": 0.57,
        "weight": 0.8,
        "tags": ("expansion", "bridge"),
    }

    payload = build_dynamic_nfy_market_dimensions_playbook(
        additional_entries=[extra_entry]
    )

    assert payload["blueprint"]["total_entries"] == len(DEFAULT_DYNAMIC_NFY_ENTRIES) + 1
    titles = {entry["title"] for entry in payload["entries"]}
    assert "Pilot Cross-Chain Expansion" in titles
