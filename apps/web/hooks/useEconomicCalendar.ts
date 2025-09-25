"use client";

import { useCallback, useEffect, useState } from "react";

import type { EconomicEvent } from "@/types/economic-event";
import {
  fetchEconomicEvents,
  getCachedEconomicEvents,
  getCachedEconomicEventsError,
  isFetchingEconomicEvents,
} from "@/services/economic-calendar";

interface UseEconomicCalendarOptions {
  enabled?: boolean;
}

interface UseEconomicCalendarResult {
  events: EconomicEvent[];
  loading: boolean;
  error: string | null;
  hasData: boolean;
  refresh: (force?: boolean) => Promise<EconomicEvent[]>;
}

export function useEconomicCalendar(
  options: UseEconomicCalendarOptions = {},
): UseEconomicCalendarResult {
  const { enabled = true } = options;
  const [events, setEvents] = useState<EconomicEvent[]>(() =>
    enabled ? getCachedEconomicEvents() : []
  );
  const [loading, setLoading] = useState(() =>
    enabled
      ? getCachedEconomicEvents().length === 0 &&
        !getCachedEconomicEventsError() &&
        !isFetchingEconomicEvents()
      : false
  );
  const [error, setError] = useState<string | null>(() =>
    enabled ? getCachedEconomicEventsError() : null
  );

  const loadEvents = useCallback(
    async (force?: boolean) => {
      if (!enabled) {
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchEconomicEvents({ force });
        setEvents(result);
        return result;
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : "Failed to load economic calendar.";
        setError(message);
        setEvents([]);
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

    const cached = getCachedEconomicEvents();
    const cachedErr = getCachedEconomicEventsError();

    if (cached.length > 0) {
      setEvents(cached);
      return;
    }

    if (cachedErr) {
      setError(cachedErr);
      return;
    }

    if (isFetchingEconomicEvents()) {
      setLoading(true);
      return;
    }

    void loadEvents();
  }, [enabled, loadEvents]);

  const refresh = useCallback(
    (force = false) => loadEvents(force),
    [loadEvents],
  );

  return {
    events,
    loading,
    error,
    hasData: events.length > 0,
    refresh,
  };
}
