import {
  createClient as baseCreateClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "../../../apps/web/integrations/supabase/client.ts";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type { SupabaseClient, SupabaseClientOptions };

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function createClient(
  role: "anon" | "service" = "anon",
  options?: SupabaseClientOptions<"public">,
): SupabaseClient {
  if (!options) {
    if (role === "anon") {
      if (!anonClient) anonClient = baseCreateClient(role);
      return anonClient;
    }
    if (!serviceClient) serviceClient = baseCreateClient(role);
    return serviceClient;
  }
  return baseCreateClient(role, options);
}

export function getServiceClient(): SupabaseClient {
  return createClient("service");
}

export function getAnonClient(): SupabaseClient {
  return createClient("anon");
}

export { createSupabaseClient };
