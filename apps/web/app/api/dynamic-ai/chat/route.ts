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

type UserInteractionInsert =
  Database["public"]["Tables"]["user_interactions"]["Insert"];
type UserInteractionRow = Pick<
  Database["public"]["Tables"]["user_interactions"]["Row"],
  "interaction_data"
>;

interface SupabaseSelectBuilder<Row> {
  eq(column: string, value: unknown): SupabaseSelectBuilder<Row>;
  order(
    column: string,
    options: { ascending: boolean },
  ): SupabaseSelectBuilder<Row>;
  limit(count: number): Promise<{
    data: Row[] | null;
    error: unknown | null;
  }>;
}

interface SupabaseUserInteractionsTable {
  insert(values: UserInteractionInsert): Promise<{ error: unknown | null }>;
  select(columns: string): SupabaseSelectBuilder<UserInteractionRow>;
}

interface ServiceSupabaseClient {
  from(table: string): SupabaseUserInteractionsTable;
}

let cachedClient: ServiceSupabaseClient | null = null;
let supabaseModulePromise:
  | Promise<{ createClient: (...args: unknown[]) => unknown }>
  | null = null;

async function loadSupabaseModule(): Promise<
  { createClient: (...args: unknown[]) => unknown }
> {
  if (!supabaseModulePromise) {
    supabaseModulePromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      return { createClient } as {
        createClient: (...args: unknown[]) => unknown;
      };
    })();
  }

  return supabaseModulePromise;
}

async function getSupabaseClient(): Promise<ServiceSupabaseClient> {
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

  const { createClient } = await loadSupabaseModule();
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  }) as unknown as ServiceSupabaseClient;
  cachedClient = client;
  return client;
}

async function persistMessage(entry: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  telegram?: z.infer<typeof telegramAuthSchema>;
}) {
  const supabase = await getSupabaseClient();
  const payload: UserInteractionInsert = {
    interaction_type: "ai_chat",
    telegram_user_id: String(entry.telegram?.id ?? "anonymous"),
    session_id: entry.sessionId,
    page_context: "chat_widget",
    interaction_data: {
      role: entry.role,
      content: entry.content,
    },
  };
  const { error } = await supabase.from("user_interactions").insert(payload);

  if (error) {
    throw error;
  }
}

async function loadHistory(sessionId: string): Promise<ChatMessage[]> {
  const supabase = await getSupabaseClient();
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

type StreamEvent =
  | { type: "ack" }
  | { type: "token"; token: string; content: string }
  | {
    type: "done";
    message: ChatMessage;
    history: ChatMessage[];
    metadata?: Record<string, unknown>;
  }
  | {
    type: "error";
    message: string;
    status?: number;
    requestId?: string | null;
    hint?: unknown;
  };

function chunkAnswer(answer: string): string[] {
  const tokens: string[] = [];
  const splitter = /(\s+)/g;
  let lastIndex = 0;
  for (const match of answer.matchAll(splitter)) {
    if (match.index === undefined) {
      continue;
    }
    if (match.index > lastIndex) {
      tokens.push(answer.slice(lastIndex, match.index));
    }
    if (match[0]) {
      tokens.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < answer.length) {
    tokens.push(answer.slice(lastIndex));
  }
  return tokens;
}

function streamChatResponse(payload: ChatRequestPayload, req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      send({ type: "ack" });

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

        const userEntry: ChatMessage = {
          role: "user",
          content: payload.message,
        };
        const history: ChatMessage[] = [
          ...payload.history,
          userEntry,
          assistantMessage,
        ]
          .slice(-MAX_HISTORY);

        let aggregated = "";
        for (const token of chunkAnswer(assistantMessage.content)) {
          aggregated += token;
          send({ type: "token", token, content: aggregated });
          await Promise.resolve();
        }

        send({
          type: "done",
          message: assistantMessage,
          history,
          metadata: response.metadata,
        });
      } catch (error) {
        console.error("Dynamic AI chat stream failed", error);
        const message = error instanceof Error
          ? error.message
          : "Dynamic AI chat failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      ...corsHeaders(req),
    },
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

    const url = new URL(req.url);
    const stream = url.searchParams.get("stream") === "1";

    if (stream) {
      return streamChatResponse(payload, req);
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

      const userEntry: ChatMessage = {
        role: "user",
        content: payload.message,
      };
      const history: ChatMessage[] = [
        ...payload.history,
        userEntry,
        assistantMessage,
      ]
        .slice(-MAX_HISTORY);

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
