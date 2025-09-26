import { supabase } from "./client";

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function logChatMessage(params: {
  telegramUserId?: string | number;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { telegramUserId, sessionId, role, content } = params;
  const { error } = await supabase.from("user_interactions").insert({
    interaction_type: "ai_chat",
    telegram_user_id: String(telegramUserId ?? "anonymous"),
    session_id: sessionId,
    page_context: "chat_widget",
    interaction_data: { role, content },
  });
  if (error) console.warn("Failed to log chat message", error);
}
