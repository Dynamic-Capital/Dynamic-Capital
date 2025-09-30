// scripts/check-linkage.ts
// Runs an external linkage check using env + Telegram + (optionally) the Edge audit function.
// Prints findings; always exits 0.

import { createHttpClientWithEnvCa } from "./utils/http-client.ts";

type TelegramWebhookInfoResponse = {
  ok: boolean;
  result?: {
    url?: string;
  };
};

type SupabaseLinkageAuditResponse = {
  status?: string;
  webhooks?: Record<string, unknown>;
  outbound?: Record<string, unknown>;
  [key: string]: unknown;
};

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

type GetJsonOptions = {
  client?: Deno.HttpClient;
  label?: string;
  timeoutMs?: number;
};

async function getJson<T>(
  url: string,
  options: GetJsonOptions = {},
): Promise<T | null> {
  const { client, label, timeoutMs = 10_000 } = options;
  const target = label ?? url;
  try {
    const signal = AbortSignal.timeout(timeoutMs);
    const response = await fetch(url, client ? { client, signal } : { signal });
    if (!response.ok) {
      const body = await response.text().catch(() => null);
      console.warn(
        `[linkage] ${target} responded ${response.status} ${response.statusText}` +
          (body ? ` — ${body.slice(0, 200)}` : ""),
      );
      return null;
    }
    try {
      return await response.json() as T;
    } catch (parseError) {
      console.warn(
        `[linkage] Unable to parse JSON from ${target}:`,
        parseError instanceof Error ? parseError.message : String(parseError),
      );
      return null;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      console.warn(`[linkage] Request timed out for ${target}`);
    } else {
      console.warn(
        `[linkage] Request failed for ${target}:`,
        error instanceof Error ? error.message : String(error),
      );
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
    const info = await getJson<TelegramWebhookInfoResponse>(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
      {
        client: tlsContext?.client,
        label: "Telegram getWebhookInfo",
      },
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
    const inside = await getJson<SupabaseLinkageAuditResponse>(healthUrl, {
      client: tlsContext?.client,
      label: "Supabase linkage-audit",
    });
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
