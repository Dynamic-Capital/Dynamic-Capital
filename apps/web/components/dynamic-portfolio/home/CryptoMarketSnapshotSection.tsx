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

const CRYPTO_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "BTCUSD",
    code: "BTC/USD",
    rank: 1,
    tone: "strong",
    summary:
      "Bitcoin holding the $64k breakout shelf keeps trend bots engaged and alt beta supported.",
  },
  {
    id: "ETHUSD",
    code: "ETH/USD",
    rank: 2,
    tone: "balanced",
    summary:
      "Ether consolidates above $3.1k; watching staking flows for confirmation before adding.",
  },
  {
    id: "SOLUSD",
    code: "SOL/USD",
    rank: 3,
    tone: "strong",
    summary:
      "Layer-1 trade stays active with Solana leading alt momentum – expect higher realised volatility.",
  },
];

const CRYPTO_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "SOLUSD",
    code: "SOL/USD",
    rank: 1,
    summary:
      "Strong participation keeps 24h ranges wide – size positions accordingly.",
  },
  {
    id: "DOGEUSD",
    code: "DOGE/USD",
    rank: 2,
    summary:
      "Meme complex swingy as social chatter spikes; automation trims quickly on reversals.",
  },
  {
    id: "ETHUSD",
    code: "ETH/USD",
    rank: 3,
    summary:
      "Options flow drives intraday swings as traders price the next upgrade roadmap.",
  },
];

const CRYPTO_MOVERS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "SOLUSD",
        label: "Solana",
        symbol: "SOL/USD",
        changePercent: 3.85,
        change: 6.24,
        last: 168.2,
      },
      {
        id: "ETHUSD",
        label: "Ether",
        symbol: "ETH/USD",
        changePercent: 2.14,
        change: 66.5,
        last: 3182.4,
      },
      {
        id: "BTCUSD",
        label: "Bitcoin",
        symbol: "BTC/USD",
        changePercent: 1.78,
        change: 1142.0,
        last: 65420.0,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "DOGEUSD",
        label: "Dogecoin",
        symbol: "DOGE/USD",
        changePercent: -2.65,
        change: -0.0045,
        last: 0.165,
      },
      {
        id: "ADAUSD",
        label: "Cardano",
        symbol: "ADA/USD",
        changePercent: -1.92,
        change: -0.013,
        last: 0.662,
      },
      {
        id: "AVAXUSD",
        label: "Avalanche",
        symbol: "AVAX/USD",
        changePercent: -1.35,
        change: -0.72,
        last: 52.3,
      },
    ],
  },
];

const CRYPTO_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "Momentum alts",
    background: "brand-alpha-weak",
    data: [
      { id: "SOLUSD", label: "Solana", symbol: "SOL/USD", value: 6.4 },
      { id: "AVAXUSD", label: "Avalanche", symbol: "AVAX/USD", value: 5.1 },
      { id: "LINKUSD", label: "Chainlink", symbol: "LINK/USD", value: 4.7 },
    ],
  },
  {
    title: "Stable majors",
    background: "neutral-alpha-weak",
    data: [
      { id: "BTCUSD", label: "Bitcoin", symbol: "BTC/USD", value: 3.2 },
      { id: "ETHUSD", label: "Ether", symbol: "ETH/USD", value: 3.8 },
      { id: "XRPUSD", label: "XRP", symbol: "XRP/USD", value: 2.6 },
    ],
  },
];

const CRYPTO_MOMENTUM = [
  {
    id: "BTCUSD",
    headline: "BTC trend intact",
    detail:
      "Funding neutral and supply absorption strong – keep adds measured while above $62k.",
  },
  {
    id: "ETHUSD",
    headline: "ETH awaiting catalysts",
    detail:
      "Rotation into L2 plays softens impulse – monitor staking metrics for next signal.",
  },
  {
    id: "SOLUSD",
    headline: "SOL momentum high",
    detail:
      "Ecosystem inflows keep momentum bots long, but we fade parabolic spikes intraday.",
  },
];

const CRYPTO_HEATMAP_NOTES = [
  "Layer-1 momentum dominates the heat map with Solana and Avalanche in the lead quadrant.",
  "Stablecoins hold neutral – no signs of broad de-risking yet.",
  "DeFi tokens lag but are curling higher alongside Ethereum strength.",
];

export function CryptoMarketSnapshotSection() {
  return (
    <Column
      as="section"
      id="crypto-market-snapshot"
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
          <Heading variant="display-strong-xs">Crypto market snapshot</Heading>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
            Desk preview
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Digital asset overview capturing the majors plus high-beta alts so you
          can calibrate crypto exposure at a glance.
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Crypto strength meter"
            description="Shows which coins are driving the current digital asset trend."
            tag={{
              label: "Leadership",
              icon: "flag",
              tone: "brand-alpha-weak",
            }}
          >
            <StrengthMeterList entries={CRYPTO_STRENGTH_ENTRIES} />
          </InsightCard>

          <InsightCard
            title="Crypto volatility meter"
            description="24h realised volatility so you can dial sizing appropriately."
            tag={{
              label: "Volatility",
              icon: "activity",
              tone: "neutral-alpha-weak",
            }}
          >
            <VolatilityMeterList entries={CRYPTO_VOLATILITY_ENTRIES} />
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32} gap="24">
          <InsightCard
            title="Top movers"
            description="Percentage moves and dollar changes for the majors and favourite alts."
            tag={{
              label: "Global session",
              icon: "trending-up",
              tone: "brand-alpha-weak",
            }}
          >
            <Column gap="16">
              {CRYPTO_MOVERS.map((section) => (
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
            description="Compare momentum alts against steadier majors before rotating risk."
            tag={{
              label: "Trading ranges",
              icon: "target",
              tone: "neutral-alpha-weak",
            }}
          >
            <Row gap="16" wrap>
              {CRYPTO_VOLATILITY_BUCKETS.map((bucket) => (
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
            description="Automation commentary on crypto positioning."
            tag={{ label: "Momentum", icon: "zap", tone: "brand-alpha-weak" }}
          >
            <Column as="ul" gap="12" fillWidth>
              {CRYPTO_MOMENTUM.map((entry) => (
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
            description="Narrative context from the crypto relative-strength matrix."
            tag={{
              label: "Playbook",
              icon: "grid",
              tone: "neutral-alpha-weak",
            }}
          >
            <Column gap="12">
              {CRYPTO_HEATMAP_NOTES.map((note, index) => (
                <Text
                  key={`crypto-heatmap-note-${index}`}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {note}
                </Text>
              ))}
              <Text variant="body-default-s" onBackground="neutral-weak">
                Full heat map visualisation is staged and ready once the live
                data feed switches on.
              </Text>
            </Column>
          </InsightCard>
        </Column>
      </Row>
    </Column>
  );
}

export default CryptoMarketSnapshotSection;
