"use client";

import {
  Column,
  Heading,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { Colors } from "@/components/dynamic-ui-system";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatIsoTime } from "@/utils/isoFormat";

type CurrencyStrength = {
  code: string;
  rank: number;
  tone: "strong" | "balanced" | "soft";
  summary: string;
};

type TopMover = {
  symbol: string;
  pair: string;
  changePercent: number;
  change: number;
  pips: number;
  lastPrice: number;
};

type CurrencyVolatility = {
  code: string;
  rank: number;
  summary: string;
};

type VolatilityPair = {
  symbol: string;
  pair: string;
  rangePercent: number;
};

type TagBackground = Colors | "page" | "surface" | "overlay" | "transparent";

type MoversSection = {
  title: string;
  data: TopMover[];
  tone: TagBackground;
};

type VolatilityBucket = {
  title: string;
  data: VolatilityPair[];
  background: TagBackground;
};

type InsightCardTag = {
  label: string;
  icon?: ComponentProps<typeof Tag>["prefixIcon"];
  tone?: TagBackground;
};

type InsightCardProps = {
  title: string;
  description?: string;
  tag?: InsightCardTag;
  children: ReactNode;
};

type FxQuote = {
  symbol: string;
  base: string;
  quote: string;
  bid: number;
  changePercent: number;
  change: number;
  high: number;
  low: number;
  rangePercent: number;
  timestamp: number | null;
};

type FxSnapshot = {
  currencyStrength: CurrencyStrength[];
  topGainers: TopMover[];
  topLosers: TopMover[];
  currencyVolatility: CurrencyVolatility[];
  mostVolatilePairs: VolatilityPair[];
  leastVolatilePairs: VolatilityPair[];
};

type SnapshotState = {
  data: FxSnapshot | null;
  lastUpdated: Date | null;
  isFetching: boolean;
  error: string | null;
};

type MarketApiQuote = {
  bid?: string;
  pctChange?: string;
  varBid?: string;
  high?: string;
  low?: string;
  timestamp?: string;
  create_date?: string;
};

type MarketApiResponse = Record<string, MarketApiQuote>;

const FX_CURRENCIES = [
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "AUD",
  "NZD",
  "CAD",
  "CHF",
] as const;

const FX_PAIRS = [
  { base: "EUR", quote: "USD" },
  { base: "USD", quote: "JPY" },
  { base: "GBP", quote: "USD" },
  { base: "AUD", quote: "USD" },
  { base: "NZD", quote: "USD" },
  { base: "USD", quote: "CAD" },
  { base: "USD", quote: "CHF" },
  { base: "EUR", quote: "GBP" },
  { base: "EUR", quote: "JPY" },
  { base: "EUR", quote: "AUD" },
  { base: "EUR", quote: "NZD" },
  { base: "EUR", quote: "CHF" },
  { base: "EUR", quote: "CAD" },
  { base: "GBP", quote: "JPY" },
  { base: "GBP", quote: "AUD" },
  { base: "AUD", quote: "JPY" },
  { base: "AUD", quote: "NZD" },
  { base: "AUD", quote: "CHF" },
  { base: "NZD", quote: "JPY" },
  { base: "CAD", quote: "JPY" },
  { base: "CHF", quote: "JPY" },
] as const;

const REFRESH_INTERVAL_MS = 60_000;

const FX_ENDPOINT = `https://economia.awesomeapi.com.br/last/${
  FX_PAIRS.map((pair) => `${pair.base}-${pair.quote}`).join(",")
}`;

const toneTagBackground: Record<CurrencyStrength["tone"], TagBackground> = {
  strong: "brand-alpha-weak",
  balanced: "neutral-alpha-weak",
  soft: "danger-alpha-weak",
};

const toneLabel: Record<CurrencyStrength["tone"], string> = {
  strong: "Leadership",
  balanced: "Balanced",
  soft: "Under pressure",
};

const formatPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatChange = (value: number) => value.toFixed(4);

const formatPips = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

const MALDIVES_TIME_ZONE = "Indian/Maldives";

const lastUpdatedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: MALDIVES_TIME_ZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const lastUpdatedTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: MALDIVES_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const getNumberFormatter = (options: Intl.NumberFormatOptions) => {
  const key = JSON.stringify(options);
  const cached = NUMBER_FORMATTER_CACHE.get(key);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat("en-US", options);
  NUMBER_FORMATTER_CACHE.set(key, formatter);
  return formatter;
};

