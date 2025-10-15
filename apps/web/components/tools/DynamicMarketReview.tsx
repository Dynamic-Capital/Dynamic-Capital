"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import {
  Column,
  Row,
  SegmentedControl,
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
import {
  DeskSection,
  type DeskSectionProps,
} from "@/components/workspaces/DeskSection";
import {
  DeskSectionGrid,
  type DeskSectionGridItem,
  DeskSectionHeader,
  type DeskSectionHeaderProps,
} from "@/components/workspaces/DeskSectionHeader";

// Keep these widths numeric so the desk grid parses them as rem values rather than
// collapsing to spacing token sizes (e.g. "64" => var(--static-space-64)).
const FX_MIN_WIDTH_REM = 36;
const WATCHLIST_MIN_WIDTH_REM = 28;
const SNAPSHOT_MIN_WIDTH_REM = 18;
const HEATMAP_MIN_WIDTH_REM = 18;

const COVERAGE_PRIMARY = [
  {
    key: "fx",
    Component: FxMarketSnapshotSection,
    flex: 5,
    minWidth: FX_MIN_WIDTH_REM,
  },
  {
    key: "watchlist",
    Component: MarketWatchlist,
    flex: 4,
    minWidth: WATCHLIST_MIN_WIDTH_REM,
  },
] satisfies ReadonlyArray<DeskSectionGridItem>;

const COVERAGE_SNAPSHOTS = [
  {
    key: "stocks",
    Component: StocksMarketSnapshotSection,
    flex: 1,
    minWidth: SNAPSHOT_MIN_WIDTH_REM,
  },
  {
    key: "commodities",
    Component: CommoditiesMarketSnapshotSection,
    flex: 1,
    minWidth: SNAPSHOT_MIN_WIDTH_REM,
  },
  {
    key: "indices",
    Component: IndicesMarketSnapshotSection,
    flex: 1,
    minWidth: SNAPSHOT_MIN_WIDTH_REM,
  },
  {
    key: "crypto",
    Component: CryptoMarketSnapshotSection,
    flex: 1,
    minWidth: SNAPSHOT_MIN_WIDTH_REM,
  },
] satisfies ReadonlyArray<DeskSectionGridItem>;

const HEATMAP_GRID = [
  {
    key: "currency",
    Component: CurrencyStrengthSection,
    flex: 1,
    minWidth: HEATMAP_MIN_WIDTH_REM,
  },
  {
    key: "commodity",
    Component: CommodityStrengthSection,
    flex: 1,
    minWidth: HEATMAP_MIN_WIDTH_REM,
  },
  {
    key: "index",
    Component: IndexStrengthSection,
    flex: 1,
    minWidth: HEATMAP_MIN_WIDTH_REM,
  },
  {
    key: "crypto-strength",
    Component: CryptoStrengthSection,
    flex: 1,
    minWidth: HEATMAP_MIN_WIDTH_REM,
  },
] satisfies ReadonlyArray<DeskSectionGridItem>;

type TradingSession = "asia" | "europe" | "americas";
type FocusLens = "fx" | "macro" | "digital";

const SESSION_OPTIONS: Array<{ label: string; value: TradingSession }> = [
  { label: "Asia-Pac", value: "asia" },
  { label: "London", value: "europe" },
  { label: "New York", value: "americas" },
];

const FOCUS_OPTIONS: Array<{ label: string; value: FocusLens }> = [
  { label: "FX Core", value: "fx" },
  { label: "Macro Board", value: "macro" },
  { label: "Digital Pulse", value: "digital" },
];

const SESSION_METADATA: Record<
  TradingSession,
  {
    summary: string;
    helper: string;
    tags: readonly string[];
  }
> = {
  asia: {
    summary:
      "Asia-Pacific hours prioritise carry pairs and commodity tone — keep the FX cockpit compact while scanning metals.",
    helper:
      "Start with the FX snapshot, then sweep commodities before liquidity thins into the hand-off.",
    tags: ["Asia-Pac", "Carry focus", "Commodity lens"],
  },
  europe: {
    summary:
      "London overlap unlocks the deepest liquidity, so run FX and indices lanes at full width for decision-grade clarity.",
    helper:
      "Capture cross-asset momentum cues before the Americas take the book and volatility pivots.",
    tags: ["London core", "High liquidity", "Session overlap"],
  },
  americas: {
    summary:
      "New York drives the risk hand-off — equities, crypto, and dollar strength all steer afternoon positioning.",
    helper:
      "Watch equities and digital assets for the closing pulse while FX telemetry confirms the tone.",
    tags: ["New York", "Risk pulse", "Closing flow"],
  },
};

const FOCUS_METADATA: Record<
  FocusLens,
  {
    summary: string;
    helper: string;
    tags: readonly string[];
  }
> = {
  fx: {
    summary:
      "Pair the FX snapshot beside the live watchlist for an instant read on majors, spreads, and cross-volatility.",
    helper:
      "Ideal when calibrating hedges or validating macro triggers against live currency telemetry.",
    tags: ["FX cockpit", "Live telemetry", "Volatility scan"],
  },
  macro: {
    summary:
      "Lean into equities, commodities, and indices snapshots to check macro breadth without losing FX context.",
    helper:
      "Run this lens for morning notes or macro rundowns where cross-asset confirmation matters most.",
    tags: ["Cross-asset", "Breadth check", "Morning brief"],
  },
  digital: {
    summary:
      "Use the crypto snapshot and strength grid to contextualise digital assets alongside traditional desks.",
    helper:
      "Helpful for rotation planning and weekend monitoring when digital markets stay active.",
    tags: ["Crypto context", "Rotation map", "Weekend ready"],
  },
};

