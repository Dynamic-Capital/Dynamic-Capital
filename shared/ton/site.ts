export const TON_SITE_DOMAIN = "dynamiccapital.ton";
export const TON_SITE_ALIAS_DOMAINS = Object.freeze(
  [
    "dynamicapital.ton",
  ] as const,
);

const TON_SITE_DOMAIN_CANDIDATES = Object.freeze([
  TON_SITE_DOMAIN,
  ...TON_SITE_ALIAS_DOMAINS,
]);
export const TON_SITE_GATEWAY_BASE =
  "https://ton-gateway.dynamic-capital.ondigitalocean.app";
export const TON_SITE_GATEWAY_STANDBY_BASE = "https://ton.site";

export const TON_SITE_GATEWAY_SELF_HOST_BASES = Object.freeze(
  [
    TON_SITE_GATEWAY_BASE,
    "https://ton-gateway.dynamic-capital.lovable.app",
  ] as const,
);

export const TON_SITE_GATEWAY_FOUNDATION_BASES = Object.freeze(
  [
    TON_SITE_GATEWAY_STANDBY_BASE,
    "https://tonsite.io",
    "https://tonsite.link",
  ] as const,
);

const TON_SITE_GATEWAY_SELF_HOST_HOSTS = TON_SITE_GATEWAY_SELF_HOST_BASES.map((
  base,
) => new URL(base).hostname);
const TON_SITE_GATEWAY_FOUNDATION_HOSTS = TON_SITE_GATEWAY_FOUNDATION_BASES.map(
  (base) => new URL(base).hostname,
);

export const TON_SITE_GATEWAY_PRIMARY_HOST =
  new URL(TON_SITE_GATEWAY_BASE).hostname;
export const TON_SITE_GATEWAY_STANDBY_HOST =
  new URL(TON_SITE_GATEWAY_STANDBY_BASE).hostname;

export const TON_SITE_GATEWAY_HOSTS = Object.freeze(
  Array.from(
    new Set([
      ...TON_SITE_GATEWAY_FOUNDATION_HOSTS,
      ...TON_SITE_GATEWAY_SELF_HOST_HOSTS,
    ]),
  ),
);

function trimTrailingSlash(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

type ResolveTonSiteGatewayOriginOptions = {
  /**
   * When true (default), requests for the standby foundation base are
   * canonicalised back to the primary self-hosted gateway to preserve legacy
   * behaviour. Setting this to false preserves the provided standby base so the
   * caller can attempt a direct foundation fetch.
   */
  canonicalizeStandby?: boolean;
};

export function resolveTonSiteGatewayOrigin(
  base: string,
  options: ResolveTonSiteGatewayOriginOptions = {},
): string {
  const { canonicalizeStandby = true } = options;
  const trimmed = base.trim();
  if (!trimmed) {
    return `${TON_SITE_GATEWAY_BASE}/${TON_SITE_DOMAIN}`;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // If we received a malformed URL, fall back to the canonical gateway base
    // to avoid propagating an invalid origin.
    return `${TON_SITE_GATEWAY_BASE}/${TON_SITE_DOMAIN}`;
  }

  const normalizedBase = trimTrailingSlash(url.toString());

  const hostname = url.hostname;
  const mappedBase = TON_SITE_GATEWAY_BASE_BY_HOST.get(hostname);
  let canonicalBase = normalizedBase;

  if (mappedBase) {
    if (mappedBase === TON_SITE_GATEWAY_STANDBY_BASE && !canonicalizeStandby) {
      canonicalBase = normalizedBase;
    } else {
      canonicalBase = mappedBase;
    }
  }

  return `${canonicalBase}/${TON_SITE_DOMAIN}`;
}

const TON_SITE_GATEWAY_BASE_BY_HOST = new Map<string, string>();
for (
  const base of [
    ...TON_SITE_GATEWAY_FOUNDATION_BASES,
    ...TON_SITE_GATEWAY_SELF_HOST_BASES,
  ]
) {
  const normalizedBase = trimTrailingSlash(base);
  const host = new URL(normalizedBase).hostname;
  if (!TON_SITE_GATEWAY_BASE_BY_HOST.has(host)) {
    TON_SITE_GATEWAY_BASE_BY_HOST.set(host, normalizedBase);
  }
}

export const TON_SITE_GATEWAY_ORIGIN = resolveTonSiteGatewayOrigin(
  TON_SITE_GATEWAY_BASE,
);

/**
 * Canonical URL for the TON Site landing page routed through the public gateway.
 */
export const TON_SITE_GATEWAY_URL = TON_SITE_GATEWAY_ORIGIN;

/**
 * Canonical URL used in `curl` health checks against the TON gateway.
 */
export const TON_SITE_GATEWAY_CURL_URL = TON_SITE_GATEWAY_URL;

/**
 * Resolves a path relative to the TON Site gateway origin, ensuring duplicate
 * slashes are collapsed while preserving query and hash suffixes.
 */
export function resolveTonSiteUrl(path: string = "/"): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return TON_SITE_GATEWAY_ORIGIN;
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
  const normalizedPath = segments.join("/");
  const baseUrl = normalizedPath
    ? `${TON_SITE_GATEWAY_ORIGIN}/${normalizedPath}`
    : TON_SITE_GATEWAY_ORIGIN;

  return `${baseUrl}${query}${hash}`;
}

