"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_REFRESH_SECONDS, type LiveIntelSnapshot } from "../data/live-intel";

type LiveIntelResponse = {
  generatedAt: string;
  nextUpdateInSeconds?: number;
  report: LiveIntelSnapshot;
};
 
export type LiveIntelState = {
  status: "loading" | "ready" | "error";
  report?: LiveIntelSnapshot;
  updatedAt?: string;
  nextRefreshSeconds?: number;
  isSyncing: boolean;
  error?: string;
};

export function useLiveIntel(
  pollMs: number = DEFAULT_REFRESH_SECONDS * 1000,
): LiveIntelState & { refresh: () => void } {
  const [state, setState] = useState<LiveIntelState>({
    status: "loading",
    isSyncing: true,
  });
  const isUnmounted = useRef(false);

  const fetchIntel = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      status: previous.report ? previous.status : "loading",
      isSyncing: true,
      error: previous.report ? previous.error : undefined,
    }));

    try {
      const response = await fetch("/api/live-intel", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload: LiveIntelResponse = await response.json();
      if (isUnmounted.current) {
        return;
      }
      setState({
        status: "ready",
        report: payload.report,
        updatedAt: payload.generatedAt,
        nextRefreshSeconds: payload.nextUpdateInSeconds ??
          Math.floor(pollMs / 1000),
        isSyncing: false,
        error: undefined,
      });
    } catch (error) {
      if (isUnmounted.current) {
        return;
      }
      const message = error instanceof Error
        ? error.message
        : "Unknown sync error";
      setState((previous) => ({
        ...previous,
        status: previous.report ? "ready" : "error",
        isSyncing: false,
        error: message,
      }));
    }
  }, [pollMs]);

  useEffect(() => {
    isUnmounted.current = false;
    void fetchIntel();
    const intervalId = setInterval(() => {
      void fetchIntel();
    }, pollMs);

    return () => {
      isUnmounted.current = true;
      clearInterval(intervalId);
    };
  }, [fetchIntel, pollMs]);

  return {
    ...state,
    refresh: fetchIntel,
  };
}
