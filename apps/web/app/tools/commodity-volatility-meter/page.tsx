import type { Metadata } from "next";

import { Column, Heading, Line, Row, Tag, Text } from "@once-ui-system/core";
import type { Colors } from "@once-ui-system/core";

const LAST_UPDATED = "25 September 2025 at 06:30 GMT+5";

type SnapshotCategory = "Energy" | "Metals" | "Agriculture" | "Precious";

type SnapshotCommodity = {
  symbol: string;
  label: string;
  category: SnapshotCategory;
  volatilityScore: number;
  percentile: string;
  change: string;
  commentary: string;
};

const VOLATILITY_SNAPSHOT: SnapshotCommodity[] = [
  {
    symbol: "NGAS",
    label: "Natural Gas Futures",
    category: "Energy",
    volatilityScore: 47.2,
    percentile: "Top 2% of all commodities",
    change: "+6.8% intraday range",
    commentary:
      "European storage draws triggered a sharp repricing as winter hedging flows hit the tape.",
  },
  {
    symbol: "Copper",
    label: "Copper Futures",
    category: "Metals",
    volatilityScore: 34.6,
    percentile: "Elevated vs 30-day average",
    change: "+4.1% range on the session",
    commentary:
      "China stimulus chatter kept base metals bid while LME spreads stayed tight across warehouses.",
  },
  {
    symbol: "WHEATF",
    label: "US Wheat Futures",
    category: "Agriculture",
    volatilityScore: 28.9,
    percentile: "Above seasonal trend",
    change: "+2.6% intraday high-low",
    commentary:
      "Harvest pressure is fading but export sales remain muted, tempering breakouts above $6.40.",
  },
  {
    symbol: "UKOil",
    label: "UK Brent Crude",
    category: "Energy",
    volatilityScore: 27.4,
    percentile: "Desk watchlist focus",
    change: "+2.1% daily move",
    commentary:
      "North Sea outages lifted the UK benchmark into backwardation through the Asian session open.",
  },
  {
    symbol: "SOYF",
    label: "US Soy Oil Futures",
    category: "Agriculture",
    volatilityScore: 24.3,
    percentile: "Steady momentum",
    change: "+1.8% range",
    commentary:
      "Biofuel demand kept realized volatility elevated while crush margins held firm in Chicago.",
  },
  {
    symbol: "USOil",
    label: "WTI Crude",
    category: "Energy",
    volatilityScore: 23.5,
    percentile: "In line with 30-day mean",
    change: "+1.5% range",
    commentary:
      "WTI consolidated near $80 with options flow dampening larger swings into NYMEX close.",
  },
  {
    symbol: "XAU",
    label: "Gold Spot (XAU/USD)",
    category: "Precious",
    volatilityScore: 20.8,
    percentile: "Cooling from last week",
    change: "+1.1% session range",
    commentary:
      "Gold volatility eased as dollar strength faded and flows rotated toward longer-dated hedges.",
  },
  {
    symbol: "XAG",
    label: "Silver Spot (XAG/USD)",
    category: "Precious",
    volatilityScore: 19.2,
    percentile: "Muted conditions",
    change: "+0.9% intraday move",
    commentary:
      "Silver tracked gold but held a tighter range while industrial demand signals remain mixed.",
  },
  {
    symbol: "CORNF",
    label: "US Corn Futures",
    category: "Agriculture",
    volatilityScore: 17.6,
    percentile: "Quietest on the desk",
    change: "-0.8% drift lower",
    commentary:
      "Corn stayed quiet with US export commitments lagging seasonal averages into quarter-end.",
  },
];

const CATEGORY_STYLES: Record<SnapshotCategory, { background: Colors }> = {
  Energy: { background: "brand-alpha-weak" },
  Metals: { background: "neutral-alpha-weak" },
  Agriculture: { background: "success-alpha-weak" },
  Precious: { background: "neutral-alpha-weak" },
};

const SNAPSHOT_MAX_SCORE = Math.max(
  ...VOLATILITY_SNAPSHOT.map((item) => item.volatilityScore),
);

type VolatilityHistoryPoint = {
  date: string;
  label: string;
  values: Record<string, number>;
};

