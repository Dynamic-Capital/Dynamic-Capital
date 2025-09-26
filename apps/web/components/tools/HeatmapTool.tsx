"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Column,
  Heading,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import { useSupabase } from "@/context/SupabaseProvider";

import type { Colors } from "@/components/dynamic-ui-system";

type Sentiment = "Bullish" | "Bearish" | "Neutral";

type CommodityStrengthEntry = {
  symbol: string;
  name: string;
  score: number;
  dayChange: string;
  sentiment: Sentiment;
};

type RelativeStrengthSeries = {
  symbol: string;
  label: string;
  values: number[];
};

type RelativeStrengthGeometry = {
  series: Array<{
    symbol: string;
    label: string;
    path: string;
    color: string;
    lastPoint: { x: number; y: number; value: number };
  }>;
  xTicks: Array<{ label: string; x: number }>;
  yTicks: Array<{ value: number; y: number }>;
};

type TrendDirection = "Bullish" | "Bearish" | "Balancing";

type MatrixPoint = {
  symbol: string;
  label: string;
  shortTerm: number;
  longTerm: number;
  conviction: number;
  direction: TrendDirection;
};

type MatrixGeometry = {
  points: Array<MatrixPoint & { x: number; y: number }>;
  axes: {
    xTicks: Array<{ value: number; x: number }>;
    yTicks: Array<{ value: number; y: number }>;
  };
};

type MomentumClassification =
  | "Very Bullish"
  | "Bullish"
  | "Bearish"
  | "Very Bearish";

type MomentumEntry = {
  symbol: string;
  display: string;
  score: number;
  classification?: MomentumClassification;
  updatedAt?: string;
};

type MarketMoverApiEntry = {
  symbol: string;
  display: string;
  score: number;
  classification?: string;
  updated_at?: string;
};

type MarketMoversResponse = {
  data?: MarketMoverApiEntry[];
};

const COMMODITY_STRENGTH: CommodityStrengthEntry[] = [
  {
    symbol: "XAG",
    name: "XAG/USD",
    score: 47,
    dayChange: "-0.5%",
    sentiment: "Bearish",
  },
  {
    symbol: "NGAS",
    name: "NGAS",
    score: 58,
    dayChange: "+2.3%",
    sentiment: "Neutral",
  },
  {
    symbol: "WHEATF",
    name: "WHEATF",
    score: 39,
    dayChange: "-1.2%",
    sentiment: "Bearish",
  },
  {
    symbol: "UKOil",
    name: "UKOil",
    score: 63,
    dayChange: "+1.1%",
    sentiment: "Bullish",
  },
  {
    symbol: "USOil",
    name: "USOil",
    score: 66,
    dayChange: "+0.8%",
    sentiment: "Bullish",
  },
  {
    symbol: "SOYF",
    name: "SOYF",
    score: 68,
    dayChange: "+1.4%",
    sentiment: "Bullish",
  },
  {
    symbol: "XAU",
    name: "XAU/USD",
    score: 81,
    dayChange: "+0.7%",
    sentiment: "Bullish",
  },
  {
    symbol: "CORNF",
    name: "CORNF",
    score: 52,
    dayChange: "+0.6%",
    sentiment: "Neutral",
  },
  {
    symbol: "Copper",
    name: "Copper",
    score: 76,
    dayChange: "+0.9%",
    sentiment: "Bullish",
  },
];

const RELATIVE_STRENGTH_LABELS = [
  "Aug 29",
  "Sep 4",
  "Sep 10",
  "Sep 16",
  "Sep 23",
];

