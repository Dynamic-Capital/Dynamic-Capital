"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface UseDeskClockOptions {
  /**
   * Interval (in milliseconds) used to refresh the clock. Defaults to one minute
   * which keeps the UI light while still reflecting near real-time changes.
   */
  updateInterval?: number;
  /**
   * Whether the hook should immediately sync when mounted. Defaults to true.
   */
  immediate?: boolean;
}

interface DeskClockState {
  /** Current Date instance that reflects the user's device time. */
  now: Date;
  /**
   * ISO string representation of the desk time. Useful when persisting or
   * sending telemetry about the sync moment.
   */
  iso: string;
  /**
   * Localized string suitable for displaying to the user. Uses the browser's
   * locale and includes both date and time for clarity.
   */
  formatted: string;
}

const DEFAULT_INTERVAL = 60_000;

export function useDeskClock(
  { updateInterval = DEFAULT_INTERVAL, immediate = true }: UseDeskClockOptions =
    {},
): DeskClockState {
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!immediate) {
      return () => undefined;
    }

    setNow(new Date());
    return () => undefined;
  }, [immediate]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(new Date());
    }, Math.max(updateInterval, 1_000));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval]);

  const formatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(now);
    } catch {
      return now.toLocaleString();
    }
  }, [now]);

  return {
    now,
    iso: now.toISOString(),
    formatted,
  };
}
