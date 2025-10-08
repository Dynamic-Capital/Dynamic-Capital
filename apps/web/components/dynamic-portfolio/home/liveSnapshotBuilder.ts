import { formatIsoTime } from "@/utils/isoFormat";

import type {
  InsightCardTag,
  MoversSection,
  TagBackground,
  VolatilityBucket,
} from "./MarketSnapshotPrimitives";
import type {
  SnapshotMomentumEntry,
  StaticMarketSnapshotConfig,
} from "./StaticMarketSnapshotSection";
import {
  buildFallbackStrength,
  buildFallbackVolatility,
  computeRangePercent,
  determineTone,
  formatPercent,
  formatUnsignedPercent,
} from "./liveSnapshotShared";
import type { LiveMarketQuote } from "./useLiveMarketQuotes";

export interface LiveInstrumentDefinition {
  id: string;
  code: string;
  requestSymbol: string;
  label: string;
  group: string;
}

export interface InstrumentSnapshot {
  instrument: LiveInstrumentDefinition;
  changePercent: number | undefined;
  change: number | undefined;
  last: number | undefined;
  rangePercent: number | undefined;
  quoteTimestamp: Date | null | undefined;
}

export interface SnapshotCardCopy {
  title: string;
  description: string;
  tag: InsightCardTag;
}

export interface SnapshotBuilderOptions {
  id: string;
  categoryLabel: string;
  heroHeading: string;
  heroTag: InsightCardTag;
  strengthCard: SnapshotCardCopy;
  volatilityCard: SnapshotCardCopy;
  moversCard: SnapshotCardCopy & {
    tableOverrides: StaticMarketSnapshotConfig["movers"]["tableOverrides"];
  };
  bucketsCard: SnapshotCardCopy;
  momentumCard: SnapshotCardCopy;
  heatmapCard: SnapshotCardCopy & { placeholder: string };
  instruments: LiveInstrumentDefinition[];
  bucketConfig: Array<
    { title: string; group: string; background: VolatilityBucket["background"] }
  >;
  formatPrice: (value: number | null | undefined) => string;
  fallbackMomentumDetail?: string;
}

const normalizeSymbol = (symbol: string) => symbol.trim().toLowerCase();

const average = (values: Array<number | undefined>): number | undefined => {
  const valid = values.filter((value): value is number =>
    value !== undefined && Number.isFinite(value)
  );
  if (valid.length === 0) {
    return undefined;
  }
  return valid.reduce((acc, value) => acc + value, 0) / valid.length;
};

export const buildSnapshots = (
  quotes: Record<string, LiveMarketQuote>,
  instruments: LiveInstrumentDefinition[],
): InstrumentSnapshot[] =>
  instruments.map((instrument) => {
    const quote = quotes[normalizeSymbol(instrument.requestSymbol)];
    const changePercent = quote?.changePercent ?? undefined;
    const change = quote?.change ?? undefined;
    const last = quote?.last ?? undefined;
    const rangePercent = computeRangePercent(quote);
    return {
      instrument,
      changePercent,
      change,
      last,
      rangePercent,
      quoteTimestamp: quote?.timestamp,
    } satisfies InstrumentSnapshot;
  });

export const hasLiveData = (snapshots: InstrumentSnapshot[]) =>
  snapshots.some((snapshot) => snapshot.last !== undefined);

const buildStrengthEntries = (
  snapshots: InstrumentSnapshot[],
  formatPrice: SnapshotBuilderOptions["formatPrice"],
): StaticMarketSnapshotConfig["strength"]["entries"] => {
  const ranked = [...snapshots].sort((a, b) => {
    const aValue = a.changePercent ?? -Infinity;
    const bValue = b.changePercent ?? -Infinity;
    return bValue - aValue;
  });

  return ranked.map((snapshot, index) => {
    const tone = determineTone(index, ranked.length);
    if (snapshot.last === undefined || snapshot.changePercent === undefined) {
      return {
        id: snapshot.instrument.id,
        code: snapshot.instrument.code,
        rank: index + 1,
        tone,
        summary: "Awaiting live market sync.",
      };
    }

    const direction = snapshot.changePercent >= 0 ? "advances" : "slips";
    return {
      id: snapshot.instrument.id,
      code: snapshot.instrument.code,
      rank: index + 1,
      tone,
      summary: `${snapshot.instrument.label} ${direction} ${
        formatPercent(snapshot.changePercent)
      } to ${formatPrice(snapshot.last)}.`,
    };
  });
};

