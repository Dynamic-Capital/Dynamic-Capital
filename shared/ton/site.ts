export const TON_SITE_DOMAIN = "dynamiccapital.ton";
export const TON_SITE_GATEWAY_BASE = "https://ton.site";

export const TON_SITE_GATEWAY_ORIGIN = `${TON_SITE_GATEWAY_BASE}/${TON_SITE_DOMAIN}`;

/**
 * Canonical URL for the TON Site landing page routed through the public gateway.
 */
export const TON_SITE_GATEWAY_URL = TON_SITE_GATEWAY_ORIGIN;

/**
 * Resolves a path relative to the TON Site gateway origin, ensuring there are no duplicate slashes.
 */
export function resolveTonSiteUrl(path: string = "/"): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return TON_SITE_GATEWAY_ORIGIN;
  }

  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `${TON_SITE_GATEWAY_ORIGIN}/${normalized}`;
}

export const TON_SITE_ICON_URL = resolveTonSiteUrl("icon.png");
export const TON_SITE_SOCIAL_PREVIEW_URL = resolveTonSiteUrl(
  "social/social-preview.svg",
);