const RELATIVE_STRENGTH_SERIES: RelativeStrengthSeries[] = [
  { symbol: "Copper", label: "Copper", values: [48, 56, 62, 70, 78] },
  { symbol: "CORNF", label: "CORNF", values: [34, 42, 47, 52, 58] },
  { symbol: "NGAS", label: "NGAS", values: [32, 36, 41, 44, 49] },
  { symbol: "SOYF", label: "SOYF", values: [46, 52, 58, 63, 68] },
  { symbol: "UKOil", label: "UKOil", values: [44, 49, 54, 59, 64] },
  { symbol: "USOil", label: "USOil", values: [42, 47, 53, 58, 63] },
  { symbol: "WHEATF", label: "WHEATF", values: [30, 34, 36, 38, 41] },
  { symbol: "XAG/USD", label: "XAG/USD", values: [45, 48, 46, 49, 53] },
  { symbol: "XAU/USD", label: "XAU/USD", values: [58, 62, 66, 72, 78] },
];

const CHART_DIMENSIONS = {
  width: 640,
  height: 280,
  marginX: 48,
  marginY: 32,
};

const MATRIX_DIMENSIONS = {
  width: 360,
  height: 320,
  margin: 40,
};

const MARKET_MOVERS_REFRESH_MS = 60_000;

const MATRIX_POINTS: MatrixPoint[] = [
  {
    symbol: "XAU/USD",
    label: "Gold",
    shortTerm: 74,
    longTerm: 78,
    conviction: 86,
    direction: "Bullish",
  },
  {
    symbol: "XAG/USD",
    label: "Silver",
    shortTerm: 52,
    longTerm: 58,
    conviction: 64,
    direction: "Balancing",
  },
  {
    symbol: "Copper",
    label: "Copper",
    shortTerm: 68,
    longTerm: 72,
    conviction: 81,
    direction: "Bullish",
  },
  {
    symbol: "NGAS",
    label: "Nat gas",
    shortTerm: 46,
    longTerm: 42,
    conviction: 58,
    direction: "Bearish",
  },
  {
    symbol: "SOYF",
    label: "Soybeans",
    shortTerm: 60,
    longTerm: 56,
    conviction: 63,
    direction: "Bullish",
  },
  {
    symbol: "UKOil",
    label: "UKOil",
    shortTerm: 64,
    longTerm: 66,
    conviction: 72,
    direction: "Bullish",
  },
  {
    symbol: "USOil",
    label: "USOil",
    shortTerm: 58,
    longTerm: 61,
    conviction: 68,
    direction: "Bullish",
  },
  {
    symbol: "CORNF",
    label: "Corn",
    shortTerm: 44,
    longTerm: 48,
    conviction: 52,
    direction: "Bearish",
  },
  {
    symbol: "WHEATF",
    label: "Wheat",
    shortTerm: 36,
    longTerm: 40,
    conviction: 45,
    direction: "Bearish",
  },
];

const DEFAULT_TREND_MOMENTUM: MomentumEntry[] = [
  { symbol: "Copper", display: "Copper", score: 78 },
  { symbol: "CORNF", display: "CORNF", score: 46 },
  { symbol: "NGAS", display: "NGAS", score: 58 },
  { symbol: "SOYF", display: "SOYF", score: 67 },
  { symbol: "UKOil", display: "UKOil", score: 73 },
  { symbol: "USOil", display: "USOil", score: 71 },
  { symbol: "WHEATF", display: "WHEATF", score: 38 },
  { symbol: "XAG", display: "XAG/USD", score: 55 },
  { symbol: "XAU", display: "XAU/USD", score: 84 },
  { symbol: "USD", display: "USD", score: 62 },
  { symbol: "BTC", display: "BTC", score: 74 },
  { symbol: "ETH", display: "ETH", score: 68 },
  { symbol: "CHN50", display: "CHN50", score: 54 },
  { symbol: "AUS200", display: "AUS200", score: 57 },
  { symbol: "UK100", display: "UK100", score: 52 },
  { symbol: "FRA40", display: "FRA40", score: 51 },
  { symbol: "EUSTX50", display: "EUSTX50", score: 50 },
  { symbol: "JPN225", display: "JPN225", score: 59 },
  { symbol: "HKG33", display: "HKG33", score: 45 },
  { symbol: "ESP35", display: "ESP35", score: 53 },
  { symbol: "US30", display: "US30", score: 61 },
  { symbol: "GER30", display: "GER30", score: 58 },
  { symbol: "NAS100", display: "NAS100", score: 65 },
  { symbol: "SPX500", display: "SPX500", score: 63 },
  { symbol: "US2000", display: "US2000", score: 49 },
];

