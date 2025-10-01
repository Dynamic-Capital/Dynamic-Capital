"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import process from "node:process";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[miniapp] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars; realtime sync disabled.",
      );
    }
    return null;
  }

  cachedClient = createClient(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });

  return cachedClient;
}
