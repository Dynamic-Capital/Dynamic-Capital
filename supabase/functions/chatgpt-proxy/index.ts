import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { optionalEnv } from "../_shared/env.ts";
import { corsHeaders } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

type ChatCompletionRole = "system" | "user" | "assistant";

interface ChatCompletionMessage {
  role: ChatCompletionRole;
  content: string;
}

const ALLOWED_ROLES: ChatCompletionRole[] = ["system", "user", "assistant"];

const MAX_HISTORY_MESSAGES = 24;

function parseMessages(payload: unknown): ChatCompletionMessage[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const sanitized: ChatCompletionMessage[] = [];

  for (const entry of payload) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (
      typeof role === "string" &&
      ALLOWED_ROLES.includes(role as ChatCompletionRole) &&
      typeof content === "string"
    ) {
      const trimmedContent = content.trim();
      if (trimmedContent.length > 0) {
        sanitized.push({
          role: role as ChatCompletionRole,
          content: trimmedContent,
        });
      }
    }
  }

  if (sanitized.length <= MAX_HISTORY_MESSAGES) {
    return sanitized;
  }

  return sanitized.slice(-MAX_HISTORY_MESSAGES);
}

const OPENAI_API_KEY = optionalEnv("OPENAI_API_KEY");
const OPENAI_BASE_URL = optionalEnv("OPENAI_BASE_URL") ??
  "https://api.openai.com/v1";

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const chatCompletionsUrl = new URL(
  "chat/completions",
  ensureTrailingSlash(OPENAI_BASE_URL),
).toString();

const buildOpenAIHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (OPENAI_API_KEY) {
    headers["Authorization"] = `Bearer ${OPENAI_API_KEY}`;
  }
  return headers;
};

export const handler = registerHandler(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    if (origin && !headers["access-control-allow-origin"]) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { headers });
  }
  if (origin && !headers["access-control-allow-origin"]) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers,
    });
  }

  try {
    const {
      prompt,
      messages: rawMessages,
      test,
      temperature,
    } = await req.json().catch(() => ({}));

    if (test) {
      return new Response(
        JSON.stringify({ success: true, message: "chatgpt-proxy OK" }),
        { headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const historyMessages = parseMessages(rawMessages);
    let hasUserMessage = historyMessages.some((msg) => msg.role === "user");

    if (typeof prompt === "string") {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length > 0 && !hasUserMessage) {
        historyMessages.push({ role: "user", content: trimmedPrompt });
        hasUserMessage = true;
      }
    }

    if (!hasUserMessage) {
      return new Response(
        JSON.stringify({ error: "At least one user message is required" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const clampedTemperature = Math.max(
      0,
      Math.min(1, typeof temperature === "number" ? temperature : 0.7),
    );

    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: buildOpenAIHeaders(),
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: historyMessages,
        temperature: clampedTemperature,
        max_tokens: 700,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI error");
    }

    const answer = data.choices[0].message.content as string;

    return new Response(JSON.stringify({ answer }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("chatgpt-proxy error:", err);
    let details = "Unknown error";
    if (err instanceof Error) details = err.message;
    return new Response(
      JSON.stringify({ error: "Failed to get AI response", details }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

export default handler;
