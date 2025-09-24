"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Column, Heading, Line, Row, Tag, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";
import { formatIsoTime } from "@/utils/isoFormat";

interface MarketWatchlistItem {
  symbol: string;
  displaySymbol: string;
  name: string;
  category: InstrumentCategory;
  session: string;
  focus: string;
  beginnerTip: string;
  bias: "Long" | "Short" | "Monitoring";
  dataKey: string;
  format: Intl.NumberFormatOptions;
}

type InstrumentCategory = "Crypto" | "FX" | "Metals" | "Indices";

type MarketQuote = {
  last: number;
  changePercent: number;
  high: number;
  low: number;
};

type BiasVisual = {
  label: string;
  background: `${"brand" | "danger" | "neutral"}-alpha-${"weak" | "medium"}`;
  onBackground: `${"brand" | "danger" | "neutral"}-${"weak" | "medium" | "strong"}`;
};

type CategoryVisual = {
  icon: IconName;
  label: string;
};

type MarketApiQuote = {
  bid?: string;
  pctChange?: string;
  high?: string;
  low?: string;
  create_date?: string;
};

type MarketApiResponse = Record<string, MarketApiQuote>;

const REFRESH_INTERVAL_MS = 60_000;

const CATEGORY_DETAILS: Record<InstrumentCategory, CategoryVisual> = {
  Crypto: { icon: "sparkles", label: "Crypto" },
  FX: { icon: "globe", label: "FX majors" },
  Metals: { icon: "sparkles", label: "Metals" },
  Indices: { icon: "grid", label: "Indices" },
};

const BIAS_DETAILS: Record<MarketWatchlistItem["bias"], BiasVisual> = {
  Long: {
    label: "Long bias",
    background: "brand-alpha-weak",
    onBackground: "brand-strong",
  },
  Short: {
    label: "Short bias",
    background: "danger-alpha-weak",
    onBackground: "danger-strong",
  },
  Monitoring: {
    label: "Monitoring",
    background: "neutral-alpha-weak",
    onBackground: "neutral-strong",
  },
};

