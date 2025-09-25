import { optionalEnv } from "../../_shared/env.ts";

const SUPABASE_URL = optionalEnv("SUPABASE_URL");

export async function askChatGPT(prompt: string): Promise<string | null> {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/chatgpt-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => ({}));
    return data.answer ?? null;
  } catch {
    return null;
  }
}
