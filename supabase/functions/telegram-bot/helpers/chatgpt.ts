import { createClient, type SupabaseClient } from "../../_shared/client.ts";

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  // Lazily create the service client to avoid import-time crashes
  // in environments where the service key is not configured (e.g. tests).
  supabaseAdmin = createClient("service");
  return supabaseAdmin;
}

const FUNCTION_TIMEOUT_MS = 12_000;

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
  const client = getSupabaseAdmin();
  const result = await withTimeout(
    client.functions.invoke<AskResponse>("ai-faq-assistant", {
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
  const client = getSupabaseAdmin();
  const result = await withTimeout(
    client.functions.invoke<ProxyResponse>("chatgpt-proxy", {
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
    return null;
  }
}
