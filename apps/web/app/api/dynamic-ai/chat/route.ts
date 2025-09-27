import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import { callDynamicAi } from "@/services/dynamic-ai/client";
import {
  MAX_HISTORY,
  MAX_REQUEST_HISTORY,
  SYSTEM_PROMPT,
} from "@/services/dynamic-ai/constants";
import {
  chatHistorySchema,
  type ChatMessage,
  chatMessageSchema,
  type ChatRequestMessage,
  type ChatRequestPayload,
  chatRequestPayloadSchema,
  telegramAuthSchema,
} from "@/services/dynamic-ai/schema";
import { SUPABASE_URL } from "@/config/supabase-runtime";
import type { Database } from "@/integrations/supabase/types";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
} from "@/utils/http.ts";
import { getEnvVar } from "@/utils/env.ts";

const ROUTE_NAME = "/api/dynamic-ai/chat";
const SUPABASE_SERVICE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY", [
  "SUPABASE_SERVICE_ROLE",
]);

const SUPABASE_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.supabase",
);

type ServiceSupabaseClient = SupabaseClient<Database>;

let cachedClient: ServiceSupabaseClient | null = null;

function getSupabaseClient(): ServiceSupabaseClient {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    SUPABASE_OVERRIDE_SYMBOL
  ];
  if (override) {
    return override as ServiceSupabaseClient;
  }

  if (cachedClient) {
    return cachedClient;
  }

  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase service role key is not configured");
  }

  cachedClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

async function persistMessage(entry: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  telegram?: z.infer<typeof telegramAuthSchema>;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("user_interactions").insert({
    interaction_type: "ai_chat",
    telegram_user_id: String(entry.telegram?.id ?? "anonymous"),
    session_id: entry.sessionId,
    page_context: "chat_widget",
    interaction_data: {
      role: entry.role,
      content: entry.content,
    },
  });

  if (error) {
    throw error;
  }
}

async function loadHistory(sessionId: string): Promise<ChatMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_interactions")
    .select("interaction_data")
    .eq("interaction_type", "ai_chat")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY);

  if (error) {
    throw error;
  }

  const parsed = chatHistorySchema.safeParse(
    (data ?? []).map((row) => row?.interaction_data),
  );
  if (!parsed.success) {
    return [];
  }
  return parsed.data.map((item) => chatMessageSchema.parse(item));
}

function buildPrompt({
  history,
  message,
  telegram,
}: ChatRequestPayload): ChatRequestMessage[] {
  const trimmedHistory = history.slice(-MAX_REQUEST_HISTORY);

  const messages: ChatRequestMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (telegram) {
    const parsedTelegram = telegramAuthSchema.parse(telegram);
    const fullName = [parsedTelegram.first_name, parsedTelegram.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    const username = parsedTelegram.username
      ? `@${parsedTelegram.username}`
      : "not provided";
    const displayName = fullName || "Unknown";
    messages.push({
      role: "system",
      content:
        `User context: Telegram ID ${parsedTelegram.id}. Display name: ${displayName}. Username: ${username}. Use this context only when it improves the answer.`,
    });
  }

  for (const entry of trimmedHistory) {
    messages.push({ role: entry.role, content: entry.content });
  }

  messages.push({ role: "user", content: message });

  return messages;
}

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId")?.trim();

    if (!sessionId) {
      return bad("Missing sessionId", req);
    }

    try {
      const history = await loadHistory(sessionId);
      return jsonResponse({ ok: true, messages: history }, {}, req);
    } catch (error) {
      console.error("Failed to load chat history", error);
      return oops("Failed to load chat history", error, req);
    }
  });
}

export async function POST(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    let payload: ChatRequestPayload;
    try {
      const body = await req.json();
      payload = chatRequestPayloadSchema.parse(body);
    } catch (error) {
      console.warn("Invalid chat payload", error);
      return bad("Invalid request body", req);
    }

    try {
      await persistMessage({
        sessionId: payload.sessionId,
        role: "user",
        content: payload.message,
        telegram: payload.telegram,
      });
    } catch (error) {
      console.error("Failed to persist user message", error);
      return oops("Failed to persist user message", error, req);
    }

    try {
      const prompt = buildPrompt(payload);
      const response = await callDynamicAi({
        sessionId: payload.sessionId,
        messages: prompt,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
      };

      try {
        await persistMessage({
          sessionId: payload.sessionId,
          role: "assistant",
          content: assistantMessage.content,
          telegram: payload.telegram,
        });
      } catch (error) {
        console.error("Failed to persist assistant message", error);
      }

      const history = [...payload.history, {
        role: "user",
        content: payload.message,
      }, assistantMessage].slice(-MAX_HISTORY);

      return jsonResponse(
        {
          ok: true,
          assistantMessage,
          history,
          metadata: response.metadata,
        },
        {},
        req,
      );
    } catch (error) {
      console.error("Dynamic AI chat failed", error);
      return oops("Dynamic AI chat failed", error, req);
    }
  });
}

export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
