export const TON_SITE_DOMAIN = "dynamiccapital.ton";
export const TON_SITE_GATEWAY_BASE =
  "https://ton-gateway.dynamic-capital.ondigitalocean.app";

export const TON_SITE_GATEWAY_ORIGIN = `${TON_SITE_GATEWAY_BASE}/${TON_SITE_DOMAIN}`;

/**
 * Canonical URL for the TON Site landing page routed through the public gateway.
 */
export const TON_SITE_GATEWAY_URL = TON_SITE_GATEWAY_ORIGIN;

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
