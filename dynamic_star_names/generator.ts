export type StarNameStyle = "classical" | "mythic" | "catalog" | "hybrid";

export interface StarNameOptions {
  /**
   * Seed to deterministically generate a sequence of names. Accepts numbers or
   * strings so calling code can derive a seed from user input. When omitted the
   * generator falls back to a time-based seed for additional entropy.
   */
  seed?: number | string;
  /**
   * Strategy used to construct the base star designation.
   */
  style?: StarNameStyle;
  /**
   * Append a spectral class code (e.g. `G2`) to the generated name.
   */
  includeSpectralClass?: boolean;
  /**
   * Append a simple companion designation (A, B, C) to illustrate multi-star systems.
   */
  includeDesignation?: boolean;
  /**
   * Override the stock vocabularies with custom arrays.
   */
  vocabulary?: Partial<typeof DEFAULT_VOCABULARY>;
}

const DEFAULT_VOCABULARY = {
  greekLetters: [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Iota",
    "Kappa",
    "Lambda",
    "Mu",
    "Nu",
    "Xi",
    "Omicron",
    "Pi",
    "Rho",
    "Sigma",
    "Tau",
    "Upsilon",
    "Phi",
    "Chi",
    "Psi",
    "Omega",
  ],
  constellations: [
    "Andromedae",
    "Aquilae",
    "Aurigae",
    "Boötis",
    "Canis Majoris",
    "Carinae",
    "Cassiopeiae",
    "Centauri",
    "Cygni",
    "Draconis",
    "Eridani",
    "Geminorum",
    "Leonis",
    "Lyrae",
    "Orionis",
    "Pegasi",
    "Persei",
    "Sagittarii",
    "Scorpii",
    "Tauri",
    "Ursae Majoris",
    "Ursae Minoris",
    "Virginis",
  ],
  mythicDescriptors: [
    "Luminous",
    "Radiant",
    "Arcane",
    "Celestial",
    "Wandering",
    "Eternal",
    "Glacial",
    "Solar",
    "Nebular",
    "Verdant",
    "Harmonic",
    "Resonant",
    "Empyreal",
    "Obsidian",
    "Auroral",
    "Chrono",
    "Stellar",
    "Prismatic",
    "Vanguard",
    "Aether",
  ],
  mythicCores: [
    "Phoenix",
    "Drake",
    "Oracle",
    "Nomad",
    "Sentinel",
    "Aegis",
    "Lyric",
    "Crown",
    "Harbinger",
    "Grove",
    "Lattice",
    "Paradox",
    "Spire",
    "Monolith",
    "Echo",
    "Harmony",
    "Pulse",
    "Voyager",
    "Helix",
    "Beacon",
  ],
  catalogPrefixes: ["HD", "HR", "HIP", "BD", "SAO", "TYC", "Gaia"],
  spectralClasses: ["O", "B", "A", "F", "G", "K", "M"],
  designations: ["A", "B", "C", "D", "E"],
};

export function generateStarName(options: StarNameOptions = {}): string {
  const {
    seed,
    style = "hybrid",
    includeSpectralClass = false,
    includeDesignation = false,
    vocabulary,
  } = options;

  const vocab = mergeVocabulary(vocabulary);
  const rng = createRng(seed);

  const baseName = style === "classical"
    ? createClassicalName(rng, vocab)
    : style === "mythic"
    ? createMythicName(rng, vocab)
    : style === "catalog"
    ? createCatalogName(rng, vocab)
    : createHybridName(rng, vocab);

  const segments = [baseName];

  if (includeSpectralClass) {
    const spectral = pick(vocab.spectralClasses, rng);
    const subclass = Math.floor(rng() * 10);
    segments.push(`(${spectral}${subclass})`);
  }

  if (includeDesignation) {
    segments.push(pick(vocab.designations, rng));
  }

  return segments.join(" ");
}

export function generateStarNames(
  count: number,
  options: StarNameOptions = {},
): string[] {
  if (!Number.isFinite(count) || count <= 0) {
    throw new RangeError("count must be a positive finite number");
  }

  const names: string[] = [];
  // Chain the seed to produce distinct names without requiring callers to
  // manage offsets manually.
  for (let index = 0; index < Math.floor(count); index += 1) {
    const chainedSeed = options.seed != null
      ? `${options.seed}:${index}`
      : undefined;
    names.push(
      generateStarName({
        ...options,
        seed: chainedSeed,
      }),
    );
  }

  return names;
}