const buildVolatilityEntries = (
  snapshots: InstrumentSnapshot[],
): StaticMarketSnapshotConfig["volatilityMeter"]["entries"] => {
  const ranked = [...snapshots].sort((a, b) => {
    const aValue = a.rangePercent ?? -Infinity;
    const bValue = b.rangePercent ?? -Infinity;
    return bValue - aValue;
  });

  return ranked.map((snapshot, index) => {
    if (snapshot.rangePercent === undefined) {
      return {
        id: snapshot.instrument.id,
        code: snapshot.instrument.code,
        rank: index + 1,
        summary: "Awaiting live market sync.",
      };
    }

    return {
      id: snapshot.instrument.id,
      code: snapshot.instrument.code,
      rank: index + 1,
      summary: `${snapshot.instrument.label} ranged ${
        formatUnsignedPercent(snapshot.rangePercent)
      } across the session.`,
    };
  });
};

const buildMovers = (
  snapshots: InstrumentSnapshot[],
): MoversSection[] => {
  const valid = snapshots.filter((snapshot) =>
    snapshot.last !== undefined && snapshot.changePercent !== undefined
  );

  const sortedDesc = [...valid].sort((a, b) =>
    (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)
  );
  const sortedAsc = [...valid].sort((a, b) =>
    (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity)
  );

  const toMoversData = (entries: InstrumentSnapshot[]) =>
    entries.map((snapshot) => ({
      id: snapshot.instrument.id,
      label: snapshot.instrument.label,
      symbol: snapshot.instrument.code,
      changePercent: snapshot.changePercent ?? 0,
      change: snapshot.change ?? 0,
      last: snapshot.last ?? 0,
    }));

  return [
    {
      title: "Top gainers",
      tone: "brand-alpha-weak",
      iconName: "trending-up",
      data: toMoversData(sortedDesc.slice(0, 3)),
    },
    {
      title: "Top decliners",
      tone: "danger-alpha-weak",
      iconName: "trending-down",
      data: toMoversData(sortedAsc.slice(0, 3)),
    },
  ];
};

const buildBuckets = (
  snapshots: InstrumentSnapshot[],
  bucketConfig: SnapshotBuilderOptions["bucketConfig"],
): VolatilityBucket[] =>
  bucketConfig.map((bucket) => {
    const entries = snapshots
      .filter((snapshot) => snapshot.instrument.group === bucket.group)
      .reduce<VolatilityBucket["data"]>((acc, member) => {
        const value = member.rangePercent;
        if (
          value === undefined || Number.isNaN(value) || !Number.isFinite(value)
        ) {
          return acc;
        }
        acc.push({
          id: member.instrument.id,
          label: member.instrument.label,
          symbol: member.instrument.code,
          value: Math.abs(value),
        });
        return acc;
      }, []);

    return {
      title: bucket.title,
      background: bucket.background,
      data: entries,
    } satisfies VolatilityBucket;
  });

