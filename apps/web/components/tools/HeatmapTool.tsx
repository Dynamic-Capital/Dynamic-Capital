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
import type { SnapshotVariant } from "@/components/dynamic-portfolio/home/MarketSnapshotPrimitives";

import type { Colors } from "@/components/dynamic-ui-system";
import {
  HEATMAP_CONFIGS,
  type HeatmapAssetClass,
  type HeatmapMatrixPointConfig,
  type HeatmapMomentumClassification,
  type HeatmapMomentumEntryConfig,
  type HeatmapSeriesConfig,
  type HeatmapStrengthEntryConfig,
  type HeatmapTrendDirection,
} from "./heatmapConfigs";
import {
  findInstrumentMetadata,
  formatInstrumentLabel,
} from "@/data/instruments";

type StrengthEntry = HeatmapStrengthEntryConfig & {
  instrumentId: string;
  symbolLabel: string;
  nameLabel: string;
};

type RelativeStrengthSeries = HeatmapSeriesConfig & {
  instrumentId: string;
  label: string;
};

type RelativeStrengthGeometry = {
  chartId: string;
  series: Array<{
    instrumentId: string;
    label: string;
    path: string;
    areaPath: string;
    gradientId: string;
    color: string;
    lastPoint: { x: number; y: number; value: number; valueLabel: string };
  }>;
  xTicks: Array<{ label: string; x: number }>;
  yTicks: Array<{ value: number; y: number }>;
  baselineY: number;
  midlineY: number;
};

type MatrixPoint = HeatmapMatrixPointConfig & {
  instrumentId: string;
  label: string;
};

type MatrixGeometry = {
  matrixId: string;
  points: Array<MatrixPoint & { x: number; y: number }>;
  axes: {
    xTicks: Array<{ value: number; x: number }>;
    yTicks: Array<{ value: number; y: number }>;
  };
  center: { x: number; y: number };
};

type MomentumEntry = {
  symbol: string;
  display: string;
  score: number;
  classification?: HeatmapMomentumClassification;
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

const SENTIMENT_STYLES: Record<
  HeatmapStrengthEntryConfig["sentiment"],
  { background: Colors; icon: string }
> = {
  Bullish: { background: "brand-alpha-weak", icon: "trending-up" },
  Bearish: { background: "danger-alpha-weak", icon: "trending-down" },
  Neutral: { background: "neutral-alpha-weak", icon: "activity" },
};

const DIRECTION_STYLES: Record<
  HeatmapTrendDirection,
  { background: Colors; icon: string }
> = {
  Bullish: { background: "brand-alpha-weak", icon: "arrow-up-right" },
  Bearish: { background: "danger-alpha-weak", icon: "arrow-down-right" },
  Balancing: { background: "neutral-alpha-weak", icon: "move" },
};

const MOMENTUM_CATEGORIES = [
  "Very Bearish",
  "Bearish",
  "Bullish",
  "Very Bullish",
] as const satisfies readonly HeatmapMomentumClassification[];

const MOMENTUM_STYLES: Record<
  HeatmapMomentumClassification,
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

const getChartColor = (index: number) => {
  const paletteIndex = (index % 5) + 1;
  if (index < 5) {
    return `hsl(var(--chart-${paletteIndex}))`;
  }
  return `hsl(var(--chart-${paletteIndex}) / 0.6)`;
};

const toDomFriendlyId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const formatRelativeStrengthValue = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);

const buildStrengthEntries = (
  entries: HeatmapStrengthEntryConfig[],
): StrengthEntry[] =>
  entries.map((entry) => {
    const metadata = findInstrumentMetadata(entry.instrumentId);
    return {
      ...entry,
      instrumentId: entry.instrumentId,
      symbolLabel: metadata
        ? metadata.shortCode ?? metadata.displaySymbol
        : entry.instrumentId,
      nameLabel: metadata?.name ?? metadata?.displaySymbol ??
        entry.instrumentId,
    };
  });

const buildSeries = (
  series: HeatmapSeriesConfig[],
): RelativeStrengthSeries[] =>
  series.map((entry) => ({
    ...entry,
    instrumentId: entry.instrumentId,
    label: entry.label ??
      formatInstrumentLabel(entry.instrumentId, { variant: "display" }),
  }));