export function generateAllStarNames(
  options: Pick<StarNameOptions, "style" | "vocabulary"> = {},
): string[] {
  const { style = "hybrid", vocabulary } = options;
  const vocab = mergeVocabulary(vocabulary);

  if (style === "classical") {
    return enumerateClassical(vocab);
  }

  if (style === "mythic") {
    return enumerateMythic(vocab);
  }

  if (style === "hybrid") {
    return enumerateHybrid(vocab);
  }

  throw new Error("catalog designations cannot be enumerated exhaustively");
}

function mergeVocabulary(
  overrides: Partial<typeof DEFAULT_VOCABULARY> | undefined,
) {
  if (!overrides || Object.keys(overrides).length === 0) {
    return DEFAULT_VOCABULARY;
  }

  const merged: typeof DEFAULT_VOCABULARY = {
    greekLetters: [...DEFAULT_VOCABULARY.greekLetters],
    constellations: [...DEFAULT_VOCABULARY.constellations],
    mythicDescriptors: [...DEFAULT_VOCABULARY.mythicDescriptors],
    mythicCores: [...DEFAULT_VOCABULARY.mythicCores],
    catalogPrefixes: [...DEFAULT_VOCABULARY.catalogPrefixes],
    spectralClasses: [...DEFAULT_VOCABULARY.spectralClasses],
    designations: [...DEFAULT_VOCABULARY.designations],
  };

  for (
    const [key, values] of Object.entries(overrides) as Array<[
      keyof typeof DEFAULT_VOCABULARY,
      string[] | undefined,
    ]>
  ) {
    if (!values || values.length === 0) {
      throw new Error(`vocabulary.${key} must not be empty`);
    }
    merged[key] = [...values];
  }

  return merged;
}

function createClassicalName(
  rng: () => number,
  vocab: typeof DEFAULT_VOCABULARY,
): string {
  const letter = pick(vocab.greekLetters, rng);
  const constellation = pick(vocab.constellations, rng);
  return `${letter} ${constellation}`;
}

function createMythicName(
  rng: () => number,
  vocab: typeof DEFAULT_VOCABULARY,
): string {
  const descriptor = pick(vocab.mythicDescriptors, rng);
  const core = pick(vocab.mythicCores, rng);
  return `${descriptor} ${core}`;
}

function createCatalogName(
  rng: () => number,
  vocab: typeof DEFAULT_VOCABULARY,
): string {
  const prefix = pick(vocab.catalogPrefixes, rng);
  const digits = Math.floor(rng() * 9000) + 1000;
  const suffix = Math.floor(rng() * 100);
  return `${prefix} ${digits}${suffix.toString().padStart(2, "0")}`;
}

function createHybridName(
  rng: () => number,
  vocab: typeof DEFAULT_VOCABULARY,
): string {
  const classical = createClassicalName(rng, vocab);
  const mythic = createMythicName(rng, vocab);
  return `${mythic} of ${classical}`;
}

function enumerateClassical(vocab: typeof DEFAULT_VOCABULARY): string[] {
  const names: string[] = [];
  for (const letter of vocab.greekLetters) {
    for (const constellation of vocab.constellations) {
      names.push(`${letter} ${constellation}`);
    }
  }
  return names;
}

function enumerateMythic(vocab: typeof DEFAULT_VOCABULARY): string[] {
  const names: string[] = [];
  for (const descriptor of vocab.mythicDescriptors) {
    for (const core of vocab.mythicCores) {
      names.push(`${descriptor} ${core}`);
    }
  }
  return names;
}

function enumerateHybrid(vocab: typeof DEFAULT_VOCABULARY): string[] {
  const mythic = enumerateMythic(vocab);
  const classical = enumerateClassical(vocab);
  const names: string[] = [];
  for (const mythicName of mythic) {
    for (const classicalName of classical) {
      names.push(`${mythicName} of ${classicalName}`);
    }
  }
  return names;
}

function pick<T>(list: readonly T[], rng: () => number): T {
  if (list.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }

  const index = Math.floor(rng() * list.length) % list.length;
  return list[index];
}

function createRng(seed?: number | string): () => number {
  if (seed == null) {
    const autoSeed = Math.floor(Math.random() * 2 ** 32);
    return mulberry32(autoSeed);
  }

  const numericSeed = typeof seed === "number"
    ? seed
    : Math.abs(hashString(seed));
  return mulberry32(numericSeed >>> 0);
}

function mulberry32(initial: number): () => number {
  let a = initial >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
