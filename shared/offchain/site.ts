const OFFCHAIN_WEBSITE_CANONICAL_BASE = "https://dynamic.capital";

export const OFFCHAIN_WEBSITE_CANONICAL_HOST =
  new URL(OFFCHAIN_WEBSITE_CANONICAL_BASE).hostname;

export const OFFCHAIN_WEBSITE_FALLBACK_BASES = Object.freeze([
  "https://dynamic-capital.vercel.app",
  "https://dynamic-capital.lovable.app",
  "https://dynamic-capital.ondigitalocean.app",
  "https://dynamic-capital-qazf2.ondigitalocean.app",
] as const);

const OFFCHAIN_WEBSITE_BASES = Object.freeze([
  OFFCHAIN_WEBSITE_CANONICAL_BASE,
  ...OFFCHAIN_WEBSITE_FALLBACK_BASES,
] as const);

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normaliseBase(value: string): string {
  return trimTrailingSlash(value.trim());
}

const OFFCHAIN_WEBSITE_BASE_BY_HOST = new Map<string, string>();
for (const base of OFFCHAIN_WEBSITE_BASES) {
  const normalised = normaliseBase(base);
  const host = new URL(normalised).hostname;
  if (!OFFCHAIN_WEBSITE_BASE_BY_HOST.has(host)) {
    OFFCHAIN_WEBSITE_BASE_BY_HOST.set(host, normalised);
  }
}

export const OFFCHAIN_WEBSITE_HOSTS = Object.freeze(
  Array.from(OFFCHAIN_WEBSITE_BASE_BY_HOST.keys()),
);

function sanitisePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  let working = trimmed;
  let hash = "";
  const hashIndex = working.indexOf("#");
  if (hashIndex >= 0) {
    hash = working.slice(hashIndex);
    working = working.slice(0, hashIndex);
  }

  let query = "";
  const queryIndex = working.indexOf("?");
  if (queryIndex >= 0) {
    query = working.slice(queryIndex);
    working = working.slice(0, queryIndex);
  }

  const segments = working
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const normalisedPath = segments.join("/");
  return `${normalisedPath ? `/${normalisedPath}` : ""}${query}${hash}`;
}

function buildOffchainUrl(base: string, path: string): string {
  const normalisedBase = normaliseBase(base);
  const normalisedPath = sanitisePath(path);
  return `${normalisedBase}${normalisedPath}`;
}

export function resolveOffchainWebsiteUrl(path: string = "/"): string {
  return buildOffchainUrl(OFFCHAIN_WEBSITE_CANONICAL_BASE, path);
}

export function resolveOffchainWebsiteUrlForBase(
  base: string,
  path: string = "/",
): string {
  return buildOffchainUrl(base, path);
}

function addBase(prioritised: string[], seen: Set<string>, base: string) {
  const normalised = normaliseBase(base);
  if (!normalised || seen.has(normalised)) return;
  seen.add(normalised);
  prioritised.push(normalised);
}

export function resolveOffchainWebsiteBasesForHost(
  host: string | null | undefined,
): readonly string[] {
  const prioritised: string[] = [];
  const seen = new Set<string>();

  if (host) {
    const normalisedHost = host.trim().toLowerCase();
    if (normalisedHost) {
      const hostname = normalisedHost.split(":")[0];
      const mapped = OFFCHAIN_WEBSITE_BASE_BY_HOST.get(hostname);
      if (mapped) {
        addBase(prioritised, seen, mapped);
      }
    }
  }

  for (const base of OFFCHAIN_WEBSITE_BASES) {
    addBase(prioritised, seen, base);
  }

  if (prioritised.length === 0) {
    addBase(prioritised, seen, OFFCHAIN_WEBSITE_CANONICAL_BASE);
  }

  return Object.freeze([...prioritised]);
}

export function resolveOffchainWebsiteBaseForHost(
  host: string | null | undefined,
): string {
  const [first] = resolveOffchainWebsiteBasesForHost(host);
  return first ?? OFFCHAIN_WEBSITE_CANONICAL_BASE;
}

export const OFFCHAIN_WEBSITE_CANONICAL_URL =
  resolveOffchainWebsiteUrl();

export {
  OFFCHAIN_WEBSITE_CANONICAL_BASE,
  OFFCHAIN_WEBSITE_BASES,
};
