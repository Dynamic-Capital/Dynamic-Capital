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
      "Asia-Pacific hours emphasise carry pairs and commodity tone, so the FX desk can stay compact while metals stay close by.",
    helper:
      "Start with currencies, then review commodities before liquidity fades into the European hand-off.",
    tags: ["Asia-Pac", "Carry pairs", "Commodities"],
  },
  europe: {
    summary:
      "London overlap delivers the deepest liquidity, keeping FX and indices lanes wide for high-confidence execution.",
    helper:
      "Track cross-asset momentum before the Americas open and rebalance the book.",
    tags: ["London", "Liquidity", "Session overlap"],
  },
  americas: {
    summary:
      "New York sets the closing tone as equities, crypto, and the dollar guide the afternoon hand-off.",
    helper:
      "Monitor equities and digital assets into the close while FX confirms the trend.",
    tags: ["New York", "Closing tone", "Risk pulse"],
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
      "Keep the FX cockpit next to key pairs and spreads so currency risk can be adjusted without leaving the desk.",
    helper:
      "Best for intraday hedging or confirming macro triggers against live currency telemetry.",
    tags: ["FX desk", "Currency risk", "Live spreads"],
  },
  macro: {
    summary:
      "Bring equities, commodities, and indices forward to check breadth while FX stays visible for confirmation.",
    helper:
      "Use this lens when drafting market wraps or preparing cross-asset briefings.",
    tags: ["Cross-asset", "Macro wrap", "Breadth view"],
  },
  digital: {
    summary:
      "Surface crypto telemetry beside traditional markets so digital flows are monitored alongside core risk.",
    helper:
      "Ideal for rotation planning or weekend oversight when digital markets remain open.",
    tags: ["Digital flows", "Rotation", "Continuous session"],
  },
};

const FOCUS_LAYOUTS: Record<
  FocusLens,
  {
    coverageSnapshots: readonly string[];
    heatmapOrder: readonly string[];
  }
> = {
  fx: {
    coverageSnapshots: ["indices", "commodities", "stocks"],
    heatmapOrder: [
      "currency",
      "index",
      "commodity",
      "crypto-strength",
    ],
  },
  macro: {
    coverageSnapshots: ["indices", "commodities", "stocks"],
    heatmapOrder: [
      "index",
      "commodity",
      "currency",
      "crypto-strength",
    ],
  },
  digital: {
    coverageSnapshots: ["crypto", "indices", "commodities"],
    heatmapOrder: [
      "crypto-strength",
      "currency",
      "index",
      "commodity",
    ],
  },
};

const selectGridItems = (
  items: ReadonlyArray<DeskSectionGridItem>,
  keys: readonly string[],
) => {
  const registry = new Map(items.map((item) => [item.key, item] as const));
  return keys
    .map((key) => registry.get(key))
    .filter((value): value is DeskSectionGridItem => Boolean(value));
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
        "Primary lanes keep FX telemetry beside the watchlist while secondary snapshots extend coverage across equities, commodities, indices, and crypto.",
      helperText:
        "Grids respect defined minimum widths so the layout stays readable on any breakpoint.",
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
        "Currency, commodity, index, and crypto strength tables align to the same rhythm for quick cross-asset comparison.",
      helperText:
        "Each heatmap inherits desk padding tokens to preserve hierarchy across breakpoints.",
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

  const focusLayout = FOCUS_LAYOUTS[selectedFocus];

  const focusCoverageSnapshots = selectGridItems(
    COVERAGE_SNAPSHOTS,
    focusLayout.coverageSnapshots,
  );

  const focusHeatmaps = selectGridItems(
    HEATMAP_GRID,
    focusLayout.heatmapOrder,
  );

  const [baseCoverageSection, baseHeatmapSection] = MARKET_REVIEW_SECTIONS;

  const sectionsWithFocus: MarketReviewSection[] = [
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
          "Adjust the workspace for the current session while keeping FX, equities, commodities, crypto, and indices within the same view.",
        descriptionVariant: "body-default-l",
        helperText:
          "Session and focus toggles surface layout guidance so the desk remains consistent from mobile through ultrawide monitors.",
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
    {
      ...baseCoverageSection,
      grids: [
        COVERAGE_PRIMARY,
        focusCoverageSnapshots.length > 0
          ? focusCoverageSnapshots
          : COVERAGE_SNAPSHOTS,
      ],
      header: {
        ...baseCoverageSection.header,
        description: selectedFocus === "fx"
          ? "Keep currency telemetry next to the live watchlist, then scan the supporting snapshots that stay relevant to the session."
          : selectedFocus === "digital"
          ? "Surface crypto alongside the indices and commodities that influence digital flows while FX remains available for confirmation."
          : "Balance equities, commodities, and indices snapshots with FX so macro coverage stays complete across breakpoints.",
        helperText:
          "Grid tiles honour minimum widths to prevent data loss when the layout wraps.",
        maxWidth: 90,
      },
    },
    {
      ...baseHeatmapSection,
      grids: [focusHeatmaps.length > 0 ? focusHeatmaps : HEATMAP_GRID],
      header: {
        ...baseHeatmapSection.header,
        description: selectedFocus === "digital"
          ? "Crypto strength leads the row so risk moves in digital assets can be compared against core currency and macro baskets."
          : selectedFocus === "macro"
          ? "Index and commodity strength take point, with currency and crypto close by for quick confirmation."
          : "Currency strength remains first so FX remains the anchor while other heatmaps line up for fast scanning.",
        helperText:
          "Each heatmap inherits shared spacing tokens so comparisons stay legible on any screen.",
        maxWidth: 88,
      },
    },
  ];

  return (
    <Column gap="32" fillWidth>
      {sectionsWithFocus.map(({ deskProps, header, grids, body }, index) => {
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
