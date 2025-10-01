import { createClient } from "../_shared/client.ts";
import { getEnv } from "../_shared/env.ts";
import { mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

function genHex(n = 24) {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const handler = registerHandler(async (req) => {
  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname.endsWith("/version")) {
      return ok({ name: "rotate-admin-secret", ts: new Date().toISOString() });
    }
    if (req.method === "HEAD") return new Response(null, { status: 200 });
    if (req.method !== "POST") return mna();

    const hdr = req.headers.get("X-Admin-Secret") || "";
    if (hdr !== getEnv("ADMIN_API_SECRET")) return unauth();

    const supa = createClient();
    const secret = genHex(24);
    const { error } = await supa.from("bot_settings").upsert({
      setting_key: "ADMIN_API_SECRET",
      setting_value: secret,
    }, { onConflict: "setting_key" });
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true, new_secret: secret }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return oops("Internal Error", e instanceof Error ? e.message : String(e));
  }
});

export default handler;
