import { createClient } from "../_shared/client.ts";
import { ok, mna, unauth, oops } from "../_shared/http.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { registerHandler } from "../_shared/serve.ts";

function genHex(n = 24) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function tg(token: string, method: string, body?: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await r.json().catch(() => ({}));
}

export const handler = registerHandler(async (req) => {
  try {
    const urlObj = new URL(req.url);
    if (req.method === "GET" && urlObj.pathname.endsWith("/version")) {
      return ok({ name: "rotate-webhook-secret", ts: new Date().toISOString() });
    }
    if (req.method === "HEAD") return new Response(null, { status: 200 });
    if (req.method !== "POST") {
      return mna();
    }

    // Admin header secret from Phase 04 (reuse)
    const hdr = req.headers.get("X-Admin-Secret") || "";
    if (hdr !== (Deno.env.get("ADMIN_API_SECRET") || "")) {
      return unauth();
    }

    const { TELEGRAM_BOT_TOKEN: token } =
      requireEnv(["TELEGRAM_BOT_TOKEN"] as const);
    const supa = createClient();
    const ref = (new URL(getEnv("SUPABASE_URL"))).hostname.split(".")[0];
    const expectedUrl = `https://${ref}.functions.supabase.co/telegram-bot`;

    const secret = genHex(24);
    await supa.from("bot_settings").upsert({
      setting_key: "TELEGRAM_WEBHOOK_SECRET",
      setting_value: secret,
    }, { onConflict: "setting_key" });

    await tg(token, "setWebhook", {
      url: expectedUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
    const info = await tg(token, "getWebhookInfo");

    return new Response(
      JSON.stringify({
        ok: info?.ok === true,
        new_secret: secret,
        webhook: info,
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    return oops("Internal Error", String(e));
  }
});

export default handler;
