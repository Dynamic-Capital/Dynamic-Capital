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
import { createClient } from "../_shared/client.ts";

type VipSyncEndpoint = "one" | "batch";

const SUPABASE_URL = optionalEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnv("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");

let vipSyncClient: ReturnType<typeof createClient> | null = null;

function getSupabaseConfigError(): string | null {
  if (!SUPABASE_URL) {
    return "Supabase URL is not configured. Define SUPABASE_URL to enable VIP sync.";
  }

  if (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY) {
    return "Supabase API keys are not configured. Define SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY to enable VIP sync.";
  }

  return null;
}

function getVipSyncClient() {
  if (vipSyncClient) {
    return vipSyncClient;
  }

  const role = SUPABASE_SERVICE_ROLE_KEY ? "service" : "anon";
  vipSyncClient = createClient(role);
  return vipSyncClient;
}

async function invokeVipSync(
  endpoint: VipSyncEndpoint,
  body: Record<string, unknown>,
) {
  const client = getVipSyncClient();
  const adminSecret = optionalEnv("ADMIN_API_SECRET");

  const headers = adminSecret ? { "X-Admin-Secret": adminSecret } : undefined;

  const { data, error } = await client.functions.invoke<
    Record<string, unknown>
  >(`vip-sync/${endpoint}`, {
    body,
    headers,
  });

  if (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "VIP sync failed")
      : String(error ?? "VIP sync failed");
    throw new Error(message);
  }

  return data ?? { ok: true };
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
      const configError = getSupabaseConfigError();

      if (configError) {
        await notify(
          chatId,
          JSON.stringify({
            ok: false,
            error: configError,
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

      if (endpoint === "one" && normalizedArg.length === 0) {
        await notify(
          chatId,
          JSON.stringify({
            ok: false,
            error: "Provide a Telegram user ID to sync a single VIP.",
          }),
        );
        return;
      }

      try {
        const payload = await invokeVipSync(
          endpoint,
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
