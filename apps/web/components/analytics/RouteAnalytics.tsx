"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useAnalytics } from "@/hooks/useAnalytics";

function resolveTheme() {
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.documentElement.getAttribute("data-theme") ?? undefined;
}

export function RouteAnalytics() {
  const { trackPageView } = useAnalytics();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const searchValue = searchParams?.toString() ?? "";
    const page = searchValue ? `${pathname}?${searchValue}` : pathname;

    if (previousLocationRef.current === page) {
      return;
    }

    previousLocationRef.current = page;

    trackPageView(page, {
      theme: resolveTheme(),
    });
  }, [pathname, searchParams, trackPageView]);

  return null;
}
