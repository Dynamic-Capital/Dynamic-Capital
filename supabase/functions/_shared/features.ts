import { createClient } from "./client.ts";
import { getFlag as getConfigFlag } from "./config.ts";

const FEATURE_TABLE = "features";

type FeatureRow = {
  key: string;
  enabled: boolean;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function isFeatureEnabled(
  key: string,
  fallback = false,
): Promise<boolean> {
  try {
    const supabase = createClient("service");
    const { data, error } = await supabase
      .from<FeatureRow>(FEATURE_TABLE)
      .select("enabled")
      .eq("key", key)
      .maybeSingle();
    if (!error && data) {
      return Boolean(data.enabled);
    }
  } catch (error) {
    console.error(`[features] failed to read feature "${key}":`, error);
  }
  try {
    return await getConfigFlag(key, fallback);
  } catch (error) {
    console.error(`[features] config fallback failed for "${key}":`, error);
    return fallback;
  }
}

export async function ensureFeatureRegistered(
  key: string,
  description: string,
  enabled = false,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = createClient("service");
    const { error } = await supabase
      .from(FEATURE_TABLE)
      .upsert(
        { key, description, enabled, metadata },
        { onConflict: "key" },
      );
    if (error) {
      console.error(`[features] upsert failed for "${key}":`, error);
    }
  } catch (error) {
    console.error(`[features] failed to register feature "${key}":`, error);
  }
}
