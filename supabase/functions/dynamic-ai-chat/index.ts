import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  buildAgsSystemPrompt,
  buildDynamicAgsPlaybook,
  type PlaybookPayload,
} from "../_shared/ags-playbook.ts";
import {
  type AiServiceLogValues,
  recordAiServiceLog,
} from "../_shared/ai-service-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_TIMEOUT_MS = 45_000;
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 8_192;
const MAX_SESSION_TITLE_LENGTH = 80;

type ServiceName = "ai" | "agi" | "ags";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  session_id?: string;
  message: string;
  history?: ChatMessage[];
  service?: ServiceName | string;
  language?: string;
  metadata?: Record<string, unknown>;
}

interface ServiceConfig {
  model: string;
  temperature?: number;
  buildPrompt: (
    params: {
      language?: string;
      message: string;
      history: ChatMessage[];
    },
  ) => Promise<string> | string;
  metadata?: Record<string, unknown>;
}

const SERVICE_CONFIGS: Record<ServiceName, ServiceConfig> = {
  ai: {
    model: "google/gemini-2.5-flash",
    temperature: 0.35,
    buildPrompt: ({ language }) => {
      const languageLine = language
        ? `Respond in ${language} while preserving key trading metrics.`
        : "Respond in clear, professional language.";

      return [
        "You are Dynamic AI, the quantitative research copilot for Dynamic Capital.",
        "Fuse market structure, macro regime analysis, treasury guardrails, and risk telemetry into every answer.",
        "Coordinate with Dynamic AGI for execution planning and Dynamic AGS for governance coverage.",
        languageLine,
        "Return actionable insights, scenario simulations, and data-backed positioning in bullet form when helpful.",
      ].join("\n");
    },
    metadata: { provider: "lovable", domain: "dynamic-ai" },
  },
  agi: {
    model: "google/gemini-2.5-flash",
    temperature: 0.4,
    buildPrompt: () =>
      [
        "You are Dynamic AGI, the autonomous market strategist for Dynamic Capital.",
        "Synthesize trading strategies, execution plans, and guardrails aligned with firm-wide mandates.",
        "Reason step-by-step, cite the telemetry you rely on, and highlight collaboration points for Dynamic AI and AGS.",
      ].join("\n"),
    metadata: { provider: "lovable", domain: "dynamic-agi" },
  },
  ags: {
    model: "openai/gpt-4o-mini",
    temperature: 0.2,
    buildPrompt: async ({ language }) => {
      const playbook: PlaybookPayload = buildDynamicAgsPlaybook({ language });
      return buildAgsSystemPrompt(playbook);
    },
    metadata: { provider: "lovable", domain: "dynamic-ags" },
  },
};

function sanitiseHistory(history: ChatMessage[] = []): ChatMessage[] {
  return history
    .filter((item): item is ChatMessage => {
      return Boolean(
        item && typeof item.content === "string" &&
          item.content.trim().length > 0,
      );
    })
    .map((item) => ({
      role: item.role ?? "user",
      content: item.content.trim(),
    }))
    .slice(-MAX_HISTORY);
}

function serialiseMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  try {
    const cloned = JSON.parse(JSON.stringify(value));
    if (!cloned || typeof cloned !== "object" || Array.isArray(cloned)) {
      return null;
    }

    return cloned as Record<string, unknown>;
  } catch (_error) {
    return null;
  }
}

