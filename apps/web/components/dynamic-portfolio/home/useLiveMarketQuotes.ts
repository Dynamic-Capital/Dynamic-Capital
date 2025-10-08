"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AssetClass = "stocks" | "commodities" | "indices" | "crypto";

export interface LiveMarketQuote {
  requestSymbol: string;
  sourceSymbol: string;
  source: "stooq" | "coingecko" | "awesomeapi";
  name?: string;
  last?: number | null;
  change?: number | null;
  changePercent?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  timestamp?: Date | null;
}

interface MarketApiQuote extends Omit<LiveMarketQuote, "timestamp"> {
  timestamp?: string | null;
}

interface MarketApiPayload {
  class: AssetClass;
  quotes: MarketApiQuote[];
  errors?: string[];
}

const REFRESH_INTERVAL_MS = 30_000;
const BACKGROUND_REFRESH_INTERVAL_MS = 120_000;

const normalizeSymbol = (symbol: string) => symbol.trim().toLowerCase();

const areQuoteRecordsEqual = (
  previous: Record<string, LiveMarketQuote>,
  next: Record<string, LiveMarketQuote>,
) => {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of previousKeys) {
    const prevQuote = previous[key];
    const nextQuote = next[key];
    if (!nextQuote) {
      return false;
    }

    if (
      prevQuote.requestSymbol !== nextQuote.requestSymbol ||
      prevQuote.sourceSymbol !== nextQuote.sourceSymbol ||
      prevQuote.source !== nextQuote.source ||
      (prevQuote.name ?? null) !== (nextQuote.name ?? null) ||
      (prevQuote.last ?? null) !== (nextQuote.last ?? null) ||
      (prevQuote.change ?? null) !== (nextQuote.change ?? null) ||
      (prevQuote.changePercent ?? null) !== (nextQuote.changePercent ?? null) ||
      (prevQuote.high ?? null) !== (nextQuote.high ?? null) ||
      (prevQuote.low ?? null) !== (nextQuote.low ?? null) ||
      (prevQuote.open ?? null) !== (nextQuote.open ?? null) ||
      (prevQuote.previousClose ?? null) !== (nextQuote.previousClose ?? null) ||
      (prevQuote.volume ?? null) !== (nextQuote.volume ?? null)
    ) {
      return false;
    }

    const prevTimestamp = prevQuote.timestamp
      ? prevQuote.timestamp.getTime()
      : null;
    const nextTimestamp = nextQuote.timestamp
      ? nextQuote.timestamp.getTime()
      : null;
    if (prevTimestamp !== nextTimestamp) {
      return false;
    }
  }

  return true;
};

export interface UseLiveMarketQuotesOptions {
  assetClass: AssetClass;
  symbols: string[];
  refreshIntervalMs?: number;
}

export interface LiveMarketQuotesState {
  quotes: Record<string, LiveMarketQuote>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useLiveMarketQuotes(
  options: UseLiveMarketQuotesOptions,
): LiveMarketQuotesState {
  const { assetClass, symbols, refreshIntervalMs = REFRESH_INTERVAL_MS } =
    options;
  const [quotes, setQuotes] = useState<Record<string, LiveMarketQuote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const latestQuotesRef = useRef<Record<string, LiveMarketQuote>>({});
  const [effectiveRefreshInterval, setEffectiveRefreshInterval] = useState(
    () => {
      if (refreshIntervalMs <= 0) {
        return 0;
      }
      if (typeof document === "undefined" || !document.hidden) {
        return refreshIntervalMs;
      }
      return Math.max(refreshIntervalMs, BACKGROUND_REFRESH_INTERVAL_MS);
    },
  );

  const requestSymbols = useMemo(() => {
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const symbol of symbols) {
      const trimmed = symbol.trim();
      if (!trimmed) {
        continue;
      }
      const normalized = normalizeSymbol(trimmed);
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      deduped.push(trimmed);
    }
    return deduped;
  }, [symbols]);

  const symbolsKey = useMemo(
    () =>
      requestSymbols.map((symbol) => normalizeSymbol(symbol)).sort().join(","),
    [requestSymbols],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchQuotes = useCallback(async () => {
    if (requestSymbols.length === 0 || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isMountedRef.current) {
      setIsRefreshing(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        class: assetClass,
        symbols: requestSymbols.join(","),
      });
      const response = await fetch(`/api/market?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Market feed unavailable (${response.status})`);
      }

      const payload = await response.json() as MarketApiPayload;
      const nextQuotes: Record<string, LiveMarketQuote> = {};
      for (const quote of payload.quotes) {
        const key = normalizeSymbol(quote.requestSymbol ?? quote.sourceSymbol);
        nextQuotes[key] = {
          ...quote,
          timestamp: quote.timestamp ? new Date(quote.timestamp) : null,
        };
      }

      if (isMountedRef.current) {
        if (!areQuoteRecordsEqual(latestQuotesRef.current, nextQuotes)) {
          latestQuotesRef.current = nextQuotes;
          setQuotes(nextQuotes);
        }
        setLastUpdated(new Date());
        setError(
          payload.errors && payload.errors.length > 0
            ? payload.errors.join("; ")
            : null,
        );
      }
    } catch (marketError) {
      if (
        marketError instanceof DOMException && marketError.name === "AbortError"
      ) {
        return;
      }

      if (isMountedRef.current) {
        setError(
          marketError instanceof Error
            ? marketError.message
            : "Unknown market feed error",
        );
      }
    } finally {
      inFlightRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [assetClass, requestSymbols, symbolsKey]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    if (refreshIntervalMs <= 0) {
      setEffectiveRefreshInterval(0);
      return () => {};
    }

    const computeInterval = () => {
      if (typeof document === "undefined" || !document.hidden) {
        return refreshIntervalMs;
      }
      return Math.max(refreshIntervalMs, BACKGROUND_REFRESH_INTERVAL_MS);
    };

    setEffectiveRefreshInterval(computeInterval());

    if (typeof document === "undefined") {
      return () => {};
    }

    const handleVisibilityChange = () => {
      setEffectiveRefreshInterval(computeInterval());
      if (!document.hidden) {
        void fetchQuotes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchQuotes, refreshIntervalMs]);

  useEffect(() => {
    if (effectiveRefreshInterval <= 0) {
      return () => {};
    }

    const interval = window.setInterval(() => {
      fetchQuotes();
    }, effectiveRefreshInterval);

    return () => {
      window.clearInterval(interval);
    };
  }, [effectiveRefreshInterval, fetchQuotes]);

  const refresh = useCallback(() => {
    if (!inFlightRef.current) {
      void fetchQuotes();
    }
  }, [fetchQuotes]);

  return useMemo(
    () => ({ quotes, isLoading, isRefreshing, error, lastUpdated, refresh }),
    [quotes, isLoading, isRefreshing, error, lastUpdated, refresh],
  );
}
