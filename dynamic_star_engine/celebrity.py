"""Predefined agents representing well-known real-world stars."""

from __future__ import annotations

from typing import Iterable, Mapping, Sequence

from .agents import StarAgent

__all__ = ["CELEBRITY_STAR_AGENTS", "get_celebrity_agents"]


def _slugify(name: str) -> str:
    slug: list[str] = []
    last_dash = False
    for char in name.lower():
        if char.isalnum():
            slug.append(char)
            last_dash = False
        elif char in {" ", "-"}:
            if not last_dash and slug:
                slug.append("-")
                last_dash = True
        else:
            last_dash = False
            continue
    return "".join(slug).strip("-")


def _build_agent(
    *,
    name: str,
    designation: str,
    spectral_type: str,
    absolute_magnitude: float,
    distance_ly: float,
    roles: Sequence[str],
    tags: Sequence[str],
    metadata: Mapping[str, object],
) -> StarAgent:
    identifier = _slugify(name)
    return StarAgent(
        identifier=identifier,
        designation=designation,
        spectral_type=spectral_type,
        absolute_magnitude=absolute_magnitude,
        distance_ly=distance_ly,
        roles=tuple(roles),
        tags=tuple(tags),
        metadata=dict(metadata),
    )


def _agents() -> Iterable[StarAgent]:
    yield _build_agent(
        name="The Sun",
        designation="The Sun",
        spectral_type="G2V",
        absolute_magnitude=4.83,
        distance_ly=1.5813e-5,
        roles=["Life-Giving Star"],
        tags=["sol", "celebrity"],
        metadata={
            "distance_km": 150_000_000,
            "description": "Our home star providing the light and heat required for life on Earth.",
        },
    )
    yield _build_agent(
        name="Sirius",
        designation="Sirius (Alpha Canis Majoris)",
        spectral_type="A1V",
        absolute_magnitude=1.42,
        distance_ly=8.6,
        roles=["Brightest Night Sky Star"],
        tags=["brightest", "dog-star"],
        metadata={"notable_for": "Brightest star visible from Earth."},
    )
    yield _build_agent(
        name="Canopus",
        designation="Canopus (Alpha Carinae)",
        spectral_type="A9II",
        absolute_magnitude=-5.53,
        distance_ly=310.0,
        roles=["Brightest Night Sky Star"],
        tags=["southern", "navigation"],
        metadata={"notable_for": "Second-brightest star, dominant in the southern sky."},
    )
    yield _build_agent(
        name="Rigil Kentaurus",
        designation="Rigil Kentaurus (Alpha Centauri)",
        spectral_type="G2V + K1V",
        absolute_magnitude=4.38,
        distance_ly=4.37,
        roles=["Brightest Night Sky Star", "Nearby System"],
        tags=["alpha-centauri", "binary"],
        metadata={"notable_for": "Closest star system to Earth after the Sun."},
    )
    yield _build_agent(
        name="Arcturus",
        designation="Arcturus (Alpha Boötis)",
        spectral_type="K1.5III",
        absolute_magnitude=-0.30,
        distance_ly=36.7,
        roles=["Brightest Night Sky Star"],
        tags=["northern", "orange-giant"],
        metadata={"notable_for": "Luminous orange giant visible in the northern hemisphere."},
    )
    yield _build_agent(
        name="Vega",
        designation="Vega (Alpha Lyrae)",
        spectral_type="A0V",
        absolute_magnitude=0.58,
        distance_ly=25.0,
        roles=["Brightest Night Sky Star", "Summer Triangle"],
        tags=["lyra", "benchmark"],
        metadata={"notable_for": "Well-studied reference star and part of the Summer Triangle."},
    )
    yield _build_agent(
        name="Capella",
        designation="Capella (Alpha Aurigae)",
        spectral_type="G5III + G0III",
        absolute_magnitude=0.37,
        distance_ly=42.9,
        roles=["Brightest Night Sky Star"],
        tags=["binary", "northern"],
        metadata={"notable_for": "Yellow giant pair resembling a brighter version of the Sun."},
    )
    yield _build_agent(
        name="Rigel",
        designation="Rigel (Beta Orionis)",
        spectral_type="B8Ia",
        absolute_magnitude=-6.69,
        distance_ly=860.0,
        roles=["Brightest Night Sky Star"],
        tags=["blue-supergiant", "orion"],
        metadata={"notable_for": "Blue supergiant anchoring the constellation Orion."},
    )
    yield _build_agent(
        name="Procyon",
        designation="Procyon (Alpha Canis Minoris)",
        spectral_type="F5IV-V",
        absolute_magnitude=2.66,
        distance_ly=11.46,
        roles=["Brightest Night Sky Star"],
        tags=["nearby", "winter-triangle"],
        metadata={"notable_for": "Bright nearby star forming the Winter Triangle."},
    )
    yield _build_agent(
        name="Achernar",
        designation="Achernar (Alpha Eridani)",
        spectral_type="B6Vep",
        absolute_magnitude=-2.77,
        distance_ly=139.0,
        roles=["Brightest Night Sky Star"],
        tags=["southern", "rapid-rotator"],
        metadata={"notable_for": "Rapidly rotating, extremely hot star in the southern sky."},
    )
    yield _build_agent(
        name="Betelgeuse",
        designation="Betelgeuse (Alpha Orionis)",
        spectral_type="M1-2Ia-Iab",
        absolute_magnitude=-5.85,
        distance_ly=548.0,
        roles=["Brightest Night Sky Star", "Supernova Progenitor"],
        tags=["red-supergiant", "variable"],
        metadata={"notable_for": "Variable red supergiant expected to end in a supernova."},
    )
    yield _build_agent(
        name="Polaris",
        designation="Polaris (Alpha Ursae Minoris)",
        spectral_type="F7Ib",
        absolute_magnitude=-3.64,
        distance_ly=433.0,
        roles=["Navigational Star"],
        tags=["north-star", "cepheid"],
        metadata={"notable_for": "North Star positioned nearly above Earth's north pole."},
    )
    yield _build_agent(
        name="Aldebaran",
        designation="Aldebaran (Alpha Tauri)",
        spectral_type="K5III",
        absolute_magnitude=-0.63,
        distance_ly=65.3,
        roles=["Navigational Star"],
        tags=["taurus", "red-giant"],
        metadata={"notable_for": "Marks the eye of Taurus in the night sky."},
    )
    yield _build_agent(
        name="Spica",
        designation="Spica (Alpha Virginis)",
        spectral_type="B1III-IV",
        absolute_magnitude=-3.55,
        distance_ly=250.0,
        roles=["Navigational Star"],
        tags=["virgo", "binary"],
        metadata={"notable_for": "Blue double star forming the anchor of Virgo."},
    )
    yield _build_agent(
        name="Antares",
        designation="Antares (Alpha Scorpii)",
        spectral_type="M1.5Iab-Ib",
        absolute_magnitude=-5.28,
        distance_ly=554.0,
        roles=["Navigational Star", "Supernova Progenitor"],
        tags=["red-supergiant", "scorpius"],
        metadata={"notable_for": "Red supergiant forming the heart of Scorpius."},
    )
    yield _build_agent(
        name="Altair",
        designation="Altair (Alpha Aquilae)",
        spectral_type="A7V",
        absolute_magnitude=2.21,
        distance_ly=16.7,
        roles=["Navigational Star", "Summer Triangle"],
        tags=["aquila", "rapid-rotator"],
        metadata={"notable_for": "Forms the Summer Triangle with Vega and Deneb."},
    )
    yield _build_agent(
        name="Deneb",
        designation="Deneb (Alpha Cygni)",
        spectral_type="A2Ia",
        absolute_magnitude=-7.20,
        distance_ly=2615.0,
        roles=["Navigational Star", "Summer Triangle"],
        tags=["cygnus", "blue-supergiant"],
        metadata={"notable_for": "Luminous blue-white supergiant completing the Summer Triangle."},
    )
    yield _build_agent(
        name="Proxima Centauri",
        designation="Proxima Centauri",
        spectral_type="M5.5Ve",
        absolute_magnitude=15.53,
        distance_ly=4.24,
        roles=["Nearby System"],
        tags=["alpha-centauri", "red-dwarf"],
        metadata={"notable_for": "Closest star to the Sun and a prime exoplanet target."},
    )
    yield _build_agent(
        name="Barnard's Star",
        designation="Barnard's Star",
        spectral_type="M4Ve",
        absolute_magnitude=13.24,
        distance_ly=5.96,
        roles=["Nearby System"],
        tags=["red-dwarf", "high-proper-motion"],
        metadata={"notable_for": "Nearby red dwarf famed for its high proper motion."},
    )
    yield _build_agent(
        name="Wolf 359",
        designation="Wolf 359",
        spectral_type="M6Ve",
        absolute_magnitude=16.65,
        distance_ly=7.86,
        roles=["Nearby System"],
        tags=["red-dwarf", "faint"],
        metadata={"notable_for": "Dim red dwarf of interest to astronomers and science fiction."},
    )


CELEBRITY_STAR_AGENTS: tuple[StarAgent, ...] = tuple(_agents())


def get_celebrity_agents() -> tuple[StarAgent, ...]:
    """Return the immutable roster of celebrity star agents."""

    return CELEBRITY_STAR_AGENTS

