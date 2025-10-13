// Admin command registry builders to keep core bot navigation focused

// Minimal Telegram message type for command context
interface TelegramMessage {
  chat: { id: number; type?: string };
  from?: {
    id?: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  text?: string;
  [key: string]: unknown;
}

export interface CommandContext {
  msg: TelegramMessage;
  chatId: number;
  args: string[];
  miniAppValid: boolean;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;

type AdminHandlers = typeof import("./admin-handlers/index.ts");
import { optionalEnv } from "../_shared/env.ts";

type VipSyncEndpoint = "one" | "batch";

function asRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function resolveVipSyncUrl(
  endpoint: VipSyncEndpoint,
):
  | { ok: true; url: string; source: string }
  | { ok: false; error: string } {
  const supabaseUrl = optionalEnv("SUPABASE_URL");
  const projectUrl = optionalEnv("PROJECT_URL");
  const projectRef = optionalEnv("SUPABASE_PROJECT_REF") ??
    optionalEnv("SUPABASE_PROJECT_ID");

  const candidates: Array<{
    value: string;
    label: string;
    forceFunctionsHost?: boolean;
  }> = [];

  if (supabaseUrl) {
    candidates.push({ value: supabaseUrl, label: "SUPABASE_URL" });
  }

  if (projectUrl) {
    candidates.push({ value: projectUrl, label: "PROJECT_URL" });
  }

  if (projectRef) {
    candidates.push({
      value: `https://${projectRef}.supabase.co`,
      label: "SUPABASE_PROJECT_REF",
    });
    candidates.push({
      value: `https://${projectRef}.functions.supabase.co`,
      label: "SUPABASE_PROJECT_REF",
      forceFunctionsHost: true,
    });
  }

  for (const candidate of candidates) {
    const parsed = coerceUrl(candidate.value);
    if (!parsed) continue;

    const isFunctionsHost = candidate.forceFunctionsHost === true ||
      parsed.hostname.includes(".functions.supabase.");

    const baseParts = parsed.pathname.split("/").filter((part) => part.length);
    let pathParts = [...baseParts];

    if (isFunctionsHost) {
      if (pathParts.slice(-2).join("/") === "functions/v1") {
        pathParts = pathParts.slice(0, -2);
      }
    } else if (pathParts.slice(-2).join("/") !== "functions/v1") {
      pathParts = [...pathParts, "functions", "v1"];
    }

    const finalParts = [...pathParts, "vip-sync", endpoint];
    const finalUrl = new URL(parsed.toString());
    finalUrl.pathname = `/${finalParts.join("/")}`;
    finalUrl.hash = "";

    return { ok: true, url: finalUrl.toString(), source: candidate.label };
  }

  return {
    ok: false,
    error:
      "Supabase URL is not configured. Define SUPABASE_URL with your project URL to enable VIP sync.",
  };
}

function extractErrorMessage(value: unknown): string | null {
  if (!asRecord(value)) return null;

  const { error } = value;
  if (!error) return null;

  if (typeof error === "string") {
    return error;
  }

  if (asRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function invokeVipSync(
  url: string,
  adminSecret: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": adminSecret,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed: unknown = null;

  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { ok: response.ok, raw: text };
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(parsed) ??
      (text.length > 0 ? text : response.statusText) ??
      `HTTP ${response.status}`;
    throw new Error(typeof message === "string" ? message : String(message));
  }

  if (asRecord(parsed)) {
    return parsed;
  }

  if (parsed === null) {
    return { ok: true };
  }

  return { ok: true, data: parsed };
}

export function buildAdminCommandHandlers(
  load: () => Promise<AdminHandlers>,
  notify: (chatId: number, text: string) => Promise<unknown>,
): Record<string, CommandHandler> {
  return {
    "/ping": async ({ chatId }) => {
      const mod = await load();
      await notify(chatId, JSON.stringify(mod.handlePing()));
    },
    "/version": async ({ chatId }) => {
      const mod = await load();
      await notify(chatId, JSON.stringify(mod.handleVersion()));
    },
    "/env": async ({ chatId }) => {
      const mod = await load();
      const envStatus = await mod.handleEnvStatus();
      await notify(chatId, JSON.stringify(envStatus));
    },
    "/reviewlist": async ({ chatId }) => {
      const mod = await load();
      const list = await mod.handleReviewList();
      await notify(chatId, JSON.stringify(list));
    },
    "/replay": async ({ chatId, args }) => {
      const id = args[0];
      if (id) {
        const mod = await load();
        await notify(chatId, JSON.stringify(mod.handleReplay(id)));
      }
    },
    "/webhookinfo": async ({ chatId }) => {
      const mod = await load();
      const info = await mod.handleWebhookInfo();
      await notify(chatId, JSON.stringify(info));
    },
    "/admin": async ({ msg, chatId }) => {
      const mod = await load();
      const userId = String(msg.from?.id ?? chatId);
      await mod.handleAdminDashboard(chatId, userId);
    },
    "/vipsync": async ({ chatId, args }) => {
      const rawArg = args[0];
      const normalizedArg = typeof rawArg === "string"
        ? rawArg.trim()
        : typeof rawArg === "number"
        ? String(rawArg)
        : rawArg != null
        ? String(rawArg).trim()
        : "";
      const endpoint: VipSyncEndpoint = normalizedArg.length > 0
        ? "one"
        : "batch";
      const resolution = resolveVipSyncUrl(endpoint);

      if (!resolution.ok) {
        await notify(
          chatId,
          JSON.stringify({
            ok: false,
            error: resolution.error,
          }),
        );
        return;
      }

      const adminSecret = optionalEnv("ADMIN_API_SECRET");
      if (!adminSecret) {
        await notify(
          chatId,
          JSON.stringify({
            ok: false,
            error:
              "ADMIN_API_SECRET is not configured. Define it to authorize VIP sync requests.",
          }),
        );
        return;
      }

      try {
        const payload = await invokeVipSync(
          resolution.url,
          adminSecret,
          endpoint === "one" ? { telegram_user_id: normalizedArg } : {},
        );
        await notify(chatId, JSON.stringify(payload));
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : String(error ?? "unknown error");
        await notify(
          chatId,
          JSON.stringify({
            ok: false,
            error: `Failed to trigger VIP sync: ${message}`,
            meta: {
              endpoint,
              resolvedUrl: resolution.url,
              urlSource: resolution.source,
            },
          }),
        );
      }
    },
    "/tables": async ({ chatId }) => {
      const mod = await load();
      await mod.handleTableManagement(chatId, "system");
    },
    "/content": async ({ chatId }) => {
      const mod = await load();
      await mod.handleContentManagement(chatId, "system");
    },
    "/flags": async ({ chatId }) => {
      const mod = await load();
      await mod.handleFeatureFlags(chatId, "system");
    },
    "/logs": async ({ chatId }) => {
      const mod = await load();
      await mod.handleAdminLogsManagement(chatId, "system");
    },
  };
}