const buildMomentum = (
  snapshots: InstrumentSnapshot[],
  formatPrice: SnapshotBuilderOptions["formatPrice"],
  fallbackDetail: string,
): SnapshotMomentumEntry[] => {
  const entries: SnapshotMomentumEntry[] = [];
  const seen = new Set<string>();

  const addEntry = (
    snapshot: InstrumentSnapshot | undefined,
    headline: string,
    detailBuilder: (snapshot: InstrumentSnapshot) => string,
  ) => {
    if (!snapshot || seen.has(snapshot.instrument.id)) {
      return;
    }
    if (
      snapshot.last === undefined || snapshot.changePercent === undefined
    ) {
      return;
    }
    entries.push({
      id: snapshot.instrument.code,
      headline: `${snapshot.instrument.label} ${headline}`,
      detail: detailBuilder(snapshot),
    });
    seen.add(snapshot.instrument.id);
  };

  const rankedByChange = [...snapshots].sort((a, b) =>
    (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)
  );
  const rankedByRange = [...snapshots].sort((a, b) =>
    (b.rangePercent ?? -Infinity) - (a.rangePercent ?? -Infinity)
  );

  addEntry(
    rankedByChange[0],
    "extends gains",
    (snapshot) =>
      `${snapshot.instrument.label} up ${
        formatPercent(snapshot.changePercent ?? 0)
      } at ${formatPrice(snapshot.last)}.`,
  );
  addEntry(
    rankedByChange[rankedByChange.length - 1],
    "faces pressure",
    (snapshot) =>
      `${snapshot.instrument.label} down ${
        formatPercent(snapshot.changePercent ?? 0)
      } at ${formatPrice(snapshot.last)}.`,
  );
  addEntry(
    rankedByRange[0],
    "sets the volatility pace",
    (snapshot) =>
      `${snapshot.instrument.label} spanned ${
        formatUnsignedPercent(snapshot.rangePercent ?? 0)
      } today.`,
  );

  for (const snapshot of snapshots) {
    if (entries.length >= 3) {
      break;
    }
    if (!seen.has(snapshot.instrument.id)) {
      entries.push({
        id: snapshot.instrument.code,
        headline: `${snapshot.instrument.label} awaiting live sync`,
        detail: fallbackDetail,
      });
    }
  }

  return entries.slice(0, 3);
};

const buildHeatmapNotes = (
  snapshots: InstrumentSnapshot[],
  formatPrice: SnapshotBuilderOptions["formatPrice"],
  categoryLabel: string,
): string[] => {
  const rankedByChange = [...snapshots].sort((a, b) =>
    (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)
  );
  const leader = rankedByChange.find((snapshot) =>
    snapshot.changePercent !== undefined
  );
  const laggard = [...rankedByChange].reverse().find((snapshot) =>
    snapshot.changePercent !== undefined
  );
  const averageChange = average(
    snapshots.map((snapshot) => snapshot.changePercent),
  );
  const averageRange = average(
    snapshots.map((snapshot) => snapshot.rangePercent),
  );

  return [
    averageChange !== undefined
      ? `Average ${categoryLabel} move ${
        formatPercent(averageChange)
      } with realised range ${formatUnsignedPercent(averageRange ?? 0)}.`
      : `Awaiting ${categoryLabel} average once live data completes.`,
    leader && leader.changePercent !== undefined
      ? `${leader.instrument.label} leads ${
        formatPercent(leader.changePercent)
      } at ${formatPrice(leader.last)}.`
      : `Leadership update pending ${categoryLabel} feed stabilisation.`,
    laggard && laggard.changePercent !== undefined
      ? `${laggard.instrument.label} trails ${
        formatPercent(laggard.changePercent)
      } near ${formatPrice(laggard.last)}.`
      : `No ${categoryLabel} laggard data published yet.`,
  ];
};

const buildHeroSummary = (
  snapshots: InstrumentSnapshot[],
  lastUpdated: Date | null,
  error: string | null,
  categoryLabel: string,
  formatPrice: SnapshotBuilderOptions["formatPrice"],
): string => {
  if (error) {
    return `${error} – showing latest cached ${categoryLabel} snapshot when available.`;
  }

  const ranked = [...snapshots].sort((a, b) =>
    (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)
  );
  const leader = ranked.find((snapshot) =>
    snapshot.changePercent !== undefined
  );
  const laggard = [...ranked].reverse().find((snapshot) =>
    snapshot.changePercent !== undefined
  );
  const timeLabel = lastUpdated ? formatIsoTime(lastUpdated) : "Syncing";

  if (!leader) {
    return `Live ${categoryLabel} feed syncing – refreshed ${timeLabel}.`;
  }

  const leaderText = `${leader.instrument.label} ${
    leader.changePercent && leader.changePercent >= 0 ? "leads" : "slides"
  } ${formatPercent(leader.changePercent ?? 0)} at ${
    formatPrice(leader.last)
  }.`;
  const laggardText = laggard && laggard !== leader
    ? ` ${laggard.instrument.label} trails ${
      formatPercent(laggard.changePercent ?? 0)
    }.`
    : "";

  return `Live ${categoryLabel} feed refreshed ${timeLabel}. ${leaderText}${laggardText}`;
};

