"use client";

import { useMemo } from "react";

import { Column, Text } from "@/components/dynamic-ui-system";
import { Skeleton } from "@/components/ui/skeleton";

import { StaticMarketSnapshotSection } from "./StaticMarketSnapshotSection";
import {
  buildSnapshotConfig,
  buildSnapshots,
  hasLiveData,
  type LiveInstrumentDefinition,
  type SnapshotBuilderOptions,
} from "./liveSnapshotBuilder";
import { formatNumber, formatPercent } from "./liveSnapshotShared";
import { useLiveMarketQuotes } from "./useLiveMarketQuotes";

const INDEX_INSTRUMENTS: LiveInstrumentDefinition[] = [
  {
    id: "^SPX",
    code: "SPX",
    requestSymbol: "^spx",
    label: "S&P 500",
    group: "US",
  },
  {
    id: "^NDX",
    code: "NDX",
    requestSymbol: "^ndx",
    label: "Nasdaq 100",
    group: "US",
  },
  {
    id: "^DJI",
    code: "DJI",
    requestSymbol: "^dji",
    label: "Dow Jones",
    group: "US",
  },
  {
    id: "^UKX",
    code: "UKX",
    requestSymbol: "^ukx",
    label: "FTSE 100",
    group: "Europe",
  },
  {
    id: "^DAX",
    code: "DAX",
    requestSymbol: "^dax",
    label: "DAX",
    group: "Europe",
  },
  {
    id: "^HSI",
    code: "HSI",
    requestSymbol: "^hsi",
    label: "Hang Seng",
    group: "Asia",
  },
];

const INDEX_BUCKETS: SnapshotBuilderOptions["bucketConfig"] = [
  { title: "US majors", group: "US", background: "brand-alpha-weak" },
  {
    title: "European benchmarks",
    group: "Europe",
    background: "neutral-alpha-weak",
  },
  { title: "Asia momentum", group: "Asia", background: "warning-alpha-weak" },
];

const formatIndexLevel = (value: number | null | undefined) =>
  formatNumber(value, { digits: 2 });

const INDEX_OPTIONS: SnapshotBuilderOptions = {
  id: "indices-market-snapshot",
  categoryLabel: "indices",
  heroHeading: "Global indices snapshot",
  heroTag: {
    label: "Live indices",
    icon: "globe-2",
    tone: "brand-alpha-weak",
  },
  strengthCard: {
    title: "Index strength meter",
    description: "Ranking derived from live benchmark performance.",
    tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
  },
  volatilityCard: {
    title: "Index volatility meter",
    description: "Compare realised ranges across regional benchmarks.",
    tag: { label: "Range watch", icon: "activity", tone: "neutral-alpha-weak" },
  },
  moversCard: {
    title: "Top movers",
    description: "Live points change and level for the monitored indices.",
    tag: {
      label: "Global session",
      icon: "trending-up",
      tone: "brand-alpha-weak",
    },
    tableOverrides: {
      columnLabels: {
        change: "Change (pts)",
        extra: null,
        last: "Last",
      },
      formatters: {
        changePercent: (value?: number | null) =>
          formatPercent(value ?? undefined),
        change: (value?: number | null) => formatIndexLevel(value ?? undefined),
        last: (value?: number | null) => formatIndexLevel(value ?? undefined),
      },
    },
  },
  bucketsCard: {
    title: "Volatility radar",
    description: "Regional baskets grouped by realised index ranges.",
    tag: {
      label: "Trading ranges",
      icon: "target",
      tone: "neutral-alpha-weak",
    },
  },
  momentumCard: {
    title: "Momentum board",
    description: "Momentum bias for global equity benchmarks.",
    tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
  },
  heatmapCard: {
    title: "Heat map insight",
    description: "Leadership and laggards across the index universe.",
    tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    placeholder:
      "Heat map visual activates with the global index depth feed – textual insight stays live.",
  },
  instruments: INDEX_INSTRUMENTS,
  bucketConfig: INDEX_BUCKETS,
  formatPrice: formatIndexLevel,
  fallbackMomentumDetail: "Live data synchronising.",
};

export function IndicesMarketSnapshotSection() {
  const { quotes, isLoading, error, lastUpdated } = useLiveMarketQuotes({
    assetClass: "indices",
    symbols: INDEX_INSTRUMENTS.map((instrument) => instrument.requestSymbol),
  });

  const snapshots = useMemo(
    () => buildSnapshots(quotes, INDEX_INSTRUMENTS),
    [quotes],
  );
  const config = useMemo(
    () => buildSnapshotConfig(snapshots, lastUpdated, error, INDEX_OPTIONS),
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

  return <StaticMarketSnapshotSection config={config} />;
}

export default IndicesMarketSnapshotSection;
