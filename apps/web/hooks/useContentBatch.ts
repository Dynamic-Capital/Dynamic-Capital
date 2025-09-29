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

function snapshotDefaults(defaults: Record<string, string>) {
  const normalized: Record<string, string> = {};
  const signatureParts: string[] = [];

  const entries = Object.entries(defaults ?? {}).sort((a, b) => {
    if (a[0] === b[0]) return 0;
    return a[0] < b[0] ? -1 : 1;
  });

  for (const [key, value] of entries) {
    if (typeof value !== "string") {
      continue;
    }

    normalized[key] = value;
    signatureParts.push(`${key}\u0000${value}`);
  }

  return {
    normalized,
    signature: signatureParts.join("\u0001"),
  };
}

export function useContentBatch(
  keys: readonly string[],
  defaults: Record<string, string> = {},
) {
  const keysSignatureRef = useRef<string>("");
  const normalizedKeysRef = useRef<string[]>([]);
  const normalizedKeys = useMemo(() => {
    const normalized = sanitizeKeys(keys);
    const signature = normalized.join("\u0000");

    if (signature === keysSignatureRef.current) {
      return normalizedKeysRef.current;
    }

    keysSignatureRef.current = signature;
    normalizedKeysRef.current = normalized;
    return normalized;
  }, [keys]);

  const defaultsSignatureRef = useRef<string>("");
  const stableDefaultsRef = useRef<Record<string, string>>({});
  const stableDefaults = useMemo(() => {
    const { normalized, signature } = snapshotDefaults(defaults);

    if (signature === defaultsSignatureRef.current) {
      return stableDefaultsRef.current;
    }

    defaultsSignatureRef.current = signature;
    stableDefaultsRef.current = normalized;
    return normalized;
  }, [defaults]);

  const [content, setContent] = useState<Record<string, string>>(() => ({
    ...stableDefaults,
  }));
  const [loading, setLoading] = useState(normalizedKeys.length > 0);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setContent((previous) => ({ ...stableDefaults, ...previous }));
  }, [stableDefaults]);

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
      const { data, error: edgeError } = await callEdgeFunction<
        ContentBatchResponse
      >(
        "CONTENT_BATCH",
        {
          method: "POST",
          body: { keys: normalizedKeys },
        },
      );

      if (edgeError) {
        throw new Error(edgeError.message);
      }

      const next: Record<string, string> = { ...stableDefaults };

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
      setContent((previous) => ({ ...stableDefaults, ...previous }));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [normalizedKeys, stableDefaults]);

  useEffect(() => {
    void fetchContent();
  }, [fetchContent]);

  return { content, loading, error, refresh: fetchContent } as const;
}
