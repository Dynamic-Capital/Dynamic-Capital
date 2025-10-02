"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function MiniAppIndex() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const { search, hash } = window.location;
    const nextPath = `/miniapp/dynamic-hq${search ?? ""}${hash ?? ""}`;

    hasRedirectedRef.current = true;
    router.replace(nextPath);
  }, [router]);

  return null;
}
