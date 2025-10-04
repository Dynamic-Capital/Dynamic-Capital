"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

function normalizePathname(pathname: string | null): string {
  if (!pathname) {
    return "/";
  }

  let normalized = pathname;

  if (normalized.startsWith("/_sites/")) {
    const withoutPreviewPrefix = normalized.replace(
      /^\/_sites\/[^/]+/,
      "",
    );
    normalized = withoutPreviewPrefix || "/";
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized || "/";
}

function isMiniAppPath(pathname: string | null): boolean {
  const normalizedPathname = normalizePathname(pathname);

  return normalizedPathname.startsWith("/miniapp");
}

export function HideOnMiniApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const shouldHide = useMemo(() => isMiniAppPath(pathname), [pathname]);

  if (shouldHide) {
    return null;
  }

  return <>{children}</>;
}

export function __internal_isMiniAppPath(pathname: string | null): boolean {
  return isMiniAppPath(pathname);
}
