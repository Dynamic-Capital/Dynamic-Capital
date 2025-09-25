"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Column,
  Heading,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { formatIsoTime } from "@/utils/isoFormat";

const REFRESH_INTERVAL_MS = 60_000;

const AWESOME_CODES = ["XAU-USD", "EUR-USD", "BTC-USD"] as const;

const AWESOME_ENDPOINT = `https://economia.awesomeapi.com.br/last/${
  AWESOME_CODES.join(",")
}`;

const CATEGORIES = ["Forex", "Crypto", "Commodities"] as const;

type MarketCategory = (typeof CATEGORIES)[number];

type MarketAsset = {
  id: string;
  name: string;
  displaySymbol: string;
  tickerLabel: string;
  category: MarketCategory;
  source: "awesome" | "yahoo";
  awesomeCode?: (typeof AWESOME_CODES)[number];
  awesomeKey?: string;
  yahooSymbol?: string;
  format: Intl.NumberFormatOptions;
};

type AwesomeQuoteResponse = {
  bid?: string;
  pctChange?: string;
  create_date?: string;
};

type AwesomeResponse = Record<string, AwesomeQuoteResponse>;

type AwesomeHistoryEntry = {
  bid?: string;
  timestamp?: string;
  create_date?: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type AssetQuote = {
  price: number | null;
  changePercent: number | null;
  sparkline: number[];
  lastUpdated: Date | null;
};

type QuoteMap = Record<string, AssetQuote>;

type MarketLoadResult = {
  quotes: QuoteMap;
  lastUpdated: Date | null;
};

const ASSETS: MarketAsset[] = [
  {
    id: "EURUSD",
    name: "Euro vs US dollar",
    displaySymbol: "EUR/USD",
    tickerLabel: "EUR/USD",
    category: "Forex",
    source: "awesome",
    awesomeCode: "EUR-USD",
    awesomeKey: "EURUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "BTCUSD",
    name: "Bitcoin",
    displaySymbol: "BTC/USD",
    tickerLabel: "BTC",
    category: "Crypto",
    source: "awesome",
    awesomeCode: "BTC-USD",
    awesomeKey: "BTCUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  {
    id: "XAUUSD",
    name: "Gold",
    displaySymbol: "XAU/USD",
    tickerLabel: "Gold",
    category: "Commodities",
    source: "awesome",
    awesomeCode: "XAU-USD",
    awesomeKey: "XAUUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "ES_F",
    name: "S&P 500 index",
    displaySymbol: "S&P 500",
    tickerLabel: "S&P 500",
    category: "Commodities",
    source: "yahoo",
    yahooSymbol: "ES=F",
    format: {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
];

const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const getFormatter = (options: Intl.NumberFormatOptions) => {
  const key = JSON.stringify(options);
  const cached = NUMBER_FORMATTER_CACHE.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat("en-US", options);
  NUMBER_FORMATTER_CACHE.set(key, formatter);
  return formatter;
};

const formatNumber = (
  value: number | null,
  options: Intl.NumberFormatOptions,
) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return getFormatter(options).format(value);
};

const formatChangePercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  const absolute = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${absolute}%`;
  }
  if (value < 0) {
    return `-${absolute}%`;
  }
  return `${absolute}%`;
};

const parseNumber = (value?: string | number | null): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number"
    ? value
    : Number.parseFloat(value as string);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTimestamp = (value?: string | number | null): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value * 1000 : undefined;
  }
  const normalized = `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildSparklinePath = (
  values: number[],
  width: number,
  height: number,
) => {
  if (values.length === 0) {
    return { path: "", lastPoint: null } as const;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  let path = "";
  values.forEach((value, index) => {
    const x = index * step;
    const normalized = (value - min) / range;
    const y = height - normalized * height;
    path += `${index === 0 ? "M" : "L"}${x},${y}`;
  });

  const lastValue = values[values.length - 1];
  const lastNormalized = (lastValue - min) / range;
  const lastY = height - lastNormalized * height;
  const lastX = (values.length - 1) * step;

  return { path, lastPoint: { x: lastX, y: lastY } } as const;
};

const loadMarketQuotes = async (
  signal?: AbortSignal,
): Promise<MarketLoadResult> => {
  const quotes: QuoteMap = Object.fromEntries(
    ASSETS.map((asset) => [
      asset.id,
      {
        price: null,
        changePercent: null,
        sparkline: [],
        lastUpdated: null,
      },
    ]),
  );

  let latestTimestamp: number | undefined;

  const awesomeAssets = ASSETS.filter((asset) => asset.source === "awesome");

  if (awesomeAssets.length > 0) {
    const response = await fetch(AWESOME_ENDPOINT, {
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch market data (${response.status})`);
    }

    const payload = (await response.json()) as AwesomeResponse;

    const historyEntries = await Promise.all(
      awesomeAssets.map(async (asset) => {
        if (!asset.awesomeCode) {
          return {
            id: asset.id,
            series: [] as number[],
            latest: undefined as number | undefined,
          };
        }

        const historyResponse = await fetch(
          `https://economia.awesomeapi.com.br/${asset.awesomeCode}/30`,
          {
            cache: "no-store",
            signal,
          },
        );

        if (!historyResponse.ok) {
          return {
            id: asset.id,
            series: [] as number[],
            latest: undefined as number | undefined,
          };
        }

        const historyPayload =
          (await historyResponse.json()) as AwesomeHistoryEntry[];
        const points = historyPayload
          .map((entry) => {
            const value = parseNumber(entry.bid);
            const timestampSeconds = parseNumber(entry.timestamp);
            const timestamp = timestampSeconds !== null
              ? timestampSeconds * 1000
              : parseTimestamp(entry.create_date);
            if (value === null || timestamp === undefined) {
              return null;
            }
            return { timestamp, value };
          })
          .filter((entry): entry is { timestamp: number; value: number } =>
            Boolean(entry)
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        const series = points.map((point) => point.value);
        const latest = points.length
          ? points[points.length - 1].timestamp
          : undefined;
        return { id: asset.id, series, latest };
      }),
    );

    const historyMap = new Map(
      historyEntries.map((entry) => [entry.id, entry]),
    );

    for (const asset of awesomeAssets) {
      if (!asset.awesomeKey) {
        continue;
      }
      const quote = payload[asset.awesomeKey];
      const state = quotes[asset.id];
      if (!quote || !state) {
        continue;
      }
      const price = parseNumber(quote.bid);
      const changePercent = parseNumber(quote.pctChange);
      const updated = parseTimestamp(quote.create_date);
      const history = historyMap.get(asset.id);

      state.price = price;
      state.changePercent = changePercent;
      state.sparkline = history?.series ?? [];
      state.lastUpdated = updated
        ? new Date(updated)
        : history?.latest
        ? new Date(history.latest)
        : null;

      if (updated && (!latestTimestamp || updated > latestTimestamp)) {
        latestTimestamp = updated;
      } else if (
        !updated && history?.latest &&
        (!latestTimestamp || history.latest > latestTimestamp)
      ) {
        latestTimestamp = history.latest;
      }
    }
  }

  const yahooAsset = ASSETS.find((asset) => asset.source === "yahoo");
  if (yahooAsset) {
    const symbol = encodeURIComponent(yahooAsset.yahooSymbol ?? "ES=F");
    const endpoint =
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=15m`;
    const response = await fetch(endpoint, { cache: "no-store", signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch S&P 500 data (${response.status})`);
    }
    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const quote = quotes[yahooAsset.id];

    if (result && quote) {
      const price = parseNumber(result.meta?.regularMarketPrice ?? null);
      const previous = parseNumber(result.meta?.previousClose ?? null) ??
        parseNumber(result.meta?.chartPreviousClose ?? null);
      const timestamp = result.meta?.regularMarketTime
        ? result.meta.regularMarketTime * 1000
        : undefined;
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      const times = result.timestamp ?? [];

      const points = closes
        .map((value, index) => {
          if (
            value === null || value === undefined || !Number.isFinite(value)
          ) {
            return null;
          }
          const time = times[index];
          if (time === undefined) {
            return null;
          }
          return { timestamp: time * 1000, value };
        })
        .filter((entry): entry is { timestamp: number; value: number } =>
          Boolean(entry)
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      const latestPoint = points.length
        ? points[points.length - 1].timestamp
        : undefined;
      quote.price = price;
      quote.sparkline = points.map((point) => point.value);
      quote.lastUpdated = timestamp
        ? new Date(timestamp)
        : latestPoint
        ? new Date(latestPoint)
        : quote.lastUpdated;

      quote.changePercent =
        price !== null && previous !== null && previous !== 0
          ? ((price - previous) / previous) * 100
          : null;

      if (timestamp && (!latestTimestamp || timestamp > latestTimestamp)) {
        latestTimestamp = timestamp;
      } else if (
        !timestamp && latestPoint &&
        (!latestTimestamp || latestPoint > latestTimestamp)
      ) {
        latestTimestamp = latestPoint;
      }
    }
  }

  return {
    quotes,
    lastUpdated: latestTimestamp ? new Date(latestTimestamp) : null,
  };
};

const getStatusLabel = (updatedAt: Date | null, isFetching: boolean) => {
  if (!updatedAt && isFetching) {
    return "Fetching live prices…";
  }
  if (isFetching) {
    return "Syncing live prices…";
  }
  if (updatedAt) {
    return `Synced ${formatIsoTime(updatedAt)}`;
  }
  return "Waiting for live feed…";
};

const Sparkline = ({
  data,
  positive,
}: {
  data: number[];
  positive: boolean | null;
}) => {
  const width = 120;
  const height = 40;
  const { path, lastPoint } = useMemo(
    () => buildSparklinePath(data, width, height),
    [data],
  );

  const strokeColor = positive === null
    ? "var(--color-neutral-strong, #71717a)"
    : positive
    ? "var(--color-brand-strong, #2563eb)"
    : "var(--color-danger-strong, #ef4444)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={strokeColor}
        />
      )}
    </svg>
  );
};

