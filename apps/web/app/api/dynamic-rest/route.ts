import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  buildDynamicRestResponse,
  DYNAMIC_REST_CACHE_CONTROL_HEADER,
  DYNAMIC_REST_CACHE_TAG,
  DYNAMIC_REST_ENDPOINTS,
} from "@/services/dynamic-rest";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const ROUTE_ENDPOINT = DYNAMIC_REST_ENDPOINTS.root;
const ROUTE_NAME = ROUTE_ENDPOINT.path;
const CACHE_KEY = "dynamic-rest-response";

// Keep this fallback in sync with DEFAULT_DYNAMIC_REST_CACHE_TTL_SECONDS in
// `@/services/dynamic-rest`.
const FALLBACK_REVALIDATE_SECONDS = 300;
const rawRevalidateSeconds = process.env.CACHE_TTL_SECONDS;
const parsedRevalidateSeconds = rawRevalidateSeconds === undefined
  ? undefined
  : Number.parseInt(rawRevalidateSeconds, 10);

export const revalidate = parsedRevalidateSeconds !== undefined &&
    Number.isFinite(parsedRevalidateSeconds) &&
    parsedRevalidateSeconds >= 0
  ? parsedRevalidateSeconds
  : FALLBACK_REVALIDATE_SECONDS;

const getDynamicRestResponse = unstable_cache(
  () => Promise.resolve(buildDynamicRestResponse()),
  [CACHE_KEY],
  {
    revalidate,
    tags: [DYNAMIC_REST_CACHE_TAG],
  },
);

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const payload = await getDynamicRestResponse();
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
  const headers = corsHeaders(req, ROUTE_ENDPOINT.method);
  return new Response(null, { status: 204, headers });
}
