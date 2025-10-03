import tradingDeskPlan from "@/data/trading-desk-plan.json" with {
  type: "json",
};
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

export function buildDynamicRestResponse(
  now: Date = new Date(),
): DynamicRestResponse {
  const instruments = summariseInstruments();
  const tradingDesk = summariseTradingDesk();
  const bondYields = summariseBondYields();

  return {
    status: "ok",
    generatedAt: now.toISOString(),
    metadata: buildMetadata(),
    endpoints: [
      {
        method: "GET",
        path: "/api/dynamic-rest",
        description:
          "Retrieve aggregated Dynamic Capital datasets for public use.",
      },
      {
        method: "GET",
        path: "/api/dynamic-rest/resources/instruments",
        description: "List curated trading instruments grouped by asset class.",
      },
      {
        method: "GET",
        path: "/api/dynamic-rest/resources/trading-desk",
        description:
          "Fetch trading desk plan snapshots with execution context.",
      },
      {
        method: "GET",
        path: "/api/dynamic-rest/resources/bond-yields",
        description:
          "Summaries of live sovereign yield coverage and feed capabilities.",
      },
    ],
    resources: {
      instruments,
      tradingDesk,
      bondYields,
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
