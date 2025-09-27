import {
  assertEquals,
  assertMatch,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  generateAllStarNames,
  generateStarName,
  generateStarNames,
} from "./generator.ts";

Deno.test("deterministic output for seeded generator", () => {
  const first = generateStarName({
    seed: "mentor",
    includeSpectralClass: true,
    includeDesignation: true,
  });
  const second = generateStarName({
    seed: "mentor",
    includeSpectralClass: true,
    includeDesignation: true,
  });
  assertEquals(first, second);
  assertMatch(first, /\(.*\) [A-E]$/);
});

Deno.test("bulk generation produces unique-looking catalogue", () => {
  const names = generateStarNames(5, {
    seed: 42,
    style: "hybrid",
    includeSpectralClass: true,
  });
  assertEquals(names, [
    "Resonant Sentinel of Beta Sagittarii (B2)",
    "Chrono Nomad of Iota Carinae (G5)",
    "Auroral Lattice of Eta Centauri (O7)",
    "Empyreal Crown of Gamma Cygni (K6)",
    "Solar Pulse of Mu Aquilae (G6)",
  ]);
});

Deno.test("custom vocabulary overrides default lexicon", () => {
  const names = generateStarNames(3, {
    seed: "custom",
    vocabulary: {
      mythicDescriptors: ["Crimson"],
      mythicCores: ["Hydra", "Hydra"],
      constellations: ["Hydrae"],
      greekLetters: ["Zeta"],
    },
  });

  names.forEach((name) => {
    assertMatch(name, /Crimson Hydra/);
    assertMatch(name, /Hydrae/);
  });
});

Deno.test("empty vocabulary overrides raise", () => {
  assertThrows(
    () =>
      generateStarName({
        seed: 99,
        vocabulary: {
          greekLetters: [] as string[],
        },
      }),
    Error,
    "vocabulary.greekLetters must not be empty",
  );
});

Deno.test("enumerating classical names returns full catalog", () => {
  const names = generateAllStarNames({ style: "classical" });
  assertEquals(names.length, 24 * 23);
  assertEquals(names[0], "Alpha Andromedae");
  assertEquals(names.at(-1), "Omega Virginis");
});

Deno.test("hybrid enumeration respects custom vocabulary", () => {
  const names = generateAllStarNames({
    style: "hybrid",
    vocabulary: {
      mythicDescriptors: ["Radiant"],
      mythicCores: ["Oracle", "Monolith"],
      greekLetters: ["Alpha", "Beta"],
      constellations: ["Lyrae"],
    },
  });

  assertEquals(names, [
    "Radiant Oracle of Alpha Lyrae",
    "Radiant Oracle of Beta Lyrae",
    "Radiant Monolith of Alpha Lyrae",
    "Radiant Monolith of Beta Lyrae",
  ]);
});

Deno.test("catalog enumeration rejects request", () => {
  assertThrows(
    () => generateAllStarNames({ style: "catalog" }),
    Error,
    "catalog designations cannot be enumerated exhaustively",
  );
});
