import test from "node:test";
import {
  equal as assertEquals,
  match as assertMatch,
  ok as assert,
} from "node:assert/strict";

async function makeInitData(user: Record<string, unknown>, token: string) {
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.digest("SHA-256", enc.encode(token));
  const key = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const params = new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "TEST",
  });
  const dcs = Array.from(params.entries()).map(([k, v]) => `${k}=${v}`).sort()
    .join("\n");
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(dcs));
  const hash = [...new Uint8Array(sig)].map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  params.set("hash", hash);
  return params.toString();
}

test("tg-verify-init returns session token for valid initData", async () => {
  Deno.env.set("TELEGRAM_BOT_TOKEN", "token");
  Deno.env.set("SESSION_JWT_SECRET", "secret");
  try {
    const initData = await makeInitData({ id: 1, username: "alice" }, "token");
    const { default: handler } = await import(
      /* @vite-ignore */ "../supabase/functions/tg-verify-init/index.ts"
    );
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initData }),
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assert(data.ok);
    assertEquals(data.user_id, 1);
    assertEquals(data.username, "alice");
    assertMatch(
      data.session_token,
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
    );
  } finally {
    Deno.env.delete("TELEGRAM_BOT_TOKEN");
    Deno.env.delete("SESSION_JWT_SECRET");
  }
});
