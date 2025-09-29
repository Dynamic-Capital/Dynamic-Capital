"use client";

import { useMemo } from "react";

import { useContentBatch } from "@/hooks/useContentBatch";

const POPULAR_PLAN_KEY = "popular_plan_id";

function normalizePopularPlanId(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function usePopularPlanId() {
  const {
    content,
    loading,
    error,
    refresh,
  } = useContentBatch([POPULAR_PLAN_KEY]);

  const rawPopularPlanId = content[POPULAR_PLAN_KEY];
  const popularPlanId = useMemo(
    () => normalizePopularPlanId(rawPopularPlanId),
    [rawPopularPlanId],
  );

  return { popularPlanId, loading, error, refresh };
}
