"use client";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import {
  InsightCard,
  type MoversSection,
  MoversTable,
  type StrengthMeterEntry,
  StrengthMeterList,
  type VolatilityBucket,
  VolatilityBucketPanel,
  type VolatilityMeterEntry,
  VolatilityMeterList,
} from "./MarketSnapshotPrimitives";

const STOCK_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "AAPL",
    code: "AAPL",
    rank: 1,
    tone: "strong",
    summary:
      "Fresh breakout leadership with buyers defending the $214 pivot while automation trails higher highs.",
  },
  {
    id: "MSFT",
    code: "MSFT",
    rank: 2,
    tone: "balanced",
    summary:
      "Cloud momentum stabilising – waiting on a decisive close above $415 to confirm renewed trend participation.",
  },
  {
    id: "NVDA",
    code: "NVDA",
    rank: 3,
    tone: "strong",
    summary:
      "Semi complex still charging higher as AI demand keeps flows directional; expect volatility into earnings windows.",
  },
];

const STOCK_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "TSLA",
    code: "TSLA",
    rank: 1,
    summary:
      "Two-way action as deliveries reset expectations – wide daily ranges demand disciplined position sizing.",
  },
  {
    id: "AMZN",
    code: "AMZN",
    rank: 2,
    summary:
      "Marketplace and cloud headlines inject intraday whipsaws; keep automation ready for quick reversals.",
  },
  {
    id: "META",
    code: "META",
    rank: 3,
    summary:
      "Repricing ad growth keeps momentum elevated with sharp post-news swings across the session.",
  },
];

const STOCK_MOVERS_SECTIONS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "NVDA",
        label: "NVIDIA Corp.",
        symbol: "NVDA",
        changePercent: 2.35,
        change: 22.15,
        last: 965.2,
      },
      {
        id: "AAPL",
        label: "Apple Inc.",
        symbol: "AAPL",
        changePercent: 1.42,
        change: 3.08,
        last: 219.4,
      },
      {
        id: "META",
        label: "Meta Platforms Inc.",
        symbol: "META",
        changePercent: 1.13,
        change: 4.45,
        last: 399.3,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "TSLA",
        label: "Tesla Inc.",
        symbol: "TSLA",
        changePercent: -1.87,
        change: -3.68,
        last: 193.4,
      },
      {
        id: "NFLX",
        label: "Netflix Inc.",
        symbol: "NFLX",
        changePercent: -1.32,
        change: -6.01,
        last: 448.6,
      },
      {
        id: "AMD",
        label: "Advanced Micro Devices",
        symbol: "AMD",
        changePercent: -0.98,
        change: -1.75,
        last: 176.2,
      },
    ],
  },
];

const STOCK_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "High beta focus",
    background: "brand-alpha-weak",
    data: [
      { id: "TSLA", label: "Tesla", symbol: "TSLA", value: 3.4 },
      { id: "NVDA", label: "NVIDIA", symbol: "NVDA", value: 2.8 },
      { id: "AMD", label: "AMD", symbol: "AMD", value: 2.1 },
    ],
  },
  {
    title: "Defensives",
    background: "neutral-alpha-weak",
    data: [
      { id: "PG", label: "Procter & Gamble", symbol: "PG", value: 0.9 },
      { id: "KO", label: "Coca-Cola", symbol: "KO", value: 0.7 },
      { id: "JNJ", label: "Johnson & Johnson", symbol: "JNJ", value: 0.6 },
    ],
  },
];

const STOCK_MOMENTUM_ENTRIES = [
  {
    id: "AAPL",
    headline: "AAPL momentum +2.1%",
    detail:
      "Breakout continuation in play while product cycle headlines stay supportive.",
  },
  {
    id: "MSFT",
    headline: "MSFT steady +1.4%",
    detail:
      "Cloud guidance inline – watching for a decisive reclaim above $415.",
  },
  {
    id: "NVDA",
    headline: "NVDA +2.3%",
    detail:
      "AI demand keeps leadership intact; expect volatility around supplier commentary.",
  },
];