const formatPrice = (value: number) =>
  getNumberFormatter({
    minimumFractionDigits: 3,
    maximumFractionDigits: 6,
  }).format(value);

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseTimestamp = (quote: MarketApiQuote): number | null => {
  const timestamp = quote.timestamp
    ? Number.parseInt(quote.timestamp, 10)
    : NaN;
  if (Number.isFinite(timestamp)) {
    return timestamp * 1000;
  }

  if (quote.create_date) {
    const normalized = `${quote.create_date.replace(" ", "T")}Z`;
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

const computeRangePercent = (high: number, low: number): number => {
  if (
    !Number.isFinite(high) || !Number.isFinite(low) || high <= 0 || low <= 0
  ) {
    return 0;
  }

  const midpoint = (high + low) / 2;
  if (!Number.isFinite(midpoint) || midpoint === 0) {
    return 0;
  }

  return ((high - low) / midpoint) * 100;
};

const getPipFactor = (base: string, quote: string): number => {
  if (quote === "JPY") {
    return 0.01;
  }
  return 0.0001;
};

const formatPairLabel = (base: string, quote: string) => `${base}/${quote}`;

const formatPercentAbsolute = (value: number) =>
  `${Math.abs(value).toFixed(2)}%`;

const formatLastUpdatedTag = (date: Date) =>
  `${lastUpdatedDateFormatter.format(date)} · ${
    lastUpdatedTimeFormatter.format(date)
  } MVT`;

const getStatusLabel = (lastUpdated: Date | null, isFetching: boolean) => {
  if (!lastUpdated && isFetching) {
    return "Fetching live FX data…";
  }

  if (!lastUpdated) {
    return "Waiting for FX feed…";
  }

  const formattedTime = formatIsoTime(lastUpdated);
  return isFetching
    ? `Syncing… last update ${formattedTime}`
    : `Synced ${formattedTime}`;
};

const buildStrengthSummary = (
  currency: string,
  score: number,
  drivers: Array<{ pair: string; changePercent: number }>,
): string => {
  const [primary, secondary] = drivers;

  if (!primary) {
    return `${currency} flows are muted with limited directional cues.`;
  }

  const trend = score > 0.05
    ? "strengthens"
    : score < -0.05
    ? "softens"
    : "trades mixed";
  const primaryDirection = primary.changePercent >= 0 ? "rises" : "falls";
  const primaryText = `${primary.pair} ${primaryDirection} ${
    formatPercentAbsolute(primary.changePercent)
  }`;

  if (secondary) {
    const secondaryDirection = secondary.changePercent >= 0 ? "rises" : "falls";
    const secondaryText = `${secondary.pair} ${secondaryDirection} ${
      formatPercentAbsolute(secondary.changePercent)
    }`;
    if (trend === "trades mixed") {
      return `${currency} trades mixed as ${primaryText} while ${secondaryText}.`;
    }
    return `${currency} ${trend} as ${primaryText} while ${secondaryText}.`;
  }

  if (trend === "trades mixed") {
    return `${currency} trades mixed as ${primaryText}.`;
  }

  return `${currency} ${trend} as ${primaryText}.`;
};

const deriveStrengthTone = (
  score: number,
  rank: number,
  total: number,
): CurrencyStrength["tone"] => {
  if (score >= 0.1) {
    return "strong";
  }
  if (score <= -0.1) {
    return "soft";
  }

  const strongCutoff = Math.max(1, Math.ceil(total / 3));
  const softCutoffStart = total - strongCutoff + 1;

  if (rank <= strongCutoff && score > 0) {
    return "strong";
  }
  if (rank >= softCutoffStart && score < 0) {
    return "soft";
  }

  return "balanced";
};

const buildVolatilitySummary = (
  currency: string,
  drivers: Array<{ pair: string; rangePercent: number }>,
): string => {
  const [primary] = drivers;
  if (!primary) {
    return `${currency} ranges remain subdued across tracked pairs.`;
  }
  return `${currency} focus stays on ${primary.pair} with a ${
    primary.rangePercent.toFixed(2)
  }% session range.`;
};

const toTopMover = (quote: FxQuote): TopMover => {
  const pipFactor = getPipFactor(quote.base, quote.quote);
  const pips = quote.change / pipFactor;

  return {
    symbol: quote.symbol,
    pair: formatPairLabel(quote.base, quote.quote),
    changePercent: quote.changePercent,
    change: quote.change,
    pips,
    lastPrice: quote.bid,
  };
};

const computeSnapshot = (quotes: FxQuote[]): FxSnapshot => {
  const gainers = quotes
    .filter((quote) => quote.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5)
    .map(toTopMover);

  const losers = quotes
    .filter((quote) => quote.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5)
    .map(toTopMover);

  const contributions = new Map<
    string,
    Array<{ pair: string; changePercent: number }>
  >();

  const volatilityContributions = new Map<
    string,
    Array<{ pair: string; rangePercent: number }>
  >();

  for (const currency of FX_CURRENCIES) {
    contributions.set(currency, []);
    volatilityContributions.set(currency, []);
  }

  for (const quote of quotes) {
    const pairLabel = formatPairLabel(quote.base, quote.quote);

    contributions.get(quote.base)?.push({
      pair: pairLabel,
      changePercent: quote.changePercent,
    });

    contributions.get(quote.quote)?.push({
      pair: pairLabel,
      changePercent: -quote.changePercent,
    });

    volatilityContributions.get(quote.base)?.push({
      pair: pairLabel,
      rangePercent: quote.rangePercent,
    });
    volatilityContributions.get(quote.quote)?.push({
      pair: pairLabel,
      rangePercent: quote.rangePercent,
    });
  }

  const currencyStrength = FX_CURRENCIES.map((currency) => {
    const drivers = (contributions.get(currency) ?? []).slice().sort(
      (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
    );
    const total = drivers.reduce(
      (sum, driver) => sum + driver.changePercent,
      0,
    );
    const avg = drivers.length > 0 ? total / drivers.length : 0;
    return {
      code: currency,
      score: avg,
      summary: buildStrengthSummary(currency, avg, drivers),
    };
  })
    .sort((a, b) => b.score - a.score)
    .map((entry, index, array) => ({
      code: entry.code,
      rank: index + 1,
      tone: deriveStrengthTone(entry.score, index + 1, array.length),
      summary: entry.summary,
    }));

  const currencyVolatility = FX_CURRENCIES.map((currency) => {
    const drivers = (volatilityContributions.get(currency) ?? []).slice().sort(
      (a, b) => b.rangePercent - a.rangePercent,
    );
    const total = drivers.reduce((sum, driver) => sum + driver.rangePercent, 0);
    const avg = drivers.length > 0 ? total / drivers.length : 0;
    return {
      code: currency,
      score: avg,
      summary: buildVolatilitySummary(currency, drivers),
    };
  })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({
      code: entry.code,
      rank: index + 1,
      summary: entry.summary,
    }));

  const quotesWithRange = quotes.filter((quote) => quote.rangePercent > 0);
  const mostVolatilePairs = quotesWithRange
    .slice()
    .sort((a, b) => b.rangePercent - a.rangePercent)
    .slice(0, 5)
    .map((quote) => ({
      symbol: quote.symbol,
      pair: formatPairLabel(quote.base, quote.quote),
      rangePercent: quote.rangePercent,
    }));

  const leastVolatilePairs = quotesWithRange
    .slice()
    .sort((a, b) => a.rangePercent - b.rangePercent)
    .slice(0, 5)
    .map((quote) => ({
      symbol: quote.symbol,
      pair: formatPairLabel(quote.base, quote.quote),
      rangePercent: quote.rangePercent,
    }));

  return {
    currencyStrength,
    topGainers: gainers,
    topLosers: losers,
    currencyVolatility,
    mostVolatilePairs,
    leastVolatilePairs,
  };
};

const parseQuotes = (
  payload: MarketApiResponse,
): { quotes: FxQuote[]; timestamp: number | null } => {
  const quotes: FxQuote[] = [];
  let latestTimestamp: number | null = null;

  for (const pair of FX_PAIRS) {
    const symbol = `${pair.base}${pair.quote}`;
    const data = payload[symbol];
    if (!data) {
      continue;
    }

    const bid = parseNumber(data.bid);
    const changePercent = parseNumber(data.pctChange);
    const change = parseNumber(data.varBid);
    const high = parseNumber(data.high);
    const low = parseNumber(data.low);

    if (
      bid === undefined ||
      changePercent === undefined ||
      change === undefined ||
      high === undefined ||
      low === undefined
    ) {
      continue;
    }

    const rangePercent = computeRangePercent(high, low);
    const timestamp = parseTimestamp(data);
    if (
      timestamp && (latestTimestamp === null || timestamp > latestTimestamp)
    ) {
      latestTimestamp = timestamp;
    }

    quotes.push({
      symbol,
      base: pair.base,
      quote: pair.quote,
      bid,
      changePercent,
      change,
      high,
      low,
      rangePercent,
      timestamp,
    });
  }

  return { quotes, timestamp: latestTimestamp };
};

export function FxMarketSnapshotSection() {
  const [state, setState] = useState<SnapshotState>({
    data: null,
    lastUpdated: null,
    isFetching: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);
  const isDocumentVisibleRef = useRef(
    typeof document === "undefined" ? true : !document.hidden,
  );

  useEffect(() => () => {
    isMountedRef.current = false;
    abortControllerRef.current?.abort();
  }, []);

  const fetchSnapshot = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, isFetching: true }));
    }

    try {
      const response = await fetch(FX_ENDPOINT, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch FX snapshot (${response.status})`);
      }

      const payload = (await response.json()) as MarketApiResponse;
      const { quotes, timestamp } = parseQuotes(payload);

      if (!isMountedRef.current) {
        return;
      }

      if (quotes.length === 0) {
        throw new Error("Live FX feed returned no data");
      }

      const snapshot = computeSnapshot(quotes);
      const lastUpdated = new Date(timestamp ?? Date.now());

      setState({
        data: snapshot,
        lastUpdated,
        isFetching: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("[FxMarketSnapshot] Failed to sync data", error);

      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isFetching: false,
          error:
            "Unable to sync the FX snapshot right now. We'll retry automatically.",
        }));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibility = () => {
      const visible = !document.hidden;
      isDocumentVisibleRef.current = visible;
      if (visible && hasFetchedRef.current) {
        void fetchSnapshot();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchSnapshot();
    }
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!isDocumentVisibleRef.current) {
      return;
    }

    const interval = setInterval(() => {
      if (isDocumentVisibleRef.current) {
        void fetchSnapshot();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [fetchSnapshot]);

  const statusLabel = useMemo(
    () => getStatusLabel(state.lastUpdated, state.isFetching),
    [state.lastUpdated, state.isFetching],
  );

  const lastUpdatedLabel = useMemo(() => {
    if (!state.lastUpdated) {
      return state.isFetching ? "Syncing live FX data…" : "Feed offline";
    }
    return formatLastUpdatedTag(state.lastUpdated);
  }, [state.lastUpdated, state.isFetching]);

  const snapshot = state.data;

  return (
    <Column
      id="fx-market-snapshot"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Row gap="12" vertical="center">
          <Heading variant="display-strong-xs">FX market snapshot</Heading>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
            {lastUpdatedLabel}
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          A desk-level digest of where momentum, volatility, and cross-asset
          leadership currently sit across major currency pairs.
        </Text>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {statusLabel}
        </Text>
        {state.error
          ? (
            <Text variant="label-default-s" onBackground="danger-strong">
              {state.error}
            </Text>
          )
          : null}
      </Column>

      {snapshot
        ? (
          <Row gap="24" wrap>
            <Column flex={1} minWidth={32} gap="24">
              <InsightCard
                title="Currency strength meter"
                description="Ordered by intraday performance, highlighting which majors are driving price action right now."
                tag={{
                  label: "Currency leadership",
                  icon: "flag",
                  tone: "brand-alpha-weak",
                }}
              >
                <Row gap="16" wrap>
                  {snapshot.currencyStrength.length > 0
                    ? snapshot.currencyStrength.map((currency) => (
                      <Column
                        key={currency.code}
                        background="page"
                        border="neutral-alpha-weak"
                        radius="l"
                        padding="l"
                        gap="12"
                        minWidth={20}
                        flex={1}
                      >
                        <Row horizontal="between" vertical="center" gap="8">
                          <Row gap="8" vertical="center">
                            <Tag size="s" background="neutral-alpha-weak">
                              #{currency.rank}
                            </Tag>
                            <Heading as="h4" variant="heading-strong-s">
                              {currency.code}
                            </Heading>
                          </Row>
                          <Tag
                            size="s"
                            background={toneTagBackground[currency.tone]}
                          >
                            {toneLabel[currency.tone]}
                          </Tag>
                        </Row>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-weak"
                        >
                          {currency.summary}
                        </Text>
                      </Column>
                    ))
                    : (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        FX leadership data is not available at the moment.
                      </Text>
                    )}
                </Row>
              </InsightCard>

              <InsightCard
                title="Currency volatility meter"
                description="Which currencies are producing the widest realized ranges during the current session."
                tag={{
                  label: "Realized volatility",
                  icon: "activity",
                  tone: "neutral-alpha-weak",
                }}
              >
                <Column gap="12">
                  {snapshot.currencyVolatility.length > 0
                    ? snapshot.currencyVolatility.map((currency) => (
                      <Row key={currency.code} gap="12" vertical="start">
                        <Tag size="s" background="neutral-alpha-weak">
                          #{currency.rank}
                        </Tag>
                        <Column gap="4">
                          <Text variant="body-strong-s">{currency.code}</Text>
                          <Text
                            variant="body-default-s"
                            onBackground="neutral-weak"
                          >
                            {currency.summary}
                          </Text>
                        </Column>
                      </Row>
                    ))
                    : (
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        Volatility readings are unavailable right now.
                      </Text>
                    )}
                </Column>
              </InsightCard>
            </Column>

            <Column flex={1} minWidth={32} gap="24">
              <InsightCard
                title="Top movers"
                description="Change and last price snapshots for the session."
                tag={{
                  label: "Session movers",
                  icon: "trending-up",
                  tone: "brand-alpha-weak",
                }}
              >
                <Column gap="16">
                  <MoversTable
                    title="Top gainers"
                    data={snapshot.topGainers}
                    tone="brand-alpha-weak"
                  />
                  <MoversTable
                    title="Top losers"
                    data={snapshot.topLosers}
                    tone="danger-alpha-weak"
                  />
                </Column>
              </InsightCard>

              <InsightCard
                title="Volatility radar"
                description="Cross-check the day’s most active currencies and the pairs delivering the widest and tightest trading bands."
                tag={{
                  label: "Trading ranges",
                  icon: "target",
                  tone: "neutral-alpha-weak",
                }}
              >
                <Row gap="16" wrap>
                  <VolatilityBucketPanel
                    title="Most volatile"
                    data={snapshot.mostVolatilePairs}
                    background="brand-alpha-weak"
                  />
                  <VolatilityBucketPanel
                    title="Least volatile"
                    data={snapshot.leastVolatilePairs}
                    background="neutral-alpha-weak"
                  />
                </Row>
              </InsightCard>
            </Column>
          </Row>
        )
        : (
          <Column gap="16">
            <Text variant="body-default-m">
              Live FX data is loading. The snapshot will update automatically
              once the feed is available.
            </Text>
          </Column>
        )}
    </Column>
  );
}

function InsightCard({ title, description, tag, children }: InsightCardProps) {
  return (
    <Column
      background="page"
      border="neutral-alpha-weak"
      radius="l"
      padding="l"
      gap="16"
      align="start"
    >
      <Column gap="8" align="start">
        {tag
          ? (
            <Tag
              size="s"
              background={tag.tone ?? "neutral-alpha-weak"}
              prefixIcon={tag.icon}
            >
              {tag.label}
            </Tag>
          )
          : null}
        <Heading as="h3" variant="heading-strong-m">
          {title}
        </Heading>
        {description
          ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          )
          : null}
      </Column>
      {children}
    </Column>
  );
}

function MoversTable({ title, data, tone }: MoversSection) {
  return (
    <Column gap="12" align="start">
      <Tag
        size="s"
        background={tone}
        prefixIcon={title === "Top gainers" ? "trending-up" : "trending-down"}
      >
        {title}
      </Tag>
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="l"
        gap="12"
        fillWidth
      >
        <Row horizontal="between" vertical="center">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Pair
          </Text>
          <Row gap="16" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-weak">
              Change %
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              Change
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              Pips
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              Last
            </Text>
          </Row>
        </Row>
        <Line background="neutral-alpha-weak" />
        <Column gap="12">
          {data.length > 0
            ? (
              data.map((item) => (
                <Row key={item.symbol} horizontal="between" vertical="center">
                  <Column gap="4">
                    <Text variant="body-strong-s">{item.pair}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.symbol}
                    </Text>
                  </Column>
                  <Row gap="16" vertical="center">
                    <Text variant="body-strong-s">
                      {formatPercent(item.changePercent)}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {formatChange(item.change)}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {formatPips(item.pips)}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {formatPrice(item.lastPrice)}
                    </Text>
                  </Row>
                </Row>
              ))
            )
            : (
              <Text variant="body-default-s" onBackground="neutral-weak">
                No movers available for this session.
              </Text>
            )}
        </Column>
      </Column>
    </Column>
  );
}

function VolatilityBucketPanel({ title, data, background }: VolatilityBucket) {
  return (
    <Column
      flex={1}
      minWidth={24}
      gap="12"
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      padding="l"
      align="start"
    >
      <Tag size="s" background={background} prefixIcon="activity">
        {title}
      </Tag>
      <Column gap="12" fillWidth>
        {data.length > 0
          ? (
            data.map((item) => (
              <Row key={item.symbol} horizontal="between" vertical="center">
                <Column gap="4">
                  <Text variant="body-strong-s">{item.pair}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {item.symbol}
                  </Text>
                </Column>
                <Text variant="body-strong-s">
                  {item.rangePercent.toFixed(2)}%
                </Text>
              </Row>
            ))
          )
          : (
            <Text variant="body-default-s" onBackground="neutral-weak">
              Range data is currently unavailable.
            </Text>
          )}
      </Column>
    </Column>
  );
}

export default FxMarketSnapshotSection;
