export const TON_SITE_DOMAIN = "dynamiccapital.ton";
export const TON_SITE_GATEWAY_BASE = "https://ton.site";

export const TON_SITE_GATEWAY_ORIGIN =
  `${TON_SITE_GATEWAY_BASE}/${TON_SITE_DOMAIN}`;

/**
 * Canonical URL for the TON Site landing page routed through the public gateway.
 */
export const TON_SITE_GATEWAY_URL = TON_SITE_GATEWAY_ORIGIN;

export const TON_SITE_PROXY_FUNCTION_NAME = "ton-site-proxy" as const;
export const TON_SITE_PROXY_PATH_PREFIX = `/${TON_SITE_PROXY_FUNCTION_NAME}`;

interface TonSitePathParts {
  pathname: string;
  search: string;
  hash: string;
}

function normaliseTonSitePath(path: string = "/"): TonSitePathParts {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return { pathname: "", search: "", hash: "" };
  }

  let working = trimmed;
  let hash = "";

  const hashIndex = working.indexOf("#");
  if (hashIndex >= 0) {
    hash = working.slice(hashIndex);
    working = working.slice(0, hashIndex);
  }

  let search = "";
  const queryIndex = working.indexOf("?");
  if (queryIndex >= 0) {
    search = working.slice(queryIndex);
    working = working.slice(0, queryIndex);
  }

  const segments = working
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const pathname = segments.join("/");

  return { pathname, search, hash };
}

/**
 * Resolves a path relative to the TON Site gateway origin, ensuring duplicate
 * slashes are collapsed while preserving query and hash suffixes.
 */
export function resolveTonSiteUrl(path: string = "/"): string {
  const { pathname, search, hash } = normaliseTonSitePath(path);
  const baseUrl = pathname
    ? `${TON_SITE_GATEWAY_ORIGIN}/${pathname}`
    : TON_SITE_GATEWAY_ORIGIN;

  return `${baseUrl}${search}${hash}`;
}

export function resolveTonSiteProxyPath(path: string = "/"): string {
  const { pathname, search, hash } = normaliseTonSitePath(path);
  const basePath = pathname
    ? `${TON_SITE_PROXY_PATH_PREFIX}/${pathname}`
    : `${TON_SITE_PROXY_PATH_PREFIX}/`;

  return `${basePath}${search}${hash}`;
}

export function resolveTonSiteProxyUrl(
  functionsBaseUrl: string,
  path: string = "/",
): string {
  const trimmedBase = functionsBaseUrl.replace(/\/+$/, "");
  return `${trimmedBase}${resolveTonSiteProxyPath(path)}`;
}

export const TON_SITE_ICON_URL = resolveTonSiteUrl("icon.png");
export const TON_SITE_SOCIAL_PREVIEW_URL = resolveTonSiteUrl(
  "social/social-preview.svg",
);
