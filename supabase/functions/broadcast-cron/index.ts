// >>> DC BLOCK: broadcast-cron-core (start)
import { requireEnv } from "../_shared/env.ts";
import { functionUrl } from "../_shared/edge.ts";
import { ok, oops } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "broadcast-cron", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv(
      ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const,
    );
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/broadcast_messages?delivery_status=eq.scheduled&scheduled_at=lte.${
        new Date().toISOString()
      }&select=id`,
      { headers },
    );
    const rows = await r.json();
    const url = functionUrl("broadcast-dispatch");
    for (const row of rows || []) {
      if (!url) break;
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
    }
    return ok();
  } catch (err) {
    console.error("broadcast-cron error", err);
    return oops("Failed to dispatch broadcasts", String(err));
  }
});
// <<< DC BLOCK: broadcast-cron-core (end)

export default handler;
