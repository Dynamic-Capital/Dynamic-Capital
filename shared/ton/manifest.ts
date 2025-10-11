export const TON_MANIFEST_RESOURCE_PATH = "/tonconnect-manifest.json";

const DEFAULT_TON_MANIFEST_ORIGINS = [
  "https://cdn.dynamiccapital.ton",
  "https://miniapp.dynamiccapital.ton",
  "https://dynamiccapital.ton",
  "https://dynamic-capital-qazf2.ondigitalocean.app",
  "https://dynamic-capital.ondigitalocean.app",
  "https://dynamic.capital",
] as const;

const TON_MANIFEST_ENV_KEYS = [
  "NEXT_PUBLIC_TONCONNECT_MANIFEST_ORIGINS",
  "TONCONNECT_MANIFEST_ORIGINS",
  "NEXT_PUBLIC_TON_MANIFEST_ORIGINS",
  "TON_MANIFEST_ORIGINS",
  "NEXT_PUBLIC_TONCONNECT_MANIFEST_URL",
  "TONCONNECT_MANIFEST_URL",
];

function normaliseOrigin(candidate: string): string | null {
  try {
    const url = new URL(candidate.trim());
    return url.origin;
  } catch {
    return null;
  }
}

function parseEnvOrigins(): string[] {
  const origins: string[] = [];

  for (const key of TON_MANIFEST_ENV_KEYS) {
    const raw = (typeof process !== "undefined" ? process.env?.[key] : undefined) ??
      undefined;
    if (!raw) {
      continue;
    }

    for (const entry of raw.split(",")) {
      const normalised = normaliseOrigin(entry);
      if (normalised) {
        origins.push(normalised);
      }
    }
  }

  return origins;
}

const TON_MANIFEST_RUNTIME_ORIGINS = (() => {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const origin of [...parseEnvOrigins(), ...DEFAULT_TON_MANIFEST_ORIGINS]) {
    if (!origin || seen.has(origin)) {
      continue;
    }
    seen.add(origin);
    ordered.push(origin);
  }

  return Object.freeze(ordered);
})();

export const TON_MANIFEST_ORIGIN_CANDIDATES =
  TON_MANIFEST_RUNTIME_ORIGINS as readonly string[];

export const TON_MANIFEST_URL_CANDIDATES = TON_MANIFEST_ORIGIN_CANDIDATES.map(
  (origin) => new URL(TON_MANIFEST_RESOURCE_PATH, origin).toString(),
);
