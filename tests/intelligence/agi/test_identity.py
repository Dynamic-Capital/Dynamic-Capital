"""Tests for the Dynamic AGI identity metadata."""

from dynamic.intelligence.agi import (
    DYNAMIC_AGI_EXPANSION,
    DynamicAGIIdentity,
    DynamicAGIModel,
)


def test_identity_metadata_is_canonical() -> None:
    model = DynamicAGIModel()
    identity = model.identity

    assert isinstance(identity, DynamicAGIIdentity)
    assert identity.acronym == "Dynamic AGI"
    assert identity.expansion == DYNAMIC_AGI_EXPANSION
    assert identity.pillars == (
        "Driving Yield of New Advancements in Minds",
        "Intelligence & Creation",
        "Adapting Global Intelligence",
    )

    payload = identity.as_dict()
    assert payload["acronym"] == "Dynamic AGI"
    assert payload["expansion"] == DYNAMIC_AGI_EXPANSION
    assert payload["pillars"] == list(identity.pillars)
