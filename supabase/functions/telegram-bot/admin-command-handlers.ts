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
import { functionUrl } from "../_shared/edge.ts";

function resolveVipSyncUrl(endpoint: "one" | "batch"): string | null {
  const direct = functionUrl(`vip-sync/${endpoint}`);
  if (direct) return direct;

  const supabaseUrl = optionalEnv("SUPABASE_URL");
  if (!supabaseUrl) return null;

  const normalized = supabaseUrl.replace(/\/?$/, "");
  return `${normalized}/functions/v1/vip-sync/${endpoint}`;
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
      const endpoint = args[0] ? "one" : "batch";
      const targetUrl = resolveVipSyncUrl(endpoint);

      if (!targetUrl) {
        await notify(
          chatId,
          JSON.stringify({
            ok: false,
            error:
              "Supabase functions host is not configured. Define SUPABASE_PROJECT_ID or SUPABASE_URL to enable VIP sync.",
          }),
        );
        return;
      }

      const adminSecret = optionalEnv("ADMIN_API_SECRET");
      const body = args[0] ? { telegram_user_id: args[0] } : {};

      try {
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminSecret ? { "X-Admin-Secret": adminSecret } : {}),
          },
          body: JSON.stringify(body),
        });

        const payload = await response.json();
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