const SENTIMENT_STYLES: Record<
  Sentiment,
  { background: Colors; icon: string }
> = {
  Bullish: { background: "brand-alpha-weak", icon: "trending-up" },
  Bearish: { background: "danger-alpha-weak", icon: "trending-down" },
  Neutral: { background: "neutral-alpha-weak", icon: "activity" },
};

const DIRECTION_STYLES: Record<
  TrendDirection,
  { background: Colors; icon: string }
> = {
  Bullish: { background: "brand-alpha-weak", icon: "arrow-up-right" },
  Bearish: { background: "danger-alpha-weak", icon: "arrow-down-right" },
  Balancing: { background: "neutral-alpha-weak", icon: "move" },
};

const getChartColor = (index: number) => {
  const paletteIndex = (index % 5) + 1;
  if (index < 5) {
    return `hsl(var(--chart-${paletteIndex}))`;
  }
  return `hsl(var(--chart-${paletteIndex}) / 0.6)`;
};

const buildRelativeStrengthGeometry = (): RelativeStrengthGeometry => {
  const { width, height, marginX, marginY } = CHART_DIMENSIONS;
  const usableWidth = width - marginX * 2;
  const usableHeight = height - marginY * 2;
  const minValue = 0;
  const maxValue = 100;
  const valueRange = maxValue - minValue;

  const scaleX = (index: number) =>
    marginX +
    (usableWidth / Math.max(RELATIVE_STRENGTH_LABELS.length - 1, 1)) * index;
  const scaleY = (value: number) =>
    height - marginY - ((value - minValue) / valueRange) * usableHeight;

  const series = RELATIVE_STRENGTH_SERIES.map((item, index) => {
    const coordinates = item.values.map((value, valueIndex) => ({
      x: scaleX(valueIndex),
      y: scaleY(value),
    }));
    const path = coordinates
      .map((point, pointIndex) =>
        `${pointIndex === 0 ? "M" : "L"}${point.x} ${point.y}`
      )
      .join(" ");

    const lastValue = item.values[item.values.length - 1];
    const lastPoint = coordinates[coordinates.length - 1];

    return {
      symbol: item.symbol,
      label: item.label,
      path,
      color: getChartColor(index),
      lastPoint: { ...lastPoint, value: lastValue },
    };
  });

  const xTicks = RELATIVE_STRENGTH_LABELS.map((label, index) => ({
    label,
    x: scaleX(index),
  }));

  const yTicks = [20, 40, 60, 80, 100].map((value) => ({
    value,
    y: scaleY(value),
  }));

  return { series, xTicks, yTicks };
};

const RELATIVE_STRENGTH_GEOMETRY = buildRelativeStrengthGeometry();

const buildMatrixGeometry = (): MatrixGeometry => {
  const { width, height, margin } = MATRIX_DIMENSIONS;
  const usableWidth = width - margin * 2;
  const usableHeight = height - margin * 2;

  const scale = (value: number) => value / 100;

  const toX = (value: number) => margin + scale(value) * usableWidth;
  const toY = (value: number) => height - margin - scale(value) * usableHeight;

  const points = MATRIX_POINTS.map((point) => ({
    ...point,
    x: toX(point.longTerm),
    y: toY(point.shortTerm),
  }));

  const buildTicks = () =>
    [20, 40, 60, 80].map((value) => ({
      value,
      x: toX(value),
    }));

  const buildYTicks = () =>
    [20, 40, 60, 80].map((value) => ({
      value,
      y: toY(value),
    }));

  return {
    points,
    axes: {
      xTicks: buildTicks(),
      yTicks: buildYTicks(),
    },
  };
};

