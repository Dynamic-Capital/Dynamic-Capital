import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  buildDynamicRestInstrumentsResponse,
  DYNAMIC_REST_CACHE_CONTROL_HEADER,
  DYNAMIC_REST_CACHE_TAG,
} from "@/services/dynamic-rest";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const ROUTE_NAME = "/api/dynamic-rest/resources/instruments";
const CACHE_KEY = "dynamic-rest-resources-instruments";
export const revalidate = 300;

const getDynamicRestInstruments = unstable_cache(
  () => Promise.resolve(buildDynamicRestInstrumentsResponse()),
  [CACHE_KEY],
  {
    revalidate,
    tags: [DYNAMIC_REST_CACHE_TAG],
  },
);

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const payload = await getDynamicRestInstruments();
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
