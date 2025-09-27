import { registerHandler } from "../_shared/serve.ts";
import {
  bad,
  corsHeaders,
  methodNotAllowed,
  ok,
  oops,
} from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";

type AnalyticsType = "balances" | "activity" | "metrics";

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "50");
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(Math.floor(parsed), 500);
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }
  if (req.method !== "GET") return methodNotAllowed(req);

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "balances") as AnalyticsType;
  const chainId = url.searchParams.get("chainId");
  const address = url.searchParams.get("address");
  const metric = url.searchParams.get("metric");
  const limit = parseLimit(url.searchParams.get("limit"));

  const supabase = createClient("service");

  switch (type) {
    case "balances": {
      let query = supabase.from("onchain_balances").select("*")
        .order("observed_at", { ascending: false })
        .limit(limit);
      if (chainId) query = query.eq("chain_id", chainId);
      if (address) query = query.eq("address", address);
      const { data, error } = await query;
      if (error) {
        return oops("Failed to load balances", error.message, req);
      }
      return ok({ type, data }, req);
    }
    case "activity": {
      let query = supabase.from("onchain_activity").select("*")
        .order("block_timestamp", { ascending: false })
        .limit(limit);
      if (chainId) query = query.eq("chain_id", chainId);
      if (address) query = query.eq("address", address);
      const { data, error } = await query;
      if (error) {
        return oops("Failed to load activity", error.message, req);
      }
      return ok({ type, data }, req);
    }
    case "metrics": {
      let query = supabase.from("onchain_metrics").select("*")
        .order("observed_at", { ascending: false })
        .limit(limit);
      if (metric) query = query.eq("metric", metric);
      if (chainId) query = query.eq("tags->>asset", chainId);
      const { data, error } = await query;
      if (error) {
        return oops("Failed to load metrics", error.message, req);
      }
      return ok({ type, data }, req);
    }
    default:
      return bad(`Unsupported type: ${type}`, undefined, req);
  }
});

export default handler;
