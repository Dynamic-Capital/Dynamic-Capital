import tradingDeskPlan from "@/data/trading-desk-plan.json" with {
  type: "json",
};
import {
  buildDexScreenerResource,
  type DexScreenerResource,
} from "./dex-screener";
import {
  BOND_FEED_CAPABILITIES,
  BOND_MARKET_COVERAGE,
  type BondFeedCapability,
  type BondMarketCoverage,
} from "@/data/global-bond-yields";
import {
  type AssetClass,
  DEFAULT_FX_PAIRS,
  findInstrumentMetadata,
  type InstrumentMetadata,
  listInstruments,
} from "@/data/instruments";
import {
  LIVE_MARKET_ADVISORIES,
  type LiveMarketAdvisory,
} from "@/data/live-market-advisories";
import {
  OPEN_SOURCE_CATALOG,
  type OpenSourceCatalogData,
} from "@/data/open-source";
import { optionalEnvVar } from "@/utils/env.ts";

export const DYNAMIC_REST_CACHE_TAG = "dynamic-rest" as const;
const DEFAULT_DYNAMIC_REST_CACHE_TTL_SECONDS = 300;

function resolveDynamicRestCacheTtl(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_DYNAMIC_REST_CACHE_TTL_SECONDS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_DYNAMIC_REST_CACHE_TTL_SECONDS;
  }

  return parsed;
}

export const DYNAMIC_REST_CACHE_TTL_SECONDS = resolveDynamicRestCacheTtl(
  optionalEnvVar("CACHE_TTL_SECONDS"),
);

export const DYNAMIC_REST_CACHE_CONTROL_HEADER =
  `public, max-age=0, s-maxage=${DYNAMIC_REST_CACHE_TTL_SECONDS}, stale-while-revalidate=86400` as const;

const ASSET_CLASSES = [
  "commodities",
  "currencies",
  "indices",
  "crypto",
  "stocks",
] as const satisfies readonly AssetClass[];

export interface RestEndpointDescriptor {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  description: string;
}

export interface InstrumentSample {
  id: string;
  name: string;
  displaySymbol: string;
  assetClass: AssetClass;
}

export interface TradingPlanSummary {
  id: string;
  symbol: string;
  direction: string;
  entry: number;
  confidence: number | null;
  takeProfit?: number;
  stopLoss?: number;
  planSummary: string[];
}

export type MarketAdvisoryStance = LiveMarketAdvisory["stance"];

export interface MarketAdvisorySummary {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  stance: MarketAdvisoryStance;
  conviction: number;
  headline: string;
  summary: string;
  actions: string[];
  hedges: string[];
  riskNotes: string[];
  macroDrivers: string[];
  updatedAt: string;
}

export interface DynamicRestResources {
  instruments: {
    total: number;
    assetClasses: Record<AssetClass, {
      count: number;
      sample: InstrumentSample[];
    }>;
    majorPairs: InstrumentSample[];
  };
  tradingDesk: {
    plansAvailable: number;
    activePlans: TradingPlanSummary[];
  };
  bondYields: {
    totalMarkets: number;
    totalSeries: number;
    capabilities: BondFeedCapability[];
    markets: Array<{
      code: BondMarketCoverage["code"];
      market: BondMarketCoverage["market"];
      tenors: string[];
    }>;
  };
  openSource: {
    totals: Record<
      keyof OpenSourceCatalogData | "overall",
      number
    >;
    categories: OpenSourceCatalogData;
  };
  marketAdvisories: {
    total: number;
    updatedAt: string;
    stanceBreakdown: Record<MarketAdvisoryStance, number>;
    advisories: MarketAdvisorySummary[];
    topConviction: MarketAdvisorySummary[];
  };
  dexScreener: DexScreenerResource;
}

export interface DynamicRestResponse {
  status: "ok";
  generatedAt: string;
  metadata: {
    version: number;
    repository: string;
  };
  endpoints: RestEndpointDescriptor[];
  resources: DynamicRestResources;
}

export interface DynamicRestResourceEnvelope<Resource> {
  status: "ok";
  generatedAt: string;
  metadata: DynamicRestResponse["metadata"];
  resource: Resource;
}

export interface DynamicRestResourceEndpointDescriptor<
  Key extends keyof DynamicRestResources,
> extends RestEndpointDescriptor {
  resourceKey: Key;
  slug: string;
}

const RESPONSE_METADATA = Object.freeze({
  version: 1,
  repository: "Dynamic Capital",
});

function buildMetadata(): DynamicRestResponse["metadata"] {
  return { ...RESPONSE_METADATA };
}

type TradingDeskPlan = Record<string, TradingPlan | undefined>;

type TradingPlan = {
  direction?: string;
  entry?: number;
  finalConfidence?: number;
  originalConfidence?: number;
  plan?: string[];
  reason?: string;
  stopLoss?: number;
  symbol?: string;
  takeProfit?: number;
};

const TRADING_DESK_PLAN = tradingDeskPlan as TradingDeskPlan;