const MATRIX_GEOMETRY = buildMatrixGeometry();

const classifyMomentum = (score: number): MomentumClassification => {
  if (score >= 70) {
    return "Very Bullish";
  }
  if (score >= 50) {
    return "Bullish";
  }
  if (score >= 30) {
    return "Bearish";
  }
  return "Very Bearish";
};

const MOMENTUM_CATEGORIES = [
  "Very Bearish",
  "Bearish",
  "Bullish",
  "Very Bullish",
] as const satisfies readonly MomentumClassification[];

const isMomentumClassification = (
  value: string | undefined,
): value is MomentumClassification =>
  Boolean(
    value && MOMENTUM_CATEGORIES.includes(value as MomentumClassification),
  );

const resolveMomentumClassification = (
  classification: string | undefined,
  score: number,
): MomentumClassification =>
  isMomentumClassification(classification)
    ? classification
    : classifyMomentum(score);

const clampMomentumScore = (score: number) => Math.max(0, Math.min(100, score));

const formatMomentumScore = (score: number) =>
  Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);

const MOMENTUM_STYLES: Record<
  MomentumClassification,
  { label: string; fill: string; track: string }
> = {
  "Very Bullish": {
    label: "Very Bullish",
    fill: "hsl(var(--chart-1))",
    track: "hsl(var(--chart-1) / 0.18)",
  },
  Bullish: {
    label: "Bullish",
    fill: "hsl(var(--chart-2))",
    track: "hsl(var(--chart-2) / 0.18)",
  },
  Bearish: {
    label: "Bearish",
    fill: "hsl(var(--destructive))",
    track: "hsl(var(--destructive) / 0.2)",
  },
  "Very Bearish": {
    label: "Very Bearish",
    fill: "hsl(var(--destructive))",
    track: "hsl(var(--destructive) / 0.32)",
  },
};

const SENTIMENT_LABEL = "Market Snapshot";

export type HeatmapToolProps = {
  id?: string;
};