type CommodityDetail = {
  label: string;
  color: string;
};

const VOLATILITY_HISTORY: VolatilityHistoryPoint[] = [
  {
    date: "2025-08-29",
    label: "Aug 29",
    values: {
      NGAS: 39,
      Copper: 26,
      WHEATF: 21,
      UKOil: 24,
      SOYF: 19,
      USOil: 22,
      XAU: 17,
      XAG: 18,
      CORNF: 20,
    },
  },
  {
    date: "2025-09-10",
    label: "Sep 10",
    values: {
      NGAS: 44,
      Copper: 28,
      WHEATF: 20,
      UKOil: 26,
      SOYF: 21,
      USOil: 23,
      XAU: 18,
      XAG: 19,
      CORNF: 22,
    },
  },
  {
    date: "2025-09-23",
    label: "Sep 23",
    values: {
      NGAS: 47,
      Copper: 27,
      WHEATF: 19,
      UKOil: 25,
      SOYF: 22,
      USOil: 24,
      XAU: 20,
      XAG: 21,
      CORNF: 23,
    },
  },
];

const COMMODITY_DETAILS: Record<string, CommodityDetail> = {
  NGAS: { label: "Natural Gas", color: "hsl(var(--chart-1))" },
  Copper: { label: "Copper", color: "hsl(var(--chart-2))" },
  WHEATF: { label: "Wheat", color: "hsl(var(--chart-3))" },
  UKOil: { label: "UK Oil", color: "hsl(var(--chart-4))" },
  SOYF: { label: "Soy Oil", color: "hsl(var(--chart-5))" },
  USOil: { label: "WTI", color: "hsl(var(--primary))" },
  XAU: { label: "Gold", color: "hsl(var(--accent))" },
  XAG: { label: "Silver", color: "hsl(var(--dc-secondary))" },
  CORNF: { label: "Corn", color: "hsl(var(--dc-accent))" },
};

const CHART_DIMENSIONS = {
  width: 720,
  height: 360,
  marginX: 64,
  marginY: 48,
};

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  dateLabel: string;
};

type SeriesGeometry = {
  key: string;
  label: string;
  color: string;
  path: string;
  points: ChartPoint[];
};

type AxisLabel = {
  label: string;
  x: number;
};

type AxisTick = {
  value: number;
  y: number;
};

type HistoryGeometry = {
  width: number;
  height: number;
  marginX: number;
  marginY: number;
  series: SeriesGeometry[];
  xLabels: AxisLabel[];
  yTicks: AxisTick[];
};

const buildHistoryGeometry = (
  history: VolatilityHistoryPoint[],
  details: Record<string, CommodityDetail>,
): HistoryGeometry => {
  const { width, height, marginX, marginY } = CHART_DIMENSIONS;
  const usableWidth = width - marginX * 2;
  const usableHeight = height - marginY * 2;
  const commodityKeys = Object.keys(details);

  const allValues = history.flatMap((entry) =>
    commodityKeys.map((key) => entry.values[key] ?? 0)
  );

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = Math.max(maxValue - minValue, 1);

  const scaleX = (index: number) =>
    marginX + (usableWidth / Math.max(history.length - 1, 1)) * index;
  const scaleY = (value: number) =>
    height - marginY - ((value - minValue) / range) * usableHeight;

  const series: SeriesGeometry[] = commodityKeys.map((key) => {
    const detail = details[key];
    const pathParts: string[] = [];
    const points: ChartPoint[] = history.map((entry, index) => {
      const value = entry.values[key] ?? minValue;
      const x = scaleX(index);
      const y = scaleY(value);
      pathParts.push(`${index === 0 ? "M" : "L"}${x} ${y}`);

      return {
        x,
        y,
        value,
        dateLabel: entry.label,
      };
    });

    return {
      key,
      label: detail?.label ?? key,
      color: detail?.color ?? "hsl(var(--chart-1))",
      path: pathParts.join(" "),
      points,
    };
  });

  const tickCount = 4;
  const yTicks: AxisTick[] = Array.from({ length: tickCount }, (_, index) => {
    const value = minValue + (range / (tickCount - 1)) * index;
    return {
      value: Number(value.toFixed(1)),
      y: scaleY(value),
    };
  });

  const xLabels: AxisLabel[] = history.map((entry, index) => ({
    label: entry.label,
    x: scaleX(index),
  }));

  return {
    width,
    height,
    marginX,
    marginY,
    series,
    xLabels,
    yTicks,
  };
};

