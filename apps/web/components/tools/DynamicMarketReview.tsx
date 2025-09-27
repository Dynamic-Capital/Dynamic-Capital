"use client";

import { Column, Row } from "@/components/dynamic-ui-system";

import FxMarketSnapshotSection from "@/components/dynamic-portfolio/home/FxMarketSnapshotSection";
import MarketWatchlist from "@/components/dynamic-portfolio/home/MarketWatchlist";
import { CommodityStrengthSection } from "@/components/dynamic-portfolio/home/CommodityStrengthSection";
import { CryptoStrengthSection } from "@/components/dynamic-portfolio/home/CryptoStrengthSection";
import { CurrencyStrengthSection } from "@/components/dynamic-portfolio/home/CurrencyStrengthSection";
import { IndexStrengthSection } from "@/components/dynamic-portfolio/home/IndexStrengthSection";

export function DynamicMarketReview() {
  return (
    <Column gap="32" fillWidth maxWidth={96}>
      <FxMarketSnapshotSection />
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
