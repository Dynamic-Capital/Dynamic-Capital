import { createClient } from "../_shared/client.ts";
import { isAdmin, verifyInitDataAndGetUser } from "../_shared/telegram.ts";
import { bad, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "admin-logs", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  if (req.method !== "POST") return mna();
  let body: { initData: string; limit?: number; offset?: number };
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  const u = await verifyInitDataAndGetUser(body.initData || "");
  if (!u || !isAdmin(u.id)) return unauth();

  const supa = createClient();

  const limit = Math.min(Math.max(body.limit ?? 20, 1), 100);
  const offset = Math.max(body.offset ?? 0, 0);

  const { data, error } = await supa.from("admin_logs")
    .select(
      "created_at,admin_telegram_id,action_type,action_description,affected_table,affected_record_id",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return oops("Database error", error.message);
  return ok({ items: data });
});

export default handler;
