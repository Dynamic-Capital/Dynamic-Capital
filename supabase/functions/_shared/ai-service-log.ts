import type { SupabaseClient } from "./client.ts";

interface Logger {
  info?: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface AiServiceLogValues {
  user_id: string | null;
  session_id: string | null;
  service_name: string;
  status: "success" | "error";
  latency_ms: number;
  model: string | null;
  request_payload: Record<string, unknown>;
  response_payload?: Record<string, unknown> | null;
  error_message?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordAiServiceLog(
  supabase: SupabaseClient,
  logger: Logger,
  values: AiServiceLogValues,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("ai_service_logs")
      .insert(values)
      .select("id")
      .single();

    if (error) {
      logger.error("Failed to write AI service log", error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    logger.error("Unexpected error while writing AI service log", error);
    return null;
  }
}