const buildRelativeStrengthGeometry = (
  labels: string[],
  seriesConfig: HeatmapSeriesConfig[],
  chartKey: string,
): RelativeStrengthGeometry => {
  const { width, height, marginX, marginY } = CHART_DIMENSIONS;
  const usableWidth = width - marginX * 2;
  const usableHeight = height - marginY * 2;
  const minValue = 0;
  const maxValue = 100;
  const valueRange = maxValue - minValue;
  const chartId = toDomFriendlyId(chartKey || "relative-strength");

  const scaleX = (index: number) =>
    marginX + (usableWidth / Math.max(labels.length - 1, 1)) * index;
  const scaleY = (value: number) =>
    height - marginY - ((value - minValue) / valueRange) * usableHeight;

  const baselineY = scaleY(minValue);
  const midlineY = scaleY(50);

  const resolvedSeries = buildSeries(seriesConfig);

  const series = resolvedSeries.map((item, index) => {
    const coordinates = item.values.map((value, valueIndex) => ({
      x: scaleX(valueIndex),
      y: scaleY(value),
    }));
    const firstPoint = coordinates[0];
    const path = coordinates
      .map((point, pointIndex) =>
        `${pointIndex === 0 ? "M" : "L"}${point.x} ${point.y}`
      )
      .join(" ");

    const lastValue = item.values[item.values.length - 1];
    const lastPoint = coordinates[coordinates.length - 1];

    const areaPath = firstPoint
      ? [
        `M${firstPoint.x} ${baselineY}`,
        ...coordinates.map((point) => `L${point.x} ${point.y}`),
        `L${lastPoint.x} ${baselineY}`,
        "Z",
      ].join(" ")
      : "";

    const gradientId = `${chartId}-gradient-${
      toDomFriendlyId(item.instrumentId)
    }`;

    return {
      instrumentId: item.instrumentId,
      label: item.label,
      path,
      areaPath,
      gradientId,
      color: getChartColor(index),
      lastPoint: {
        ...lastPoint,
        value: lastValue,
        valueLabel: formatRelativeStrengthValue(lastValue),
      },
    };
  });

  const xTicks = labels.map((label, index) => ({
    label,
    x: scaleX(index),
  }));

  const yTicks = [20, 40, 60, 80, 100].map((value) => ({
    value,
    y: scaleY(value),
  }));

  return { series, xTicks, yTicks, baselineY, midlineY, chartId };
};

const buildMatrixPoints = (
  points: HeatmapMatrixPointConfig[],
): MatrixPoint[] =>
  points.map((point) => ({
    ...point,
    instrumentId: point.instrumentId,
    label: point.label ??
      formatInstrumentLabel(point.instrumentId, { variant: "display" }),
  }));