registerHandler(async (req: Request): Promise<Response> => {
  const logger = createLogger({
    function: "dynamic-ai-chat",
    requestId: crypto.randomUUID(),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = performance.now();

  try {
    const supabase = createClient("service");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      logger.error("Authentication failed", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: ChatRequestBody;
    try {
      body = await req.json() as ChatRequestBody;
    } catch (error) {
      logger.error("Invalid JSON payload", error);
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawMessage = typeof body.message === "string"
      ? body.message.trim()
      : "";
    if (!rawMessage) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = rawMessage.slice(0, MAX_MESSAGE_LENGTH);
    if (rawMessage.length > message.length) {
      logger.warn("Message truncated to max length", {
        provided: rawMessage.length,
        max: MAX_MESSAGE_LENGTH,
      });
    }

    const rawService = typeof body.service === "string"
      ? body.service.toLowerCase()
      : undefined;
    const service: ServiceName = rawService && rawService in SERVICE_CONFIGS
      ? rawService
      : "agi";

    const history = sanitiseHistory(
      Array.isArray(body.history) ? body.history : [],
    );
    const language = typeof body.language === "string"
      ? body.language.trim()
      : undefined;
    const metadataPayload = serialiseMetadata(body.metadata);

    logger.info("Processing chat request", {
      service,
      history: history.length,
      language,
    });

    let sessionId = body.session_id;
    if (!sessionId) {
      const titlePrefix = service.toUpperCase();
      const sessionTitle = `${titlePrefix}: ${message}`
        .slice(0, MAX_SESSION_TITLE_LENGTH)
        .replace(/\s+/g, " ")
        .trim();
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: sessionTitle,
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        logger.error("Failed to create chat session", sessionError);
        return new Response(
          JSON.stringify({ error: "Unable to create chat session" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      sessionId = newSession.id;
    }

    const config = SERVICE_CONFIGS[service];

    const userMessageMetadata = {
      service,
      language,
      source: "dynamic-ai-chat",
      ...(metadataPayload ?? {}),
    } as Record<string, unknown>;

    const { error: userMessageError } = await supabase.from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "user",
        content: message,
        metadata: userMessageMetadata,
      });

    if (userMessageError) {
      logger.error("Failed to store user message", userMessageError);
      const persistenceLog: AiServiceLogValues = {
        user_id: user.id,
        session_id: sessionId,
        service_name: service,
        status: "error",
        latency_ms: Math.round(performance.now() - startedAt),
        model: config.model,
        request_payload: {
          service,
          language,
          history_count: history.length,
        },
        response_payload: null,
        error_message: "Unable to persist user message",
        tokens_in: null,
        tokens_out: null,
        metadata: { ...config.metadata, ...(metadataPayload ?? {}) },
      };

      await recordAiServiceLog(supabase, logger, persistenceLog);

      return new Response(
        JSON.stringify({ error: "Unable to persist user message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      logger.error("Missing LOVABLE_API_KEY for dynamic-ai-chat");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = await config.buildPrompt({
      language,
      message,
      history,
    });

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...history.filter((item) => item.role !== "system"),
      { role: "user", content: message },
    ];

    logger.info("Calling Lovable AI Gateway", { service, model: config.model });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOVABLE_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(LOVABLE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: config.temperature,
          messages: aiMessages,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      logger.error("Lovable gateway request failed", error);

      const errorLog: AiServiceLogValues = {
        user_id: user.id,
        session_id: sessionId,
        service_name: service,
        status: "error",
        latency_ms: Math.round(performance.now() - startedAt),
        model: config.model,
        request_payload: {
          service,
          language,
          history_count: history.length,
        },
        response_payload: null,
        error_message: error instanceof Error ? error.message : String(error),
        tokens_in: null,
        tokens_out: null,
        metadata: { ...config.metadata, ...(metadataPayload ?? {}) },
      };

      await recordAiServiceLog(supabase, logger, errorLog);

      const status =
        error instanceof DOMException && error.name === "AbortError"
          ? 504
          : 502;

      return new Response(
        JSON.stringify({
          error: status === 504
            ? "AI service timeout"
            : "AI service unavailable",
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("AI gateway error", response.status, errorText);

      const errorLog: AiServiceLogValues = {
        user_id: user.id,
        session_id: sessionId,
        service_name: service,
        status: "error",
        latency_ms: latencyMs,
        model: config.model,
        request_payload: {
          service,
          language,
          history_count: history.length,
        },
        response_payload: {
          status: response.status,
          error: errorText,
        },
        error_message: errorText,
        tokens_in: null,
        tokens_out: null,
        metadata: { ...config.metadata, ...(metadataPayload ?? {}) },
      };

      await recordAiServiceLog(supabase, logger, errorLog);

      return new Response(
        JSON.stringify({
          error: "AI service error",
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rawResponseText = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawResponseText) as Record<string, unknown>;
    } catch (error) {
      logger.error("Failed to parse AI response JSON", error, rawResponseText);

      const parseLog: AiServiceLogValues = {
        user_id: user.id,
        session_id: sessionId,
        service_name: service,
        status: "error",
        latency_ms: latencyMs,
        model: config.model,
        request_payload: {
          service,
          language,
          history_count: history.length,
        },
        response_payload: { raw: rawResponseText },
        error_message: "Invalid JSON response from AI gateway",
        tokens_in: null,
        tokens_out: null,
        metadata: { ...config.metadata, ...(metadataPayload ?? {}) },
      };

      await recordAiServiceLog(supabase, logger, parseLog);

      return new Response(
        JSON.stringify({ error: "Invalid response from AI service" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const choices = data.choices as
      | Array<{ message?: { content?: string } }>
      | undefined;
    const assistantContent = choices?.[0]?.message?.content ??
      (typeof data.response === "string" ? data.response : null);
    const assistantMessage = typeof assistantContent === "string" &&
        assistantContent.trim().length > 0
      ? assistantContent.trim()
      : "No response from AI";

    const { error: assistantError } = await supabase.from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantMessage,
        metadata: {
          service,
          model: (data.model as string | undefined) ?? config.model,
          usage: data.usage,
          source: "dynamic-ai-chat",
          ...config.metadata,
          ...(metadataPayload ?? {}),
        },
      });

    if (assistantError) {
      logger.error("Failed to persist assistant message", assistantError);
      const assistantLog: AiServiceLogValues = {
        user_id: user.id,
        session_id: sessionId,
        service_name: service,
        status: "error",
        latency_ms: latencyMs,
        model: (data.model as string | undefined) ?? config.model,
        request_payload: {
          service,
          language,
          history_count: history.length,
        },
        response_payload: { message: assistantMessage },
        error_message: "Unable to persist assistant message",
        tokens_in: usage.prompt_tokens ?? usage.input_tokens ?? null,
        tokens_out: usage.completion_tokens ?? usage.output_tokens ?? null,
        metadata: { ...config.metadata, ...(metadataPayload ?? {}) },
      };

      await recordAiServiceLog(supabase, logger, assistantLog);

      return new Response(
        JSON.stringify({ error: "Unable to persist assistant message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const usage = (data.usage as Record<string, unknown> | undefined) ?? {};

    const successLog: AiServiceLogValues = {
      user_id: user.id,
      session_id: sessionId,
      service_name: service,
      status: "success",
      latency_ms: latencyMs,
      model: (data.model as string | undefined) ?? config.model,
      request_payload: {
        service,
        language,
        history_count: history.length,
      },
      response_payload: {
        message: assistantMessage,
        raw: data,
      },
      tokens_in: usage.prompt_tokens ?? usage.input_tokens ?? null,
      tokens_out: usage.completion_tokens ?? usage.output_tokens ?? null,
      metadata: { ...config.metadata, ...(metadataPayload ?? {}) },
    };

    const logId = await recordAiServiceLog(supabase, logger, successLog);

    logger.info("Chat completed", {
      service,
      latency_ms: latencyMs,
      log_id: logId,
    });

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        service,
        message: assistantMessage,
        usage,
        metadata: {
          model: (data.model as string | undefined) ?? config.model,
          log_id: logId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    logger.error("Unhandled dynamic-ai-chat error", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
