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
import type { Database } from "@/integrations/supabase/types";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
  unauth,
} from "@/utils/http.ts";
import {
  isAdminVerificationFailure,
  verifyAdminRequest,
} from "@/utils/admin-auth.ts";
import {
  getServiceRoleSupabaseClient,
  type ServiceRoleSupabaseClient,
} from "@/core/supabase/service-role-client";
import { enforceDynamicAiRateLimit } from "@/services/rate-limit/dynamic-ai";
import {
  logAiChatTelemetry,
  type RateLimitDecisionSummary,
} from "@/core/telemetry/ai-chat";

const ROUTE_NAME = "/api/dynamic-ai/chat";

const SUPPORTED_LANGUAGES = new Set(["en", "dv"]);
const LANGUAGE_PROMPTS: Record<string, string> = {
  dv:
    'Respond primarily in Dhivehi (Thaana script). Include a concise English checkpoint prefixed with "EN:" when compliance or numerical guidance is provided.',
};

function normaliseLanguage(
  language: string | null | undefined,
): string | undefined {
  if (!language) return undefined;
  const trimmed = language.trim().toLowerCase();
  if (!trimmed) return undefined;
  return SUPPORTED_LANGUAGES.has(trimmed) ? trimmed : undefined;
}

function resolveClientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    const candidate = first?.trim();
    if (candidate) {
      return candidate;
    }
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || undefined;
}

const SESSION_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.session",
);

type SessionLike =
  | { user?: { id?: string | null } | null }
  | null
  | undefined;

type SessionResolver = () => SessionLike | Promise<SessionLike>;

type GetServerSession = typeof import("next-auth").getServerSession;
type AuthOptionsModule = typeof import("@/auth/options");

let getServerSessionPromise: Promise<GetServerSession> | null = null;
let authOptionsPromise:
  | Promise<AuthOptionsModule["authOptions"]>
  | null = null;

async function loadGetServerSession(): Promise<GetServerSession> {
  if (!getServerSessionPromise) {
    getServerSessionPromise = import("next-auth").then((module) => {
      if (typeof module.getServerSession !== "function") {
        throw new Error("next-auth getServerSession export is unavailable");
      }
      return module.getServerSession;
    });
  }

  return getServerSessionPromise;
}

async function loadAuthOptions(): Promise<AuthOptionsModule["authOptions"]> {
  if (!authOptionsPromise) {
    authOptionsPromise = import("@/auth/options").then((module) => {
      if (!module.authOptions) {
        throw new Error("Auth options module did not export authOptions");
      }
      return module.authOptions;
    });
  }

  return authOptionsPromise;
}

type UserInteractionInsert =
  Database["public"]["Tables"]["user_interactions"]["Insert"];
type UserInteractionRow = Pick<
  Database["public"]["Tables"]["user_interactions"]["Row"],
  "interaction_data"
>;

type SupabaseClient = ServiceRoleSupabaseClient<
  UserInteractionRow,
  UserInteractionInsert
>;

async function getSupabaseClient(): Promise<SupabaseClient> {
  return await getServiceRoleSupabaseClient<
    UserInteractionRow,
    UserInteractionInsert
  >();
}

async function resolveSession(): Promise<SessionLike> {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    SESSION_OVERRIDE_SYMBOL
  ];
  if (typeof override === "function") {
    return await (override as SessionResolver)();
  }
  const getServerSession = await loadGetServerSession();
  const authOptions = await loadAuthOptions();
  return await getServerSession(authOptions);
}

interface AuthSuccess {
  ok: true;
  userId?: string;
}

interface AuthFailure {
  ok: false;
  status: number;
  message: string;
}

type AuthResult = AuthSuccess | AuthFailure;

async function requireAuthentication(req: Request): Promise<AuthResult> {
  const session = await resolveSession();
  const userId = session?.user && typeof session.user === "object"
    ? (session.user as { id?: unknown })?.id
    : undefined;
  if (session?.user) {
    return {
      ok: true,
      userId: typeof userId === "string" ? userId : undefined,
    } satisfies AuthSuccess;
  }

  const adminCheck = await verifyAdminRequest(req);
  if (!isAdminVerificationFailure(adminCheck)) {
    return { ok: true, userId: adminCheck.userId } satisfies AuthSuccess;
  }

  return {
    ok: false,
    status: adminCheck.status,
    message: adminCheck.message,
  } satisfies AuthFailure;
}