const STOCK_HEATMAP_NOTES = [
  "Growth continues to lead while value catches a bid on defensive rotation.",
  "AI complex anchors the upper-right quadrant of the momentum grid.",
  "Financials and utilities remain muted awaiting macro catalysts.",
];

export function StocksMarketSnapshotSection() {
  return (
    <Column
      as="section"
      id="stocks-market-snapshot"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="m"
    >
      <Column gap="12" maxWidth={48}>
        <Row gap="8" vertical="center" wrap>
          <Heading variant="display-strong-xs">Stocks market snapshot</Heading>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
            Desk preview
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Equities overview capturing leadership rotation, realised volatility,
          and the movers board we use to steer risk across the New York session.
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Equity strength meter"
            description="Where mega-cap momentum is concentrating and which names are shouldering leadership."
            tag={{
              label: "Leadership",
              icon: "flag",
              tone: "brand-alpha-weak",
            }}
          >
            <StrengthMeterList entries={STOCK_STRENGTH_ENTRIES} />
          </InsightCard>

          <InsightCard
            title="Equity volatility meter"
            description="Names posting the widest realised ranges so you can calibrate position sizing."
            tag={{
              label: "Range watch",
              icon: "activity",
              tone: "neutral-alpha-weak",
            }}
          >
            <VolatilityMeterList entries={STOCK_VOLATILITY_ENTRIES} />
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Top movers"
            description="Change, dollar move, and last trade snapshot for the desk’s equity focus list."
            tag={{
              label: "US session",
              icon: "trending-up",
              tone: "brand-alpha-weak",
            }}
          >
            <Column gap="16">
              {STOCK_MOVERS_SECTIONS.map((section) => (
                <MoversTable
                  key={section.title}
                  {...section}
                  columnLabels={{
                    change: "Change ($)",
                    extra: null,
                    last: "Last ($)",
                  }}
                  formatters={{
                    changePercent: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`,
                    change: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : `$${value.toFixed(2)}`,
                    last: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : `$${value.toFixed(2)}`,
                  }}
                />
              ))}
            </Column>
          </InsightCard>

          <InsightCard
            title="Volatility radar"
            description="Contrast the highest-beta names with low-volatility defensives before adjusting exposure."
            tag={{
              label: "Trading ranges",
              icon: "target",
              tone: "neutral-alpha-weak",
            }}
          >
            <Row gap="16" wrap>
              {STOCK_VOLATILITY_BUCKETS.map((bucket) => (
                <VolatilityBucketPanel key={bucket.title} {...bucket} />
              ))}
            </Row>
          </InsightCard>
        </Column>
      </Row>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Momentum board"
            description="Quick read on which equities the desk automation currently favours."
            tag={{ label: "Momentum", icon: "zap", tone: "brand-alpha-weak" }}
          >
            <Column as="ul" gap="12" fillWidth>
              {STOCK_MOMENTUM_ENTRIES.map((entry) => (
                <Row key={entry.id} as="li" gap="12" vertical="start">
                  <Tag size="s" background="neutral-alpha-weak">
                    {entry.id}
                  </Tag>
                  <Column gap="4">
                    <Text variant="body-strong-s">{entry.headline}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {entry.detail}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Column>
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32}>
          <InsightCard
            title="Heat map insight"
            description="Desk matrix highlighting relative momentum – live view coming soon."
            tag={{
              label: "Playbook",
              icon: "grid",
              tone: "neutral-alpha-weak",
            }}
          >
            <Column gap="12">
              {STOCK_HEATMAP_NOTES.map((note, index) => (
                <Text
                  key={`stock-heatmap-note-${index}`}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {note}
                </Text>
              ))}
              <Text variant="body-default-s" onBackground="neutral-weak">
                Live heat map visuals will drop in alongside the equities data
                feed rollout.
              </Text>
            </Column>
          </InsightCard>
        </Column>
      </Row>
    </Column>
  );
}

export default StocksMarketSnapshotSection;
