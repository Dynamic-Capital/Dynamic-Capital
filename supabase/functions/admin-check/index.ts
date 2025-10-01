import { isAdmin, verifyInitDataAndGetUser } from "../_shared/telegram.ts";
import { bad, mna, ok, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "admin-check", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  if (req.method !== "POST") return mna();

  let body: { initData?: string; telegram_user_id?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  // Handle both initData verification and direct telegram_user_id check
  if (body.telegram_user_id) {
    // Direct telegram user ID check for mini app
    // Check both environment allowlist and database
    const envAdmin = await isAdmin(body.telegram_user_id);

    // Also check database
    let dbAdmin = false;
    try {
      const { createClient } = await import("../_shared/client.ts");
      const supabase = createClient();
      const { data } = await supabase
        .from("bot_users")
        .select("is_admin")
        .eq("telegram_id", body.telegram_user_id)
        .single();
      dbAdmin = data?.is_admin || false;
    } catch (error) {
      console.warn("Failed to check DB admin status:", error);
    }

    const adminCheck = envAdmin || dbAdmin;
    return new Response(
      JSON.stringify({
        is_admin: adminCheck,
        telegram_user_id: body.telegram_user_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } else {
    // Original initData verification for Telegram bot
    const u = await verifyInitDataAndGetUser(body.initData || "");
    if (!u || !isAdmin(u.id)) return unauth();
    return ok({ user_id: u.id });
  }
});

export default handler;
