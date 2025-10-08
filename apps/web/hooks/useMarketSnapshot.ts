import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MarketTimeseriesPoint = {
  timestamp: string;
  value: number;
};

export type MarketAsset = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  changeValue: number;
  currency: string;
  source: string;
  timeseries: MarketTimeseriesPoint[];
};

export type MarketCategory = {
  id: "currencies" | "commodities" | "indices" | "cryptocurrencies";
  title: string;
  description: string;
  accentColor: string;
  assets: MarketAsset[];
};

export type MarketSnapshot = {
  updatedAt: string;
  categories: MarketCategory[];
};

interface UseMarketSnapshotOptions {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

const REFRESH_INTERVAL_MS = 30_000;
const BACKGROUND_REFRESH_INTERVAL_MS = 120_000;

export function useMarketSnapshot(
  { autoRefresh = true, refreshIntervalMs = REFRESH_INTERVAL_MS }:
    UseMarketSnapshotOptions = {},
) {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null,
  );
  const [effectiveRefreshInterval, setEffectiveRefreshInterval] = useState(
    () => {
      if (!autoRefresh || refreshIntervalMs <= 0) {
        return 0;
      }
      if (typeof document === "undefined" || !document.hidden) {
        return refreshIntervalMs;
      }
      return Math.max(refreshIntervalMs, BACKGROUND_REFRESH_INTERVAL_MS);
    },
  );

  const fetchSnapshot = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isFirstLoad = data === null;

    try {
      setIsLoading(isFirstLoad);
      setIsRefreshing(!isFirstLoad);
      setError(null);

      const response = await fetch("/api/market-snapshot", {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Unable to load market snapshot");
      }

      const payload = (await response.json()) as MarketSnapshot;
      setData(payload);
    } catch (cause) {
      if ((cause as Error).name === "AbortError") {
        return;
      }
      setError((cause as Error).message ?? "Unknown error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!autoRefresh || refreshIntervalMs <= 0) {
      setEffectiveRefreshInterval(0);
      return () => {
        abortRef.current?.abort();
      };
    }

    const computeInterval = () => {
      if (typeof document === "undefined" || !document.hidden) {
        return refreshIntervalMs;
      }
      return Math.max(refreshIntervalMs, BACKGROUND_REFRESH_INTERVAL_MS);
    };

    setEffectiveRefreshInterval(computeInterval());

    if (typeof document === "undefined") {
      return () => {
        abortRef.current?.abort();
      };
    }

    const handleVisibilityChange = () => {
      setEffectiveRefreshInterval(computeInterval());
      if (!document.hidden) {
        void fetchSnapshot();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      abortRef.current?.abort();
    };
  }, [autoRefresh, fetchSnapshot, refreshIntervalMs]);

  useEffect(() => {
    if (!autoRefresh || effectiveRefreshInterval <= 0) {
      if (intervalRef.current) {
        globalThis.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return () => {};
    }

    const interval = globalThis.setInterval(() => {
      fetchSnapshot();
    }, effectiveRefreshInterval);

    intervalRef.current = interval;

    return () => {
      globalThis.clearInterval(interval);
      intervalRef.current = null;
    };
  }, [autoRefresh, effectiveRefreshInterval, fetchSnapshot]);

  const derived = useMemo(() => {
    if (!data) {
      return { categories: [], updatedAt: null as string | null };
    }

    return { categories: data.categories, updatedAt: data.updatedAt };
  }, [data]);

  return {
    data,
    categories: derived.categories,
    updatedAt: derived.updatedAt,
    isLoading,
    error,
    isRefreshing,
    refresh: fetchSnapshot,
  };
}
