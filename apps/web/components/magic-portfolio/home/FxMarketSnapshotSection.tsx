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
import { formatIsoTime } from "@/utils/isoFormat";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

const DISPLAY_CURRENCIES: Array<CurrencyStrength["code"]> = [
  "JPY",
  "AUD",
  "EUR",
  "CHF",
  "CAD",
  "GBP",
  "USD",
  "NZD",
];

const FALLBACK_STRENGTH: CurrencyStrength[] = DISPLAY_CURRENCIES.map(
  (code, index) => ({
    code,
    rank: index + 1,
    tone: "balanced",
    summary: "Awaiting live market sync.",
  }),
);

const FALLBACK_VOLATILITY: CurrencyVolatility[] = DISPLAY_CURRENCIES.map(
  (code, index) => ({
    code,
    rank: index + 1,
    summary: "Awaiting live market sync.",
  }),
);

type FxPair = {
  base: string;
  quote: string;
  symbol: string;
};

type FxApiQuote = {
  bid?: string;
  pctChange?: string;
  high?: string;
  low?: string;
  create_date?: string;
};

type StrengthHighlight = {
  pairLabel: string;
  effect: number;
  pairChange: number;
};

type VolatilityHighlight = {
  pairLabel: string;
  rangePercent: number;
};

type CurrencyAggregate = {
  totalEffect: number;
  count: number;
  totalVolatility: number;
  volatilityCount: number;
  topPositive?: StrengthHighlight;
  topNegative?: StrengthHighlight;
  topVolatility?: VolatilityHighlight;
};

type CurrencyMetric = {
  code: string;
  averageChange: number;
  averageRange: number;
  topPositive?: StrengthHighlight;
  topNegative?: StrengthHighlight;
  topVolatility?: VolatilityHighlight;
};

type CurrencySnapshot = {
  strength: CurrencyStrength[];
  volatility: CurrencyVolatility[];
  lastUpdated: Date | null;
};

const FX_PAIRS: FxPair[] = [
  { base: "EUR", quote: "USD", symbol: "EURUSD" },
  { base: "GBP", quote: "USD", symbol: "GBPUSD" },
  { base: "AUD", quote: "USD", symbol: "AUDUSD" },
  { base: "NZD", quote: "USD", symbol: "NZDUSD" },
  { base: "USD", quote: "CAD", symbol: "USDCAD" },
  { base: "USD", quote: "CHF", symbol: "USDCHF" },
  { base: "USD", quote: "JPY", symbol: "USDJPY" },
  { base: "EUR", quote: "GBP", symbol: "EURGBP" },
  { base: "EUR", quote: "AUD", symbol: "EURAUD" },
  { base: "EUR", quote: "NZD", symbol: "EURNZD" },
  { base: "GBP", quote: "AUD", symbol: "GBPAUD" },
  { base: "AUD", quote: "NZD", symbol: "AUDNZD" },
  { base: "EUR", quote: "JPY", symbol: "EURJPY" },
  { base: "GBP", quote: "JPY", symbol: "GBPJPY" },
  { base: "AUD", quote: "JPY", symbol: "AUDJPY" },
  { base: "NZD", quote: "JPY", symbol: "NZDJPY" },
  { base: "CAD", quote: "JPY", symbol: "CADJPY" },
  { base: "CHF", quote: "JPY", symbol: "CHFJPY" },
  { base: "EUR", quote: "CHF", symbol: "EURCHF" },
  { base: "GBP", quote: "CHF", symbol: "GBPCHF" },
];

const FX_ENDPOINT = `https://economia.awesomeapi.com.br/last/${
  FX_PAIRS.map(
    ({ base, quote }) => `${base}-${quote}`,
  ).join(",")
}`;

const REFRESH_INTERVAL_MS = 60_000;

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

const computeRangePercent = (
  last: number | undefined,
  high: number | undefined,
  low: number | undefined,
): number | undefined => {
  if (
    last === undefined ||
    high === undefined ||
    low === undefined ||
    !Number.isFinite(last) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    last === 0
  ) {
    return undefined;
  }

  const range = Math.abs(high - low);
  if (!Number.isFinite(range) || range === 0) {
    return undefined;
  }

  return (range / Math.abs(last)) * 100;
};

const ensureAggregate = (
  aggregates: Record<string, CurrencyAggregate>,
  code: string,
): CurrencyAggregate => {
  const existing = aggregates[code];
  if (existing) {
    return existing;
  }

  const created: CurrencyAggregate = {
    totalEffect: 0,
    count: 0,
    totalVolatility: 0,
    volatilityCount: 0,
  };

  aggregates[code] = created;
  return created;
};