function handleAuthFailure(result: AuthFailure, req: Request) {
  if (result.status >= 500) {
    return oops(result.message, undefined, req);
  }
  return unauth(
    result.status === 401 ? "Authentication required." : result.message,
    req,
  );
}

async function persistMessage(entry: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  telegram?: z.infer<typeof telegramAuthSchema>;
  language?: string;
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
  if (entry.language) {
    (payload.interaction_data as Record<string, unknown>).language =
      entry.language;
  }
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
  language,
}: ChatRequestPayload): ChatRequestMessage[] {
  const trimmedHistory = history.slice(-MAX_REQUEST_HISTORY);

  const messages: ChatRequestMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  const normalisedLanguage = normaliseLanguage(language);
  const languagePrompt = normalisedLanguage
    ? LANGUAGE_PROMPTS[normalisedLanguage]
    : undefined;
  if (languagePrompt) {
    messages.push({
      role: "system",
      content: languagePrompt,
      language: normalisedLanguage,
    });
  }

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
    messages.push({
      role: entry.role,
      content: entry.content,
      language: normaliseLanguage(entry.language) ?? normalisedLanguage,
    });
  }

  messages.push({
    role: "user",
    content: message,
    language: normalisedLanguage,
  });

  return messages;
}

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const authResult = await requireAuthentication(req);
    if (authResult.ok === false) {
      return handleAuthFailure(authResult, req);
    }

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

interface ChatTelemetryContext {
  userId?: string;
  telegramUserId?: string;
  ipAddress?: string;
  rateLimits: RateLimitDecisionSummary[];
}

