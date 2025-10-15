import test from "node:test";
import {
  equal as assertEquals,
  match as assertMatch,
  ok as assert,
} from "node:assert/strict";

async function makeInitData(user: Record<string, unknown>, token: string) {
  const enc = new TextEncoder();
  const payload = {
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "TEST",
  } satisfies Record<string, string>;

  const toEncodedPairs = Object.entries(payload).map(([key, value]) => ({
    key,
    value,
    encodedValue: encodeURIComponent(value),
  }));

  const secretKey = await crypto.subtle.digest("SHA-256", enc.encode(token));
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const dataCheckString = toEncodedPairs
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((pair) => `${pair.key}=${pair.encodedValue}`)
    .join("\n");

  const sig = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(dataCheckString));
  const hash = [...new Uint8Array(sig)].map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");

  const query = toEncodedPairs.map((pair) => `${pair.key}=${pair.encodedValue}`)
    .concat(`hash=${hash}`)
    .join("&");

  return query;
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

test("verifyInitDataAndGetUser handles percent characters in user payload", async () => {
  Deno.env.set("TELEGRAM_BOT_TOKEN", "token");
  try {
    const initData = await makeInitData({
      id: 2,
      username: "f%o",
      first_name: "50% complete",
    }, "token");
    const { verifyInitDataAndGetUser } = await import(
      /* @vite-ignore */ "../supabase/functions/_shared/telegram.ts"
    );
    const user = await verifyInitDataAndGetUser(initData);
    assert(user);
    assertEquals(user?.id, 2);
    assertEquals(user?.username, "f%o");
    assertEquals(user?.first_name, "50% complete");
  } finally {
    Deno.env.delete("TELEGRAM_BOT_TOKEN");
  }
});

test("verify-telegram accepts percent-encoded user payload", async () => {
  Deno.env.set("TELEGRAM_BOT_TOKEN", "token");
  try {
    const initData = await makeInitData({
      id: 3,
      username: "50%club",
      last_name: "Percent%User",
    }, "token");
    const { default: handler } = await import(
      /* @vite-ignore */ "../supabase/functions/verify-telegram/index.ts"
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
    assert(data.user);
    assertEquals((data.user as { id: number }).id, 3);
    assertEquals((data.user as { username?: string }).username, "50%club");
    assertEquals((data.user as { last_name?: string }).last_name, "Percent%User");
  } finally {
    Deno.env.delete("TELEGRAM_BOT_TOKEN");
  }
});
