import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  buildDexScreenerResponse,
  DEX_SCREENER_CACHE_CONTROL_HEADER,
  DEX_SCREENER_CACHE_TAG,
  DEX_SCREENER_CACHE_TTL_SECONDS,
} from "@/services/dex-screener";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const ROUTE_ENDPOINT = Object.freeze({
  method: "GET" as const,
  path: "/api/dex-screener" as const,
  description:
    "Retrieve the latest DEX Screener token profiles and boost snapshots.",
});

const CACHE_KEY = "dex-screener-response";

const getDexScreenerResponse = unstable_cache(
  () => buildDexScreenerResponse(),
  [CACHE_KEY],
  {
    revalidate: DEX_SCREENER_CACHE_TTL_SECONDS,
    tags: [DEX_SCREENER_CACHE_TAG],
  },
);

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_ENDPOINT.path, async () => {
    const payload = await getDexScreenerResponse();
    return jsonResponse(
      payload,
      {
        headers: {
          "cache-control": DEX_SCREENER_CACHE_CONTROL_HEADER,
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
