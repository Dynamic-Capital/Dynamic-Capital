"use client";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { formatIsoTime } from "@/utils/isoFormat";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FX_PAIRS,
  getInstrumentMetadata,
  PRIMARY_CURRENCY_CODES,
} from "@/data/instruments";
import { RefreshAnimation } from "./RefreshAnimation";
import {
  InsightCard,
  MoversSection,
  MoversTable,
  type MoversTableProps,
  StrengthMeterList,
  type TagBackground,
  VolatilityBucket,
  VolatilityBucketPanel,
  VolatilityMeterList,
} from "./MarketSnapshotPrimitives";

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

const DISPLAY_CURRENCIES: Array<CurrencyStrength["code"]> =
  PRIMARY_CURRENCY_CODES.map((code) => code as CurrencyStrength["code"]);

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
  varBid?: string;
};

type PairSnapshot = {
  symbol: string;
  pairLabel: string;
  changePercent?: number;
  change?: number;
  pips?: number;
  lastPrice?: number;
  rangePercent?: number;
};

const MOVERS_DISPLAY_LIMIT = 5;
const VOLATILITY_DISPLAY_LIMIT = 5;

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
  topGainers: TopMover[];
  topLosers: TopMover[];
  mostVolatilePairs: VolatilityPair[];
  leastVolatilePairs: VolatilityPair[];
  lastUpdated: Date | null;
};

const FX_PAIRS: FxPair[] = DEFAULT_FX_PAIRS.map((instrumentId) => {
  const metadata = getInstrumentMetadata(instrumentId);
  if (!metadata.base || !metadata.quote) {
    throw new Error(`Missing base/quote metadata for ${instrumentId}`);
  }
  return { base: metadata.base, quote: metadata.quote, symbol: metadata.id };
});

const FX_ENDPOINT = `https://economia.awesomeapi.com.br/last/${
  FX_PAIRS.map(
    ({ base, quote }) => `${base}-${quote}`,
  ).join(",")
}`;

const REFRESH_INTERVAL_MS = 30_000;
const BACKGROUND_REFRESH_INTERVAL_MS = 120_000;

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

