import { getServiceRoleSupabaseClient } from "@/core/supabase/service-role-client";
import type { Database, Json } from "@/integrations/supabase/types";

export type RateLimitDecisionSummary = {
  scope: "user" | "session";
  limit: number;
  remaining: number;
  resetSeconds: number;
  blocked: boolean;
};

interface BaseAiChatTelemetryEvent {
  sessionId: string;
  userId?: string;
  telegramUserId?: string;
  ipAddress?: string;
  rateLimits?: RateLimitDecisionSummary[];
  context?: string;
}

export interface AiChatRateLimitEvent extends BaseAiChatTelemetryEvent {
  event: "rate_limit";
  status: "allowed" | "blocked";
}

export interface AiChatCompletionEvent extends BaseAiChatTelemetryEvent {
  event: "completion";
  success: boolean;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  streamed?: boolean;
}

export type AiChatTelemetryEvent =
  | AiChatRateLimitEvent
  | AiChatCompletionEvent;

export type AiChatTelemetryHandler = (
  event: AiChatTelemetryEvent,
) => void | Promise<void>;

export const AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.ai-chat.telemetry",
);

function sanitiseEvent(event: AiChatTelemetryEvent): Json {
  const serialisable = JSON.parse(JSON.stringify(event)) as Json;
  return serialisable;
}

async function persistEvent(event: AiChatTelemetryEvent) {
  try {
    const supabase = await getServiceRoleSupabaseClient<
      Database["public"]["Tables"]["user_interactions"]["Row"],
      Database["public"]["Tables"]["user_interactions"]["Insert"]
    >();

    const record: Database["public"]["Tables"]["user_interactions"]["Insert"] =
      {
        interaction_type: "ai_chat_telemetry",
        telegram_user_id: event.telegramUserId ?? "system",
        session_id: event.sessionId,
        page_context: event.context ?? "ai_chat",
        interaction_data: sanitiseEvent(event),
      };

    const { error } = await supabase.from("user_interactions").insert(record);
    if (error) {
      console.warn("[ai-chat] Failed to persist telemetry", error);
    }
  } catch (error) {
    console.warn("[ai-chat] Telemetry persistence error", error);
  }
}

export async function logAiChatTelemetry(event: AiChatTelemetryEvent) {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
  ];
  if (typeof override === "function") {
    await (override as AiChatTelemetryHandler)(event);
    return;
  }

  await persistEvent(event);
  console.info("[ai-chat] telemetry", event);
}
