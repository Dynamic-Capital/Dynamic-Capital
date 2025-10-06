import { unstable_cache } from "next/cache";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  getReleasePlanningDashboardSnapshot,
  RELEASE_PLANNING_DASHBOARD_CACHE_CONTROL_HEADER,
  RELEASE_PLANNING_DASHBOARD_CACHE_TAG,
  RELEASE_PLANNING_DASHBOARD_CACHE_TTL_SECONDS,
  RELEASE_PLANNING_DASHBOARD_ENDPOINT,
} from "@/services/release-planning-dashboard";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const CACHE_KEY = "release-planning-dashboard";

const getReleasePlanningDashboard = unstable_cache(
  async () => getReleasePlanningDashboardSnapshot(),
  [CACHE_KEY],
  {
    revalidate: RELEASE_PLANNING_DASHBOARD_CACHE_TTL_SECONDS,
    tags: [RELEASE_PLANNING_DASHBOARD_CACHE_TAG],
  },
);

export async function GET(req: Request) {
  return withApiMetrics(
    req,
    RELEASE_PLANNING_DASHBOARD_ENDPOINT.path,
    async () => {
      const payload = await getReleasePlanningDashboard();
      return jsonResponse(
        payload,
        {
          headers: {
            "cache-control": RELEASE_PLANNING_DASHBOARD_CACHE_CONTROL_HEADER,
          },
        },
        req,
      );
    },
  );
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, RELEASE_PLANNING_DASHBOARD_ENDPOINT.method);
  return new Response(null, { status: 204, headers });
}
