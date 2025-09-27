// scripts/check-linkage.ts
// Runs an external linkage check using env + Telegram + (optionally) the Edge audit function.
// Prints findings; always exits 0.

import { createHttpClientWithEnvCa } from "./utils/http-client.ts";

function env(k: string) {
  return Deno.env.get(k) ?? "";
}

function projectRef(): string | null {
  const direct = env("SUPABASE_PROJECT_ID") || env("SUPABASE_PROJECT_REF");
  if (direct) return direct;
  const supabaseUrl = env("SUPABASE_URL");
  if (supabaseUrl) {
    try {
      return new URL(supabaseUrl).hostname.split(".")[0] ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

function expectedWebhookUrl(): string | null {
  const override = env("TELEGRAM_WEBHOOK_URL");
  if (override) return override;
  const ref = projectRef();
  return ref ? `https://${ref}.functions.supabase.co/telegram-bot` : null;
}

async function getJson(url: string, client?: Deno.HttpClient) {
  try {
    const signal = AbortSignal.timeout(10_000);
    const r = await fetch(url, client ? { client, signal } : { signal });
    return await r.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      console.warn(`[linkage] Request timed out for ${url}`);
    }
    return null;
  }
}

async function main() {
  const token = env("TELEGRAM_BOT_TOKEN");
  const ref = projectRef();
  const mini = env("MINI_APP_URL");
  const expectedWebhook = expectedWebhookUrl();
  let currentWebhook: string | null = null;

  const tlsContext = await createHttpClientWithEnvCa();
  if (tlsContext) {
    console.log(`[tls] Using ${tlsContext.description}`);
  }

  if (token) {
    const info = await getJson(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
      tlsContext?.client,
    );
    currentWebhook = info?.result?.url ?? null;
    console.log("[linkage] getWebhookInfo.ok:", !!info?.ok);
    console.log("[linkage] current webhook:", currentWebhook || "(none)");
  } else {
    console.log(
      "[linkage] TELEGRAM_BOT_TOKEN missing — skipping webhook check.",
    );
  }

  if (expectedWebhook) {
    console.log("[linkage] expected webhook:", expectedWebhook);
  }
  if (mini) console.log("[linkage] MINI_APP_URL:", mini);

  const healthUrl = ref
    ? `https://${ref}.functions.supabase.co/linkage-audit`
    : null;
  if (healthUrl) {
    const inside = await getJson(healthUrl);
    console.log(
      "[linkage] Edge linkage-audit:",
      inside ? "reachable" : "not reachable",
    );
    if (inside) console.log(JSON.stringify(inside, null, 2).slice(0, 1000));
  }

  // Always succeed; human interprets output.
  tlsContext?.client.close();
  Deno.exit(0);
}

await main();
