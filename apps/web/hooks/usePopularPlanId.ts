"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { callEdgeFunction } from "@/config/supabase";

const POPULAR_PLAN_KEY = "popular_plan_id";

type ContentBatchItem = {
  content_key: string;
  content_value: string | null;
};

type ContentBatchResponse = {
  contents?: ContentBatchItem[];
};

function normalizePopularPlanId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function usePopularPlanId() {
  const [popularPlanId, setPopularPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPopularPlanId = useCallback(async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data, error: edgeError } = await callEdgeFunction<ContentBatchResponse>(
        "CONTENT_BATCH",
        {
          method: "POST",
          body: { keys: [POPULAR_PLAN_KEY] },
        },
      );

      if (edgeError) {
        throw new Error(edgeError.message);
      }

      const contents = data?.contents ?? [];
      const match = contents.find((item) => item.content_key === POPULAR_PLAN_KEY);
      const nextPopularPlanId = normalizePopularPlanId(match?.content_value);

      if (isMountedRef.current) {
        setPopularPlanId(nextPopularPlanId);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      const message = err instanceof Error
        ? err.message
        : "Failed to load popular plan";

      setError(message);
      setPopularPlanId(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPopularPlanId();
  }, [fetchPopularPlanId]);

  return { popularPlanId, loading, error };
}
