import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { bad, mna, nf, ok } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
export type TelegramPayload = Record<string, unknown>;

export function buildTelegramPayload(content: string | null): TelegramPayload {
  if (!content) return {};
  const trimmed = content.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as TelegramPayload;
      }
    } catch (_) {
      // fall through to plain text handling
    }
  }
  return { text: content };
}

export function shouldSyncMiniApp(target: unknown): boolean {
  if (!target || typeof target !== "object") {
    return true;
  }

  const record = target as Record<string, unknown>;

  const syncMiniApp = record["syncMiniApp"] ?? record["sync_miniapp"];
  if (typeof syncMiniApp === "boolean") {
    return syncMiniApp;
  }

  const rawChannels = record["channels"];
  const channels = Array.isArray(rawChannels)
    ? rawChannels
    : typeof rawChannels === "string"
    ? rawChannels.split(",")
    : [];
  const normalizedChannels = channels
    .map((entry) =>
      typeof entry === "string" ? entry.trim().toLowerCase() : null
    )
    .filter((entry): entry is string => Boolean(entry));
  if (normalizedChannels.length > 0) {
    if (
      normalizedChannels.includes("miniapp") ||
      normalizedChannels.includes("web")
    ) {
      return true;
    }
    if (normalizedChannels.every((channel) => channel === "telegram")) {
      return false;
    }
  }

  const typeRaw = record["type"];
  if (typeof typeRaw === "string") {
    const type = typeRaw.trim().toLowerCase();
    if (type === "admins" || type === "internal") {
      return false;
    }
    if (type === "telegram") {
      return false;
    }
  }

  return true;
}

export function extractAnnouncementText(content: string | null): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const candidates = [
        parsed?.text,
        parsed?.message,
        parsed?.caption,
        parsed?.body,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch (_) {
      // Ignore JSON parse issues and fall back to the raw value.
    }
  }

  return trimmed;
}

export async function dispatchAudience(
  ids: number[],
  payload: TelegramPayload,
  rps: number,
  send: (id: number, payload: TelegramPayload) => Promise<boolean>,
) {
  const delay = rps > 0 ? 1000 / rps : 0;
  let success = 0, failed = 0;
  for (const id of ids) {
    const ok = await send(id, payload);
    if (ok) success++;
    else failed++;
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }
  return { success, failed };
}

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "broadcast-dispatch");
  if (v) return v;
  if (req.method !== "POST") return mna();
  const { id } = await req.json().catch(() => ({}));
  if (!id) {
    return bad("bad_request");
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN } =
    requireEnv(
      [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "TELEGRAM_BOT_TOKEN",
      ] as const,
    );
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
  const br = await fetch(
    `${SUPABASE_URL}/rest/v1/broadcast_messages?id=eq.${id}&select=content,target_audience`,
    { headers },
  );
  const row = (await br.json())?.[0];
  if (!row) {
    return nf("not_found");
  }
  const targets: number[] = row.target_audience?.telegram_ids || [];
  const payload = buildTelegramPayload(row.content ?? "");
  const rps = Number(optionalEnv("BROADCAST_RPS") || "25");

  async function sendOnce(tid: number, basePayload: TelegramPayload) {
    let attempt = 0;
    let wait = 500;
    while (attempt < 3) {
      const requestPayload = { ...basePayload, chat_id: tid };
      const resp = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        },
      );
      if (resp.status === 429 || resp.status >= 500) {
        await new Promise((r) => setTimeout(r, wait));
        wait *= 2;
        attempt++;
        continue;
      }
      return resp.ok;
    }
    return false;
  }

  const { success, failed } = await dispatchAudience(
    targets,
    payload,
    rps,
    sendOnce,
  );

  await fetch(`${SUPABASE_URL}/rest/v1/broadcast_messages?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      successful_deliveries: success,
      failed_deliveries: failed,
      sent_at: new Date().toISOString(),
      delivery_status: "sent",
      total_recipients: targets.length,
    }),
  });

  if (shouldSyncMiniApp(row.target_audience)) {
    const announcementText = extractAnnouncementText(row.content ?? "");
    if (announcementText) {
      try {
        const supabase = createClient("service");
        const { error } = await supabase
          .from("bot_content")
          .upsert({
            content_key: "announcements",
            content_value: announcementText,
            content_type: "text",
            is_active: true,
            last_modified_by: "broadcast-dispatch", // system actor tag
            updated_at: new Date().toISOString(),
          }, { onConflict: "content_key" });
        if (error) {
          console.error("Failed to sync announcement to mini app", error);
        }
      } catch (error) {
        console.error("Unexpected error syncing announcement", error);
      }
    }
  }

  return ok();
}

if (import.meta.main) serve(handler);

export default handler;
