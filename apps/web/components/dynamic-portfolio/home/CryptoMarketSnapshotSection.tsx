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

const CRYPTO_INSTRUMENTS: LiveInstrumentDefinition[] = [
  {
    id: "bitcoin",
    code: "BTC",
    requestSymbol: "bitcoin",
    label: "Bitcoin",
    group: "Layer 1",
  },
  {
    id: "ethereum",
    code: "ETH",
    requestSymbol: "ethereum",
    label: "Ethereum",
    group: "Layer 1",
  },
  {
    id: "solana",
    code: "SOL",
    requestSymbol: "solana",
    label: "Solana",
    group: "High throughput",
  },
  {
    id: "ripple",
    code: "XRP",
    requestSymbol: "ripple",
    label: "XRP",
    group: "Payments",
  },
  {
    id: "cardano",
    code: "ADA",
    requestSymbol: "cardano",
    label: "Cardano",
    group: "Layer 1",
  },
  {
    id: "dogecoin",
    code: "DOGE",
    requestSymbol: "dogecoin",
    label: "Dogecoin",
    group: "Alt liquidity",
  },
];

const CRYPTO_BUCKETS: SnapshotBuilderOptions["bucketConfig"] = [
  { title: "Layer 1", group: "Layer 1", background: "brand-alpha-weak" },
  {
    title: "Throughput",
    group: "High throughput",
    background: "warning-alpha-weak",
  },
  { title: "Payments", group: "Payments", background: "neutral-alpha-weak" },
  {
    title: "Alt liquidity",
    group: "Alt liquidity",
    background: "danger-alpha-weak",
  },
];

const formatCryptoPrice = (value: number | null | undefined) =>
  formatNumber(value, { digits: value && value < 1 ? 4 : 2, prefix: "$" });

const CRYPTO_OPTIONS: SnapshotBuilderOptions = {
  id: "crypto-market-snapshot",
  categoryLabel: "crypto assets",
  heroHeading: "Crypto market snapshot",
  heroTag: {
    label: "Live crypto",
    icon: "sparkle",
    tone: "brand-alpha-weak",
  },
  strengthCard: {
    title: "Crypto strength meter",
    description:
      "Leaders ranked via 24h percentage performance from open APIs.",
    tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
  },
  volatilityCard: {
    title: "Crypto volatility meter",
    description: "Identify assets delivering the widest real-time ranges.",
    tag: { label: "Range watch", icon: "activity", tone: "neutral-alpha-weak" },
  },
  moversCard: {
    title: "Top movers",
    description: "Live percent, dollar change, and last trade level in USD.",
    tag: { label: "24h window", icon: "trending-up", tone: "brand-alpha-weak" },
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
          formatCryptoPrice(value ?? undefined),
        last: (value?: number | null) => formatCryptoPrice(value ?? undefined),
      },
    },
  },
  bucketsCard: {
    title: "Volatility radar",
    description:
      "Group crypto assets by network profile to compare realised ranges.",
    tag: {
      label: "Trading ranges",
      icon: "target",
      tone: "neutral-alpha-weak",
    },
  },
  momentumCard: {
    title: "Momentum board",
    description: "Momentum readout for automation and execution routing.",
    tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
  },
  heatmapCard: {
    title: "Heat map insight",
    description: "Leadership and laggards across the tracked crypto basket.",
    tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    placeholder:
      "Heat map visual enables once the on-chain depth feed is synced – textual signals keep updating.",
  },
  instruments: CRYPTO_INSTRUMENTS,
  bucketConfig: CRYPTO_BUCKETS,
  formatPrice: formatCryptoPrice,
  fallbackMomentumDetail: "Live data synchronising.",
};

export function CryptoMarketSnapshotSection() {
  const { quotes, isLoading, error, lastUpdated } = useLiveMarketQuotes({
    assetClass: "crypto",
    symbols: CRYPTO_INSTRUMENTS.map((instrument) => instrument.requestSymbol),
  });

  const snapshots = useMemo(
    () => buildSnapshots(quotes, CRYPTO_INSTRUMENTS),
    [quotes],
  );
  const config = useMemo(
    () => buildSnapshotConfig(snapshots, lastUpdated, error, CRYPTO_OPTIONS),
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

export default CryptoMarketSnapshotSection;