export const buildSnapshotConfig = (
  snapshots: InstrumentSnapshot[],
  lastUpdated: Date | null,
  error: string | null,
  options: SnapshotBuilderOptions,
): StaticMarketSnapshotConfig => {
  const live = hasLiveData(snapshots);
  const fallbackMomentumDetail = options.fallbackMomentumDetail ??
    "Live data synchronising.";

  const strengthEntries = live
    ? buildStrengthEntries(snapshots, options.formatPrice)
    : buildFallbackStrength(options.instruments.map((instrument) => ({
      id: instrument.id,
      code: instrument.code,
    })));

  const volatilityEntries = live
    ? buildVolatilityEntries(snapshots)
    : buildFallbackVolatility(options.instruments.map((instrument) => ({
      id: instrument.id,
      code: instrument.code,
    })));

  const fallbackMovers: MoversSection[] = [
    {
      title: "Top gainers",
      tone: "brand-alpha-weak" as TagBackground,
      data: [],
      iconName: "trending-up",
    },
    {
      title: "Top decliners",
      tone: "danger-alpha-weak" as TagBackground,
      data: [],
      iconName: "trending-down",
    },
  ];

  const movers = live ? buildMovers(snapshots) : fallbackMovers;

  const bucketEmptyLabel = live
    ? `No ${options.categoryLabel} volatility data available.`
    : `Awaiting live ${options.categoryLabel} volatility data.`;

  const bucketsBase = live
    ? buildBuckets(snapshots, options.bucketConfig)
    : options.bucketConfig.map((bucket) => ({
      title: bucket.title,
      background: bucket.background,
      data: [],
    } satisfies VolatilityBucket));

  const buckets = bucketsBase.map((bucket) => ({
    ...bucket,
    emptyLabel: bucket.emptyLabel ?? bucketEmptyLabel,
  }));

  const momentum = live
    ? buildMomentum(snapshots, options.formatPrice, fallbackMomentumDetail)
    : options.instruments.slice(0, 3).map((instrument) => ({
      id: instrument.code,
      headline: `${instrument.label} awaiting live sync`,
      detail: fallbackMomentumDetail,
    }));

  const heroSummary = buildHeroSummary(
    snapshots,
    lastUpdated,
    error,
    options.categoryLabel,
    options.formatPrice,
  );

  const heatmapNotes = live
    ? buildHeatmapNotes(snapshots, options.formatPrice, options.categoryLabel)
    : [
      `Awaiting ${options.categoryLabel} average once live data completes.`,
      `Leadership update pending ${options.categoryLabel} feed stabilisation.`,
      `No ${options.categoryLabel} laggard data published yet.`,
    ];

  const moversEmptyLabel = live
    ? `No ${options.categoryLabel} movers available.`
    : `Awaiting live ${options.categoryLabel} movers data.`;

  const tableOverrides = {
    ...options.moversCard.tableOverrides,
  } satisfies StaticMarketSnapshotConfig["movers"]["tableOverrides"];

  if (tableOverrides.emptyLabel === undefined) {
    tableOverrides.emptyLabel = moversEmptyLabel;
  }

  return {
    id: options.id,
    hero: {
      heading: options.heroHeading,
      summary: heroSummary,
      tag: options.heroTag,
    },
    strength: {
      card: options.strengthCard,
      entries: strengthEntries,
    },
    volatilityMeter: {
      card: options.volatilityCard,
      entries: volatilityEntries,
    },
    movers: {
      card: options.moversCard,
      sections: movers,
      tableOverrides,
    },
    volatilityBuckets: {
      card: options.bucketsCard,
      buckets,
    },
    momentum: {
      card: options.momentumCard,
      entries: momentum,
    },
    heatmap: {
      card: options.heatmapCard,
      notes: heatmapNotes,
      placeholder: options.heatmapCard.placeholder,
    },
  } satisfies StaticMarketSnapshotConfig;
};