function streamChatResponse(
  payload: ChatRequestPayload,
  req: Request,
  telemetryContext: ChatTelemetryContext,
) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();

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
        const normalisedLanguage = normaliseLanguage(payload.language);
        const response = await callDynamicAi({
          sessionId: payload.sessionId,
          messages: prompt,
          language: normalisedLanguage,
        });

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.answer,
          language: normalisedLanguage,
        };

        try {
          await persistMessage({
            sessionId: payload.sessionId,
            role: "assistant",
            content: assistantMessage.content,
            telegram: payload.telegram,
            language: normalisedLanguage,
          });
        } catch (error) {
          console.error("Failed to persist assistant message", error);
        }

        const userEntry: ChatMessage = {
          role: "user",
          content: payload.message,
          language: normalisedLanguage,
        };
        const history: ChatMessage[] = [
          ...payload.history.map((entry) => ({
            ...entry,
            language: normaliseLanguage(entry.language) ?? normalisedLanguage,
          })),
          userEntry,
          assistantMessage,
        ].slice(-MAX_HISTORY);

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

        await logAiChatTelemetry({
          event: "completion",
          success: true,
          sessionId: payload.sessionId,
          userId: telemetryContext.userId,
          telegramUserId: telemetryContext.telegramUserId,
          ipAddress: telemetryContext.ipAddress,
          rateLimits: telemetryContext.rateLimits,
          latencyMs: Date.now() - startedAt,
          metadata: response.metadata ?? undefined,
          streamed: true,
        });
      } catch (error) {
        console.error("Dynamic AI chat stream failed", error);
        const message = error instanceof Error
          ? error.message
          : "Dynamic AI chat failed";
        await logAiChatTelemetry({
          event: "completion",
          success: false,
          sessionId: payload.sessionId,
          userId: telemetryContext.userId,
          telegramUserId: telemetryContext.telegramUserId,
          ipAddress: telemetryContext.ipAddress,
          rateLimits: telemetryContext.rateLimits,
          latencyMs: Date.now() - startedAt,
          errorMessage: message,
          streamed: true,
        });
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
    const authResult = await requireAuthentication(req);
    if (authResult.ok === false) {
      return handleAuthFailure(authResult, req);
    }

    let payload: ChatRequestPayload;
    try {
      const body = await req.json();
      payload = chatRequestPayloadSchema.parse(body);
    } catch (error) {
      console.warn("Invalid chat payload", error);
      return bad("Invalid request body", req);
    }

    const sessionId = payload.sessionId.trim();
    const message = payload.message.trim();
    if (!sessionId || !message) {
      return bad("sessionId and message are required", req);
    }

    payload = { ...payload, sessionId, message };

    const normalisedLanguage = normaliseLanguage(payload.language);
    if (normalisedLanguage && payload.language !== normalisedLanguage) {
      payload = { ...payload, language: normalisedLanguage };
    }

    const ipAddress = resolveClientIp(req);
    const telegramUserId = payload.telegram?.id
      ? String(payload.telegram.id)
      : undefined;

    const rateLimitResult = await enforceDynamicAiRateLimit({
      userId: authResult.userId,
      sessionId: payload.sessionId,
    });

    const telemetryBase = {
      sessionId: payload.sessionId,
      userId: authResult.userId,
      telegramUserId,
      ipAddress,
      rateLimits: rateLimitResult.decisions,
    } as const;

    await logAiChatTelemetry({
      event: "rate_limit",
      status: rateLimitResult.allowed ? "allowed" : "blocked",
      ...telemetryBase,
      context: "ai_chat_rate_limit",
    });

    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.decisions
        .filter((decision) => decision.blocked)
        .reduce((max, decision) => Math.max(max, decision.resetSeconds), 0);

      const init: ResponseInit = { status: 429 };
      if (retryAfter > 0) {
        init.headers = { "retry-after": String(retryAfter) };
      }

      return jsonResponse(
        {
          ok: false,
          error: "Rate limit exceeded. Please try again later.",
          limits: rateLimitResult.decisions,
        },
        init,
        req,
      );
    }

    try {
      await persistMessage({
        sessionId: payload.sessionId,
        role: "user",
        content: payload.message,
        telegram: payload.telegram,
        language: normalisedLanguage,
      });
    } catch (error) {
      console.error("Failed to persist user message", error);
      return oops("Failed to persist user message", error, req);
    }

    const url = new URL(req.url);
    const stream = url.searchParams.get("stream") === "1";

    if (stream) {
      return streamChatResponse(payload, req, {
        userId: authResult.userId,
        telegramUserId,
        ipAddress,
        rateLimits: rateLimitResult.decisions,
      });
    }

    const startedAt = Date.now();

    try {
      const prompt = buildPrompt(payload);
      const response = await callDynamicAi({
        sessionId: payload.sessionId,
        messages: prompt,
        language: normalisedLanguage,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
        language: normalisedLanguage,
      };

      try {
        await persistMessage({
          sessionId: payload.sessionId,
          role: "assistant",
          content: assistantMessage.content,
          telegram: payload.telegram,
          language: normalisedLanguage,
        });
      } catch (error) {
        console.error("Failed to persist assistant message", error);
      }

      const userEntry: ChatMessage = {
        role: "user",
        content: payload.message,
        language: normalisedLanguage,
      };
      const history: ChatMessage[] = [
        ...payload.history.map((entry) => ({
          ...entry,
          language: normaliseLanguage(entry.language) ?? normalisedLanguage,
        })),
        userEntry,
        assistantMessage,
      ]
        .slice(-MAX_HISTORY);

      await logAiChatTelemetry({
        event: "completion",
        success: true,
        sessionId: payload.sessionId,
        userId: authResult.userId,
        telegramUserId,
        ipAddress,
        rateLimits: rateLimitResult.decisions,
        latencyMs: Date.now() - startedAt,
        metadata: response.metadata ?? undefined,
      });

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
      await logAiChatTelemetry({
        event: "completion",
        success: false,
        sessionId: payload.sessionId,
        userId: authResult.userId,
        telegramUserId,
        ipAddress,
        rateLimits: rateLimitResult.decisions,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      return oops("Dynamic AI chat failed", error, req);
    }
  });
}

export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
