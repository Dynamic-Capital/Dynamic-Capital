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

const COMMODITY_INSTRUMENTS: LiveInstrumentDefinition[] = [
  {
    id: "GC.F",
    code: "GC",
    requestSymbol: "gc.f",
    label: "Gold",
    group: "Metals",
  },
  {
    id: "SI.F",
    code: "SI",
    requestSymbol: "si.f",
    label: "Silver",
    group: "Metals",
  },
  {
    id: "CL.F",
    code: "CL",
    requestSymbol: "cl.f",
    label: "WTI crude",
    group: "Energy",
  },
  {
    id: "NG.F",
    code: "NG",
    requestSymbol: "ng.f",
    label: "Natural gas",
    group: "Energy",
  },
  {
    id: "ZC.F",
    code: "ZC",
    requestSymbol: "zc.f",
    label: "Corn",
    group: "Agriculture",
  },
  {
    id: "ZW.F",
    code: "ZW",
    requestSymbol: "zw.f",
    label: "Wheat",
    group: "Agriculture",
  },
];

const COMMODITY_BUCKETS: SnapshotBuilderOptions["bucketConfig"] = [
  { title: "Metals", group: "Metals", background: "brand-alpha-weak" },
  { title: "Energy", group: "Energy", background: "warning-alpha-weak" },
  {
    title: "Agriculture",
    group: "Agriculture",
    background: "neutral-alpha-weak",
  },
];

const formatCommodityPrice = (value: number | null | undefined) =>
  formatNumber(value, { digits: 2, prefix: "$" });

const COMMODITY_OPTIONS: SnapshotBuilderOptions = {
  id: "commodities-market-snapshot",
  categoryLabel: "commodities",
  heroHeading: "Commodities market snapshot",
  heroTag: {
    label: "Live commodities",
    icon: "flame",
    tone: "brand-alpha-weak",
  },
  strengthCard: {
    title: "Commodity strength meter",
    description: "Ranking based on real-time moves from open commodity feeds.",
    tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
  },
  volatilityCard: {
    title: "Commodity volatility meter",
    description: "Track realised ranges to calibrate contract exposure.",
    tag: { label: "Range watch", icon: "activity", tone: "neutral-alpha-weak" },
  },
  moversCard: {
    title: "Top movers",
    description: "Live percentage and dollar change for focus commodities.",
    tag: {
      label: "Global session",
      icon: "trending-up",
      tone: "brand-alpha-weak",
    },
    tableOverrides: {
      columnLabels: {
        change: "Change ($)",
        extra: null,
        last: "Last ($)",
      },
      formatters: {
        changePercent: (value?: number | null) =>
          formatPercent(value ?? undefined),
        change: (value?: number | null) =>
          formatCommodityPrice(value ?? undefined),
        last: (value?: number | null) =>
          formatCommodityPrice(value ?? undefined),
      },
    },
  },
  bucketsCard: {
    title: "Volatility radar",
    description:
      "Contrast energy contracts against metals and grains volatility.",
    tag: {
      label: "Trading ranges",
      icon: "target",
      tone: "neutral-alpha-weak",
    },
  },
  momentumCard: {
    title: "Momentum board",
    description: "Live contract bias for commodity automation workflows.",
    tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
  },
  heatmapCard: {
    title: "Heat map insight",
    description:
      "Snapshot of leadership and laggards across the commodity stack.",
    tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    placeholder:
      "Heat map visual activates once the commodity depth feed is wired – textual intel refreshes continuously.",
  },
  instruments: COMMODITY_INSTRUMENTS,
  bucketConfig: COMMODITY_BUCKETS,
  formatPrice: formatCommodityPrice,
  fallbackMomentumDetail: "Live data synchronising.",
};

export function CommoditiesMarketSnapshotSection() {
  const { quotes, isLoading, error, lastUpdated } = useLiveMarketQuotes({
    assetClass: "commodities",
    symbols: COMMODITY_INSTRUMENTS.map((instrument) =>
      instrument.requestSymbol
    ),
  });

  const snapshots = useMemo(
    () => buildSnapshots(quotes, COMMODITY_INSTRUMENTS),
    [quotes],
  );
  const config = useMemo(
    () => buildSnapshotConfig(snapshots, lastUpdated, error, COMMODITY_OPTIONS),
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

export default CommoditiesMarketSnapshotSection;
