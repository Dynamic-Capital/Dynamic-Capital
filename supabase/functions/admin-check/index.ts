import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyInitDataAndGetUser, isAdmin } from "../_shared/telegram.ts";
import { ok, bad, unauth, mna } from "../_shared/http.ts";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
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
    const adminCheck = await isAdmin(body.telegram_user_id);
    return new Response(JSON.stringify({ 
      is_admin: adminCheck,
      telegram_user_id: body.telegram_user_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    // Original initData verification for Telegram bot
    const u = await verifyInitDataAndGetUser(body.initData || "");
    if (!u || !isAdmin(u.id)) return unauth();
    return ok({ user_id: u.id });
  }
});
