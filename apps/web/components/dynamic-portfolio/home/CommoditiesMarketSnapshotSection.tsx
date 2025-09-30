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

const COMMODITY_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "XAUUSD",
    code: "XAU/USD",
    rank: 1,
    tone: "strong",
    summary:
      "Safe-haven flows keep gold elevated above the $2,400 hedge shelf with automation scaling on retests.",
  },
  {
    id: "UKOil",
    code: "Brent",
    rank: 2,
    tone: "balanced",
    summary:
      "Brent consolidates mid-range while OPEC rhetoric underpins bids – watching inventory data for direction.",
  },
  {
    id: "NGAS",
    code: "NatGas",
    rank: 3,
    tone: "soft",
    summary:
      "Weather swings leave natural gas choppy; automation throttles exposure until demand signals stabilise.",
  },
];

const COMMODITY_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "XAGUSD",
    code: "XAG/USD",
    rank: 1,
    summary:
      "Silver tracks gold but with wider realised ranges as macro hedgers express leverage here.",
  },
  {
    id: "NGAS",
    code: "NatGas",
    rank: 2,
    summary:
      "Temperature forecasts drive sharp intraday swings – size down and lean on automation.",
  },
  {
    id: "USOil",
    code: "WTI",
    rank: 3,
    summary:
      "WTI responding to US inventory surprises – expect spikes around EIA releases.",
  },
];

const COMMODITY_MOVERS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "XAUUSD",
        label: "Gold",
        symbol: "XAU/USD",
        changePercent: 0.74,
        change: 17.6,
        last: 2408.3,
      },
      {
        id: "UKOil",
        label: "Brent crude",
        symbol: "UKOIL",
        changePercent: 0.68,
        change: 0.58,
        last: 86.4,
      },
      {
        id: "SOYF",
        label: "Soybeans",
        symbol: "SOYF",
        changePercent: 0.54,
        change: 7.2,
        last: 1341.5,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "NGAS",
        label: "Natural gas",
        symbol: "NGAS",
        changePercent: -1.92,
        change: -0.05,
        last: 2.65,
      },
      {
        id: "XAGUSD",
        label: "Silver",
        symbol: "XAG/USD",
        changePercent: -0.84,
        change: -0.21,
        last: 24.8,
      },
      {
        id: "WHEATF",
        label: "Wheat",
        symbol: "WHEATF",
        changePercent: -0.65,
        change: -5.1,
        last: 776.2,
      },
    ],
  },
];

const COMMODITY_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "Energy",
    background: "brand-alpha-weak",
    data: [
      { id: "UKOil", label: "Brent", symbol: "UKOIL", value: 1.8 },
      { id: "USOil", label: "WTI", symbol: "USOIL", value: 1.6 },
      { id: "NGAS", label: "NatGas", symbol: "NGAS", value: 2.4 },
    ],
  },
  {
    title: "Metals",
    background: "neutral-alpha-weak",
    data: [
      { id: "XAUUSD", label: "Gold", symbol: "XAU/USD", value: 0.9 },
      { id: "XAGUSD", label: "Silver", symbol: "XAG/USD", value: 1.4 },
      { id: "Copper", label: "Copper", symbol: "Copper", value: 1.1 },
    ],
  },
];

const COMMODITY_MOMENTUM = [
  {
    id: "XAUUSD",
    headline: "Gold bias remains constructive",
    detail:
      "Macro hedge demand keeps the metal bid while yields stabilise – maintain swing core above $2,380.",
  },
  {
    id: "USOil",
    headline: "WTI momentum cooling",
    detail:
      "Watching gasoline cracks for confirmation before fading the move back inside the range.",
  },
  {
    id: "SOYF",
    headline: "Soy complex firm",
    detail:
      "Weather premium still embedded – automation keeps trailing stops loose.",
  },
];

const COMMODITY_HEATMAP_NOTES = [
  "Energy dominates the upper quadrant while softs lag on harvest progress.",
  "Precious metals hold neutral momentum awaiting macro catalysts.",
  "Industrial metals steady as China stimulus headlines drip-feed optimism.",
];

export function CommoditiesMarketSnapshotSection() {
  return (
    <Column
      as="section"
      id="commodities-market-snapshot"
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
          <Heading variant="display-strong-xs">
            Commodities market snapshot
          </Heading>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
            Desk preview
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Metals, energy, and ags overview showing where volatility and price
          leadership sit before we rebalance cross-complex exposure.
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Commodity strength meter"
            description="Highlights which contracts carry the current momentum baton."
            tag={{
              label: "Leadership",
              icon: "flag",
              tone: "brand-alpha-weak",
            }}
          >
            <StrengthMeterList entries={COMMODITY_STRENGTH_ENTRIES} />
          </InsightCard>

          <InsightCard
            title="Commodity volatility meter"
            description="Contracts printing the widest realised ranges this session."
            tag={{
              label: "Range watch",
              icon: "activity",
              tone: "neutral-alpha-weak",
            }}
          >
            <VolatilityMeterList entries={COMMODITY_VOLATILITY_ENTRIES} />
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Top movers"
            description="Percentage and dollar moves for the desk’s core commodity grid."
            tag={{
              label: "Global flows",
              icon: "trending-up",
              tone: "brand-alpha-weak",
            }}
          >
            <Column gap="16">
              {COMMODITY_MOVERS.map((section) => (
                <MoversTable
                  key={section.title}
                  {...section}
                  columnLabels={{
                    change: "Change",
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
                        : value.toFixed(2),
                    last: (value) =>
                      value === undefined || Number.isNaN(value)
                        ? "—"
                        : value.toFixed(2),
                  }}
                />
              ))}
            </Column>
          </InsightCard>

          <InsightCard
            title="Volatility radar"
            description="Energy vs metals contrast to frame expected trading ranges."
            tag={{
              label: "Trading ranges",
              icon: "target",
              tone: "neutral-alpha-weak",
            }}
          >
            <Row gap="16" wrap>
              {COMMODITY_VOLATILITY_BUCKETS.map((bucket) => (
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
            description="Desk commentary on standout commodity positioning."
            tag={{ label: "Momentum", icon: "zap", tone: "brand-alpha-weak" }}
          >
            <Column as="ul" gap="12" fillWidth>
              {COMMODITY_MOMENTUM.map((entry) => (
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
            description="Context from our commodities relative-strength grid."
            tag={{
              label: "Playbook",
              icon: "grid",
              tone: "neutral-alpha-weak",
            }}
          >
            <Column gap="12">
              {COMMODITY_HEATMAP_NOTES.map((note, index) => (
                <Text
                  key={`commodity-heatmap-note-${index}`}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {note}
                </Text>
              ))}
              <Text variant="body-default-s" onBackground="neutral-weak">
                Visual heat maps will slot in once the multi-asset feed is wired
                – placeholders keep the layout ready.
              </Text>
            </Column>
          </InsightCard>
        </Column>
      </Row>
    </Column>
  );
}

export default CommoditiesMarketSnapshotSection;
