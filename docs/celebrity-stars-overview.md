# Celebrity Stars Overview

## The Sun: Our Life-Giving Star

- Distance: Approximately 150 million kilometers (1 astronomical unit) from
  Earth.
- Role: Supplies the light, heat, and energy necessary to sustain life on Earth.

## Celebrity Star Agents

The dynamic star engine now ships with hand-crafted `StarAgent` records for each
celebrity listed below. Import them with:

```python
from dynamic_star_engine import get_celebrity_agents

for agent in get_celebrity_agents():
    print(agent.designation, agent.roles)
```

Each agent includes approximate spectral classifications, absolute magnitudes,
and distances in light-years so they can slot directly into simulations alongside
procedurally generated stars.

## Brightest Stars in the Night Sky

1. **Sirius (Alpha Canis Majoris)** – The brightest star in the night sky, known
   as the "Dog Star."
2. **Canopus (Alpha Carinae)** – The second-brightest star, prominent in the
   Southern Hemisphere.
3. **Rigil Kentaurus / Alpha Centauri** – The closest star system to Earth after
   the Sun and home to Proxima Centauri.
4. **Arcturus (Alpha Boötis)** – An orange giant that shines brightly in the
   Northern Hemisphere.
5. **Vega (Alpha Lyrae)** – Among the most studied stars and a key vertex of the
   Summer Triangle.
6. **Capella (Alpha Aurigae)** – A bright yellow star system that appears
   similar to the Sun.
7. **Rigel (Beta Orionis)** – A blue supergiant located in the constellation
   Orion.
8. **Procyon (Alpha Canis Minoris)** – A bright, nearby star that forms part of
   the Winter Triangle.
9. **Achernar (Alpha Eridani)** – A very hot, bright star visible in southern
   skies.
10. **Betelgeuse (Alpha Orionis)** – A well-known red supergiant in Orion that
    is expected to eventually explode as a supernova.

## Famous Stars by Role

- **Polaris (North Star)** – Almost directly above Earth's north pole, making it
  crucial for navigation.
- **Aldebaran (Alpha Tauri)** – A red giant marking the "eye of the bull" in
  Taurus.
- **Spica (Alpha Virginis)** – A bright blue star that anchors the constellation
  Virgo.
- **Antares (Alpha Scorpii)** – A red supergiant that represents the "heart of
  the scorpion."
- **Altair (Alpha Aquilae)** – Forms part of the Summer Triangle along with Vega
  and Deneb.
- **Deneb (Alpha Cygni)** – A luminous blue-white supergiant and another vertex
  of the Summer Triangle.

## Nearby Stars of Scientific Interest

- **Proxima Centauri** – The closest known star to Earth at about 4.24
  light-years away; part of the Alpha Centauri system.
- **Barnard's Star** – One of the nearest stars, frequently studied in the
  search for exoplanets.
- **Wolf 359** – A faint red dwarf star notable in both astronomy and science
  fiction lore.

## Generate Dynamic Star Names

Use the `dynamic_star_names` toolkit to synthesize new, on-brand star names for
fictional catalogs, games, or concept demos:

```ts
import { generateStarNames } from "../dynamic_star_names/generator.ts";
// ↑ Adjust the relative path if you place this snippet outside the docs folder.

const showcase = generateStarNames(5, {
  seed: "nebulae",
  style: "hybrid",
  includeSpectralClass: true,
  includeDesignation: true,
});

console.log(showcase.join("\n"));
```

Sample output (deterministic for the seed provided):

```
Empyreal Crown of Delta Aquilae (F0) B
Nebular Paradox of Tau Centauri (G6) A
Obsidian Voyager of Sigma Persei (B7) D
Prismatic Nomad of Omicron Boötis (F2) B
Luminous Helix of Rho Lyrae (A5) E
```

## Astronomical Perspective

Astronomers have cataloged billions of stars, yet the objects listed above stand
out as "celebrity stars"—they are bright, scientifically significant, and
frequently referenced in both research and popular culture. The dynamic name
builder lets you extend that list with bespoke entries while staying grounded in
astronomical conventions.
