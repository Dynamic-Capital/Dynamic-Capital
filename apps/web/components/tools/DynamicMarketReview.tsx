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

export function DynamicMarketReview() {
  return (
    <Column gap="32" fillWidth maxWidth={96}>
      <Column gap="24" align="start" id="dynamic-market-snapshot">
        <Column gap="12" maxWidth={64}>
          <Row gap="8" vertical="center" wrap>
            <Heading variant="display-strong-s">
              Dynamic market snapshot
            </Heading>
            <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
              Multi-asset desk view
            </Tag>
          </Row>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Live dashboard coverage for currencies, equities, commodities,
            crypto, and global indices. Currency data updates automatically; the
            additional sections provide ready-made scaffolding ahead of live
            feed rollout.
          </Text>
        </Column>
        <Column gap="32" fillWidth>
          <FxMarketSnapshotSection />
          <StocksMarketSnapshotSection />
          <CommoditiesMarketSnapshotSection />
          <IndicesMarketSnapshotSection />
          <CryptoMarketSnapshotSection />
        </Column>
      </Column>
      <MarketWatchlist />
      <Row gap="24" wrap fillWidth>
        <Column flex={1} minWidth={32}>
          <CurrencyStrengthSection />
        </Column>
        <Column flex={1} minWidth={32}>
          <CommodityStrengthSection />
        </Column>
      </Row>
      <Row gap="24" wrap fillWidth>
        <Column flex={1} minWidth={32}>
          <IndexStrengthSection />
        </Column>
        <Column flex={1} minWidth={32}>
          <CryptoStrengthSection />
        </Column>
      </Row>
    </Column>
  );
}

export default DynamicMarketReview;
