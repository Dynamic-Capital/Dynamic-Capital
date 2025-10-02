// scripts/check-webhook.ts
/**
 * Prints Telegram getWebhookInfo:
 * - current URL
 * - has_custom_certificate
 * - pending updates
 * - last error message & date
 *
 * Requires: TELEGRAM_BOT_TOKEN in env (Supabase Edge or local).
 * Never commit secrets. For local, export TELEGRAM_BOT_TOKEN before running.
 *
 * Usage:
 *   deno run -A scripts/check-webhook.ts
 */

import { createHttpClientWithEnvCa } from "./utils/http-client.ts";
import { dirname, fromFileUrl, join, relative } from "std/path/mod.ts";

type TelegramWebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
};

type TelegramWebhookResponse = {
  ok?: boolean;
  result?: TelegramWebhookInfo;
};

const DEFAULT_LIVENESS_TIMEOUT_MS = 5_000;

async function loadFixture(path: string): Promise<TelegramWebhookInfo> {
  const text = await Deno.readTextFile(path);
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object" && "result" in parsed) {
    return (parsed as TelegramWebhookResponse).result ?? {};
  }
  return (parsed ?? {}) as TelegramWebhookInfo;
}

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const PROJECT_ROOT = join(SCRIPT_DIR, "..", "");
const DEFAULT_WEBHOOK_FIXTURE = join(
  PROJECT_ROOT,
  "fixtures",
  "telegram-webhook-info.json",
);