export function HeatmapTool({ id }: HeatmapToolProps) {
  const { supabase } = useSupabase();
  const [trendMomentum, setTrendMomentum] = useState<MomentumEntry[]>(
    DEFAULT_TREND_MOMENTUM,
  );
  const [isLoadingMovers, setIsLoadingMovers] = useState(false);
  const [moversError, setMoversError] = useState<string | null>(null);

  const momentumStats = useMemo(() => {
    const counts: Record<MomentumClassification, number> = {
      "Very Bearish": 0,
      Bearish: 0,
      Bullish: 0,
      "Very Bullish": 0,
    };
    let latest: Date | null = null;

    for (const entry of trendMomentum) {
      const classification = resolveMomentumClassification(
        entry.classification,
        entry.score,
      );
      counts[classification] += 1;

      if (entry.updatedAt) {
        const parsed = new Date(entry.updatedAt);
        if (!Number.isNaN(parsed.getTime())) {
          if (!latest || parsed > latest) {
            latest = parsed;
          }
        }
      }
    }

    return { counts, latestUpdatedAt: latest };
  }, [trendMomentum]);

  const lastUpdatedLabel = useMemo(() => {
    if (!momentumStats.latestUpdatedAt) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(momentumStats.latestUpdatedAt);
  }, [momentumStats.latestUpdatedAt]);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const normaliseEntry = (entry: MarketMoverApiEntry): MomentumEntry => {
      const rawScore = Number(entry.score);
      const numericScore = clampMomentumScore(
        Number.isFinite(rawScore) ? rawScore : 0,
      );
      return {
        symbol: entry.symbol,
        display: entry.display,
        score: numericScore,
        classification: resolveMomentumClassification(
          entry.classification,
          numericScore,
        ),
        updatedAt: entry.updated_at ?? undefined,
      };
    };

    async function fetchMovers() {
      if (!isMounted) {
        return;
      }

      setIsLoadingMovers(true);

      try {
        const { data, error } = await supabase.functions.invoke<
          MarketMoversResponse
        >("market-movers-feed", { method: "GET" });

        if (!isMounted) {
          return;
        }

        if (error) {
          setMoversError(error.message ?? "Failed to load market movers");
        } else if (Array.isArray(data?.data)) {
          setTrendMomentum(data.data.map(normaliseEntry));
          setMoversError(null);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message = error instanceof Error
            ? error.message
            : "Failed to load market movers";
          setMoversError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMovers(false);
          if (refreshTimer) {
            clearTimeout(refreshTimer);
          }
          refreshTimer = setTimeout(fetchMovers, MARKET_MOVERS_REFRESH_MS);
        }
      }
    }

    fetchMovers();

    const channel = supabase
      .channel("market-movers-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_movers" },
        () => {
          if (!isMounted) {
            return;
          }
          fetchMovers();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <Column
      id={id}
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
      aria-label={SENTIMENT_LABEL}
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">Market snapshot</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          A consolidated read on the desk&apos;s cross-asset coverage – from
          commodity momentum to index leadership – so you can calibrate exposure
          in seconds.
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column
          background="page"
          border="neutral-alpha-weak"
          radius="l"
          padding="l"
          gap="20"
          flex={1}
          minWidth={28}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              Commodities Strength
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Quick view of contract-level momentum, sentiment, and intraday
              bias to anchor your commodity playbook.
            </Text>
          </Column>

          <Column gap="16">
            {COMMODITY_STRENGTH.map((commodity, index) => {
              const sentiment = SENTIMENT_STYLES[commodity.sentiment];

              return (
                <Column key={commodity.symbol} gap="12">
                  <Row
                    horizontal="between"
                    vertical="center"
                    gap="12"
                    s={{ direction: "column", align: "start" }}
                  >
                    <Column gap="4">
                      <Row gap="8" vertical="center">
                        <Heading as="h4" variant="heading-strong-s">
                          {commodity.symbol}
                        </Heading>
                        <Tag
                          size="s"
                          background={sentiment.background}
                          prefixIcon={sentiment.icon}
                        >
                          {commodity.sentiment}
                        </Tag>
                      </Row>
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-medium"
                      >
                        {commodity.name}
                      </Text>
                    </Column>
                    <Column minWidth={18} gap="4" horizontal="end">
                      <Text variant="heading-strong-s">{commodity.score}</Text>
                      <Text
                        variant="label-default-s"
                        onBackground="neutral-medium"
                      >
                        {commodity.dayChange}
                      </Text>
                    </Column>
                  </Row>
                  <div
                    role="progressbar"
                    aria-valuenow={commodity.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{
                      height: 8,
                      width: "100%",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${commodity.score}%`,
                        height: "100%",
                        background: sentiment.background === "danger-alpha-weak"
                          ? "hsl(var(--destructive))"
                          : sentiment.background === "brand-alpha-weak"
                          ? "hsl(var(--chart-1))"
                          : "hsl(var(--chart-2))",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  {index < COMMODITY_STRENGTH.length - 1
                    ? <Line background="neutral-alpha-weak" />
                    : null}
                </Column>
              );
            })}
          </Column>

          <Text variant="label-default-s" onBackground="neutral-medium">
            As of 25 September 2025 at 06:29 GMT+5
          </Text>
        </Column>

        <Column
          background="page"
          border="neutral-alpha-weak"
          radius="l"
          padding="l"
          gap="20"
          flex={1}
          minWidth={32}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              Commodities Heat Map
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Relative momentum readings over the last month highlight which
              contracts are heating up or losing steam.
            </Text>
          </Column>
          <div
            style={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <svg
              role="img"
              aria-label="Relative strength of monitored commodities over the last 30 days"
              viewBox={`0 0 ${CHART_DIMENSIONS.width} ${CHART_DIMENSIONS.height}`}
              style={{ width: "100%", height: "auto" }}
            >
              <rect
                x={0}
                y={0}
                width={CHART_DIMENSIONS.width}
                height={CHART_DIMENSIONS.height}
                fill="var(--neutral-alpha-weak)"
                opacity={0.08}
              />
              <line
                x1={CHART_DIMENSIONS.marginX}
                y1={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY}
                x2={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX}
                y2={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY}
                stroke="rgba(255,255,255,0.12)"
              />
              <line
                x1={CHART_DIMENSIONS.marginX}
                y1={CHART_DIMENSIONS.marginY}
                x2={CHART_DIMENSIONS.marginX}
                y2={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY}
                stroke="rgba(255,255,255,0.12)"
              />
              {RELATIVE_STRENGTH_GEOMETRY.yTicks.map((tick) => (
                <g key={`y-${tick.value}`}>
                  <line
                    x1={CHART_DIMENSIONS.marginX}
                    x2={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 6"
                  />
                  <text
                    x={CHART_DIMENSIONS.marginX - 12}
                    y={tick.y + 4}
                    fontSize={12}
                    fill="var(--neutral-on-background-weak)"
                    textAnchor="end"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              {RELATIVE_STRENGTH_GEOMETRY.xTicks.map((tick) => (
                <g key={`x-${tick.label}`}>
                  <text
                    x={tick.x}
                    y={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY + 24}
                    fontSize={12}
                    fill="var(--neutral-on-background-weak)"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
              {RELATIVE_STRENGTH_GEOMETRY.series.map((series) => (
                <g key={series.symbol}>
                  <path
                    d={series.path}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={series.lastPoint.x}
                    cy={series.lastPoint.y}
                    r={3.5}
                    fill={series.color}
                  />
                </g>
              ))}
            </svg>
          </div>
          <Row gap="8" wrap>
            {RELATIVE_STRENGTH_GEOMETRY.series.map((series) => (
              <Tag key={series.symbol} size="s" background="neutral-alpha-weak">
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: series.color,
                    marginRight: 8,
                  }}
                />
                {series.label}
              </Tag>
            ))}
          </Row>
          <Text variant="label-default-s" onBackground="neutral-medium">
            As of 25 September 2025 at 06:29 GMT+5
          </Text>
        </Column>
      </Row>

      <Row gap="24" wrap>
        <Column
          background="page"
          border="neutral-alpha-weak"
          radius="l"
          padding="l"
          gap="20"
          flex={1}
          minWidth={28}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              Commodities Volatility
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Short- versus long-term trend posture shows where volatility is
              compressing or expanding across the complex.
            </Text>
          </Column>
          <Row gap="8" wrap>
            <Tag
              size="s"
              background="neutral-alpha-weak"
              prefixIcon="trending-up"
            >
              20 SMA
            </Tag>
            <Tag
              size="s"
              background="neutral-alpha-weak"
              prefixIcon="trending-up"
            >
              5 SMA
            </Tag>
            <Tag size="s" background="brand-alpha-weak" prefixIcon="play">
              Replay
            </Tag>
          </Row>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              role="img"
              aria-label="Short-term versus long-term trend strength matrix"
              viewBox={`0 0 ${MATRIX_DIMENSIONS.width} ${MATRIX_DIMENSIONS.height}`}
              style={{ width: "100%", height: "auto" }}
            >
              <rect
                x={0}
                y={0}
                width={MATRIX_DIMENSIONS.width}
                height={MATRIX_DIMENSIONS.height}
                fill="var(--neutral-alpha-weak)"
                opacity={0.08}
              />
              <rect
                x={MATRIX_DIMENSIONS.margin}
                y={MATRIX_DIMENSIONS.margin}
                width={(MATRIX_DIMENSIONS.width -
                  MATRIX_DIMENSIONS.margin * 2) / 2}
                height={(MATRIX_DIMENSIONS.height -
                  MATRIX_DIMENSIONS.margin * 2) / 2}
                fill="hsl(var(--chart-1) / 0.08)"
              />
              <rect
                x={MATRIX_DIMENSIONS.margin +
                  (MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin * 2) / 2}
                y={MATRIX_DIMENSIONS.margin +
                  (MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin * 2) / 2}
                width={(MATRIX_DIMENSIONS.width -
                  MATRIX_DIMENSIONS.margin * 2) / 2}
                height={(MATRIX_DIMENSIONS.height -
                  MATRIX_DIMENSIONS.margin * 2) / 2}
                fill="hsl(var(--destructive) / 0.12)"
              />
              <line
                x1={MATRIX_DIMENSIONS.margin}
                y1={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin}
                x2={MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin}
                y2={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin}
                stroke="rgba(255,255,255,0.12)"
              />
              <line
                x1={MATRIX_DIMENSIONS.margin}
                y1={MATRIX_DIMENSIONS.margin}
                x2={MATRIX_DIMENSIONS.margin}
                y2={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin}
                stroke="rgba(255,255,255,0.12)"
              />
              <line
                x1={MATRIX_DIMENSIONS.margin}
                y1={MATRIX_DIMENSIONS.margin +
                  (MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin * 2) / 2}
                x2={MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin}
                y2={MATRIX_DIMENSIONS.margin +
                  (MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin * 2) / 2}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 6"
              />
              <line
                x1={MATRIX_DIMENSIONS.margin +
                  (MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin * 2) / 2}
                y1={MATRIX_DIMENSIONS.margin}
                x2={MATRIX_DIMENSIONS.margin +
                  (MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin * 2) / 2}
                y2={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 6"
              />
              {MATRIX_GEOMETRY.axes.yTicks.map((tick) => (
                <g key={`matrix-y-${tick.value}`}>
                  <line
                    x1={MATRIX_DIMENSIONS.margin}
                    x2={MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <text
                    x={MATRIX_DIMENSIONS.margin - 12}
                    y={tick.y + 4}
                    fontSize={12}
                    fill="var(--neutral-on-background-weak)"
                    textAnchor="end"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              {MATRIX_GEOMETRY.axes.xTicks.map((tick) => (
                <g key={`matrix-x-${tick.value}`}>
                  <line
                    x1={tick.x}
                    x2={tick.x}
                    y1={MATRIX_DIMENSIONS.margin}
                    y2={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin}
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <text
                    x={tick.x}
                    y={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin + 20}
                    fontSize={12}
                    fill="var(--neutral-on-background-weak)"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              {MATRIX_GEOMETRY.points.map((point) => {
                const styles = DIRECTION_STYLES[point.direction];
                return (
                  <g key={point.symbol}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(6, point.conviction / 14)}
                      fill={styles.background === "danger-alpha-weak"
                        ? "hsl(var(--destructive))"
                        : styles.background === "brand-alpha-weak"
                        ? "hsl(var(--chart-1))"
                        : "hsl(var(--chart-3))"}
                      opacity={0.82}
                    />
                    <text
                      x={point.x + 12}
                      y={point.y + 4}
                      fontSize={12}
                      fill="var(--neutral-on-background-weak)"
                    >
                      {point.symbol}
                    </text>
                  </g>
                );
              })}
              <text
                x={MATRIX_DIMENSIONS.width / 2}
                y={MATRIX_DIMENSIONS.margin - 12}
                fontSize={12}
                fill="var(--neutral-on-background-weak)"
                textAnchor="middle"
              >
                Stronger bullish trend →
              </text>
              <text
                x={MATRIX_DIMENSIONS.margin - 24}
                y={MATRIX_DIMENSIONS.height / 2}
                fontSize={12}
                fill="var(--neutral-on-background-weak)"
                textAnchor="middle"
                transform={`rotate(-90 ${MATRIX_DIMENSIONS.margin - 24} ${
                  MATRIX_DIMENSIONS.height / 2
                })`}
              >
                ↑ Stronger short-term momentum
              </text>
            </svg>
          </div>
          <Column gap="12">
            {MATRIX_GEOMETRY.points.map((point) => {
              const directionStyle = DIRECTION_STYLES[point.direction];
              return (
                <Row
                  key={`${point.symbol}-detail`}
                  horizontal="between"
                  gap="12"
                  s={{ direction: "column", align: "start" }}
                >
                  <Column gap="4">
                    <Row gap="8" vertical="center">
                      <Heading as="h4" variant="heading-strong-s">
                        {point.label}
                      </Heading>
                      <Tag
                        size="s"
                        background={directionStyle.background}
                        prefixIcon={directionStyle.icon}
                      >
                        {point.direction}
                      </Tag>
                    </Row>
                    <Text
                      variant="body-default-s"
                      onBackground="neutral-medium"
                    >
                      5 SMA {point.shortTerm} · 20 SMA {point.longTerm}
                    </Text>
                  </Column>
                  <Text variant="label-default-s" onBackground="neutral-medium">
                    Conviction {point.conviction}%
                  </Text>
                </Row>
              );
            })}
          </Column>
          <Text variant="label-default-s" onBackground="neutral-medium">
            As of 25 September 2025 at 06:29 GMT+5
          </Text>
        </Column>

        <Column
          background="page"
          border="neutral-alpha-weak"
          radius="l"
          padding="l"
          gap="20"
          flex={1}
          minWidth={28}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              Market Movers
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Multi-asset momentum board covering currencies, crypto, and global
              indices to spotlight leadership shifts.
            </Text>
          </Column>
          <Row horizontal="between" vertical="center" gap="12" wrap>
            <Text variant="label-default-s" onBackground="neutral-medium">
              {trendMomentum.length} matches
              {isLoadingMovers ? " · updating…" : null}
            </Text>
            <Row gap="12" wrap>
              {MOMENTUM_CATEGORIES.map((category) => (
                <Text
                  key={category}
                  variant="label-default-s"
                  onBackground="neutral-medium"
                >
                  {momentumStats.counts[category]} {category}
                </Text>
              ))}
            </Row>
          </Row>
          {moversError
            ? (
              <Text variant="label-default-s" onBackground="danger-medium">
                {moversError}
              </Text>
            )
            : null}
          {trendMomentum.length === 0 && !isLoadingMovers
            ? (
              <Text variant="body-default-m" onBackground="neutral-medium">
                No qualifying movers at the moment.
              </Text>
            )
            : (
              <Column gap="16">
                {trendMomentum.map((entry, index) => {
                  const classification = resolveMomentumClassification(
                    entry.classification,
                    entry.score,
                  );
                  const style = MOMENTUM_STYLES[classification];
                  const scoreValue = clampMomentumScore(entry.score);
                  const scoreLabel = formatMomentumScore(scoreValue);

                  return (
                    <Column key={entry.symbol} gap="12">
                      <Row
                        horizontal="between"
                        vertical="center"
                        gap="12"
                        s={{ direction: "column", align: "start" }}
                      >
                        <Column gap="4">
                          <Heading as="h4" variant="heading-strong-s">
                            {entry.display}
                          </Heading>
                          <Text
                            variant="body-default-s"
                            onBackground="neutral-medium"
                          >
                            {classification}
                          </Text>
                        </Column>
                        <Text variant="heading-strong-s">{scoreLabel}</Text>
                      </Row>
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round(scoreValue)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{
                          width: "100%",
                          height: 10,
                          borderRadius: 999,
                          background: style.track,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${scoreValue}%`,
                            height: "100%",
                            background: style.fill,
                          }}
                        />
                      </div>
                      {index < trendMomentum.length - 1
                        ? <Line background="neutral-alpha-weak" />
                        : null}
                    </Column>
                  );
                })}
              </Column>
            )}
          <Text variant="label-default-s" onBackground="neutral-medium">
            {lastUpdatedLabel
              ? `Synced ${lastUpdatedLabel}`
              : isLoadingMovers
              ? "Refreshing live movers…"
              : "Awaiting first sync"}
          </Text>
        </Column>
      </Row>
    </Column>
  );
}

export default HeatmapTool;
