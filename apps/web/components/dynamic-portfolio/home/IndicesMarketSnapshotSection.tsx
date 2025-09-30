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

const INDICES_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "NAS100",
    code: "Nasdaq 100",
    rank: 1,
    tone: "strong",
    summary:
      "Growth leadership persists as megacap tech extends gains – watch earnings for catalyst risk.",
  },
  {
    id: "SPX500",
    code: "S&P 500",
    rank: 2,
    tone: "balanced",
    summary:
      "Index grinds higher with breadth improving; automation keeps risk-on but nimble.",
  },
  {
    id: "GER30",
    code: "DAX 30",
    rank: 3,
    tone: "balanced",
    summary:
      "European indices stabilise as data surprises to the upside – scope for catch-up rotation.",
  },
];

const INDICES_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "US2000",
    code: "Russell 2000",
    rank: 1,
    summary:
      "Small caps remain choppy with rates repricing – size down and lean on hedges.",
  },
  {
    id: "HKG33",
    code: "Hang Seng",
    rank: 2,
    summary:
      "China headline risk keeps realised volatility elevated – automation trades around core exposure.",
  },
  {
    id: "JPN225",
    code: "Nikkei 225",
    rank: 3,
    summary:
      "BOJ policy speculation fuels wide ranges – keep alerts on FX correlation.",
  },
];

const INDICES_MOVERS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "NAS100",
        label: "Nasdaq 100",
        symbol: "NAS100",
        changePercent: 1.12,
        change: 190.5,
        last: 17240.0,
      },
      {
        id: "GER30",
        label: "DAX 30",
        symbol: "GER30",
        changePercent: 0.86,
        change: 142.1,
        last: 16790.0,
      },
      {
        id: "AUS200",
        label: "ASX 200",
        symbol: "AUS200",
        changePercent: 0.74,
        change: 51.4,
        last: 7018.0,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "HKG33",
        label: "Hang Seng",
        symbol: "HKG33",
        changePercent: -1.35,
        change: -242.0,
        last: 17680.0,
      },
      {
        id: "ESP35",
        label: "Spain 35",
        symbol: "ESP35",
        changePercent: -0.92,
        change: -86.4,
        last: 9340.0,
      },
      {
        id: "CHN50",
        label: "China A50",
        symbol: "CHN50",
        changePercent: -0.78,
        change: -104.5,
        last: 13280.0,
      },
    ],
  },
];

const INDICES_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "US indices",
    background: "brand-alpha-weak",
    data: [
      { id: "NAS100", label: "Nasdaq 100", symbol: "NAS100", value: 1.4 },
      { id: "SPX500", label: "S&P 500", symbol: "SPX500", value: 1.1 },
      { id: "US2000", label: "Russell 2000", symbol: "US2000", value: 1.9 },
    ],
  },
  {
    title: "Global indices",
    background: "neutral-alpha-weak",
    data: [
      { id: "GER30", label: "DAX 30", symbol: "GER30", value: 1.3 },
      { id: "HKG33", label: "Hang Seng", symbol: "HKG33", value: 2.1 },
      { id: "JPN225", label: "Nikkei 225", symbol: "JPN225", value: 1.7 },
    ],
  },
];

const INDICES_MOMENTUM = [
  {
    id: "SPX500",
    headline: "S&P 500 grinding higher",
    detail:
      "Breadth improving with cyclical participation – stay constructive while above 5200 support.",
  },
  {
    id: "NAS100",
    headline: "Nasdaq leadership intact",
    detail:
      "AI complex keeps momentum positive; watch for exhaustion near all-time highs.",
  },
  {
    id: "US2000",
    headline: "Russell rebalancing",
    detail:
      "Rates sensitivity still elevated – hedge overlays remain active until spreads compress.",
  },
];

const INDICES_HEATMAP_NOTES = [
  "US tech sits in the leadership quadrant while European indices edge higher on improving PMIs.",
  "Asia-Pacific remains mixed with Japan strong and China lagging.",
  "Volatility concentrated in small caps and Hong Kong – plan hedges accordingly.",
];

export function IndicesMarketSnapshotSection() {
  return (
    <Column
      as="section"
      id="indices-market-snapshot"
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
          <Heading variant="display-strong-xs">Index market snapshot</Heading>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
            Desk preview
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Cross-region index overview summarising leadership, volatility, and
          movers before you shift equity index exposure.
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Index strength meter"
            description="Which benchmarks are carrying global equity momentum."
            tag={{
              label: "Leadership",
              icon: "flag",
              tone: "brand-alpha-weak",
            }}
          >
            <StrengthMeterList entries={INDICES_STRENGTH_ENTRIES} />
          </InsightCard>

          <InsightCard
            title="Index volatility meter"
            description="Indices with the widest realised ranges to inform hedge calibration."
            tag={{
              label: "Volatility",
              icon: "activity",
              tone: "neutral-alpha-weak",
            }}
          >
            <VolatilityMeterList entries={INDICES_VOLATILITY_ENTRIES} />
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Top movers"
            description="Percentage and point moves across major global indices."
            tag={{
              label: "Global session",
              icon: "trending-up",
              tone: "brand-alpha-weak",
            }}
          >
            <Column gap="16">
              {INDICES_MOVERS.map((section) => (
                <MoversTable
                  key={section.title}
                  {...section}
                  columnLabels={{
                    change: "Change (pts)",
                    extra: null,
                    last: "Last",
                  }}
                  formatters={{
                    changePercent: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`,
                    change: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : value.toFixed(1),
                    last: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : value.toFixed(1),
                  }}
                />
              ))}
            </Column>
          </InsightCard>

          <InsightCard
            title="Volatility radar"
            description="US vs global dispersion snapshot for hedging decisions."
            tag={{
              label: "Trading ranges",
              icon: "target",
              tone: "neutral-alpha-weak",
            }}
          >
            <Row gap="16" wrap>
              {INDICES_VOLATILITY_BUCKETS.map((bucket) => (
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
            description="Desk narrative on index positioning across regions."
            tag={{ label: "Momentum", icon: "zap", tone: "brand-alpha-weak" }}
          >
            <Column as="ul" gap="12" fillWidth>
              {INDICES_MOMENTUM.map((entry) => (
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
            description="Upcoming visual map will highlight cross-market leadership shifts."
            tag={{
              label: "Playbook",
              icon: "grid",
              tone: "neutral-alpha-weak",
            }}
          >
            <Column gap="12">
              {INDICES_HEATMAP_NOTES.map((note, index) => (
                <Text
                  key={`indices-heatmap-note-${index}`}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {note}
                </Text>
              ))}
              <Text variant="body-default-s" onBackground="neutral-weak">
                Heat map canvas is staged – the feed hooks in once live index
                analytics activate.
              </Text>
            </Column>
          </InsightCard>
        </Column>
      </Row>
    </Column>
  );
}

export default IndicesMarketSnapshotSection;
