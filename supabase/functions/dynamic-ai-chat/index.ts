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
const MAX_HISTORY = 12;

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

    const body = await req.json() as ChatRequestBody;
    const message = body.message?.trim();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawService = body.service?.toLowerCase?.() as ServiceName | undefined;
    const service: ServiceName = rawService && rawService in SERVICE_CONFIGS
      ? rawService
      : "agi";

    const history = sanitiseHistory(body.history);
    const language = body.language?.trim();

    logger.info("Processing chat request", {
      service,
      history: history.length,
      language,
    });

    let sessionId = body.session_id;
    if (!sessionId) {
      const titlePrefix = service.toUpperCase();
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: `${titlePrefix}: ${message.slice(0, 48)}`,
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

    const userMessageMetadata = {
      service,
      language,
      source: "dynamic-ai-chat",
      ...(body.metadata ?? {}),
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
    }

    const config = SERVICE_CONFIGS[service];
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

    const response = await fetch(LOVABLE_ENDPOINT, {
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
    });

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
        metadata: config.metadata,
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

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content ||
      data.response || "No response from AI";

    const { error: assistantError } = await supabase.from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: assistantMessage,
        metadata: {
          service,
          model: data.model ?? config.model,
          usage: data.usage,
          source: "dynamic-ai-chat",
          ...config.metadata,
        },
      });

    if (assistantError) {
      logger.error("Failed to persist assistant message", assistantError);
    }

    const usage = data.usage ?? {};

    const successLog: AiServiceLogValues = {
      user_id: user.id,
      session_id: sessionId,
      service_name: service,
      status: "success",
      latency_ms: latencyMs,
      model: data.model ?? config.model,
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
      metadata: config.metadata,
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
          model: data.model ?? config.model,
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
