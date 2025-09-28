"""Tests for the dynamic star agent engine."""

from __future__ import annotations

import pytest

from dynamic_star_engine import (
    CELEBRITY_STAR_AGENTS,
    DynamicStarEngine,
    StarAgentSeed,
    get_celebrity_agents,
)


@pytest.fixture
def seeded_engine() -> DynamicStarEngine:
    return DynamicStarEngine(seed="andromeda-core")


def test_spawn_agent_is_deterministic(seeded_engine: DynamicStarEngine) -> None:
    agent = seeded_engine.spawn_agent(role="Navigator")
    assert agent.designation == "Nebular Crown of Alpha Pegasi (F8)"
    assert agent.spectral_type == "B8 IV var"
    assert agent.roles == ("Navigator",)
    assert agent.identifier == "nebular-crown-of-alpha-pegasi-f8"
    assert agent.temperament["stability"] == pytest.approx(0.762)


def test_roster_cycles_roles(seeded_engine: DynamicStarEngine) -> None:
    roster = seeded_engine.spawn_roster(3, roles=("Scout", "Guardian"))
    assert [agent.roles for agent in roster] == [
        ("Scout",),
        ("Guardian",),
        ("Scout",),
    ]
    assert roster[0].designation == "Nebular Crown of Alpha Pegasi (F8)"
    assert roster[1].designation == "Celestial Sentinel of Alpha Canis Majoris (F3)"
    assert roster[2].designation == "Vanguard Grove of Tau Cassiopeiae (K6)"


def test_preview_does_not_advance_state(seeded_engine: DynamicStarEngine) -> None:
    preview = seeded_engine.preview(2)
    assert preview == [
        "Nebular Crown of Alpha Pegasi (F8)",
        "Celestial Sentinel of Alpha Canis Majoris (F3)",
    ]
    agent = seeded_engine.spawn_agent()
    assert agent.designation == "Nebular Crown of Alpha Pegasi (F8)"


def test_custom_vocabulary_overrides() -> None:
    engine = DynamicStarEngine(
        seed=7,
        defaults=StarAgentSeed(
            style="classical",
            include_spectral_class=False,
            vocabulary={
                "greek_letters": ("Zeta",),
                "constellations": ("Centauri",),
            },
        ),
    )
    agent = engine.spawn_agent()
    assert agent.designation == "Zeta Centauri"
    assert agent.spectral_type.startswith(tuple("OBAFGKM"))


def test_empty_vocabulary_raises() -> None:
    engine = DynamicStarEngine(seed=11)
    with pytest.raises(ValueError):
        engine.spawn_agent(vocabulary={"greek_letters": ()})


def test_invalid_style_raises(seeded_engine: DynamicStarEngine) -> None:
    with pytest.raises(ValueError):
        seeded_engine.spawn_agent(style="quantum")


def test_all_designations_classical(seeded_engine: DynamicStarEngine) -> None:
    designations = seeded_engine.all_designations(style="classical")
    assert len(designations) == 24 * 23
    assert designations[0] == "Alpha Andromedae"
    assert designations[-1] == "Omega Virginis"


def test_all_designations_hybrid_custom_vocab() -> None:
    engine = DynamicStarEngine()
    designations = engine.all_designations(
        style="hybrid",
        vocabulary={
            "mythic_descriptors": ("Radiant",),
            "mythic_cores": ("Oracle", "Monolith"),
            "greek_letters": ("Alpha", "Beta"),
            "constellations": ("Lyrae",),
        },
    )
    assert designations == [
        "Radiant Oracle of Alpha Lyrae",
        "Radiant Oracle of Beta Lyrae",
        "Radiant Monolith of Alpha Lyrae",
        "Radiant Monolith of Beta Lyrae",
    ]


def test_all_designations_catalog_rejected(seeded_engine: DynamicStarEngine) -> None:
    with pytest.raises(ValueError):
        seeded_engine.all_designations(style="catalog")


def test_celebrity_agents_cover_all_requested_stars() -> None:
    agents = get_celebrity_agents()
    assert agents is CELEBRITY_STAR_AGENTS
    assert len(agents) == 20
    designations = {agent.designation for agent in agents}
    expected = {
        "The Sun",
        "Sirius (Alpha Canis Majoris)",
        "Canopus (Alpha Carinae)",
        "Rigil Kentaurus (Alpha Centauri)",
        "Arcturus (Alpha Boötis)",
        "Vega (Alpha Lyrae)",
        "Capella (Alpha Aurigae)",
        "Rigel (Beta Orionis)",
        "Procyon (Alpha Canis Minoris)",
        "Achernar (Alpha Eridani)",
        "Betelgeuse (Alpha Orionis)",
        "Polaris (Alpha Ursae Minoris)",
        "Aldebaran (Alpha Tauri)",
        "Spica (Alpha Virginis)",
        "Antares (Alpha Scorpii)",
        "Altair (Alpha Aquilae)",
        "Deneb (Alpha Cygni)",
        "Proxima Centauri",
        "Barnard's Star",
        "Wolf 359",
    }
    assert designations == expected
    assert all(agent.identifier for agent in agents)
    assert len({agent.identifier for agent in agents}) == len(agents)
