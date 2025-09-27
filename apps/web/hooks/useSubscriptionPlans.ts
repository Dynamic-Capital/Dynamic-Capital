"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plan } from "@/types/plan";
import {
  fetchSubscriptionPlans,
  getCachedSubscriptionPlans,
  getCachedSubscriptionPlansError,
  isFetchingSubscriptionPlans,
} from "@/services/plans";

interface UseSubscriptionPlansOptions {
  enabled?: boolean;
}

interface UseSubscriptionPlansResult {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  hasData: boolean;
  refresh: (force?: boolean) => Promise<Plan[]>;
}

export function useSubscriptionPlans(
  options: UseSubscriptionPlansOptions = {},
): UseSubscriptionPlansResult {
  const { enabled = true } = options;
  const [plans, setPlans] = useState<Plan[]>(() =>
    enabled ? getCachedSubscriptionPlans() : []
  );
  const [loading, setLoading] = useState(() =>
    enabled
      ? getCachedSubscriptionPlans().length === 0 &&
        !getCachedSubscriptionPlansError() &&
        !isFetchingSubscriptionPlans()
      : false
  );
  const [error, setError] = useState<string | null>(() =>
    enabled ? getCachedSubscriptionPlansError() : null
  );

  const loadPlans = useCallback(
    async (force?: boolean) => {
      if (!enabled) {
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchSubscriptionPlans({ force });
        setPlans(result);
        return result;
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : "Failed to load subscription plans.";
        setError(message);
        setPlans([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cached = getCachedSubscriptionPlans();
    const cachedErr = getCachedSubscriptionPlansError();

    if (cached.length > 0) {
      setPlans(cached);
      return;
    }

    if (cachedErr) {
      setError(cachedErr);
      return;
    }

    if (isFetchingSubscriptionPlans()) {
      setLoading(true);
      return;
    }

    void loadPlans();
  }, [enabled, loadPlans]);

  const refresh = useCallback(
    (force = false) => loadPlans(force),
    [loadPlans],
  );

  return {
    plans,
    loading,
    error,
    hasData: plans.length > 0,
    refresh,
  };
}
