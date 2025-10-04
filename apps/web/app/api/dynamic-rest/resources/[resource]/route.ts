import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  buildDynamicRestBondYieldsResponse,
  buildDynamicRestDexScreenerResponse,
  buildDynamicRestInstrumentsResponse,
  buildDynamicRestMarketAdvisoriesResponse,
  buildDynamicRestOpenSourceResponse,
  buildDynamicRestTradingDeskResponse,
  DYNAMIC_REST_CACHE_CONTROL_HEADER,
  DYNAMIC_REST_CACHE_TAG,
  DYNAMIC_REST_CACHE_TTL_SECONDS,
  DYNAMIC_REST_ENDPOINTS,
  type DynamicRestResourceEnvelope,
  type DynamicRestResources,
} from "@/services/dynamic-rest";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

export const revalidate = DYNAMIC_REST_CACHE_TTL_SECONDS;

const RESOURCE_ENDPOINTS = DYNAMIC_REST_ENDPOINTS.resources;

type ResourceEndpoint =
  (typeof RESOURCE_ENDPOINTS)[keyof typeof RESOURCE_ENDPOINTS];
type ResourceSlug = ResourceEndpoint["slug"];

type ResourcePayload = DynamicRestResourceEnvelope<
  DynamicRestResources[keyof DynamicRestResources]
>;

type CachedResourceBuilder = () => Promise<ResourcePayload>;

type ResourceDefinition = {
  endpoint: ResourceEndpoint;
  getResource: CachedResourceBuilder;
};

function createCachedResource<Payload extends ResourcePayload>(
  cacheKey: string,
  builder: () => Payload | Promise<Payload>,
): () => Promise<Payload> {
  return unstable_cache(
    () => Promise.resolve(builder()),
    [cacheKey],
    {
      revalidate,
      tags: [DYNAMIC_REST_CACHE_TAG],
    },
  );
}

const RESOURCE_DEFINITIONS = {
  [RESOURCE_ENDPOINTS.instruments.slug]: {
    endpoint: RESOURCE_ENDPOINTS.instruments,
    getResource: createCachedResource(
      "dynamic-rest-resources-instruments",
      buildDynamicRestInstrumentsResponse,
    ),
  },
  [RESOURCE_ENDPOINTS.tradingDesk.slug]: {
    endpoint: RESOURCE_ENDPOINTS.tradingDesk,
    getResource: createCachedResource(
      "dynamic-rest-resources-trading-desk",
      buildDynamicRestTradingDeskResponse,
    ),
  },
  [RESOURCE_ENDPOINTS.bondYields.slug]: {
    endpoint: RESOURCE_ENDPOINTS.bondYields,
    getResource: createCachedResource(
      "dynamic-rest-resources-bond-yields",
      buildDynamicRestBondYieldsResponse,
    ),
  },
  [RESOURCE_ENDPOINTS.openSource.slug]: {
    endpoint: RESOURCE_ENDPOINTS.openSource,
    getResource: createCachedResource(
      "dynamic-rest-resources-open-source",
      buildDynamicRestOpenSourceResponse,
    ),
  },
  [RESOURCE_ENDPOINTS.marketAdvisories.slug]: {
    endpoint: RESOURCE_ENDPOINTS.marketAdvisories,
    getResource: createCachedResource(
      "dynamic-rest-resources-market-advisories",
      buildDynamicRestMarketAdvisoriesResponse,
    ),
  },
  [RESOURCE_ENDPOINTS.dexScreener.slug]: {
    endpoint: RESOURCE_ENDPOINTS.dexScreener,
    getResource: createCachedResource(
      "dynamic-rest-resources-dex-screener",
      buildDynamicRestDexScreenerResponse,
    ),
  },
} satisfies Record<ResourceSlug, ResourceDefinition>;

const RESOURCE_SLUGS = Object.keys(RESOURCE_DEFINITIONS) as ResourceSlug[];

function resolveResource(
  resource: string | undefined,
): ResourceDefinition | null {
  if (!resource) {
    return null;
  }

  const normalized = resource.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(RESOURCE_DEFINITIONS, normalized)) {
    return RESOURCE_DEFINITIONS[normalized as ResourceSlug];
  }

  return null;
}

type RouteContext = { params: { resource: string } };

export async function GET(req: Request, context: RouteContext) {
  const definition = resolveResource(context.params.resource);

  if (!definition) {
    return jsonResponse(
      {
        status: "error",
        message: "Unknown dynamic REST resource",
        availableResources: RESOURCE_SLUGS,
      },
      { status: 404 },
      req,
    );
  }

  const { endpoint, getResource } = definition;
  const routeName = endpoint.path;

  return withApiMetrics(req, routeName, async () => {
    const payload = await getResource();

    return jsonResponse(
      payload,
      {
        headers: {
          "cache-control": DYNAMIC_REST_CACHE_CONTROL_HEADER,
        },
      },
      req,
    );
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