const WATCHLIST: MarketWatchlistItem[] = [
  {
    symbol: "XAUUSD",
    displaySymbol: "XAU/USD",
    name: "Spot gold",
    category: "Metals",
    session: "Asia accumulation",
    focus:
      "Risk-off flows keep gold bid; running partial hedge overlay with alerts for a break of $2,400 support to flip defensive.",
    beginnerTip:
      "Gold is the safety trade. We stay cautious if price slips under $2,400 and look for steadier moves before adding risk.",
    bias: "Monitoring",
    dataKey: "XAUUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    symbol: "DXY",
    displaySymbol: "DXY",
    name: "US Dollar Index",
    category: "Indices",
    session: "Global dollar flows",
    focus:
      "Watching rate expectations and Treasury auctions for momentum cues. Dollar strength keeps risk desks defensive on global beta.",
    beginnerTip:
      "When the dollar index rises, other currencies and risk assets usually cool off. Strong DXY means scale position sizes down.",
    bias: "Long",
    dataKey: "DXY",
    format: {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    symbol: "USDJPY",
    displaySymbol: "USD/JPY",
    name: "US dollar vs Japanese yen",
    category: "FX",
    session: "Tokyo carry unwind",
    focus:
      "Tracking MoF rhetoric and US yields for timing on fresh shorts. Alerted automation for spikes sub 147.00 as risk trigger.",
    beginnerTip:
      "A falling USD/JPY means the yen is getting stronger. Quick drops toward 147 are our cue to slow down and reassess entries.",
    bias: "Monitoring",
    dataKey: "USDJPY",
    format: {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    symbol: "GBPUSD",
    displaySymbol: "GBP/USD",
    name: "British pound vs US dollar",
    category: "FX",
    session: "London spot flow",
    focus:
      "Watching BoE commentary and US data for continuation shorts while price is capped below key weekly supply near 1.36.",
    beginnerTip:
      "Sellers stay in control while GBP/USD holds below 1.36. Keep any long ideas small and respect the broader downtrend.",
    bias: "Short",
    dataKey: "GBPUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    symbol: "BTCUSD",
    displaySymbol: "BTC/USD",
    name: "Bitcoin spot",
    category: "Crypto",
    session: "London momentum",
    focus:
      "Scaling automation on the $64k breakout shelf while funding stays balanced. Monitoring for exhaustion near $66k liquidity.",
    beginnerTip:
      "Bitcoin pushing above $64k keeps bullish momentum alive, but we plan exits near $66k in case buyers tire out.",
    bias: "Long",
    dataKey: "BTCUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  {
    symbol: "ETHUSD",
    displaySymbol: "ETH/USD",
    name: "Ether spot",
    category: "Crypto",
    session: "US overlap",
    focus:
      "Looking for acceptance above $3.1k to continue the weekly trend. Mentors tightening invalidation beneath $2.95k swing lows.",
    beginnerTip:
      "Ether needs to hold above $3.1k to confirm the uptrend. Below $2.95k we step aside and wait for clarity.",
    bias: "Long",
    dataKey: "ETHUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
];

const MARKET_CODES = [
  "XAU-USD",
  "GBP-USD",
  "USD-JPY",
  "EUR-USD",
  "USD-CAD",
  "USD-SEK",
  "USD-CHF",
  "BTC-USD",
  "ETH-USD",
];

const DXY_COMPOSITION: Array<{ key: string; exponent: number }> = [
  { key: "EURUSD", exponent: -0.576 },
  { key: "USDJPY", exponent: 0.136 },
  { key: "GBPUSD", exponent: -0.119 },
  { key: "USDCAD", exponent: 0.091 },
  { key: "USDSEK", exponent: 0.042 },
  { key: "USDCHF", exponent: 0.036 },
];

const MARKET_ENDPOINT = `https://economia.awesomeapi.com.br/last/${MARKET_CODES.join(",")}`;

const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const formatChangePercent = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
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

const formatNumber = (value: number | undefined, options: Intl.NumberFormatOptions) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return getFormatter(options).format(value);
};

const formatRange = (quote: MarketQuote | undefined, options: Intl.NumberFormatOptions) => {
  if (!quote) {
    return "—";
  }
  if (!Number.isFinite(quote.low) || !Number.isFinite(quote.high)) {
    return "—";
  }
  const low = formatNumber(quote.low, options);
  const high = formatNumber(quote.high, options);
  if (low === "—" || high === "—") {
    return "—";
  }
  return `${low} – ${high}`;
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseTimestamp = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const computeDxyQuote = (quotes: Record<string, MarketQuote>): MarketQuote | undefined => {
  const base = 50.14348112;
  let last = base;
  let high = base;
  let low = base;
  let changeDecimal = 0;

  for (const { key, exponent } of DXY_COMPOSITION) {
    const quote = quotes[key];
    if (!quote) {
      return undefined;
    }

    const rate = quote.last;
    const highRate = exponent >= 0 ? quote.high : quote.low;
    const lowRate = exponent >= 0 ? quote.low : quote.high;

    if (
      rate === undefined ||
      highRate === undefined ||
      lowRate === undefined ||
      !Number.isFinite(rate) ||
      !Number.isFinite(highRate) ||
      !Number.isFinite(lowRate)
    ) {
      return undefined;
    }

    last *= Math.pow(rate, exponent);
    high *= Math.pow(highRate, exponent);
    low *= Math.pow(lowRate, exponent);
    changeDecimal += exponent * (quote.changePercent / 100);
  }

  const computedHigh = Math.max(high, low);
  const computedLow = Math.min(high, low);

  if (!Number.isFinite(last) || !Number.isFinite(computedHigh) || !Number.isFinite(computedLow)) {
    return undefined;
  }

  return {
    last,
    high: computedHigh,
    low: computedLow,
    changePercent: changeDecimal * 100,
  };
};

const loadMarketQuotes = async (): Promise<{ quotes: Record<string, MarketQuote>; lastUpdated: Date | null }> => {
  const response = await fetch(MARKET_ENDPOINT, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch market data (${response.status})`);
  }

  const payload = (await response.json()) as MarketApiResponse;
  const quotes: Record<string, MarketQuote> = {};
  let latestTimestamp: number | undefined;

  for (const [key, value] of Object.entries(payload)) {
    const last = parseNumber(value.bid);
    const changePercent = parseNumber(value.pctChange);
    const high = parseNumber(value.high);
    const low = parseNumber(value.low);

    if (
      last === undefined ||
      changePercent === undefined ||
      high === undefined ||
      low === undefined
    ) {
      continue;
    }

    quotes[key] = {
      last,
      changePercent,
      high,
      low,
    };

    const timestamp = parseTimestamp(value.create_date);
    if (timestamp !== undefined) {
      latestTimestamp = latestTimestamp ? Math.max(latestTimestamp, timestamp) : timestamp;
    }
  }

  const dxy = computeDxyQuote(quotes);
  if (dxy) {
    quotes.DXY = dxy;
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

export function MarketWatchlist() {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const refreshQuotes = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    if (isMountedRef.current) {
      setIsFetching(true);
    }

    try {
      const { quotes: latestQuotes, lastUpdated } = await loadMarketQuotes();
      if (!isMountedRef.current) {
        return;
      }
      setQuotes(latestQuotes);
      setUpdatedAt(lastUpdated ?? new Date());
      setError(null);
    } catch (fetchError) {
      if (isMountedRef.current) {
        setError("Unable to sync live prices right now. We will retry automatically.");
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshQuotes();
    const intervalId = setInterval(() => {
      void refreshQuotes();
    }, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshQuotes]);

  const statusLabel = useMemo(() => getStatusLabel(updatedAt, isFetching), [updatedAt, isFetching]);

  return (
    <Column
      id="market-watchlist"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="16" maxWidth={32}>
        <Heading variant="display-strong-xs">Live market watchlist</Heading>
        <Column gap="8">
          <Text variant="body-default-l" onBackground="neutral-weak">
            New to the markets? Start with the quick takeaways in each card. We refresh prices automatically so you always see
            the latest levels the desk is working with.
          </Text>
          <Row gap="8" wrap>
            <Tag size="s" prefixIcon="clock">Maldives Time (MVT)</Tag>
            <Tag size="s" prefixIcon="repeat">Updates every 60 seconds</Tag>
          </Row>
        </Column>
        <Row gap="8" vertical="center" wrap>
          <Tag size="s">{statusLabel}</Tag>
          {error ? (
            <Text variant="label-default-s" onBackground="danger-strong">
              {error}
            </Text>
          ) : null}
        </Row>
      </Column>
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {WATCHLIST.map((item) => {
          const category = CATEGORY_DETAILS[item.category];
          const bias = BIAS_DETAILS[item.bias];
          const quote = quotes[item.dataKey];
          const changeValue = quote?.changePercent;
          const changePositive = changeValue !== undefined ? changeValue >= 0 : undefined;
          const changeBackground = changePositive === undefined
            ? "neutral-alpha-weak"
            : changePositive
              ? "brand-alpha-weak"
              : "danger-alpha-weak";
          const changeForeground = changePositive === undefined
            ? "neutral-strong"
            : changePositive
              ? "brand-strong"
              : "danger-strong";

          return (
            <Column
              key={item.symbol}
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="16"
              style={{ minWidth: "280px", scrollSnapAlign: "start" }}
            >
              <Row horizontal="between" vertical="center" gap="12" s={{ direction: "column", align: "start" }}>
                <Column gap="8">
                  <Row gap="8" vertical="center" wrap>
                    <Heading variant="heading-strong-m">{item.displaySymbol}</Heading>
                    <Tag size="s" prefixIcon={category.icon}>
                      {category.label}
                    </Tag>
                    <Tag size="s" background={bias.background} onBackground={bias.onBackground}>
                      {bias.label}
                    </Tag>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {item.name}
                  </Text>
                </Column>
                <Column gap="8" horizontal="end" align="end">
                  <Row gap="12" vertical="center">
                    <Text variant="heading-strong-m" align="right">
                      {formatNumber(quote?.last, item.format)}
                    </Text>
                    <Tag size="s" background={changeBackground} onBackground={changeForeground}>
                      {formatChangePercent(changeValue)}
                    </Tag>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak" align="right">
                    24h change
                  </Text>
                </Column>
              </Row>
              <Line background="neutral-alpha-weak" />
              <Row gap="16" wrap>
                <Column minWidth={16} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Session focus
                  </Text>
                  <Tag size="s" prefixIcon="sparkles">
                    {item.session}
                  </Tag>
                </Column>
                <Column minWidth={16} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Intraday range
                  </Text>
                  <Text variant="body-default-m">{formatRange(quote, item.format)}</Text>
                </Column>
                <Column flex={1} minWidth={24} gap="8" background="brand-alpha-weak" padding="m" radius="m">
                  <Text variant="label-default-s" onBackground="brand-strong">
                    Quick takeaway
                  </Text>
                  <Text variant="body-default-s" onBackground="brand-strong">
                    {item.beginnerTip}
                  </Text>
                </Column>
                <Column flex={1} minWidth={24} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Strategy focus
                  </Text>
                  <Text variant="body-default-m">{item.focus}</Text>
                </Column>
              </Row>
            </Column>
          );
        })}
      </div>
      <Text variant="body-default-s" onBackground="neutral-weak">
        Quotes stream from AwesomeAPI and refresh every 60 seconds while you keep this dashboard open. Guidance updates alongside
        each global session so execution, automation triggers, and risk adjustments stay aligned with the desk.
      </Text>
    </Column>
  );
}

export default MarketWatchlist;
