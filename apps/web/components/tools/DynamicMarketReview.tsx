"use client";

import { Column } from "@/components/dynamic-ui-system";

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
import {
  DeskSectionGrid,
  type DeskSectionGridItem,
  DeskSectionHeader,
} from "@/components/workspaces/DeskSectionHeader";

const COVERAGE_PRIMARY: DeskSectionGridItem[] = [
  {
    key: "fx",
    Component: FxMarketSnapshotSection,
    flex: 5,
    minWidth: 64,
  },
  {
    key: "watchlist",
    Component: MarketWatchlist,
    flex: 4,
    minWidth: 48,
  },
];

const COVERAGE_SNAPSHOTS: DeskSectionGridItem[] = [
  {
    key: "stocks",
    Component: StocksMarketSnapshotSection,
    flex: 1,
    minWidth: 56,
  },
  {
    key: "commodities",
    Component: CommoditiesMarketSnapshotSection,
    flex: 1,
    minWidth: 56,
  },
  {
    key: "indices",
    Component: IndicesMarketSnapshotSection,
    flex: 1,
    minWidth: 56,
  },
  {
    key: "crypto",
    Component: CryptoMarketSnapshotSection,
    flex: 1,
    minWidth: 56,
  },
];

const HEATMAP_GRID: DeskSectionGridItem[] = [
  {
    key: "currency",
    Component: CurrencyStrengthSection,
    flex: 1,
    minWidth: 48,
  },
  {
    key: "commodity",
    Component: CommodityStrengthSection,
    flex: 1,
    minWidth: 48,
  },
  {
    key: "index",
    Component: IndexStrengthSection,
    flex: 1,
    minWidth: 48,
  },
  {
    key: "crypto-strength",
    Component: CryptoStrengthSection,
    flex: 1,
    minWidth: 48,
  },
];

export function DynamicMarketReview() {
  return (
    <Column gap="32" fillWidth>
      <DeskSection
        anchor="snapshot"
        background="surface"
        border="neutral-alpha-weak"
        shadow="l"
        width="wide"
        contentClassName="gap-10 lg:gap-12"
      >
        <DeskSectionHeader
          title="Dynamic market snapshot"
          titleVariant="display-strong-s"
          tag={{
            label: "Multi-asset desk view",
            background: "neutral-alpha-weak",
            prefixIcon: "clock",
          }}
          description="A calm, multi-asset briefing for FX, equities, commodities, crypto, and indices. Currency telemetry is fully live today, while the remaining desks deliver curated scaffolding ahead of the streaming feed rollout."
          descriptionVariant="body-default-l"
          helperText="The layout breathes with generous padding so it feels composed on phones, tablets, ultrawide desks, and everything in between."
          maxWidth={80}
          gap="16"
        />
      </DeskSection>
      <DeskSection
        anchor="coverage"
        background="surface"
        border="neutral-alpha-weak"
        shadow="s"
        width="wide"
        contentClassName="gap-8"
      >
        <DeskSectionHeader
          title="Live asset coverage"
          description="Keep the FX cockpit beside the live watchlist on expansive screens, then let them stack gracefully on tighter breakpoints without losing breathing room."
          maxWidth={88}
        />
        <DeskSectionGrid items={COVERAGE_PRIMARY} />
        <DeskSectionGrid items={COVERAGE_SNAPSHOTS} />
      </DeskSection>
      <DeskSection
        anchor="heatmaps"
        background="surface"
        border="neutral-alpha-weak"
        shadow="s"
        width="wide"
        contentClassName="gap-8"
      >
        <DeskSectionHeader
          title="Momentum heatmaps"
          description="Cross-asset strength tables share the same safe padding so quick comparisons stay legible whether you are scanning on mobile or a trading battlestation."
          maxWidth={80}
        />
        <DeskSectionGrid items={HEATMAP_GRID} />
      </DeskSection>
    </Column>
  );
}

export default DynamicMarketReview;