const ROOT_DYNAMIC_REST_ENDPOINT = Object.freeze(
  {
    method: "GET",
    path: "/api/dynamic-rest",
    description: "Retrieve aggregated Dynamic Capital datasets for public use.",
  } satisfies RestEndpointDescriptor,
);

type ResourceEndpointMap = {
  [Key in keyof DynamicRestResources]: DynamicRestResourceEndpointDescriptor<
    Key
  >;
};

const RESOURCE_DYNAMIC_REST_ENDPOINTS = Object.freeze(
  {
    instruments: {
      method: "GET",
      path: "/api/dynamic-rest/resources/instruments",
      description: "List curated trading instruments grouped by asset class.",
      resourceKey: "instruments",
      slug: "instruments",
    },
    tradingDesk: {
      method: "GET",
      path: "/api/dynamic-rest/resources/trading-desk",
      description: "Fetch trading desk plan snapshots with execution context.",
      resourceKey: "tradingDesk",
      slug: "trading-desk",
    },
    bondYields: {
      method: "GET",
      path: "/api/dynamic-rest/resources/bond-yields",
      description:
        "Summaries of live sovereign yield coverage and feed capabilities.",
      resourceKey: "bondYields",
      slug: "bond-yields",
    },
    openSource: {
      method: "GET",
      path: "/api/dynamic-rest/resources/open-source",
      description:
        "Catalog of open-source helpers, language models, adapters, and toolkits.",
      resourceKey: "openSource",
      slug: "open-source",
    },
    marketAdvisories: {
      method: "GET",
      path: "/api/dynamic-rest/resources/market-advisories",
      description:
        "Narrative advisories synthesising desk bias, automation cues, and hedge notes.",
      resourceKey: "marketAdvisories",
      slug: "market-advisories",
    },
    dexScreener: {
      method: "GET",
      path: "/api/dynamic-rest/resources/dex-screener",
      description:
        "Latest Dex Screener token profiles and boost activity summaries.",
      resourceKey: "dexScreener",
      slug: "dex-screener",
    },
  } satisfies ResourceEndpointMap,
);

export const DYNAMIC_REST_ENDPOINTS = Object.freeze({
  root: ROOT_DYNAMIC_REST_ENDPOINT,
  resources: RESOURCE_DYNAMIC_REST_ENDPOINTS,
});

function summariseBondYields(): DynamicRestResources["bondYields"] {
  const markets = BOND_MARKET_COVERAGE.map((market) => ({
    code: market.code,
    market: market.market,
    tenors: [...market.tenors],
  }));

  const totalSeries = markets.reduce(
    (accumulator, market) => accumulator + market.tenors.length,
    0,
  );

  return {
    totalMarkets: markets.length,
    totalSeries,
    capabilities: [...BOND_FEED_CAPABILITIES],
    markets,
  } satisfies DynamicRestResources["bondYields"];
}

function toInstrumentSample(metadata: InstrumentMetadata): InstrumentSample {
  return {
    id: metadata.id,
    name: metadata.name,
    displaySymbol: metadata.displaySymbol ?? metadata.shortCode ?? metadata.id,
    assetClass: metadata.assetClass,
  };
}

function summariseInstruments() {
  let total = 0;
  const assetClasses =
    {} as DynamicRestResources["instruments"]["assetClasses"];

  for (const assetClass of ASSET_CLASSES) {
    const instruments = listInstruments(assetClass);
    total += instruments.length;
    assetClasses[assetClass] = {
      count: instruments.length,
      sample: instruments.slice(0, 3).map(toInstrumentSample),
    };
  }

  const majorPairs = DEFAULT_FX_PAIRS
    .map((instrumentId) => findInstrumentMetadata(instrumentId))
    .filter((metadata): metadata is InstrumentMetadata => Boolean(metadata))
    .map(toInstrumentSample);

  return {
    total,
    assetClasses,
    majorPairs,
  } satisfies DynamicRestResources["instruments"];
}

function summariseTradingDesk(): DynamicRestResources["tradingDesk"] {
  const entries: TradingPlanSummary[] = [];

  for (const [id, plan] of Object.entries(TRADING_DESK_PLAN)) {
    if (!plan || !plan.symbol || plan.entry === undefined) {
      continue;
    }

    const confidence = plan.finalConfidence ?? plan.originalConfidence ?? null;

    entries.push({
      id,
      symbol: plan.symbol,
      direction: plan.direction ?? "neutral",
      entry: plan.entry,
      confidence,
      takeProfit: plan.takeProfit,
      stopLoss: plan.stopLoss,
      planSummary: (plan.plan ?? []).slice(0, 2),
    });
  }

  entries.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  return {
    plansAvailable: entries.length,
    activePlans: entries,
  } satisfies DynamicRestResources["tradingDesk"];
}

