import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  buildDynamicRestBondYieldsResponse,
  buildDynamicRestInstrumentsResponse,
  buildDynamicRestTradingDeskResponse,
  DYNAMIC_REST_CACHE_CONTROL_HEADER,
  DYNAMIC_REST_CACHE_TAG,
  type DynamicRestResourceEnvelope,
  type DynamicRestResources,
} from "@/services/dynamic-rest";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const ROUTE_BASE = "/api/dynamic-rest/resources" as const;
const CACHE_TTL_SECONDS = 300;

export const revalidate = CACHE_TTL_SECONDS;

type ResourceSlug = "instruments" | "trading-desk" | "bond-yields";

type ResourcePayload = DynamicRestResourceEnvelope<
  DynamicRestResources[keyof DynamicRestResources]
>;

type CachedResourceBuilder = () => Promise<ResourcePayload>;

type ResourceDefinition = {
  routeName: `${typeof ROUTE_BASE}/${ResourceSlug}`;
  getResource: CachedResourceBuilder;
};

function createCachedResource<Payload extends ResourcePayload>(
  cacheKey: string,
  builder: () => Payload,
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

const RESOURCE_DEFINITIONS: Record<ResourceSlug, ResourceDefinition> = {
  instruments: {
    routeName: `${ROUTE_BASE}/instruments`,
    getResource: createCachedResource(
      "dynamic-rest-resources-instruments",
      buildDynamicRestInstrumentsResponse,
    ),
  },
  "trading-desk": {
    routeName: `${ROUTE_BASE}/trading-desk`,
    getResource: createCachedResource(
      "dynamic-rest-resources-trading-desk",
      buildDynamicRestTradingDeskResponse,
    ),
  },
  "bond-yields": {
    routeName: `${ROUTE_BASE}/bond-yields`,
    getResource: createCachedResource(
      "dynamic-rest-resources-bond-yields",
      buildDynamicRestBondYieldsResponse,
    ),
  },
};

function resolveResource(
  resource: string | undefined,
): ResourceDefinition | null {
  if (!resource) {
    return null;
  }

  return RESOURCE_DEFINITIONS[resource as ResourceSlug] ?? null;
}

export async function GET(
  req: Request,
  context: { params: { resource?: string } },
) {
  const definition = resolveResource(context.params?.resource);

  if (!definition) {
    return jsonResponse(
      {
        status: "error",
        message: "Unknown dynamic REST resource",
      },
      { status: 404 },
      req,
    );
  }

  const { routeName, getResource } = definition;

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
export const HEAD = methodNotAllowed;

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
