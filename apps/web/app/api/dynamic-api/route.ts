import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  buildDynamicApiResponse,
  DYNAMIC_API_CACHE_CONTROL_HEADER,
  DYNAMIC_API_CACHE_TAG,
  DYNAMIC_API_CACHE_TTL_SECONDS,
  DYNAMIC_API_ENDPOINT,
} from "@/services/dynamic-api";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const ROUTE_ENDPOINT = DYNAMIC_API_ENDPOINT;
const CACHE_KEY = "dynamic-api-response";

const getDynamicApiResponse = unstable_cache(
  async () => buildDynamicApiResponse(),
  [CACHE_KEY],
  {
    revalidate: DYNAMIC_API_CACHE_TTL_SECONDS,
    tags: [DYNAMIC_API_CACHE_TAG],
  },
);

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_ENDPOINT.path, async () => {
    const payload = await getDynamicApiResponse();

    return jsonResponse(
      payload,
      {
        headers: {
          "cache-control": DYNAMIC_API_CACHE_CONTROL_HEADER,
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
  const headers = corsHeaders(req, ROUTE_ENDPOINT.method);
  return new Response(null, { status: 204, headers });
}
