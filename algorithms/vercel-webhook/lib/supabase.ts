import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedAlert } from "./validation.js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase credentials are not configured.");
  }

  cachedClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
}

export interface SupabaseAlertRecord {
  alert_uuid: string;
  symbol: string;
  exchange: string | null;
  triggered_at: string;
  price: number | null;
  action: string | null;
  comment: string | null;
  payload: NormalizedAlert["rawPayload"];
  ingested_at: string;
}

export function toSupabaseRecord(alert: NormalizedAlert): SupabaseAlertRecord {
  return {
    alert_uuid: alert.alertUuid,
    symbol: alert.symbol,
    exchange: alert.exchange,
    triggered_at: alert.triggeredAt,
    price: alert.price,
    action: alert.action,
    comment: alert.comment,
    payload: alert.rawPayload,
    ingested_at: new Date().toISOString(),
  };
}

export async function upsertAlert(
  client: SupabaseClient,
  tableName: string,
  record: SupabaseAlertRecord,
): Promise<void> {
  const { error } = await client.from(tableName).upsert(record, {
    onConflict: "alert_uuid",
  });

  if (error) {
    throw error;
  }
}
