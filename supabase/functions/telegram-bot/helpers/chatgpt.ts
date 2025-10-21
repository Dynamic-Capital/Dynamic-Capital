import { createClient } from "../../_shared/client.ts";

const supabaseAdmin = createClient("service");

interface AskResponse {
  answer?: string | null;
}

export async function askChatGPT(prompt: string): Promise<string | null> {
  const question = prompt.trim();
  if (!question) return null;

  try {
    const { data, error } = await supabaseAdmin.functions.invoke<AskResponse>(
      "ai-faq-assistant",
      {
        body: { question },
      },
    );

    if (error) {
      console.error("askChatGPT invoke error:", error);
      return null;
    }

    const answer = data?.answer ?? null;
    if (typeof answer === "string" && answer.trim().length > 0) {
      return answer;
    }

    return null;
  } catch (err) {
    console.error("askChatGPT unexpected error:", err);
    return null;
  }
}
