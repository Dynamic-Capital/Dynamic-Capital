import { createClient } from "../../_shared/client.ts";

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient("service");
  }
  return supabaseAdmin;
}

const FUNCTION_TIMEOUT_MS = 12_000;
const OLLAMA_TIMEOUT_MS = 12_000;

interface AskResponse {
  answer?: string | null;
}

interface ProxyResponse {
  answer?: string | null;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function sanitizeAnswer(answer: unknown): string | null {
  if (typeof answer !== "string") return null;
  const trimmed = answer.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function invokeAiFaq(question: string): Promise<string | null> {
  const startedAt = performance.now();
  const result = await withTimeout(
    getSupabaseAdmin().functions.invoke<AskResponse>("ai-faq-assistant", {
      body: { question },
    }),
    FUNCTION_TIMEOUT_MS,
    "ai-faq-assistant",
  );

  if (result.error) {
    throw result.error;
  }

  const answer = sanitizeAnswer(result.data?.answer ?? null);
  if (answer) {
    const duration = Math.round(performance.now() - startedAt);
    console.info(`[askChatGPT] ai-faq-assistant answered in ${duration}ms`);
  }
  return answer;
}

async function invokeChatGptProxy(question: string): Promise<string | null> {
  const startedAt = performance.now();
  const result = await withTimeout(
    getSupabaseAdmin().functions.invoke<ProxyResponse>("chatgpt-proxy", {
      body: { prompt: question },
    }),
    FUNCTION_TIMEOUT_MS,
    "chatgpt-proxy",
  );

  if (result.error) {
    throw result.error;
  }

  const answer = sanitizeAnswer(result.data?.answer ?? null);
  if (answer) {
    const duration = Math.round(performance.now() - startedAt);
    console.info(`[askChatGPT] chatgpt-proxy answered in ${duration}ms`);
  }
  return answer;
}

export async function askChatGPT(prompt: string): Promise<string | null> {
  const question = prompt.trim();
  if (!question) return null;

  try {
    const answer = await invokeAiFaq(question);
    if (answer) {
      return answer;
    }
    console.warn(
      "[askChatGPT] ai-faq-assistant returned no answer; falling back",
    );
  } catch (error) {
    console.error("[askChatGPT] ai-faq-assistant error", error);
  }

  try {
    return await invokeChatGptProxy(question);
  } catch (error) {
    console.error("[askChatGPT] chatgpt-proxy error", error);
  }

  // Optional local/self-hosted fallback via Ollama HTTP API
  try {
    const enabled = (Deno.env.get("OLLAMA_ENABLED") ?? "false").toLowerCase();
    if (enabled === "true" || enabled === "1" || enabled === "yes") {
      return await invokeOllama(question);
    }
  } catch (error) {
    console.error("[askChatGPT] ollama fallback error", error);
  }
  return null;
}

async function invokeOllama(question: string): Promise<string | null> {
  const host = Deno.env.get("OLLAMA_HOST") ?? "http://127.0.0.1:11434";
  const model = Deno.env.get("OLLAMA_MODEL_AI") ?? "deepseek-r1-codex:8b";
  const url = `${host.replace(/\/$/, "")}/api/generate`;
  const startedAt = performance.now();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: question,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });
    if (!resp.ok) {
      console.error("[askChatGPT] ollama HTTP", resp.status);
      return null;
    }
    const data = await resp.json();
    const answer = sanitizeAnswer(data?.response ?? null);
    if (answer) {
      const duration = Math.round(performance.now() - startedAt);
      console.info(`[askChatGPT] ollama(${model}) answered in ${duration}ms`);
    }
    return answer ?? null;
  } finally {
    clearTimeout(id);
  }
}
