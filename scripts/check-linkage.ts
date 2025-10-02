// scripts/check-linkage.ts
// Runs an external linkage check using env + Telegram + (optionally) the Edge audit function.
// Prints findings; always exits 0.

import { createHttpClientWithEnvCa } from "./utils/http-client.ts";
import { dirname, fromFileUrl, join, relative } from "std/path/mod.ts";

type TelegramWebhookInfo = {
  ok?: boolean;
  result?: {
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_message?: string;
    last_synchronization_error_date?: number;
  } | null;
};

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const PROJECT_ROOT = join(SCRIPT_DIR, "..", "");
const DEFAULT_WEBHOOK_FIXTURE = join(
  PROJECT_ROOT,
  "fixtures",
  "telegram-webhook-info.json",
);

async function loadFixture(path: string): Promise<TelegramWebhookInfo | null> {
  try {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as TelegramWebhookInfo;
  } catch (error) {
    console.warn(`[fixtures] Unable to load ${path}:`, error);
    return null;
  }
}

async function resolveWebhookFixture(): Promise<
  { info: TelegramWebhookInfo; source: string } | null
> {
  const envPath = Deno.env.get("TELEGRAM_WEBHOOK_INFO_PATH");
  if (envPath) {
    const info = await loadFixture(envPath);
    if (info) {
      return { info, source: envPath };
    }
  }

  try {
    const stats = await Deno.stat(DEFAULT_WEBHOOK_FIXTURE);
    if (stats.isFile) {
      const info = await loadFixture(DEFAULT_WEBHOOK_FIXTURE);
      if (info) {
        return { info, source: DEFAULT_WEBHOOK_FIXTURE };
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn(
        "[fixtures] Unable to inspect default Telegram webhook fixture:",
        error,
      );
    }
  }

  return null;
}

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
  let webhookInfo: TelegramWebhookInfo | null = null;

  const tlsContext = await createHttpClientWithEnvCa();
  if (tlsContext) {
    console.log(`[tls] Using ${tlsContext.description}`);
  }

  if (token) {
    webhookInfo = await getJson(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
      tlsContext?.client,
    ) as TelegramWebhookInfo | null;
    currentWebhook = webhookInfo?.result?.url ?? null;
    console.log("[linkage] getWebhookInfo.ok:", !!webhookInfo?.ok);
    console.log("[linkage] current webhook:", currentWebhook || "(none)");
  } else {
    const fixture = await resolveWebhookFixture();
    if (fixture) {
      webhookInfo = fixture.info;
      currentWebhook = webhookInfo?.result?.url ?? null;
      const displayPath = fixture.source.startsWith("/")
        ? relative(Deno.cwd(), fixture.source)
        : fixture.source;
      console.log(
        `[fixtures] TELEGRAM_BOT_TOKEN missing; using ${
          displayPath.startsWith("..") ? fixture.source : displayPath
        } for webhook linkage data.`,
      );
      console.log("[linkage] getWebhookInfo.ok:", !!webhookInfo?.ok);
      console.log("[linkage] current webhook:", currentWebhook || "(none)");
    } else {
      console.log(
        "[linkage] TELEGRAM_BOT_TOKEN missing — skipping webhook check.",
      );
    }
  }

  if (typeof webhookInfo?.result?.pending_update_count === "number") {
    console.log(
      "[linkage] pending updates:",
      webhookInfo.result.pending_update_count,
    );
  }
  if (webhookInfo?.result?.last_error_message) {
    console.log(
      "[linkage] last error message:",
      webhookInfo.result.last_error_message,
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
