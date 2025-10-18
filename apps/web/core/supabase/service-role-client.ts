import { SUPABASE_URL } from "@/config/supabase-runtime";
import { getEnvVar } from "@/utils/env.ts";

export const SUPABASE_SERVICE_ROLE_CLIENT_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.supabase",
);

export interface SupabaseSelectBuilder<Row> {
  eq(column: string, value: unknown): SupabaseSelectBuilder<Row>;
  order(
    column: string,
    options: { ascending: boolean },
  ): SupabaseSelectBuilder<Row>;
  limit(count: number): Promise<{
    data: Row[] | null;
    error: unknown | null;
  }>;
}

export interface SupabaseUserInteractionsTable<Row, Insert> {
  insert(values: Insert): Promise<{ error: unknown | null }>;
  select(columns: string): SupabaseSelectBuilder<Row>;
}

export interface ServiceRoleSupabaseClient<Row, Insert> {
  from(table: string): SupabaseUserInteractionsTable<Row, Insert>;
}

let cachedClient: ServiceRoleSupabaseClient<unknown, unknown> | null = null;
let supabaseModulePromise:
  | Promise<{ createClient: (...args: unknown[]) => unknown }>
  | null = null;

const SUPABASE_SERVICE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY", [
  "SUPABASE_SERVICE_ROLE",
]);

async function loadSupabaseModule(): Promise<
  { createClient: (...args: unknown[]) => unknown }
> {
  if (!supabaseModulePromise) {
    supabaseModulePromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      return { createClient } as {
        createClient: (...args: unknown[]) => unknown;
      };
    })();
  }

  return supabaseModulePromise;
}

export async function getServiceRoleSupabaseClient<Row, Insert>(): Promise<
  ServiceRoleSupabaseClient<Row, Insert>
> {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    SUPABASE_SERVICE_ROLE_CLIENT_OVERRIDE_SYMBOL
  ];
  if (override) {
    return override as ServiceRoleSupabaseClient<Row, Insert>;
  }

  if (cachedClient) {
    return cachedClient as ServiceRoleSupabaseClient<Row, Insert>;
  }

  if (!SUPABASE_URL) {
    throw new Error("Supabase URL is not configured");
  }

  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase service role key is not configured");
  }

  const { createClient } = await loadSupabaseModule();
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  }) as unknown as ServiceRoleSupabaseClient<Row, Insert>;

  cachedClient = client as ServiceRoleSupabaseClient<unknown, unknown>;
  return client;
}

export function resetSupabaseServiceRoleClientCache() {
  cachedClient = null;
  supabaseModulePromise = null;
}