async function resolveDefaultFixture(): Promise<string | null> {
  try {
    const stats = await Deno.stat(DEFAULT_WEBHOOK_FIXTURE);
    if (stats.isFile) {
      return DEFAULT_WEBHOOK_FIXTURE;
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

async function fetchWebhookInfo(): Promise<TelegramWebhookInfo> {
  const envFixturePath = Deno.env.get("TELEGRAM_WEBHOOK_INFO_PATH");
  if (envFixturePath) {
    console.log(
      `Using TELEGRAM_WEBHOOK_INFO_PATH fixture: ${envFixturePath}`,
    );
    return await loadFixture(envFixturePath);
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    const fallbackFixture = await resolveDefaultFixture();
    if (fallbackFixture) {
      const relativePath = relative(Deno.cwd(), fallbackFixture);
      console.log(
        `[fixtures] TELEGRAM_BOT_TOKEN missing; using ${
          relativePath.startsWith("..") ? fallbackFixture : relativePath
        } for webhook info.`,
      );
      return await loadFixture(fallbackFixture);
    }
    console.error(
      "Missing TELEGRAM_BOT_TOKEN and no webhook fixture found. Set TELEGRAM_WEBHOOK_INFO_PATH or provide a token.",
    );
    Deno.exit(1);
  }

  const apiBase =
    (Deno.env.get("TELEGRAM_API_BASE") ?? "https://api.telegram.org")
      .replace(/\/$/, "");
  const tlsContext = await createHttpClientWithEnvCa();
  if (tlsContext) {
    console.log(`[tls] Using ${tlsContext.description}`);
  }
  try {
    const response = await fetch(`${apiBase}/bot${token}/getWebhookInfo`, {
      client: tlsContext?.client,
    });
    const json = (await response.json()) as TelegramWebhookResponse;

    if (!json.ok) {
      console.error("Telegram API error:", json);
      Deno.exit(1);
    }

    return json.result ?? {};
  } catch (error) {
    if (
      error instanceof TypeError &&
      /UnknownIssuer/i.test(error.message ?? String(error))
    ) {
      console.error(
        "TLS validation failed: UnknownIssuer. Provide TELEGRAM_CA_CERT, ",
        "TELEGRAM_CA_BUNDLE, or set SSL_CERT_FILE to a trusted bundle.",
      );
    }
    throw error;
  } finally {
    tlsContext?.client.close();
  }
}

const info = await fetchWebhookInfo();
console.log("Webhook URL:", info.url || "(none)");
console.log("Has custom cert:", !!info.has_custom_certificate);
console.log("Pending updates:", info.pending_update_count ?? 0);
if (info.last_error_message) {
  const ts = info.last_error_date
    ? new Date(info.last_error_date * 1000).toISOString()
    : "";
  console.log("Last error:", info.last_error_message, ts ? `@ ${ts}` : "");
} else {
  console.log("No recent webhook errors recorded.");
}

await checkWebhookLiveness(info);

function deriveHealthUrl(info: TelegramWebhookInfo): string | null {
  const explicitHealth = Deno.env.get("TELEGRAM_WEBHOOK_HEALTH_URL") ??
    Deno.env.get("TELEGRAM_WEBHOOK_LIVENESS_URL");
  if (explicitHealth) {
    return explicitHealth;
  }

  const declaredWebhook = Deno.env.get("TELEGRAM_WEBHOOK_URL");
  if (declaredWebhook) {
    const versionUrl = toVersionUrl(declaredWebhook);
    if (versionUrl) {
      return versionUrl;
    }
  }

  if (info.url) {
    const versionUrl = toVersionUrl(info.url);
    if (versionUrl) {
      return versionUrl;
    }
  }

  return null;
}

function toVersionUrl(input: string): string | null {
  try {
    const url = new URL(input);
    const basePath = url.pathname.replace(/\/+$/, "");
    url.pathname = `${basePath}/version`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch (error) {
    console.warn("[liveness] Unable to derive version URL from:", input, error);
    return null;
  }
}

async function checkWebhookLiveness(info: TelegramWebhookInfo): Promise<void> {
  const healthUrl = deriveHealthUrl(info);
  if (!healthUrl) {
    console.warn(
      "[liveness] No webhook URL available; skipping /version health probe.",
    );
    return;
  }

  const parsedUrl = safeParseUrl(healthUrl);
  if (!parsedUrl) {
    console.warn(
      "[liveness] Unable to parse webhook health URL; skipping /version probe.",
    );
    return;
  }

  const skipReason = shouldSkipLivenessProbe(parsedUrl, info);
  if (skipReason) {
    console.warn(`[liveness] Skipping /version probe: ${skipReason}`);
    return;
  }

  const timeoutMs = Number(
    Deno.env.get("TELEGRAM_WEBHOOK_HEALTH_TIMEOUT_MS") ??
      DEFAULT_LIVENESS_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  const tlsContext = await createHttpClientWithEnvCa();
  if (tlsContext) {
    console.log(`[liveness] Using ${tlsContext.description}`);
  }

  try {
    const response = await fetch(healthUrl, {
      signal: controller.signal,
      client: tlsContext?.client,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    const bodyText = await response.clone().text().catch(() => "");

    if (!response.ok) {
      console.error(
        `[liveness] ${healthUrl} responded with ${response.status} ${response.statusText} after ${durationMs}ms.`,
      );
      if (bodyText) {
        console.error("[liveness] Response body:", truncate(bodyText));
      }
      Deno.exit(1);
    }

    console.log(
      `[liveness] ${healthUrl} responded with ${response.status} in ${durationMs}ms.`,
    );

    if (bodyText) {
      logBodySummary(response.headers.get("content-type"), bodyText);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error(
        `[liveness] Timed out after ${timeoutMs}ms while waiting for ${healthUrl}.`,
      );
      Deno.exit(1);
    }
    if (
      error instanceof TypeError &&
      /UnknownIssuer/i.test(error.message ?? String(error))
    ) {
      console.error(
        "[liveness] TLS validation failed: UnknownIssuer. Provide TELEGRAM_CA_CERT, TELEGRAM_CA_BUNDLE, or SSL_CERT_FILE.",
      );
      Deno.exit(1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    tlsContext?.client.close();
  }
}

function shouldSkipLivenessProbe(
  url: URL,
  info: TelegramWebhookInfo,
): string | null {
  const placeholderHosts = new Set([
    "example.functions.supabase.co",
    "example.com",
  ]);
  if (placeholderHosts.has(url.hostname)) {
    return `placeholder host ${url.hostname}`;
  }

  if (info.url) {
    try {
      const infoUrl = new URL(info.url);
      if (placeholderHosts.has(infoUrl.hostname)) {
        return `placeholder host ${infoUrl.hostname}`;
      }
    } catch {
      // ignore parse errors here; fall through to no skip
    }
  }

  return null;
}

function safeParseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch (error) {
    console.warn("[liveness] Failed to parse URL:", input, error);
    return null;
  }
}

function logBodySummary(contentType: string | null, bodyText: string) {
  const preview = truncate(bodyText);
  if (contentType?.includes("application/json")) {
    try {
      const json = JSON.parse(bodyText) as Record<string, unknown>;
      const summaryParts: string[] = [];
      if (typeof json.name === "string") {
        summaryParts.push(`name=${json.name}`);
      }
      if (typeof json.ts === "string") {
        summaryParts.push(`ts=${json.ts}`);
      }
      if (summaryParts.length > 0) {
        console.log(`[liveness] Response summary: ${summaryParts.join(", ")}.`);
        return;
      }
    } catch {
      // fall through to preview logging
    }
  }

  console.log("[liveness] Response body:", preview);
}

function truncate(input: string, maxLength = 200): string {
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength)}…`;
}
