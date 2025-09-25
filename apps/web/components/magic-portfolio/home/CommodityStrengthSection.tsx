import { Column, Heading, Line, Row, Tag, Text } from "@/components/dynamic-ui-system";

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
};

const COMMODITY_STRENGTH: CommodityStrengthEntry[] = [
  {
    symbol: "SOYF",
    name: "Soybean futures",
    score: 68,
    dayChange: "+1.4%",
    sentiment: "Bullish",
  },
  {
    symbol: "Copper",
    name: "Copper",
    score: 76,
    dayChange: "+0.9%",
    sentiment: "Bullish",
  },
  {
    symbol: "CORNF",
    name: "Corn futures",
    score: 52,
    dayChange: "+0.6%",
    sentiment: "Neutral",
  },
  {
    symbol: "UKOil",
    name: "UK Brent crude",
    score: 63,
    dayChange: "+1.1%",
    sentiment: "Bullish",
  },
  {
    symbol: "XAU/USD",
    name: "Gold",
    score: 81,
    dayChange: "+0.7%",
    sentiment: "Bullish",
  },
  {
    symbol: "USOil",
    name: "WTI crude",
    score: 66,
    dayChange: "+0.8%",
    sentiment: "Bullish",
  },
  {
    symbol: "XAG/USD",
    name: "Silver",
    score: 47,
    dayChange: "-0.5%",
    sentiment: "Bearish",
  },
  {
    symbol: "NGAS",
    name: "Natural gas",
    score: 58,
    dayChange: "+2.3%",
    sentiment: "Neutral",
  },
  {
    symbol: "WHEATF",
    name: "Wheat futures",
    score: 39,
    dayChange: "-1.2%",
    sentiment: "Bearish",
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

const TREND_MOMENTUM: MomentumEntry[] = [
  { symbol: "Copper", display: "Copper", score: 78 },
  { symbol: "CORNF", display: "CORNF", score: 46 },
  { symbol: "NGAS", display: "NGAS", score: 58 },
  { symbol: "SOYF", display: "SOYF", score: 67 },
  { symbol: "UKOil", display: "UKOil", score: 73 },
  { symbol: "USOil", display: "USOil", score: 71 },
  { symbol: "WHEATF", display: "WHEATF", score: 38 },
  { symbol: "XAGUSD", display: "XAG/USD", score: 55 },
  { symbol: "XAUUSD", display: "XAU/USD", score: 84 },
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

const SENTIMENT_LABEL = "Commodity Strength Meter";

export function CommodityStrengthSection() {
  return (
    <Column
      id="commodity-strength"
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
        <Heading variant="display-strong-xs">Commodity strength meter</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Monitor the strength of major commodities in real time. Quickly spot
          which contracts are leading, cooling, or reversing so you can respond
          with the right positioning.
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
              Commodity Strength Meter
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              What is the overall strength or weakness of individual commodities
              today?
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
              Commodity Strength Chart
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Compare the relative strength of each contract across the last 30
              days to see which trend is accelerating.
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
              Trend Strength Matrix
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Plot commodities by short-term versus long-term moving averages to
              understand trend direction and conviction at a glance.
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
              Trend Momentum
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Values above 50 indicate upward buying pressure while readings
              under 50 highlight growing selling pressure.
            </Text>
          </Column>
          <Row horizontal="between" vertical="center" gap="12" wrap>
            <Text variant="label-default-s" onBackground="neutral-medium">
              9 matches
            </Text>
            <Row gap="12" wrap>
              <Text variant="label-default-s" onBackground="neutral-medium">
                0 Very Bearish
              </Text>
              <Text variant="label-default-s" onBackground="neutral-medium">
                30 Bearish
              </Text>
              <Text variant="label-default-s" onBackground="neutral-medium">
                50 Bullish
              </Text>
              <Text variant="label-default-s" onBackground="neutral-medium">
                70 Very Bullish
              </Text>
              <Text variant="label-default-s" onBackground="neutral-medium">
                100
              </Text>
            </Row>
          </Row>
          <Column gap="16">
            {TREND_MOMENTUM.map((entry, index) => {
              const classification = classifyMomentum(entry.score);
              const style = MOMENTUM_STYLES[classification];

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
                    <Text variant="heading-strong-s">{entry.score}</Text>
                  </Row>
                  <div
                    role="progressbar"
                    aria-valuenow={entry.score}
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
                        width: `${entry.score}%`,
                        height: "100%",
                        background: style.fill,
                      }}
                    />
                  </div>
                  {index < TREND_MOMENTUM.length - 1
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
      </Row>
    </Column>
  );
}

export default CommodityStrengthSection;