const buildMatrixGeometry = (
  points: HeatmapMatrixPointConfig[],
  matrixKey: string,
): MatrixGeometry => {
  const { width, height, margin } = MATRIX_DIMENSIONS;
  const usableWidth = width - margin * 2;
  const usableHeight = height - margin * 2;
  const matrixId = toDomFriendlyId(`${matrixKey || "trend-matrix"}-matrix`);

  const scale = (value: number) => value / 100;

  const toX = (value: number) => margin + scale(value) * usableWidth;
  const toY = (value: number) => height - margin - scale(value) * usableHeight;

  const resolvedPoints = buildMatrixPoints(points);

  const mappedPoints = resolvedPoints.map((point) => ({
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
    matrixId,
    points: mappedPoints,
    axes: {
      xTicks: buildTicks(),
      yTicks: buildYTicks(),
    },
    center: { x: toX(50), y: toY(50) },
  };
};

const isMomentumClassification = (
  value: string | undefined,
): value is HeatmapMomentumClassification =>
  Boolean(
    value &&
      MOMENTUM_CATEGORIES.includes(value as HeatmapMomentumClassification),
  );

const classifyMomentum = (score: number): HeatmapMomentumClassification => {
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

const resolveMomentumClassification = (
  entry: HeatmapMomentumEntryConfig,
  score: number,
): HeatmapMomentumClassification =>
  isMomentumClassification(entry.classification)
    ? entry.classification
    : classifyMomentum(score);

const clampMomentumScore = (score: number) => Math.max(0, Math.min(100, score));

const formatMomentumScore = (score: number) =>
  Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);

const normaliseMomentumEntry = (
  entry: HeatmapMomentumEntryConfig,
): MomentumEntry => {
  const score = clampMomentumScore(entry.score);
  const display = entry.display ??
    formatInstrumentLabel(entry.instrumentId, { variant: "display" });
  return {
    symbol: entry.instrumentId,
    display,
    score,
    classification: resolveMomentumClassification(entry, score),
  };
};

const normaliseApiMomentumEntry = (
  entry: MarketMoverApiEntry,
): MomentumEntry => {
  const rawScore = Number(entry.score);
  const numericScore = clampMomentumScore(
    Number.isFinite(rawScore) ? rawScore : 0,
  );

  const configEntry: HeatmapMomentumEntryConfig = {
    instrumentId: entry.symbol,
    score: numericScore,
    display: entry.display,
    classification: entry.classification as
      | HeatmapMomentumClassification
      | undefined,
  };

  return {
    ...normaliseMomentumEntry(configEntry),
    updatedAt: entry.updated_at ?? undefined,
  };
};

export type HeatmapToolProps = {
  id?: string;
  assetClass: HeatmapAssetClass;
  variant?: SnapshotVariant;
};

export function HeatmapTool({
  id,
  assetClass,
  variant = "contained",
}: HeatmapToolProps) {
  const config = HEATMAP_CONFIGS[assetClass];
  const { supabase } = useSupabase();

  const geometryKey = id ?? assetClass;

  const isFrameless = variant === "frameless";

  const strengthEntries = useMemo(
    () => buildStrengthEntries(config.strength.entries),
    [config.strength.entries],
  );

  const relativeStrengthGeometry = useMemo(
    () =>
      buildRelativeStrengthGeometry(
        config.chart.labels,
        config.chart.series,
        `${geometryKey}-chart`,
      ),
    [config.chart.labels, config.chart.series, geometryKey],
  );

  const matrixGeometry = useMemo(
    () => buildMatrixGeometry(config.matrix.points, geometryKey),
    [config.matrix.points, geometryKey],
  );

  const defaultMomentum = useMemo(
    () => config.marketMovers.defaultEntries.map(normaliseMomentumEntry),
    [config.marketMovers.defaultEntries],
  );

  const [trendMomentum, setTrendMomentum] = useState<MomentumEntry[]>(
    defaultMomentum,
  );
  const [isLoadingMovers, setIsLoadingMovers] = useState(false);
  const [moversError, setMoversError] = useState<string | null>(null);

  useEffect(() => {
    setTrendMomentum(defaultMomentum);
  }, [defaultMomentum]);

  const momentumStats = useMemo(() => {
    const counts: Record<HeatmapMomentumClassification, number> = {
      "Very Bearish": 0,
      Bearish: 0,
      Bullish: 0,
      "Very Bullish": 0,
    };
    let latest: Date | null = null;

    for (const entry of trendMomentum) {
      const classification = entry.classification
        ? entry.classification
        : classifyMomentum(entry.score);
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
          setTrendMomentum(data.data.map(normaliseApiMomentumEntry));
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

  const chartClipPathId = `${relativeStrengthGeometry.chartId}-clip`;
  const chartAreaWidth = CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX * 2;
  const chartAreaHeight = CHART_DIMENSIONS.height -
    CHART_DIMENSIONS.marginY * 2;
  const matrixClipPathId = `${matrixGeometry.matrixId}-clip`;
  const matrixBounds = {
    xStart: MATRIX_DIMENSIONS.margin,
    xEnd: MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin,
    yStart: MATRIX_DIMENSIONS.margin,
    yEnd: MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin,
  };
  const matrixTopHeight = matrixGeometry.center.y - matrixBounds.yStart;
  const matrixBottomHeight = matrixBounds.yEnd - matrixGeometry.center.y;
  const matrixLeftWidth = matrixGeometry.center.x - matrixBounds.xStart;
  const matrixRightWidth = matrixBounds.xEnd - matrixGeometry.center.x;

  return (
    <Column
      id={id}
      fillWidth
      background={isFrameless ? undefined : "surface"}
      border={isFrameless ? undefined : "neutral-alpha-medium"}
      radius={isFrameless ? undefined : "l"}
      padding="xl"
      gap={isFrameless ? "24" : "32"}
      shadow={isFrameless ? undefined : "l"}
      aria-label={config.snapshotLabel}
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">{config.hero.title}</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          {config.hero.description}
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column
          background={isFrameless ? undefined : "page"}
          border={isFrameless ? undefined : "neutral-alpha-weak"}
          radius={isFrameless ? undefined : "l"}
          padding="l"
          gap="20"
          flex={1}
          minWidth={28}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              {config.strength.copy.title}
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {config.strength.copy.description}
            </Text>
          </Column>

          <Column gap="16">
            {strengthEntries.map((entry, index) => {
              const sentiment = SENTIMENT_STYLES[entry.sentiment];

              return (
                <Column key={entry.instrumentId} gap="12">
                  <Row
                    horizontal="between"
                    vertical="center"
                    gap="12"
                    s={{ direction: "column", align: "start" }}
                  >
                    <Column gap="4">
                      <Row gap="8" vertical="center">
                        <Heading as="h4" variant="heading-strong-s">
                          {entry.symbolLabel}
                        </Heading>
                        <Tag
                          size="s"
                          background={sentiment.background}
                          prefixIcon={sentiment.icon}
                        >
                          {entry.sentiment}
                        </Tag>
                      </Row>
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-medium"
                      >
                        {entry.nameLabel}
                      </Text>
                    </Column>
                    <Column minWidth={18} gap="4" horizontal="end">
                      <Text variant="heading-strong-s">{entry.score}</Text>
                      <Text
                        variant="label-default-s"
                        onBackground="neutral-medium"
                      >
                        {entry.dayChange}
                      </Text>
                    </Column>
                  </Row>
                  <div
                    role="progressbar"
                    aria-valuenow={entry.score}
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
                        width: `${entry.score}%`,
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
                  {index < strengthEntries.length - 1
                    ? <Line background="neutral-alpha-weak" />
                    : null}
                </Column>
              );
            })}
          </Column>

          <Text variant="label-default-s" onBackground="neutral-medium">
            {config.strength.copy.asOf}
          </Text>
        </Column>

        <Column
          background={isFrameless ? undefined : "page"}
          border={isFrameless ? undefined : "neutral-alpha-weak"}
          radius={isFrameless ? undefined : "l"}
          padding="l"
          gap="20"
          flex={1}
          minWidth={32}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              {config.chart.copy.title}
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {config.chart.copy.description}
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
              aria-label={`${config.chart.copy.title} over the last 30 days`}
              viewBox={`0 0 ${CHART_DIMENSIONS.width} ${CHART_DIMENSIONS.height}`}
              style={{ width: "100%", height: "auto" }}
            >
              <defs>
                <clipPath id={chartClipPathId}>
                  <rect
                    x={CHART_DIMENSIONS.marginX}
                    y={CHART_DIMENSIONS.marginY}
                    width={chartAreaWidth}
                    height={chartAreaHeight}
                    rx={12}
                  />
                </clipPath>
                {relativeStrengthGeometry.series.map((series) => (
                  <linearGradient
                    key={series.gradientId}
                    id={series.gradientId}
                    x1="0%"
                    x2="0%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={series.color}
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor={series.color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
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
              <line
                x1={CHART_DIMENSIONS.marginX}
                x2={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX}
                y1={relativeStrengthGeometry.midlineY}
                y2={relativeStrengthGeometry.midlineY}
                stroke="rgba(148,163,184,0.32)"
                strokeDasharray="6 6"
              />
              {relativeStrengthGeometry.yTicks.map((tick) => (
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
              {relativeStrengthGeometry.xTicks.map((tick) => (
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
              <g clipPath={`url(#${chartClipPathId})`}>
                {relativeStrengthGeometry.series.map((series) => (
                  <g key={series.instrumentId}>
                    {series.areaPath
                      ? (
                        <path
                          d={series.areaPath}
                          fill={`url(#${series.gradientId})`}
                          opacity={0.9}
                        />
                      )
                      : null}
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
                      stroke="rgba(15,23,42,0.35)"
                      strokeWidth={1.5}
                    />
                  </g>
                ))}
              </g>
              {relativeStrengthGeometry.series.map((series) => {
                const labelX = Math.min(
                  CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX,
                  series.lastPoint.x + 12,
                );
                const labelY = Math.max(
                  CHART_DIMENSIONS.marginY + 16,
                  series.lastPoint.y - 12,
                );
                return (
                  <text
                    key={`label-${series.instrumentId}`}
                    x={labelX}
                    y={labelY}
                    fontSize={12}
                    fill={series.color}
                    textAnchor="start"
                    stroke="rgba(15,23,42,0.72)"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {series.lastPoint.valueLabel}%
                  </text>
                );
              })}
              <text
                x={CHART_DIMENSIONS.marginX - 48}
                y={CHART_DIMENSIONS.height / 2}
                fontSize={12}
                fill="rgba(255,255,255,0.6)"
                textAnchor="middle"
                transform={`rotate(-90 ${CHART_DIMENSIONS.marginX - 48} ${
                  CHART_DIMENSIONS.height / 2
                })`}
              >
                Relative strength
              </text>
              <text
                x={CHART_DIMENSIONS.width / 2}
                y={CHART_DIMENSIONS.height - 8}
                fontSize={12}
                fill="rgba(255,255,255,0.6)"
                textAnchor="middle"
              >
                Lookback period
              </text>
            </svg>
          </div>
          <Row gap="8" wrap>
            {relativeStrengthGeometry.series.map((series) => (
              <Tag
                key={series.instrumentId}
                size="s"
                background="neutral-alpha-weak"
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: series.color,
                    }}
                  />
                  <span>{series.label}</span>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      opacity: 0.8,
                    }}
                  >
                    {series.lastPoint.valueLabel}%
                  </span>
                </span>
              </Tag>
            ))}
          </Row>
          <Text variant="label-default-s" onBackground="neutral-medium">
            {config.chart.copy.asOf}
          </Text>
        </Column>
      </Row>

      <Row gap="24" wrap>
        <Column
          background={isFrameless ? undefined : "page"}
          border={isFrameless ? undefined : "neutral-alpha-weak"}
          radius={isFrameless ? undefined : "l"}
          padding="l"
          gap="20"
          flex={1}
          minWidth={28}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              {config.matrix.copy.title}
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {config.matrix.copy.description}
            </Text>
          </Column>
          <Row gap="8" wrap>
            {config.matrix.tags.map((tag) => (
              <Tag
                key={tag.label}
                size="s"
                background={tag.background ?? "neutral-alpha-weak"}
                prefixIcon={tag.icon}
              >
                {tag.label}
              </Tag>
            ))}
          </Row>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              role="img"
              aria-label="Short-term versus long-term trend strength matrix"
              viewBox={`0 0 ${MATRIX_DIMENSIONS.width} ${MATRIX_DIMENSIONS.height}`}
              style={{ width: "100%", height: "auto" }}
            >
              <defs>
                <clipPath id={matrixClipPathId}>
                  <rect
                    x={matrixBounds.xStart}
                    y={matrixBounds.yStart}
                    width={matrixBounds.xEnd - matrixBounds.xStart}
                    height={matrixBounds.yEnd - matrixBounds.yStart}
                    rx={12}
                  />
                </clipPath>
                <filter
                  id={`${matrixGeometry.matrixId}-shadow`}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                  colorInterpolationFilters="sRGB"
                >
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="10"
                    floodColor="rgba(15,23,42,0.45)"
                    floodOpacity="0.5"
                  />
                </filter>
              </defs>
              <rect
                x={0}
                y={0}
                width={MATRIX_DIMENSIONS.width}
                height={MATRIX_DIMENSIONS.height}
                fill="var(--neutral-alpha-weak)"
                opacity={0.08}
                rx={18}
              />
              <g clipPath={`url(#${matrixClipPathId})`}>
                <rect
                  x={matrixBounds.xStart}
                  y={matrixBounds.yStart}
                  width={matrixLeftWidth}
                  height={matrixTopHeight}
                  fill="hsl(var(--destructive) / 0.08)"
                />
                <rect
                  x={matrixGeometry.center.x}
                  y={matrixBounds.yStart}
                  width={matrixRightWidth}
                  height={matrixTopHeight}
                  fill="hsl(var(--chart-1) / 0.08)"
                />
                <rect
                  x={matrixBounds.xStart}
                  y={matrixGeometry.center.y}
                  width={matrixLeftWidth}
                  height={matrixBottomHeight}
                  fill="hsl(var(--destructive) / 0.14)"
                />
                <rect
                  x={matrixGeometry.center.x}
                  y={matrixGeometry.center.y}
                  width={matrixRightWidth}
                  height={matrixBottomHeight}
                  fill="hsl(var(--chart-4) / 0.08)"
                />
                <line
                  x1={matrixBounds.xStart}
                  y1={matrixBounds.yEnd}
                  x2={matrixBounds.xEnd}
                  y2={matrixBounds.yStart}
                  stroke="rgba(148,163,184,0.22)"
                  strokeDasharray="10 10"
                />
              </g>
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
                x1={matrixBounds.xStart}
                x2={matrixBounds.xEnd}
                y1={matrixGeometry.center.y}
                y2={matrixGeometry.center.y}
                stroke="rgba(148,163,184,0.3)"
                strokeDasharray="6 6"
              />
              <line
                x1={matrixGeometry.center.x}
                x2={matrixGeometry.center.x}
                y1={matrixBounds.yStart}
                y2={matrixBounds.yEnd}
                stroke="rgba(148,163,184,0.3)"
                strokeDasharray="6 6"
              />
              {matrixGeometry.axes.yTicks.map((tick) => (
                <g key={`matrix-y-${tick.value}`}>
                  <line
                    x1={MATRIX_DIMENSIONS.margin}
                    x2={MATRIX_DIMENSIONS.width - MATRIX_DIMENSIONS.margin}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 6"
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
              {matrixGeometry.axes.xTicks.map((tick) => (
                <g key={`matrix-x-${tick.value}`}>
                  <line
                    x1={tick.x}
                    x2={tick.x}
                    y1={MATRIX_DIMENSIONS.margin}
                    y2={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 6"
                  />
                  <text
                    x={tick.x}
                    y={MATRIX_DIMENSIONS.height - MATRIX_DIMENSIONS.margin + 24}
                    fontSize={12}
                    fill="var(--neutral-on-background-weak)"
                    textAnchor="middle"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              {matrixGeometry.points.map((point) => {
                const directionStyle = DIRECTION_STYLES[point.direction];
                return (
                  <g key={point.instrumentId}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={10}
                      fill={directionStyle.background === "danger-alpha-weak"
                        ? "hsl(var(--destructive))"
                        : directionStyle.background === "brand-alpha-weak"
                        ? "hsl(var(--chart-1))"
                        : "hsl(var(--chart-2))"}
                      opacity={0.85}
                      stroke="rgba(15,23,42,0.4)"
                      strokeWidth={2}
                      filter={`url(#${matrixGeometry.matrixId}-shadow)`}
                    />
                  </g>
                );
              })}
              <text
                x={MATRIX_DIMENSIONS.margin - 52}
                y={MATRIX_DIMENSIONS.height / 2}
                fontSize={12}
                fill="rgba(255,255,255,0.6)"
                textAnchor="middle"
                transform={`rotate(-90 ${MATRIX_DIMENSIONS.margin - 52} ${
                  MATRIX_DIMENSIONS.height / 2
                })`}
              >
                Short-term momentum
              </text>
              <text
                x={MATRIX_DIMENSIONS.width / 2}
                y={MATRIX_DIMENSIONS.height - 8}
                fontSize={12}
                fill="rgba(255,255,255,0.6)"
                textAnchor="middle"
              >
                Long-term momentum
              </text>
            </svg>
          </div>
          <Column gap="16">
            {matrixGeometry.points.map((point) => {
              const directionStyle = DIRECTION_STYLES[point.direction];
              return (
                <Row
                  key={point.instrumentId}
                  horizontal="between"
                  vertical="center"
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
            {config.matrix.copy.asOf}
          </Text>
        </Column>

        <Column
          background={isFrameless ? undefined : "page"}
          border={isFrameless ? undefined : "neutral-alpha-weak"}
          radius={isFrameless ? undefined : "l"}
          padding="l"
          gap="20"
          flex={1}
          minWidth={28}
        >
          <Column gap="8">
            <Heading as="h3" variant="heading-strong-s">
              {config.marketMovers.copy.title}
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {config.marketMovers.copy.description}
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
                  const classification = entry.classification
                    ? entry.classification
                    : classifyMomentum(entry.score);
                  const style = MOMENTUM_STYLES[classification];
                  const scoreValue = clampMomentumScore(entry.score);
                  const scoreLabel = formatMomentumScore(scoreValue);

                  return (
                    <Column key={`${entry.symbol}-${index}`} gap="12">
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
                    </Column>
                  );
                })}
              </Column>
            )}
          {lastUpdatedLabel
            ? (
              <Text variant="label-default-s" onBackground="neutral-medium">
                Last refreshed {lastUpdatedLabel}
              </Text>
            )
            : null}
        </Column>
      </Row>
    </Column>
  );
}

export default HeatmapTool;
