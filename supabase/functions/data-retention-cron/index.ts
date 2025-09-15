import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { ok } from "../_shared/http.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "data-retention-cron", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  const supa = createClient();
  const days = Number(Deno.env.get("RETENTION_DAYS") ?? "90");
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const del1 = await supa.from("user_interactions").delete().lte(
    "created_at",
    cutoff,
  ).select("id");
  const del2 = await supa.from("user_sessions").delete().lte(
    "last_activity",
    cutoff,
  ).select("id");
  const del3 = await supa.from("abuse_bans").delete().lt(
    "expires_at",
    new Date().toISOString(),
  ).select("id");

  await supa.from("admin_logs").insert({
    admin_telegram_id: "system",
    action_type: "data_retention",
    action_description: `Cleaned interactions(${
      del1.data?.length || 0
    }), sessions(${del2.data?.length || 0}), bans(${del3.data?.length || 0})`,
  });

  return ok({
    deleted: {
      interactions: del1.data?.length || 0,
      sessions: del2.data?.length || 0,
      bans: del3.data?.length || 0,
    },
  });
}

if (import.meta.main) serve(handler);

export default handler;
