export const PREVIEW_SITE_PREFIX = /^\/_sites\/[^/]+/;

export function normalizeAppPathname(pathname: string | null): string {
  if (!pathname) {
    return "/";
  }

  let normalized = pathname;

  if (normalized.startsWith("/_sites/")) {
    const withoutPreviewPrefix = normalized.replace(PREVIEW_SITE_PREFIX, "");
    normalized = withoutPreviewPrefix || "/";
  }

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized || "/";
}

export function isMiniAppPath(pathname: string | null): boolean {
  return normalizeAppPathname(pathname).startsWith("/miniapp");
}
