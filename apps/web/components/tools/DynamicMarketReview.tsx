"use client";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import FxMarketSnapshotSection from "@/components/dynamic-portfolio/home/FxMarketSnapshotSection";
import MarketWatchlist from "@/components/dynamic-portfolio/home/MarketWatchlist";
import { CommodityStrengthSection } from "@/components/dynamic-portfolio/home/CommodityStrengthSection";
import { CryptoStrengthSection } from "@/components/dynamic-portfolio/home/CryptoStrengthSection";
import { CurrencyStrengthSection } from "@/components/dynamic-portfolio/home/CurrencyStrengthSection";
import { IndexStrengthSection } from "@/components/dynamic-portfolio/home/IndexStrengthSection";
import CommoditiesMarketSnapshotSection from "@/components/dynamic-portfolio/home/CommoditiesMarketSnapshotSection";
import CryptoMarketSnapshotSection from "@/components/dynamic-portfolio/home/CryptoMarketSnapshotSection";
import IndicesMarketSnapshotSection from "@/components/dynamic-portfolio/home/IndicesMarketSnapshotSection";
import StocksMarketSnapshotSection from "@/components/dynamic-portfolio/home/StocksMarketSnapshotSection";
import { DeskSection } from "@/components/workspaces/DeskSection";

export function DynamicMarketReview() {
  return (
    <Column gap="32" fillWidth>
      <DeskSection
        anchor="snapshot"
        background="surface"
        border="neutral-alpha-weak"
        shadow="l"
        width="wide"
      >
        <Column gap="16" align="start">
          <Row gap="12" vertical="center" wrap>
            <Heading variant="display-strong-s">
              Dynamic market snapshot
            </Heading>
            <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
              Multi-asset desk view
            </Tag>
          </Row>
          <Column gap="12" maxWidth={80}>
            <Text variant="body-default-l" onBackground="neutral-weak">
              A calm, multi-asset briefing for FX, equities, commodities,
              crypto, and indices. Currency telemetry is fully live today, while
              the remaining desks deliver curated scaffolding ahead of the
              streaming feed rollout.
            </Text>
            <Text variant="label-default-m" onBackground="neutral-medium">
              The layout breathes with generous padding so it feels composed on
              phones, tablets, ultrawide desks, and everything in between.
            </Text>
          </Column>
        </Column>
      </DeskSection>
      <DeskSection
        anchor="coverage"
        background="surface"
        border="neutral-alpha-weak"
        shadow="s"
        width="wide"
      >
        <Column gap="12" maxWidth={88}>
          <Heading variant="heading-strong-m">Live asset coverage</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Keep the FX cockpit beside the live watchlist on expansive screens,
            then let them stack gracefully on tighter breakpoints without losing
            breathing room.
          </Text>
        </Column>
        <Row gap="24" wrap fillWidth vertical="stretch">
          <Column flex={5} minWidth={64} fillWidth>
            <FxMarketSnapshotSection />
          </Column>
          <Column flex={4} minWidth={48} fillWidth>
            <MarketWatchlist />
          </Column>
        </Row>
        <Row gap="24" wrap fillWidth vertical="stretch">
          <Column flex={1} minWidth={56} fillWidth>
            <StocksMarketSnapshotSection />
          </Column>
          <Column flex={1} minWidth={56} fillWidth>
            <CommoditiesMarketSnapshotSection />
          </Column>
          <Column flex={1} minWidth={56} fillWidth>
            <IndicesMarketSnapshotSection />
          </Column>
          <Column flex={1} minWidth={56} fillWidth>
            <CryptoMarketSnapshotSection />
          </Column>
        </Row>
      </DeskSection>
      <DeskSection
        anchor="heatmaps"
        background="surface"
        border="neutral-alpha-weak"
        shadow="s"
        width="wide"
      >
        <Column gap="12" maxWidth={80}>
          <Heading variant="heading-strong-m">Momentum heatmaps</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Cross-asset strength tables share the same safe padding so quick
            comparisons stay legible whether you are scanning on mobile or a
            trading battlestation.
          </Text>
        </Column>
        <Row gap="24" wrap fillWidth vertical="stretch">
          <Column flex={1} minWidth={48} fillWidth>
            <CurrencyStrengthSection />
          </Column>
          <Column flex={1} minWidth={48} fillWidth>
            <CommodityStrengthSection />
          </Column>
          <Column flex={1} minWidth={48} fillWidth>
            <IndexStrengthSection />
          </Column>
          <Column flex={1} minWidth={48} fillWidth>
            <CryptoStrengthSection />
          </Column>
        </Row>
      </DeskSection>
    </Column>
  );
}

export default DynamicMarketReview;
