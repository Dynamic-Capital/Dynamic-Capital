import { createClient } from "./client.ts";

const PLUGINS_TABLE = "plugins";

type PluginRow = {
  key: string;
  type: string;
  version: string;
  description?: string | null;
  enabled: boolean;
  metadata?: Record<string, unknown> | null;
};

export interface PluginRegistration {
  key: string;
  type: string;
  version: string;
  description?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export async function registerPlugin(
  registration: PluginRegistration,
): Promise<void> {
  try {
    const supabase = createClient("service");
    const { error } = await supabase
      .from(PLUGINS_TABLE)
      .upsert(
        {
          key: registration.key,
          type: registration.type,
          version: registration.version,
          description: registration.description,
          enabled: registration.enabled ?? false,
          metadata: registration.metadata ?? {},
        },
        { onConflict: "key" },
      );
    if (error) {
      console.error(`[plugins] Failed to register ${registration.key}:`, error);
    }
  } catch (error) {
    console.error(
      `[plugins] Unexpected error registering ${registration.key}:`,
      error,
    );
  }
}

export async function ensurePluginEnabled(key: string): Promise<void> {
  try {
    const supabase = createClient("service");
    const { error } = await supabase
      .from<PluginRow>(PLUGINS_TABLE)
      .update({ enabled: true })
      .eq("key", key);
    if (error) {
      console.error(`[plugins] Failed to enable ${key}:`, error);
    }
  } catch (error) {
    console.error(`[plugins] Unexpected error enabling ${key}:`, error);
  }
}