const recordStrengthHighlight = (
  aggregate: CurrencyAggregate,
  effect: number,
  pairLabel: string,
  pairChange: number,
) => {
  if (!Number.isFinite(effect) || !Number.isFinite(pairChange)) {
    return;
  }

  if (effect >= 0) {
    if (!aggregate.topPositive || effect > aggregate.topPositive.effect) {
      aggregate.topPositive = { pairLabel, effect, pairChange };
    }
    return;
  }

  if (
    !aggregate.topNegative ||
    Math.abs(effect) > Math.abs(aggregate.topNegative.effect)
  ) {
    aggregate.topNegative = { pairLabel, effect, pairChange };
  }
};

const updateAggregate = (
  aggregates: Record<string, CurrencyAggregate>,
  code: string,
  effect: number | undefined,
  pairLabel: string,
  pairChange: number | undefined,
  rangePercent: number | undefined,
) => {
  const aggregate = ensureAggregate(aggregates, code);

  if (effect !== undefined && Number.isFinite(effect)) {
    aggregate.totalEffect += effect;
    aggregate.count += 1;
    if (pairChange !== undefined && Number.isFinite(pairChange)) {
      recordStrengthHighlight(aggregate, effect, pairLabel, pairChange);
    }
  }

  if (rangePercent !== undefined && Number.isFinite(rangePercent)) {
    aggregate.totalVolatility += rangePercent;
    aggregate.volatilityCount += 1;
    if (
      !aggregate.topVolatility ||
      rangePercent > aggregate.topVolatility.rangePercent
    ) {
      aggregate.topVolatility = { pairLabel, rangePercent };
    }
  }
};

const determineTone = (
  index: number,
  total: number,
): CurrencyStrength["tone"] => {
  if (total <= 0) {
    return "balanced";
  }

  const strongCount = Math.max(1, Math.ceil(total / 3));
  const softCount = Math.max(1, Math.ceil(total / 3));

  if (index < strongCount) {
    return "strong";
  }
  if (index >= total - softCount) {
    return "soft";
  }
  return "balanced";
};

const formatSignedPercentValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  const formatted = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${formatted}%`;
  }
  if (value < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
};

const formatUnsignedPercentValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  return `${Math.abs(value).toFixed(2)}%`;
};

const buildStrengthSummary = (metric: CurrencyMetric): string => {
  const averageLabel = formatSignedPercentValue(metric.averageChange);
  const preferredHighlight = metric.averageChange >= 0
    ? metric.topPositive ?? metric.topNegative
    : metric.topNegative ?? metric.topPositive;

  if (!preferredHighlight) {
    return `Avg cross performance ${averageLabel}.`;
  }

  const prefix = preferredHighlight === metric.topPositive
    ? "Strongest support from"
    : "Heaviest drag from";
  const changeLabel = formatSignedPercentValue(
    preferredHighlight.pairChange,
  );

  return `Avg cross performance ${averageLabel}. ${prefix} ${preferredHighlight.pairLabel} ${changeLabel}.`;
};

const buildVolatilitySummary = (metric: CurrencyMetric): string => {
  const averageLabel = formatUnsignedPercentValue(metric.averageRange);
  const highlight = metric.topVolatility;

  if (!highlight) {
    return `Average realized range ${averageLabel}.`;
  }

  return `Average realized range ${averageLabel}. ${highlight.pairLabel} spanned ${
    formatUnsignedPercentValue(highlight.rangePercent)
  }.`;
};

const loadCurrencySnapshot = async (
  signal?: AbortSignal,
): Promise<CurrencySnapshot> => {
  const response = await fetch(FX_ENDPOINT, { cache: "no-store", signal });

  if (!response.ok) {
    throw new Error(`Failed to fetch FX snapshot (${response.status})`);
  }

  const payload = (await response.json()) as Record<string, FxApiQuote>;
  const aggregates: Record<string, CurrencyAggregate> = {};
  let latestTimestamp: number | undefined;

  for (const pair of FX_PAIRS) {
    const quote = payload[pair.symbol];
    if (!quote) {
      continue;
    }

    const changePercent = parseNumber(quote.pctChange);
    const last = parseNumber(quote.bid);
    const high = parseNumber(quote.high);
    const low = parseNumber(quote.low);
    const rangePercent = computeRangePercent(last, high, low);
    const pairLabel = `${pair.base}/${pair.quote}`;

    updateAggregate(
      aggregates,
      pair.base,
      changePercent,
      pairLabel,
      changePercent,
      rangePercent,
    );
    updateAggregate(
      aggregates,
      pair.quote,
      changePercent !== undefined ? -changePercent : undefined,
      pairLabel,
      changePercent,
      rangePercent,
    );

    const timestamp = parseTimestamp(quote.create_date);
    if (timestamp !== undefined) {
      latestTimestamp = latestTimestamp
        ? Math.max(latestTimestamp, timestamp)
        : timestamp;
    }
  }

  const metrics: CurrencyMetric[] = DISPLAY_CURRENCIES.map((code) => {
    const aggregate = aggregates[code];
    if (!aggregate) {
      return {
        code,
        averageChange: 0,
        averageRange: 0,
      };
    }

    const averageChange = aggregate.count > 0
      ? aggregate.totalEffect / aggregate.count
      : 0;
    const averageRange = aggregate.volatilityCount > 0
      ? aggregate.totalVolatility / aggregate.volatilityCount
      : 0;

    return {
      code,
      averageChange,
      averageRange,
      topPositive: aggregate.topPositive,
      topNegative: aggregate.topNegative,
      topVolatility: aggregate.topVolatility,
    };
  });

  const strengthOrdered = [...metrics].sort(
    (a, b) => b.averageChange - a.averageChange,
  );

  const strength: CurrencyStrength[] = strengthOrdered.map((metric, index) => ({
    code: metric.code,
    rank: index + 1,
    tone: determineTone(index, strengthOrdered.length),
    summary: buildStrengthSummary(metric),
  }));

  const volatilityOrdered = [...metrics].sort(
    (a, b) => b.averageRange - a.averageRange,
  );

  const volatility: CurrencyVolatility[] = volatilityOrdered.map(
    (metric, index) => ({
      code: metric.code,
      rank: index + 1,
      summary: buildVolatilitySummary(metric),
    }),
  );

  return {
    strength,
    volatility,
    lastUpdated: latestTimestamp ? new Date(latestTimestamp) : null,
  };
};

const TOP_GAINERS: TopMover[] = [
  {
    symbol: "EURNZD",
    pair: "EUR/NZD",
    changePercent: 0.12,
    change: 0.0025,
    pips: 25.0,
    lastPrice: 2.02068,
  },
  {
    symbol: "AUDNZD",
    pair: "AUD/NZD",
    changePercent: 0.12,
    change: 0.00137,
    pips: 13.7,
    lastPrice: 1.13365,
  },
  {
    symbol: "AUDUSD",
    pair: "AUD/USD",
    changePercent: 0.08,
    change: 0.000525,
    pips: 5.2,
    lastPrice: 0.658875,
  },
  {
    symbol: "GBPNZD",
    pair: "GBP/NZD",
    changePercent: 0.05,
    change: 0.001255,
    pips: 12.6,
    lastPrice: 2.314215,
  },
  {
    symbol: "AUDCAD",
    pair: "AUD/CAD",
    changePercent: 0.05,
    change: 0.00048,
    pips: 4.8,
    lastPrice: 0.915295,
  },
];

const TOP_LOSERS: TopMover[] = [
  {
    symbol: "NZDJPY",
    pair: "NZD/JPY",
    changePercent: -0.17,
    change: -0.151,
    pips: -15.1,
    lastPrice: 86.436,
  },
  {
    symbol: "NZDCAD",
    pair: "NZD/CAD",
    changePercent: -0.12,
    change: -0.000975,
    pips: -9.7,
    lastPrice: 0.807385,
  },
  {
    symbol: "USDJPY",
    pair: "USD/JPY",
    changePercent: -0.11,
    change: -0.17,
    pips: -17.0,
    lastPrice: 148.716,
  },
  {
    symbol: "NZDCHF",
    pair: "NZD/CHF",
    changePercent: -0.1,
    change: -0.000465,
    pips: -4.6,
    lastPrice: 0.461945,
  },
  {
    symbol: "GBPJPY",
    pair: "GBP/JPY",
    changePercent: -0.09,
    change: -0.171,
    pips: -17.1,
    lastPrice: 200.041,
  },
];

const MOST_VOLATILE_PAIRS: VolatilityPair[] = [
  { symbol: "NZDJPY", pair: "NZD/JPY", rangePercent: 0.25 },
  { symbol: "USDJPY", pair: "USD/JPY", rangePercent: 0.23 },
  { symbol: "AUDUSD", pair: "AUD/USD", rangePercent: 0.21 },
  { symbol: "AUDNZD", pair: "AUD/NZD", rangePercent: 0.2 },
  { symbol: "GBPJPY", pair: "GBP/JPY", rangePercent: 0.2 },
];

const LEAST_VOLATILE_PAIRS: VolatilityPair[] = [
  { symbol: "EURCAD", pair: "EUR/CAD", rangePercent: 0.06 },
  { symbol: "EURGBP", pair: "EUR/GBP", rangePercent: 0.06 },
  { symbol: "USDCAD", pair: "USD/CAD", rangePercent: 0.07 },
  { symbol: "GBPCAD", pair: "GBP/CAD", rangePercent: 0.08 },
  { symbol: "EURUSD", pair: "EUR/USD", rangePercent: 0.1 },
];

const MOVERS_SECTIONS = [
  { title: "Top gainers", data: TOP_GAINERS, tone: "brand-alpha-weak" },
  { title: "Top losers", data: TOP_LOSERS, tone: "danger-alpha-weak" },
] as const satisfies Array<{
  title: string;
  data: TopMover[];
  tone: TagBackground;
}>;

const VOLATILITY_BUCKETS = [
  {
    title: "Most volatile",
    data: MOST_VOLATILE_PAIRS,
    background: "brand-alpha-weak",
  },
  {
    title: "Least volatile",
    data: LEAST_VOLATILE_PAIRS,
    background: "neutral-alpha-weak",
  },
] as const satisfies Array<{
  title: string;
  data: VolatilityPair[];
  background: TagBackground;
}>;

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

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 6,
  }).format(value);

export function FxMarketSnapshotSection() {
  const [strengthMeter, setStrengthMeter] = useState<CurrencyStrength[]>(
    FALLBACK_STRENGTH,
  );
  const [volatilityMeter, setVolatilityMeter] = useState<CurrencyVolatility[]>(
    FALLBACK_VOLATILITY,
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    },
    [],
  );

  const refreshSnapshot = useCallback(async () => {
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
      const snapshot = await loadCurrencySnapshot(controller.signal);
      if (!isMountedRef.current) {
        return;
      }

      setStrengthMeter(snapshot.strength);
      setVolatilityMeter(snapshot.volatility);
      setLastUpdated(snapshot.lastUpdated ?? new Date());
      setError(null);
    } catch (snapshotError) {
      if (
        snapshotError instanceof DOMException &&
        snapshotError.name === "AbortError"
      ) {
        return;
      }

      if (isMountedRef.current) {
        setError("Live market feed unavailable. Retrying…");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshSnapshot();

    const interval = setInterval(() => {
      refreshSnapshot();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [refreshSnapshot]);

  const statusLabel = useMemo(() => {
    if (error) {
      return error;
    }
    if (!lastUpdated && isFetching) {
      return "Fetching live feed…";
    }
    if (isFetching) {
      return "Syncing live feed…";
    }
    if (lastUpdated) {
      return `Synced ${formatIsoTime(lastUpdated)}`;
    }
    return "Waiting for live feed…";
  }, [error, isFetching, lastUpdated]);

  const statusTone: TagBackground = error
    ? "danger-alpha-weak"
    : "neutral-alpha-weak";

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
          <Tag size="s" background={statusTone} prefixIcon="clock">
            {statusLabel}
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          A desk-level digest of where momentum, volatility, and cross-asset
          leadership currently sit across major currency pairs.
        </Text>
      </Column>

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
              {strengthMeter.map((currency) => (
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
                    <Tag size="s" background={toneTagBackground[currency.tone]}>
                      {toneLabel[currency.tone]}
                    </Tag>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {currency.summary}
                  </Text>
                </Column>
              ))}
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
              {volatilityMeter.map((currency) => (
                <Row key={currency.code} gap="12" vertical="start">
                  <Tag size="s" background="neutral-alpha-weak">
                    #{currency.rank}
                  </Tag>
                  <Column gap="4">
                    <Text variant="body-strong-s">{currency.code}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {currency.summary}
                    </Text>
                  </Column>
                </Row>
              ))}
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
              {MOVERS_SECTIONS.map((section) => (
                <MoversTable key={section.title} {...section} />
              ))}
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
              {VOLATILITY_BUCKETS.map((bucket) => (
                <VolatilityBucketPanel key={bucket.title} {...bucket} />
              ))}
            </Row>
          </InsightCard>
        </Column>
      </Row>
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
          {data.map((item) => (
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
          ))}
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
        {data.map((item) => (
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
        ))}
      </Column>
    </Column>
  );
}

export default FxMarketSnapshotSection;
