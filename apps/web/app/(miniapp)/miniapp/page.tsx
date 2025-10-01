"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MiniAppIndex() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const nextPath = `/miniapp/home${search ? `?${search}` : ""}${hash}`;

    router.replace(nextPath);
  }, [router, searchParams]);

  return null;
}