export const TON_SITE_ICON_URL = resolveTonSiteUrl("icon.png");
export const TON_SITE_SOCIAL_PREVIEW_URL = resolveTonSiteUrl(
  "social/social-preview.svg",
);

export function resolveTonSiteGatewayBasesForHost(
  host: string | null | undefined,
): readonly string[] {
  const prioritized: string[] = [];
  const seen = new Set<string>();

  const addBase = (base: string | undefined) => {
    if (!base) return;
    const trimmed = trimTrailingSlash(base.trim());
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    prioritized.push(trimmed);
  };

  if (host) {
    const normalizedHost = host.trim().toLowerCase();
    if (normalizedHost) {
      const hostname = normalizedHost.split(":")[0];
      const mapped = TON_SITE_GATEWAY_BASE_BY_HOST.get(hostname);
      if (mapped) {
        addBase(mapped);
      }
    }
  }

  for (const base of TON_SITE_GATEWAY_FOUNDATION_BASES) {
    addBase(base);
  }

  for (const base of TON_SITE_GATEWAY_SELF_HOST_BASES) {
    addBase(base);
  }

  if (prioritized.length === 0) {
    addBase(TON_SITE_GATEWAY_BASE);
  }

  return Object.freeze([...prioritized]);
}

export function resolveTonSiteGatewayBaseForHost(
  host: string | null | undefined,
): string {
  if (!host || !host.trim()) {
    return TON_SITE_GATEWAY_BASE;
  }

  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) {
    return TON_SITE_GATEWAY_BASE;
  }

  const hostname = normalizedHost.split(":")[0];
  const mappedBase = TON_SITE_GATEWAY_BASE_BY_HOST.get(hostname);
  if (mappedBase) {
    return mappedBase;
  }

  return TON_SITE_GATEWAY_BASE;
}

/**
 * Normalises request paths received through the TON gateway so they can be
 * safely appended to the `/ton-site` edge route without duplicating the
 * `dynamiccapital.ton` prefix. The gateway forwards requests such as
 * `/dynamiccapital.ton`, `/dynamiccapital.ton/icon.png`, or root `/`, and we
 * need to collapse these into the relative suffix expected by the upstream
 * resolver.
 */
export function normalizeTonGatewayPath(pathname: string | undefined): string {
  if (!pathname) return "";

  let working = pathname.trim();
  if (!working) return "";

  if (!working.startsWith("/")) {
    working = `/${working}`;
  }

  // Collapse duplicate slashes to avoid accidental directory traversal when we
  // strip the host prefix.
  let collapsed = "";
  let lastWasSlash = false;
  for (const char of working) {
    if (char === "/") {
      if (lastWasSlash) continue;
      lastWasSlash = true;
    } else {
      lastWasSlash = false;
    }
    collapsed += char;
  }
  working = collapsed;

  const hadTrailingSlash = working.length > 1 && working.endsWith("/");

  // Strip self-referential `.` segments and reject any `..` traversal attempts
  // before removing the tenant prefix so callers cannot escape the TON site
  // namespace.
  const sanitizedSegments: string[] = [];
  for (const segment of working.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      return "";
    }
    sanitizedSegments.push(segment);
  }

  working = sanitizedSegments.length ? `/${sanitizedSegments.join("/")}` : "/";
  if (hadTrailingSlash && working !== "/") {
    working = `${working}/`;
  }

  if (working === "/") {
    return "";
  }

  for (const domain of TON_SITE_DOMAIN_CANDIDATES) {
    const gatewayPrefix = `/${domain}`;
    if (working === gatewayPrefix || working === `${gatewayPrefix}/`) {
      return "";
    }

    if (working.startsWith(`${gatewayPrefix}/`)) {
      const remainder = working.slice(gatewayPrefix.length);
      if (!remainder || remainder === "/") {
        return "";
      }
      return remainder.startsWith("/") ? remainder : `/${remainder}`;
    }
  }

  return working;
}

export function isTonSitePath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;

  const trimmed = pathname.trim();
  if (!trimmed) return false;

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.toLowerCase();
  for (const domain of TON_SITE_DOMAIN_CANDIDATES) {
    const prefix = `/${domain}`;

    if (normalized === prefix) {
      return true;
    }

    if (normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  return false;
}
