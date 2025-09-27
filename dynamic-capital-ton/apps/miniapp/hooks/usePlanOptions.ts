"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "../lib/supabase-client";
import {
  getFallbackPlans,
  normalisePlanOptions,
  resolvePlanUpdatedAt,
  type Plan,
  type PlanOption,
  type RawPlan,
} from "../lib/plans";

type PlanSyncStatus = {
  isLoading: boolean;
  isRealtimeSyncing: boolean;
  updatedAt?: string;
  error?: string | null;
};

type PlansPayload = { plans?: RawPlan[] | null };

type UsePlanOptionsResult = {
  planOptions: PlanOption[];
  selectedPlan: Plan;
  setSelectedPlan: (plan: Plan) => void;
  status: PlanSyncStatus;
  refresh: (options?: { showSpinner?: boolean }) => void;
};

export function usePlanOptions(initialPlan: Plan): UsePlanOptionsResult {
  const [planOptions, setPlanOptions] = useState<PlanOption[]>(() =>
    getFallbackPlans()
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan);
  const [status, setStatus] = useState<PlanSyncStatus>({
    isLoading: true,
    isRealtimeSyncing: false,
    updatedAt: undefined,
    error: null,
  });

  const loadPlans = useCallback(
    async ({ showSpinner }: { showSpinner: boolean }) => {
      setStatus((previous) => ({
        ...previous,
        isLoading: showSpinner,
        isRealtimeSyncing: !showSpinner,
      }));

      const controller = new AbortController();

      try {
        const response = await fetch("/api/plans", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const payload = await response.json() as PlansPayload;
        const normalized = Array.isArray(payload?.plans)
          ? normalisePlanOptions(payload.plans as RawPlan[])
          : getFallbackPlans();

        setPlanOptions(normalized);
        setSelectedPlan((current) =>
          normalized.some((option) => option.id === current)
            ? current
            : normalized[0]?.id ?? current
        );
        setStatus({
          isLoading: false,
          isRealtimeSyncing: false,
          updatedAt: resolvePlanUpdatedAt(normalized),
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[miniapp] Failed to load plans", error);
        setPlanOptions((previous) =>
          previous.length ? previous : getFallbackPlans()
        );
        setStatus((previous) => ({
          isLoading: false,
          isRealtimeSyncing: false,
          updatedAt: previous.updatedAt,
          error: error instanceof Error ? error.message : "Unable to load plans",
        }));
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    let pendingController: AbortController | null = null;

    const runInitialLoad = async () => {
      if (!isMounted) {
        return;
      }
      const controller = new AbortController();
      pendingController = controller;
      await loadPlans({ showSpinner: true });
      if (pendingController === controller) {
        pendingController = null;
      }
    };

    void runInitialLoad();

    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus((previous) => ({
        ...previous,
        isLoading: false,
        isRealtimeSyncing: false,
        error: previous.error ?? "Realtime sync unavailable (missing Supabase env)",
      }));

      return () => {
        isMounted = false;
        if (pendingController) {
          pendingController.abort();
        }
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
      };
    }

    const scheduleRealtimeRefresh = () => {
      setStatus((previous) => ({
        ...previous,
        isRealtimeSyncing: true,
      }));

      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        refreshTimeout = null;
        void loadPlans({ showSpinner: false });
      }, 250);
    };

    const channel = supabase
      .channel("miniapp-subscription-plans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_plans" },
        () => {
          if (!isMounted) {
            return;
          }
          scheduleRealtimeRefresh();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (pendingController) {
        pendingController.abort();
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [loadPlans]);

  const refresh = useCallback(
    ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
      void loadPlans({ showSpinner });
    },
    [loadPlans],
  );

  const stablePlan = useMemo(() => selectedPlan, [selectedPlan]);

  return {
    planOptions,
    selectedPlan: stablePlan,
    setSelectedPlan,
    status,
    refresh,
  };
}