function summariseOpenSource(): DynamicRestResources["openSource"] {
  const categories = {
    helpers: [...OPEN_SOURCE_CATALOG.helpers],
    languageModels: [...OPEN_SOURCE_CATALOG.languageModels],
    adapters: [...OPEN_SOURCE_CATALOG.adapters],
    toolkits: [...OPEN_SOURCE_CATALOG.toolkits],
  } as const satisfies OpenSourceCatalogData;

  const totals = {
    helpers: categories.helpers.length,
    languageModels: categories.languageModels.length,
    adapters: categories.adapters.length,
    toolkits: categories.toolkits.length,
  } as const satisfies Record<keyof OpenSourceCatalogData, number>;

  const overall = Object.values(totals).reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    totals: {
      ...totals,
      overall,
    },
    categories,
  } satisfies DynamicRestResources["openSource"];
}

function summariseMarketAdvisories(
  now: Date = new Date(),
): DynamicRestResources["marketAdvisories"] {
  const advisories: MarketAdvisorySummary[] = LIVE_MARKET_ADVISORIES.map(
    (entry) => ({
      symbol: entry.symbol,
      name: entry.name,
      assetClass: entry.assetClass,
      stance: entry.stance,
      conviction: entry.conviction,
      headline: entry.headline,
      summary: entry.summary,
      actions: [...entry.actions],
      hedges: [...entry.hedges],
      riskNotes: [...entry.riskNotes],
      macroDrivers: [...entry.macroDrivers],
      updatedAt: entry.updatedAt,
    }),
  );

  const stanceBreakdown: Record<MarketAdvisoryStance, number> = {
    Bullish: 0,
    Neutral: 0,
    Bearish: 0,
  };

  let latestTimestamp: number | null = null;

  for (const advisory of advisories) {
    stanceBreakdown[advisory.stance] += 1;
    const parsed = Date.parse(advisory.updatedAt);
    if (!Number.isNaN(parsed)) {
      latestTimestamp = latestTimestamp === null || parsed > latestTimestamp
        ? parsed
        : latestTimestamp;
    }
  }

  const updatedAt = latestTimestamp !== null
    ? new Date(latestTimestamp).toISOString()
    : now.toISOString();

  const topConviction = [...advisories]
    .sort((a, b) => b.conviction - a.conviction)
    .slice(0, 3);

  return {
    total: advisories.length,
    updatedAt,
    stanceBreakdown,
    advisories,
    topConviction,
  } satisfies DynamicRestResources["marketAdvisories"];
}

export async function buildDynamicRestResponse(
  now: Date = new Date(),
): Promise<DynamicRestResponse> {
  const [
    instruments,
    tradingDesk,
    bondYields,
    openSource,
    marketAdvisories,
    dexScreener,
  ] = await Promise.all([
    Promise.resolve(summariseInstruments()),
    Promise.resolve(summariseTradingDesk()),
    Promise.resolve(summariseBondYields()),
    Promise.resolve(summariseOpenSource()),
    Promise.resolve(summariseMarketAdvisories(now)),
    buildDexScreenerResource(),
  ]);

  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    endpoints: [
      ROOT_DYNAMIC_REST_ENDPOINT,
      ...Object.values(RESOURCE_DYNAMIC_REST_ENDPOINTS),
    ],
    resources: {
      instruments,
      tradingDesk,
      bondYields,
      openSource,
      marketAdvisories,
      dexScreener,
    },
  } satisfies DynamicRestResponse;
}

export function buildDynamicRestInstrumentsResponse(
  now: Date = new Date(),
): DynamicRestResourceEnvelope<DynamicRestResources["instruments"]> {
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    resource: summariseInstruments(),
  } satisfies DynamicRestResourceEnvelope<DynamicRestResources["instruments"]>;
}

export function buildDynamicRestTradingDeskResponse(
  now: Date = new Date(),
): DynamicRestResourceEnvelope<DynamicRestResources["tradingDesk"]> {
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    resource: summariseTradingDesk(),
  } satisfies DynamicRestResourceEnvelope<DynamicRestResources["tradingDesk"]>;
}

export function buildDynamicRestBondYieldsResponse(
  now: Date = new Date(),
): DynamicRestResourceEnvelope<DynamicRestResources["bondYields"]> {
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    resource: summariseBondYields(),
  } satisfies DynamicRestResourceEnvelope<DynamicRestResources["bondYields"]>;
}

export function buildDynamicRestOpenSourceResponse(
  now: Date = new Date(),
): DynamicRestResourceEnvelope<DynamicRestResources["openSource"]> {
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    resource: summariseOpenSource(),
  } satisfies DynamicRestResourceEnvelope<DynamicRestResources["openSource"]>;
}

export function buildDynamicRestMarketAdvisoriesResponse(
  now: Date = new Date(),
): DynamicRestResourceEnvelope<DynamicRestResources["marketAdvisories"]> {
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    resource: summariseMarketAdvisories(now),
  } satisfies DynamicRestResourceEnvelope<
    DynamicRestResources["marketAdvisories"]
  >;
}

export async function buildDynamicRestDexScreenerResponse(
  now: Date = new Date(),
): Promise<
  DynamicRestResourceEnvelope<DynamicRestResources["dexScreener"]>
> {
  const resource = await buildDexScreenerResource();
  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    resource,
  } satisfies DynamicRestResourceEnvelope<DynamicRestResources["dexScreener"]>;
}
