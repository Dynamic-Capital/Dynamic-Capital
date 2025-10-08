export const TON_MANIFEST_RESOURCE_PATH = "/tonconnect-manifest.json";

export const TON_MANIFEST_ORIGIN_CANDIDATES = [
  "https://dynamiccapital.ton",
  "https://dynamic-capital-qazf2.ondigitalocean.app",
  "https://dynamic-capital.ondigitalocean.app",
  "https://dynamic.capital",
] as const;

export const TON_MANIFEST_URL_CANDIDATES = TON_MANIFEST_ORIGIN_CANDIDATES.map(
  (origin) => new URL(TON_MANIFEST_RESOURCE_PATH, origin).toString(),
);
