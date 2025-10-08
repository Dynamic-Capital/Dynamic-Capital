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

export function useMarketSnapshot(
  { autoRefresh = true, refreshIntervalMs = 60_000 }: UseMarketSnapshotOptions =
    {},
) {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

    if (!autoRefresh) {
      return () => {
        abortRef.current?.abort();
      };
    }

    const interval = window.setInterval(() => {
      fetchSnapshot();
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [autoRefresh, fetchSnapshot, refreshIntervalMs]);

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
