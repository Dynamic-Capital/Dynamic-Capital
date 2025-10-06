import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";

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
    async () => builder(),
    [cacheKey],
    {
      revalidate: DYNAMIC_REST_CACHE_TTL_SECONDS,
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

function hasResourceDefinition(slug: string): slug is ResourceSlug {
  return Object.prototype.hasOwnProperty.call(RESOURCE_DEFINITIONS, slug);
}

type RouteParams = {
  resource?: string | string[];
};

type RouteContext = {
  params: Readonly<RouteParams>;
};

type ResolvedResource =
  | { type: "ok"; definition: ResourceDefinition }
  | { type: "unknown" }
  | { type: "ambiguous" };

function resolveResourceFromParams(
  params: Readonly<RouteParams>,
): ResolvedResource {
  const { resource } = params;
  if (!resource) {
    return { type: "unknown" };
  }

  const values = Array.isArray(resource) ? resource : [resource];

  let resolvedSlug: ResourceSlug | null = null;

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const normalized = trimmed.toLowerCase();
    if (!hasResourceDefinition(normalized)) {
      return { type: "unknown" };
    }

    if (resolvedSlug && resolvedSlug !== normalized) {
      return { type: "ambiguous" };
    }

    resolvedSlug = normalized as ResourceSlug;
  }

  if (!resolvedSlug) {
    return { type: "unknown" };
  }

  return { type: "ok", definition: RESOURCE_DEFINITIONS[resolvedSlug] };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const resolution = resolveResourceFromParams(params);

  switch (resolution.type) {
    case "ambiguous":
      return jsonResponse(
        {
          status: "error",
          message:
            "Multiple resource slugs provided. Specify a single resource.",
          availableResources: RESOURCE_SLUGS,
        },
        { status: 400 },
        req,
      );
    case "ok": {
      const { endpoint, getResource } = resolution.definition;
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
    default:
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
