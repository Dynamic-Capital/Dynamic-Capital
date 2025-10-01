"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEdgeFunction } from "@/hooks/useEdgeFunction";
import { SUPABASE_ENV_ERROR } from "@/config/supabase";
import type { SystemHealthResponse } from "@/types/system-health";

const SYSTEM_HEALTH_QUERY_KEY = ["system-health"];
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000;

interface UseSystemHealthOptions {
  /**
   * Automatically refetch the health status on an interval.
   * Defaults to 5 minutes when enabled.
   */
  autoRefresh?: boolean;
  /**
   * Custom refresh interval in milliseconds. Only used when `autoRefresh` is true.
   */
  refreshInterval?: number;
  /**
   * Enable or disable the query entirely. Enabled by default.
   */
  enabled?: boolean;
}

export function useSystemHealth({
  autoRefresh = false,
  refreshInterval,
  enabled = true,
}: UseSystemHealthOptions = {}) {
  const callEdgeFunction = useEdgeFunction();

  const fetchSystemHealth = useCallback(async () => {
    if (SUPABASE_ENV_ERROR) {
      throw new Error(SUPABASE_ENV_ERROR);
    }

    const { data, error } = await callEdgeFunction<SystemHealthResponse>(
      "WEB_APP_HEALTH",
    );

    if (error || !data) {
      throw new Error(error?.message || "Unable to load system health");
    }

    return data;
  }, [callEdgeFunction]);

  return useQuery<SystemHealthResponse, Error>({
    queryKey: SYSTEM_HEALTH_QUERY_KEY,
    queryFn: fetchSystemHealth,
    staleTime: DEFAULT_REFRESH_INTERVAL,
    gcTime: DEFAULT_REFRESH_INTERVAL * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: autoRefresh
      ? refreshInterval ?? DEFAULT_REFRESH_INTERVAL
      : false,
    enabled,
  });
}

export function useSystemHealthRefetch() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: SYSTEM_HEALTH_QUERY_KEY });
  }, [queryClient]);
}