const computePips = (
  change: number | undefined,
  quoteCurrency: string,
): number | undefined => {
  if (change === undefined || !Number.isFinite(change)) {
    return undefined;
  }

  const pipValue = quoteCurrency === "JPY" ? 0.01 : 0.0001;

  return change / pipValue;
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
  const pairSnapshots: PairSnapshot[] = [];

  for (const pair of FX_PAIRS) {
    const quote = payload[pair.symbol];
    if (!quote) {
      continue;
    }

    const changePercent = parseNumber(quote.pctChange);
    const last = parseNumber(quote.bid);
    const change = parseNumber(quote.varBid) ??
      (changePercent !== undefined &&
          last !== undefined &&
          Number.isFinite(changePercent) &&
          Number.isFinite(last)
        ? (last * changePercent) / 100
        : undefined);
    const pips = computePips(change, pair.quote);
    const high = parseNumber(quote.high);
    const low = parseNumber(quote.low);
    const rangePercent = computeRangePercent(last, high, low);
    const pairLabel = `${pair.base}/${pair.quote}`;

    pairSnapshots.push({
      symbol: pair.symbol,
      pairLabel,
      changePercent,
      change,
      pips,
      lastPrice: last,
      rangePercent,
    });

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

  const validMovers = pairSnapshots.filter((snapshot) =>
    typeof snapshot.changePercent === "number" &&
    Number.isFinite(snapshot.changePercent) &&
    typeof snapshot.change === "number" &&
    Number.isFinite(snapshot.change) &&
    typeof snapshot.pips === "number" &&
    Number.isFinite(snapshot.pips) &&
    typeof snapshot.lastPrice === "number" &&
    Number.isFinite(snapshot.lastPrice)
  );

  const sortedByChangeDesc = [...validMovers].sort((a, b) =>
    (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)
  );
  const sortedByChangeAsc = [...validMovers].sort((a, b) =>
    (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity)
  );

  const positiveMovers = sortedByChangeDesc.filter((item) =>
    (item.changePercent ?? 0) >= 0
  );
  const negativeMovers = sortedByChangeAsc.filter((item) =>
    (item.changePercent ?? 0) <= 0
  );

  const topGainersSnapshots = positiveMovers.length >= MOVERS_DISPLAY_LIMIT
    ? positiveMovers.slice(0, MOVERS_DISPLAY_LIMIT)
    : sortedByChangeDesc.slice(0, MOVERS_DISPLAY_LIMIT);
  const topLosersSnapshots = negativeMovers.length >= MOVERS_DISPLAY_LIMIT
    ? negativeMovers.slice(0, MOVERS_DISPLAY_LIMIT)
    : sortedByChangeAsc.slice(0, MOVERS_DISPLAY_LIMIT);

  const topGainers: TopMover[] = topGainersSnapshots.map((snapshot) => ({
    symbol: snapshot.symbol,
    pair: snapshot.pairLabel,
    changePercent: snapshot.changePercent ?? 0,
    change: snapshot.change ?? 0,
    pips: snapshot.pips ?? 0,
    lastPrice: snapshot.lastPrice ?? 0,
  }));

  const topLosers: TopMover[] = topLosersSnapshots.map((snapshot) => ({
    symbol: snapshot.symbol,
    pair: snapshot.pairLabel,
    changePercent: snapshot.changePercent ?? 0,
    change: snapshot.change ?? 0,
    pips: snapshot.pips ?? 0,
    lastPrice: snapshot.lastPrice ?? 0,
  }));

  const validVolatility = pairSnapshots.filter((snapshot) =>
    typeof snapshot.rangePercent === "number" &&
    Number.isFinite(snapshot.rangePercent)
  );

  const mostVolatilePairs: VolatilityPair[] = [...validVolatility]
    .sort((a, b) => (b.rangePercent ?? 0) - (a.rangePercent ?? 0))
    .slice(0, VOLATILITY_DISPLAY_LIMIT)
    .map((snapshot) => ({
      symbol: snapshot.symbol,
      pair: snapshot.pairLabel,
      rangePercent: snapshot.rangePercent ?? 0,
    }));

  const leastVolatilePairs: VolatilityPair[] = [...validVolatility]
    .sort((a, b) => (a.rangePercent ?? 0) - (b.rangePercent ?? 0))
    .slice(0, VOLATILITY_DISPLAY_LIMIT)
    .map((snapshot) => ({
      symbol: snapshot.symbol,
      pair: snapshot.pairLabel,
      rangePercent: snapshot.rangePercent ?? 0,
    }));

  return {
    strength,
    volatility,
    topGainers,
    topLosers,
    mostVolatilePairs,
    leastVolatilePairs,
    lastUpdated: latestTimestamp ? new Date(latestTimestamp) : null,
  };
};

const MOVERS_DISPLAY_METADATA = [
  { title: "Top gainers", tone: "brand-alpha-weak" },
  { title: "Top losers", tone: "danger-alpha-weak" },
] as const satisfies Array<Pick<MoversSection, "title" | "tone">>;

const VOLATILITY_DISPLAY_METADATA = [
  {
    title: "Most volatile",
    background: "brand-alpha-weak",
  },
  {
    title: "Least volatile",
    background: "neutral-alpha-weak",
  },
] as const satisfies Array<Pick<VolatilityBucket, "title" | "background">>;

export function FxMarketSnapshotSection() {
  const [strengthMeter, setStrengthMeter] = useState<CurrencyStrength[]>(
    FALLBACK_STRENGTH,
  );
  const [volatilityMeter, setVolatilityMeter] = useState<CurrencyVolatility[]>(
    FALLBACK_VOLATILITY,
  );
  const [topGainers, setTopGainers] = useState<TopMover[]>([]);
  const [topLosers, setTopLosers] = useState<TopMover[]>([]);
  const [mostVolatilePairs, setMostVolatilePairs] = useState<VolatilityPair[]>(
    [],
  );
  const [leastVolatilePairs, setLeastVolatilePairs] = useState<
    VolatilityPair[]
  >(
    [],
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [effectiveRefreshInterval, setEffectiveRefreshInterval] = useState(
    () => {
      if (typeof document === "undefined" || !document.hidden) {
        return REFRESH_INTERVAL_MS;
      }
      return BACKGROUND_REFRESH_INTERVAL_MS;
    },
  );

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
      setTopGainers(snapshot.topGainers);
      setTopLosers(snapshot.topLosers);
      setMostVolatilePairs(snapshot.mostVolatilePairs);
      setLeastVolatilePairs(snapshot.leastVolatilePairs);
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
  }, [refreshSnapshot]);

  useEffect(() => {
    const computeInterval = () => {
      if (typeof document === "undefined" || !document.hidden) {
        return REFRESH_INTERVAL_MS;
      }
      return BACKGROUND_REFRESH_INTERVAL_MS;
    };

    setEffectiveRefreshInterval(computeInterval());

    if (typeof document === "undefined") {
      return () => {};
    }

    const handleVisibilityChange = () => {
      setEffectiveRefreshInterval(computeInterval());
      if (!document.hidden) {
        void refreshSnapshot();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    if (effectiveRefreshInterval <= 0) {
      return () => {};
    }

    const interval = setInterval(() => {
      refreshSnapshot();
    }, effectiveRefreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [effectiveRefreshInterval, refreshSnapshot]);

  const moversSections = useMemo<MoversTableProps[]>(
    () => [
      {
        title: MOVERS_DISPLAY_METADATA[0].title,
        tone: MOVERS_DISPLAY_METADATA[0].tone,
        iconName: "trending-up",
        data: topGainers.map((item) => ({
          id: item.symbol,
          label: item.pair,
          symbol: item.symbol,
          changePercent: item.changePercent,
          change: item.change,
          extra: item.pips,
          last: item.lastPrice,
        })),
        emptyLabel: "Awaiting live FX gainers…",
      },
      {
        title: MOVERS_DISPLAY_METADATA[1].title,
        tone: MOVERS_DISPLAY_METADATA[1].tone,
        iconName: "trending-down",
        data: topLosers.map((item) => ({
          id: item.symbol,
          label: item.pair,
          symbol: item.symbol,
          changePercent: item.changePercent,
          change: item.change,
          extra: item.pips,
          last: item.lastPrice,
        })),
        emptyLabel: "Awaiting live FX decliners…",
      },
    ],
    [topGainers, topLosers],
  );

  const volatilityBuckets = useMemo<VolatilityBucket[]>(
    () => [
      {
        title: VOLATILITY_DISPLAY_METADATA[0].title,
        background: VOLATILITY_DISPLAY_METADATA[0].background,
        data: mostVolatilePairs.map((item) => ({
          id: item.symbol,
          label: item.pair,
          symbol: item.symbol,
          value: item.rangePercent,
        })),
        emptyLabel: "Awaiting live FX volatility data…",
      },
      {
        title: VOLATILITY_DISPLAY_METADATA[1].title,
        background: VOLATILITY_DISPLAY_METADATA[1].background,
        data: leastVolatilePairs.map((item) => ({
          id: item.symbol,
          label: item.pair,
          symbol: item.symbol,
          value: item.rangePercent,
        })),
        emptyLabel: "Awaiting live FX volatility data…",
      },
    ],
    [leastVolatilePairs, mostVolatilePairs],
  );

  const strengthEntries = useMemo(
    () =>
      strengthMeter.map((currency) => ({
        id: currency.code,
        code: currency.code,
        rank: currency.rank,
        tone: currency.tone,
        summary: currency.summary,
      })),
    [strengthMeter],
  );

  const volatilityEntries = useMemo(
    () =>
      volatilityMeter.map((currency) => ({
        id: currency.code,
        code: currency.code,
        rank: currency.rank,
        summary: currency.summary,
      })),
    [volatilityMeter],
  );

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
      as="section"
      id="fx-market-snapshot"
      aria-labelledby="fx-market-snapshot-heading"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Row gap="12" vertical="center" wrap>
          <Heading
            id="fx-market-snapshot-heading"
            variant="display-strong-xs"
          >
            Currencies market snapshot
          </Heading>
          <Row gap="4" vertical="center">
            <Tag
              size="s"
              background={statusTone}
              prefixIcon="clock"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {statusLabel}
            </Tag>
            <RefreshAnimation
              active={isFetching}
              ariaLabel={isFetching
                ? "Refreshing FX market snapshot"
                : "FX market snapshot idle"}
            />
          </Row>
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
            <StrengthMeterList entries={strengthEntries} />
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
            <VolatilityMeterList entries={volatilityEntries} />
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
              {moversSections.map((section) => (
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
              {volatilityBuckets.map((bucket) => (
                <VolatilityBucketPanel key={bucket.title} {...bucket} />
              ))}
            </Row>
          </InsightCard>
        </Column>
      </Row>
    </Column>
  );
}

export default FxMarketSnapshotSection;
