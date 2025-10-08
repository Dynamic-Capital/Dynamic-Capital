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

const REFRESH_INTERVAL_MS = 60_000;

const normalizeSymbol = (symbol: string) => symbol.trim().toLowerCase();

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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0 || inFlightRef.current) {
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
        symbols: symbols.join(","),
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
        setQuotes(nextQuotes);
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
  }, [assetClass, symbols]);

  useEffect(() => {
    fetchQuotes();
    if (refreshIntervalMs <= 0) {
      return () => {};
    }

    const interval = window.setInterval(() => {
      fetchQuotes();
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchQuotes, refreshIntervalMs]);

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
