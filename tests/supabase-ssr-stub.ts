import { createClient } from "./supabase-client-stub.ts";

export function createBrowserClient(
  _url: string,
  _key: string,
  _opts?: Record<string, unknown>,
) {
  return createClient();
}
