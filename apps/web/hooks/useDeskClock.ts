"use client";

import { useEffect, useMemo, useState } from "react";

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
const MIN_INTERVAL = 1_000;

export function useDeskClock(
  { updateInterval = DEFAULT_INTERVAL, immediate = true }: UseDeskClockOptions =
    {},
): DeskClockState {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!immediate) {
      return () => undefined;
    }

    setNow(new Date());
    return () => undefined;
  }, [immediate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, Math.max(updateInterval, MIN_INTERVAL));

    return () => {
      window.clearInterval(interval);
    };
  }, [updateInterval]);

  const formatter = useMemo(() => {
    if (
      typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function"
    ) {
      return undefined;
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return undefined;
    }
  }, []);

  const formatted = useMemo(() => {
    if (!formatter) {
      return now.toLocaleString();
    }

    try {
      return formatter.format(now);
    } catch {
      return now.toLocaleString();
    }
  }, [formatter, now]);

  return {
    now,
    iso: now.toISOString(),
    formatted,
  };
}
