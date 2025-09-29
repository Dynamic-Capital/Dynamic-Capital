"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { callEdgeFunction } from "@/config/supabase";

type ContentBatchItem = {
  content_key?: string | null;
  content_value?: string | null;
};

type ContentBatchResponse = {
  contents?: ContentBatchItem[];
};

function sanitizeKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawKey of keys) {
    const key = rawKey?.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

export function useContentBatch(
  keys: readonly string[],
  defaults: Record<string, string> = {},
) {
  const normalizedKeys = useMemo(() => sanitizeKeys(keys), [keys]);
  const [content, setContent] = useState<Record<string, string>>({
    ...defaults,
  });
  const [loading, setLoading] = useState(normalizedKeys.length > 0);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setContent((previous) => ({ ...defaults, ...previous }));
  }, [defaults]);

  const fetchContent = useCallback(async () => {
    if (normalizedKeys.length === 0) {
      if (isMountedRef.current) {
        setLoading(false);
        setError(null);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data, error: edgeError } = await callEdgeFunction<ContentBatchResponse>(
        "CONTENT_BATCH",
        {
          method: "POST",
          body: { keys: normalizedKeys },
        },
      );

      if (edgeError) {
        throw new Error(edgeError.message);
      }

      const next: Record<string, string> = { ...defaults };

      for (const item of data?.contents ?? []) {
        if (!item?.content_key) {
          continue;
        }

        const { content_key: key, content_value } = item;
        if (typeof content_value === "string") {
          next[key] = content_value;
        } else if (content_value != null) {
          next[key] = String(content_value);
        }
      }

      if (isMountedRef.current) {
        setContent(next);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      const message = err instanceof Error
        ? err.message
        : "Failed to load content";

      setError(message);
      setContent((previous) => ({ ...defaults, ...previous }));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [defaults, normalizedKeys]);

  useEffect(() => {
    void fetchContent();
  }, [fetchContent]);

  return { content, loading, error, refresh: fetchContent } as const;
}
