export const TON_SITE_DOMAIN = "dynamiccapital.ton";
export const TON_SITE_GATEWAY_BASE =
  "https://ton-gateway.dynamic-capital.ondigitalocean.app";
export const TON_SITE_GATEWAY_STANDBY_BASE =
  "https://ton-gateway.dynamic-capital.lovable.app";

export const TON_SITE_GATEWAY_PRIMARY_HOST =
  new URL(TON_SITE_GATEWAY_BASE).hostname;
export const TON_SITE_GATEWAY_STANDBY_HOST =
  new URL(TON_SITE_GATEWAY_STANDBY_BASE).hostname;

export const TON_SITE_GATEWAY_HOSTS = [
  TON_SITE_GATEWAY_PRIMARY_HOST,
  TON_SITE_GATEWAY_STANDBY_HOST,
] as const;

function trimTrailingSlash(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

export function resolveTonSiteGatewayOrigin(base: string): string {
  return `${trimTrailingSlash(base)}/${TON_SITE_DOMAIN}`;
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

const TON_SITE_GATEWAY_BASE_BY_HOST = new Map<string, string>([
  [TON_SITE_GATEWAY_PRIMARY_HOST, TON_SITE_GATEWAY_BASE],
  [TON_SITE_GATEWAY_STANDBY_HOST, TON_SITE_GATEWAY_STANDBY_BASE],
]);

export function resolveTonSiteGatewayBaseForHost(
  host: string | null | undefined,
): string {
  if (!host) return TON_SITE_GATEWAY_BASE;

  const normalized = host.trim().toLowerCase();
  if (!normalized) return TON_SITE_GATEWAY_BASE;

  const hostname = normalized.split(":")[0];
  return TON_SITE_GATEWAY_BASE_BY_HOST.get(hostname) ?? TON_SITE_GATEWAY_BASE;
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

  const gatewayPrefix = `/${TON_SITE_DOMAIN}`;
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

  return working;
}

export function isTonSitePath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;

  const trimmed = pathname.trim();
  if (!trimmed) return false;

  const withLeadingSlash = trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;
  const normalized = withLeadingSlash.toLowerCase();
  const prefix = `/${TON_SITE_DOMAIN}`;

  if (normalized === prefix) {
    return true;
  }

  return normalized.startsWith(`${prefix}/`);
}
