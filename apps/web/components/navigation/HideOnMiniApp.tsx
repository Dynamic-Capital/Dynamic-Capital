"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { isMiniAppPath } from "@/lib/pathnames";

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