type MarketReviewSection = {
  deskProps: Omit<DeskSectionProps, "children">;
  header: DeskSectionHeaderProps;
  grids?: DeskSectionGridItem[][];
  body?: ReactNode;
};

const DESK_BASE_PROPS: Pick<
  DeskSectionProps,
  "background" | "border" | "width"
> = {
  background: "surface",
  border: "neutral-alpha-weak",
  width: "wide",
};

const MARKET_REVIEW_SECTIONS = [
  {
    deskProps: {
      ...DESK_BASE_PROPS,
      anchor: "coverage",
      shadow: "s",
      contentClassName: "gap-8",
    },
    header: {
      title: "Live asset coverage",
      description:
        "Primary lanes keep FX telemetry beside the watchlist, while secondary snapshots breathe across equities, commodities, indices, and crypto.",
      helperText:
        "Grids respect minimum widths so nothing collapses when you glide between mobile, tablet, and ultrawide monitors.",
      maxWidth: 92,
    },
    grids: [COVERAGE_PRIMARY, COVERAGE_SNAPSHOTS],
    body: (
      <Text variant="label-default-s" onBackground="neutral-medium">
        Snapshot tiles pin to an 18&nbsp;rem floor, keeping labels, prices, and
        movement cues legible even as the desk wraps.
      </Text>
    ),
  },
  {
    deskProps: {
      ...DESK_BASE_PROPS,
      anchor: "heatmaps",
      shadow: "s",
      contentClassName: "gap-8",
    },
    header: {
      title: "Momentum heatmaps",
      description:
        "Currency, commodity, index, and crypto strength tables align to the same rhythm so comparative scans stay effortless.",
      helperText:
        "Each heatmap inherits desk padding tokens, reinforcing visual hierarchy across any breakpoint.",
      maxWidth: 86,
    },
    grids: [HEATMAP_GRID],
    body: (
      <Text variant="label-default-s" onBackground="neutral-medium">
        Toggle focus lanes above to highlight the panels most relevant to the
        session you are operating.
      </Text>
    ),
  },
] satisfies ReadonlyArray<MarketReviewSection>;

export function DynamicMarketReview() {
  const [selectedSession, setSelectedSession] = useState<TradingSession>(
    SESSION_OPTIONS[1].value,
  );
  const [selectedFocus, setSelectedFocus] = useState<FocusLens>(
    FOCUS_OPTIONS[0].value,
  );

  const sessionMeta = SESSION_METADATA[selectedSession];
  const focusMeta = FOCUS_METADATA[selectedFocus];

  const highlightTags = Array.from(
    new Set([...sessionMeta.tags, ...focusMeta.tags]),
  );

  const sections: MarketReviewSection[] = [
    {
      deskProps: {
        ...DESK_BASE_PROPS,
        anchor: "snapshot",
        shadow: "l",
        contentClassName: "gap-12 lg:gap-16",
      },
      header: {
        title: "Dynamic market workspace",
        titleVariant: "display-strong-s",
        tag: {
          label: "Adaptive multi-asset desk",
          background: "neutral-alpha-weak",
          prefixIcon: "clock",
        },
        description:
          "Calibrate the desk for the session you are running while keeping FX, equities, commodities, crypto, and indices within the same calm frame.",
        descriptionVariant: "body-default-l",
        helperText:
          "Session and focus toggles below surface layout guidance so the workspace stays composed from phones to ultrawide battlestations.",
        maxWidth: 84,
        gap: "16",
      },
      body: (
        <Column gap="20">
          <Row gap="20" wrap>
            <Column gap="8" minWidth={22}>
              <Text variant="label-default-s" onBackground="neutral-medium">
                Active session
              </Text>
              <SegmentedControl
                buttons={SESSION_OPTIONS}
                selected={selectedSession}
                onToggle={(value) =>
                  setSelectedSession(value as TradingSession)}
                aria-label="Select active market session"
              />
            </Column>
            <Column gap="8" minWidth={22}>
              <Text variant="label-default-s" onBackground="neutral-medium">
                Focus lens
              </Text>
              <SegmentedControl
                buttons={FOCUS_OPTIONS}
                selected={selectedFocus}
                onToggle={(value) => setSelectedFocus(value as FocusLens)}
                aria-label="Select market focus lens"
              />
            </Column>
          </Row>

          <Column gap="12">
            <Row gap="8" wrap>
              {highlightTags.map((tag) => (
                <Tag
                  key={tag}
                  size="s"
                  background="neutral-alpha-weak"
                >
                  {tag}
                </Tag>
              ))}
            </Row>
            <Text variant="body-default-m" onBackground="neutral-strong">
              {focusMeta.summary}
            </Text>
            <Text variant="label-default-m" onBackground="neutral-medium">
              {focusMeta.helper}
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              {sessionMeta.summary}
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              {sessionMeta.helper}
            </Text>
          </Column>
        </Column>
      ),
    },
    ...MARKET_REVIEW_SECTIONS,
  ];

  return (
    <Column gap="32" fillWidth>
      {sections.map(({ deskProps, header, grids, body }, index) => {
        const sectionAnchor = deskProps.anchor ??
          `market-review-section-${index}`;
        return (
          <DeskSection key={sectionAnchor} {...deskProps}>
            <DeskSectionHeader {...header} />
            {body}
            {grids?.map((items, gridIndex) => (
              <DeskSectionGrid
                key={`${sectionAnchor}-grid-${gridIndex}`}
                items={items}
              />
            ))}
          </DeskSection>
        );
      })}
    </Column>
  );
}

export default DynamicMarketReview;
