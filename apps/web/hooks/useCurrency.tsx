"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { callEdgeFunction } from "@/config/supabase";

interface FrankfurterResponse {
  rates?: {
    MVR?: number;
  };
}

type ContentBatchItem = {
  content_key?: string | null;
  content_value?: string | null;
};

type ContentBatchResponse = {
  contents?: ContentBatchItem[];
};

// Client-only hook: accesses window and localStorage

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState(() => {
    if (typeof globalThis.window !== "undefined") {
      // Initialize from URL params, then localStorage, then default
      const urlParams = new URLSearchParams(globalThis.location.search);
      const urlCurrency = urlParams.get("cur");
      if (urlCurrency && ["USD", "MVR"].includes(urlCurrency)) {
        return urlCurrency;
      }

      const stored = localStorage.getItem("preferred_currency");
      return stored && ["USD", "MVR"].includes(stored) ? stored : "USD";
    }
    return "USD";
  });

  const [exchangeRate, setExchangeRate] = useState(() => {
    if (typeof globalThis.window !== "undefined") {
      const cached = localStorage.getItem("usd_mvr_rate");
      const cacheTime = localStorage.getItem("usd_mvr_rate_time");

      // Use cached rate if less than 1 hour old
      if (
        cached &&
        cacheTime &&
        (Date.now() - parseInt(cacheTime, 10)) < 3600000
      ) {
        return parseFloat(cached);
      }
    }
    return 17.5; // Default fallback
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch exchange rate on mount if not cached or expired
  useEffect(() => {
    const cached = localStorage.getItem("usd_mvr_rate");
    const cacheTime = localStorage.getItem("usd_mvr_rate_time");

    if (
      cached &&
      cacheTime &&
      (Date.now() - parseInt(cacheTime, 10)) < 3600000
    ) {
      return;
    }

    let isMounted = true;

    const persistRate = (rate: number) => {
      if (!isMounted) return;
      setExchangeRate(rate);
      localStorage.setItem("usd_mvr_rate", rate.toString());
      localStorage.setItem("usd_mvr_rate_time", Date.now().toString());
    };

    const fetchFrankfurterRate = async (): Promise<number | null> => {
      try {
        const response = await fetch(
          "https://api.frankfurter.app/latest?amount=1&from=USD&to=MVR",
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          return null;
        }

        const json = (await response.json()) as FrankfurterResponse;
        const rate = json.rates?.MVR;
        return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
      } catch {
        return null;
      }
    };

    const fetchRate = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await callEdgeFunction<ContentBatchResponse>(
          "CONTENT_BATCH",
          {
            method: "POST",
            body: { keys: ["usd_mvr_rate"] },
          },
        );

        if (!error) {
          const rateContent = data?.contents?.find((item): item is Required<
            Pick<ContentBatchItem, "content_key" | "content_value">
          > => item?.content_key === "usd_mvr_rate");

          if (rateContent) {
            const rate = parseFloat(rateContent.content_value ?? "");
            if (!Number.isNaN(rate) && Number.isFinite(rate)) {
              persistRate(rate);
              return;
            }
          }
        }
      } catch {
        // ignore and fall back to Frankfurter
      }

      const frankfurterRate = await fetchFrankfurterRate();
      if (frankfurterRate !== null) {
        persistRate(frankfurterRate);
      }
    };

    void fetchRate().finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    if (typeof globalThis.window !== "undefined") {
      localStorage.setItem("preferred_currency", newCurrency);

      // Update URL parameter
      const url = new URL(globalThis.location.href);
      url.searchParams.set("cur", newCurrency);
      globalThis.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate,
        setExchangeRate,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