const HISTORY_GEOMETRY = buildHistoryGeometry(
  VOLATILITY_HISTORY,
  COMMODITY_DETAILS,
);

export const metadata: Metadata = {
  title: "Commodity Volatility Meter – Dynamic Capital",
  description:
    "Monitor real-time commodity volatility, identify the most active contracts, and compare 30-day trends across energy, metals, and grains.",
};

const formatScore = (value: number) => `${value.toFixed(1)} σ`;

const formatTick = (value: number) => `${value.toFixed(0)} σ`;

export default function CommodityVolatilityMeterPage() {
  const mostVolatile = VOLATILITY_SNAPSHOT[0];
  const quietest = VOLATILITY_SNAPSHOT[VOLATILITY_SNAPSHOT.length - 1];

  return (
    <Column gap="40" paddingY="48" align="center" horizontal="center" fillWidth>
      <Column maxWidth={34} gap="12" align="center" horizontal="center">
        <Tag size="s" background="brand-alpha-weak">Real-time desk tools</Tag>
        <Heading variant="display-strong-s" align="center">
          Commodity Volatility Meter
        </Heading>
        <Text
          variant="body-default-l"
          align="center"
          onBackground="neutral-weak"
        >
          Monitor the volatility of commodities in real time. Our desk keeps
          tabs on the contracts that are breaking out and the ones staying quiet
          so you can size your trades with confidence.
        </Text>
      </Column>

      <Column
        fillWidth
        maxWidth={40}
        background="surface"
        border="neutral-alpha-medium"
        radius="l"
        padding="xl"
        gap="32"
        shadow="l"
        id="daily-volatility"
      >
        <Column gap="12" maxWidth={30}>
          <Heading variant="display-strong-xs">
            Today’s volatility leaderboard
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            What is the most volatile commodity today? See which contracts moved
            the most and which stayed calm so you can adapt your exposure before
            the next session opens.
          </Text>
        </Column>

        <Row gap="16" wrap s={{ direction: "column" }}>
          {[mostVolatile, quietest].map((item, index) => (
            <Column
              key={item.symbol}
              flex={1}
              minWidth={20}
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="12"
            >
              <Tag size="s" background="brand-alpha-weak">
                {index === 0 ? "Most volatile" : "Calmest"}
              </Tag>
              <Row horizontal="between" vertical="center">
                <Column gap="4">
                  <Heading variant="heading-strong-m">{item.symbol}</Heading>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    {item.label}
                  </Text>
                </Column>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {formatScore(item.volatilityScore)}
                </Text>
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {item.commentary}
              </Text>
            </Column>
          ))}
        </Row>

        <Column gap="20">
          {VOLATILITY_SNAPSHOT.map((item, index) => {
            const progress = Math.round(
              (item.volatilityScore / SNAPSHOT_MAX_SCORE) * 100,
            );

            return (
              <Column key={item.symbol} gap="12">
                <Row
                  horizontal="between"
                  vertical="center"
                  gap="16"
                  s={{ direction: "column", align: "start" }}
                >
                  <Column gap="4">
                    <Row gap="8" vertical="center">
                      <Heading variant="heading-strong-s">
                        {item.symbol}
                      </Heading>
                      <Tag
                        size="s"
                        background={CATEGORY_STYLES[item.category].background}
                      >
                        {item.category}
                      </Tag>
                    </Row>
                    <Text
                      variant="body-default-s"
                      onBackground="neutral-medium"
                    >
                      {item.label}
                    </Text>
                  </Column>
                  <Column gap="4" horizontal="end" align="end">
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-medium"
                    >
                      Volatility score
                    </Text>
                    <Text variant="heading-strong-xs">
                      {formatScore(item.volatilityScore)}
                    </Text>
                  </Column>
                </Row>
                <Row gap="12" s={{ direction: "column", align: "start" }}>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 999,
                      background: "var(--neutral-alpha-weak)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: "hsl(var(--primary))",
                        borderRadius: 999,
                        transition: "width 200ms ease-out",
                      }}
                    />
                  </div>
                  <Column gap="4">
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-medium"
                    >
                      {item.percentile}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.change}
                    </Text>
                  </Column>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {item.commentary}
                </Text>
                {index < VOLATILITY_SNAPSHOT.length - 1
                  ? <Line background="neutral-alpha-weak" />
                  : null}
              </Column>
            );
          })}
        </Column>

        <Text variant="body-default-s" onBackground="neutral-medium">
          As of {LAST_UPDATED}
        </Text>
      </Column>

      <Column
        fillWidth
        maxWidth={40}
        background="surface"
        border="neutral-alpha-medium"
        radius="l"
        padding="xl"
        gap="32"
        shadow="l"
        id="volatility-history"
      >
        <Column gap="12" maxWidth={30}>
          <Heading variant="display-strong-xs">
            Commodity volatility history
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Which commodity has been the most volatile over the last 30 days?
            Compare one-day realized volatility across the desk’s core contracts
            and spot where momentum is building.
          </Text>
        </Column>

        <Column gap="16">
          <Row gap="12" wrap>
            {HISTORY_GEOMETRY.series.map((series) => (
              <Row
                key={series.key}
                gap="8"
                vertical="center"
                style={{ flexBasis: "33%" }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: series.color,
                  }}
                />
                <Text variant="label-default-s" onBackground="neutral-medium">
                  {series.label}
                </Text>
              </Row>
            ))}
          </Row>

          <div style={{ overflowX: "auto" }}>
            <svg
              width={HISTORY_GEOMETRY.width}
              height={HISTORY_GEOMETRY.height}
              role="img"
              aria-labelledby="volatility-chart-title"
            >
              <title id="volatility-chart-title">
                30-day realized volatility for key commodity contracts
              </title>
              <rect
                x={CHART_DIMENSIONS.marginX}
                y={CHART_DIMENSIONS.marginY}
                width={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX * 2}
                height={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY * 2}
                fill="var(--page-background)"
                stroke="var(--neutral-alpha-weak)"
                rx={16}
              />
              {HISTORY_GEOMETRY.yTicks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={CHART_DIMENSIONS.marginX}
                    x2={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="var(--neutral-alpha-weak)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={CHART_DIMENSIONS.marginX - 12}
                    y={tick.y + 4}
                    textAnchor="end"
                    fontSize={12}
                    fill="var(--neutral-on-background-weak)"
                  >
                    {formatTick(tick.value)}
                  </text>
                </g>
              ))}
              {HISTORY_GEOMETRY.series.map((series) => (
                <g key={series.key}>
                  <path
                    d={series.path}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {series.points.map((point, pointIndex) => (
                    <g key={`${series.key}-${point.dateLabel}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={3.5}
                        fill={series.color}
                        stroke="var(--page-background)"
                        strokeWidth={1.5}
                      />
                      {pointIndex === series.points.length - 1
                        ? (
                          <text
                            x={point.x + 8}
                            y={point.y - 8}
                            fontSize={11}
                            fill={series.color}
                          >
                            {series.key}
                          </text>
                        )
                        : null}
                    </g>
                  ))}
                </g>
              ))}
              <line
                x1={CHART_DIMENSIONS.marginX}
                x2={CHART_DIMENSIONS.width - CHART_DIMENSIONS.marginX}
                y1={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY}
                y2={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY}
                stroke="var(--neutral-alpha-medium)"
                strokeWidth={1.2}
              />
              {HISTORY_GEOMETRY.xLabels.map((label) => (
                <text
                  key={label.label}
                  x={label.x}
                  y={CHART_DIMENSIONS.height - CHART_DIMENSIONS.marginY + 24}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--neutral-on-background-weak)"
                >
                  {label.label}
                </text>
              ))}
            </svg>
          </div>
        </Column>

        <Text variant="body-default-s" onBackground="neutral-medium">
          As of {LAST_UPDATED}
        </Text>
      </Column>
    </Column>
  );
}