export function MarketWatchlist() {
  const [quotes, setQuotes] = useState<QuoteMap>(() =>
    Object.fromEntries(
      ASSETS.map((asset) => [
        asset.id,
        {
          price: null,
          changePercent: null,
          sparkline: [],
          lastUpdated: null,
        },
      ]),
    )
  );
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<MarketCategory>("Forex");
  const [isInViewport, setIsInViewport] = useState(false);
  const [hasViewportEntry, setHasViewportEntry] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden
  );

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      setHasViewportEntry(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry) {
          setIsInViewport(entry.isIntersecting);
          setHasViewportEntry(true);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const shouldPollViewport = hasViewportEntry ? isInViewport : true;
  const isActive = shouldPollViewport && isDocumentVisible;

  const refreshQuotes = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (isMountedRef.current) {
      setIsFetching(true);
    }

    try {
      const { quotes: latestQuotes, lastUpdated } = await loadMarketQuotes(
        controller.signal,
      );
      if (!isMountedRef.current) {
        return;
      }
      setQuotes(latestQuotes);
      setUpdatedAt(lastUpdated ?? new Date());
      setError(null);
    } catch (fetchError) {
      if (
        fetchError instanceof DOMException && fetchError.name === "AbortError"
      ) {
        return;
      }
      if (isMountedRef.current) {
        setError(
          "Unable to sync live prices right now. We will retry automatically.",
        );
      }
    } finally {
      inFlightRef.current = false;
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      return;
    }

    abortControllerRef.current?.abort();
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void refreshQuotes();
    const intervalId = setInterval(() => {
      void refreshQuotes();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, refreshQuotes]);

  const statusLabel = useMemo(() => {
    if (!isDocumentVisible) {
      return "Updates paused (tab inactive)";
    }
    if (hasViewportEntry && !isInViewport) {
      return "Scroll to load live prices";
    }
    return getStatusLabel(updatedAt, isFetching);
  }, [
    hasViewportEntry,
    isInViewport,
    isDocumentVisible,
    updatedAt,
    isFetching,
  ]);

  const tickerItems = useMemo(() => {
    const items = [
      { id: "BTCUSD", label: "BTC" },
      { id: "XAUUSD", label: "Gold" },
      { id: "EURUSD", label: "EUR/USD" },
    ];
    return items.map(({ id, label }) => {
      const quote = quotes[id];
      const change = quote?.changePercent ?? null;
      const text = formatChangePercent(change);
      const positive = change === null ? null : change >= 0;
      return { id, label, text, positive };
    });
  }, [quotes]);

  const visibleAssets = useMemo(
    () => ASSETS.filter((asset) => asset.category === activeCategory),
    [activeCategory],
  );

  return (
    <Column
      ref={sectionRef}
      id="market-watchlist"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <div className="ticker" role="marquee" aria-label="Live market ticker">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className="ticker-item"
              data-trend={item.positive === null
                ? "neutral"
                : item.positive
                ? "positive"
                : "negative"}
            >
              <span className="ticker-label">{item.label}</span>
              <span className="ticker-change">{item.text}</span>
            </span>
          ))}
        </div>
      </div>
      <Column gap="16" maxWidth={32}>
        <Heading variant="display-strong-xs">Live market watchlist</Heading>
        <Column gap="8">
          <Text variant="body-default-l" onBackground="neutral-weak">
            Follow spot levels, day change and intraday rhythm for the desks we
            track the most. Switch between asset classes to focus the live feed
            and lean on the sparklines for a quick read on momentum.
          </Text>
          <Row gap="8" wrap>
            <Tag size="s" prefixIcon="clock">Maldives Time (MVT)</Tag>
            <Tag size="s" prefixIcon="repeat">Updates every 60 seconds</Tag>
          </Row>
        </Column>
        <Row gap="8" vertical="center" wrap>
          <Tag size="s">{statusLabel}</Tag>
          {error
            ? (
              <Text variant="label-default-s" onBackground="danger-strong">
                {error}
              </Text>
            )
            : null}
        </Row>
      </Column>
      <Column gap="16">
        <Row gap="8" wrap>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className="watchlist-tab"
              data-active={category === activeCategory}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </Row>
        <Line background="neutral-alpha-weak" />
        <div className="asset-grid">
          {visibleAssets.map((asset) => {
            const quote = quotes[asset.id];
            const change = quote?.changePercent ?? null;
            const positive = change === null ? null : change >= 0;
            return (
              <div key={asset.id} className="asset-card">
                <div className="asset-header">
                  <div className="asset-title">
                    <Heading variant="heading-strong-m">
                      {asset.displaySymbol}
                    </Heading>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {asset.name}
                    </Text>
                  </div>
                  <div className="asset-price">
                    <Text variant="heading-strong-m" align="right">
                      {formatNumber(quote?.price ?? null, asset.format)}
                    </Text>
                    <Tag
                      size="s"
                      background={positive === null
                        ? "neutral-alpha-weak"
                        : positive
                        ? "brand-alpha-weak"
                        : "danger-alpha-weak"}
                      onBackground={positive === null
                        ? "neutral-strong"
                        : positive
                        ? "brand-strong"
                        : "danger-strong"}
                    >
                      {formatChangePercent(change)}
                    </Tag>
                  </div>
                </div>
                <div className="sparkline">
                  <Sparkline
                    data={quote?.sparkline ?? []}
                    positive={positive}
                  />
                </div>
                <Text variant="label-default-s" onBackground="neutral-weak">
                  {quote?.lastUpdated
                    ? `Last update ${formatIsoTime(quote.lastUpdated)}`
                    : "Waiting for live price"}
                </Text>
              </div>
            );
          })}
        </div>
      </Column>
      <Text variant="body-default-s" onBackground="neutral-weak">
        Quotes stream from AwesomeAPI for FX, crypto and metals plus Yahoo
        Finance for S&P futures. Data refreshes every minute while this widget
        stays visible.
      </Text>
      <style jsx>
        {`
        .ticker {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.16);
        }
        .ticker-track {
          display: inline-flex;
          align-items: center;
          gap: 32px;
          padding: 8px 16px;
          white-space: nowrap;
          animation: ticker-scroll 18s linear infinite;
        }
        .ticker-item {
          display: inline-flex;
          align-items: baseline;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
        }
        .ticker-item[data-trend="positive"] {
          color: #166534;
        }
        .ticker-item[data-trend="negative"] {
          color: #b91c1c;
        }
        .ticker-label {
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .watchlist-tab {
          border: none;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 600;
          background: rgba(30, 41, 59, 0.1);
          color: #1e293b;
          transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .watchlist-tab[data-active="true"] {
          background: rgba(37, 99, 235, 0.2);
          color: #1d4ed8;
          transform: translateY(-1px);
        }
        .watchlist-tab:focus-visible {
          outline: 2px solid rgba(37, 99, 235, 0.4);
          outline-offset: 2px;
        }
        .asset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          width: 100%;
        }
        .asset-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 18px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        }
        .asset-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .asset-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .asset-price {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }
        .sparkline {
          width: 100%;
          height: 40px;
        }
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (max-width: 768px) {
          .ticker-track {
            animation-duration: 22s;
          }
          .asset-card {
            padding: 16px;
          }
        }
      `}
      </style>
    </Column>
  );
}

export default MarketWatchlist;
