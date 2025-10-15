"use client";

import { useMemo } from "react";

import { Column, Text } from "@/components/dynamic-ui-system";
import { Skeleton } from "@/components/ui/skeleton";

import { StaticMarketSnapshotSection } from "./StaticMarketSnapshotSection";
import type { SnapshotVariant } from "./MarketSnapshotPrimitives";
import {
  buildSnapshotConfig,
  buildSnapshots,
  hasLiveData,
  type LiveInstrumentDefinition,
  type SnapshotBuilderOptions,
} from "./liveSnapshotBuilder";
import { formatNumber, formatPercent } from "./liveSnapshotShared";
import { useLiveMarketQuotes } from "./useLiveMarketQuotes";

const STOCK_INSTRUMENTS: LiveInstrumentDefinition[] = [
  {
    id: "AAPL",
    code: "AAPL",
    requestSymbol: "aapl.us",
    label: "Apple",
    group: "Tech & Cloud",
  },
  {
    id: "MSFT",
    code: "MSFT",
    requestSymbol: "msft.us",
    label: "Microsoft",
    group: "Tech & Cloud",
  },
  {
    id: "NVDA",
    code: "NVDA",
    requestSymbol: "nvda.us",
    label: "NVIDIA",
    group: "AI & Chips",
  },
  {
    id: "AMZN",
    code: "AMZN",
    requestSymbol: "amzn.us",
    label: "Amazon",
    group: "Consumer Growth",
  },
  {
    id: "GOOGL",
    code: "GOOGL",
    requestSymbol: "googl.us",
    label: "Alphabet",
    group: "Tech & Cloud",
  },
  {
    id: "TSLA",
    code: "TSLA",
    requestSymbol: "tsla.us",
    label: "Tesla",
    group: "Consumer Growth",
  },
];

const STOCK_BUCKETS: SnapshotBuilderOptions["bucketConfig"] = [
  {
    title: "Tech & Cloud",
    group: "Tech & Cloud",
    background: "brand-alpha-weak",
  },
  {
    title: "AI & Chips",
    group: "AI & Chips",
    background: "warning-alpha-weak",
  },
  {
    title: "Consumer Growth",
    group: "Consumer Growth",
    background: "neutral-alpha-weak",
  },
];

const formatUsd = (value: number | null | undefined) =>
  formatNumber(value, { digits: 2, prefix: "$" });

const STOCK_SNAPSHOT_OPTIONS: SnapshotBuilderOptions = {
  id: "stocks-market-snapshot",
  categoryLabel: "equities",
  heroHeading: "Equities market snapshot",
  heroTag: {
    label: "Live equities",
    icon: "activity",
    tone: "brand-alpha-weak",
  },
  strengthCard: {
    title: "Equity strength meter",
    description: "Leadership ranking sourced from live open data feeds.",
    tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
  },
  volatilityCard: {
    title: "Equity volatility meter",
    description: "Intraday range analysis refreshed from open exchanges.",
    tag: { label: "Range watch", icon: "activity", tone: "neutral-alpha-weak" },
  },
  moversCard: {
    title: "Top movers",
    description: "Live change, dollar move, and last trade snapshot.",
    tag: { label: "US session", icon: "trending-up", tone: "brand-alpha-weak" },
    tableOverrides: {
      columnLabels: {
        change: "Change ($)",
        extra: null,
        last: "Last ($)",
      },
      formatters: {
        changePercent: (value?: number | null) =>
          formatPercent(value ?? undefined),
        change: (value?: number | null) => formatUsd(value ?? undefined),
        last: (value?: number | null) => formatUsd(value ?? undefined),
      },
    },
  },
  bucketsCard: {
    title: "Volatility radar",
    description:
      "Contrast high-beta leaders with low-volatility defensives ahead of allocation tweaks.",
    tag: {
      label: "Trading ranges",
      icon: "target",
      tone: "neutral-alpha-weak",
    },
  },
  momentumCard: {
    title: "Momentum board",
    description: "Automation-ready read on equity momentum strength.",
    tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
  },
  heatmapCard: {
    title: "Heat map insight",
    description: "Desk matrix summarising live leadership and laggards.",
    tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    placeholder:
      "Heat map visual goes live once the equities data feed is wired – textual insight updates meanwhile.",
  },
  instruments: STOCK_INSTRUMENTS,
  bucketConfig: STOCK_BUCKETS,
  formatPrice: formatUsd,
  fallbackMomentumDetail: "Live data synchronising.",
};

export function StocksMarketSnapshotSection({
  variant = "contained",
}: { variant?: SnapshotVariant } = {}) {
  const { quotes, isLoading, error, lastUpdated } = useLiveMarketQuotes({
    assetClass: "stocks",
    symbols: STOCK_INSTRUMENTS.map((instrument) => instrument.requestSymbol),
  });

  const snapshots = useMemo(
    () => buildSnapshots(quotes, STOCK_INSTRUMENTS),
    [quotes],
  );
  const config = useMemo(
    () =>
      buildSnapshotConfig(
        snapshots,
        lastUpdated,
        error,
        STOCK_SNAPSHOT_OPTIONS,
      ),
    [snapshots, lastUpdated, error],
  );

  if (isLoading && !hasLiveData(snapshots)) {
    return (
      <Column gap="16" fillWidth>
        <Skeleton className="h-[240px] w-full" />
        <Skeleton className="h-[240px] w-full" />
        <Skeleton className="h-[240px] w-full" />
      </Column>
    );
  }

  if (error && !hasLiveData(snapshots)) {
    return (
      <Column gap="16" fillWidth>
        <Text variant="body-default-m" onBackground="danger-strong">
          {error}
        </Text>
      </Column>
    );
  }

  return <StaticMarketSnapshotSection config={config} variant={variant} />;
}

export default StocksMarketSnapshotSection;
