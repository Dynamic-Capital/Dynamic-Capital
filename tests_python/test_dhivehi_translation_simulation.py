"""Tests for the Dhivehi translation simulation helpers."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_translation import simulate_dhivehi_translation  # noqa: E402  - path mutation for tests


def test_simulated_translation_prefers_memory_segment() -> None:
    result = simulate_dhivehi_translation("ބާވަތް ބަލާލުން.", domain="banking")

    assert result.translated_text == "Review the account balance."
    assert result.applied_memory is not None
    assert result.applied_memory.domain == "banking"
    assert any(
        entry.source_term == "account balance" for entry in result.glossary_terms
    )
    assert (
        "Ensure terminology aligns with the banking domain." in result.post_edit_instructions
    )


def test_simulated_translation_uses_fallback_machine_output() -> None:
    result = simulate_dhivehi_translation("ކާމިޔާބު ކުރިން", domain="operations")

    assert result.applied_memory is None
    assert result.translated_text == "Successful completion."
    assert any(
        instruction.startswith("Perform human review")
        for instruction in result.post_edit_instructions
    )
