import type { User } from "https://esm.sh/@supabase/supabase-js@2?dts";
import { createClient, type SupabaseClient } from "./client.ts";
import { unauth } from "./http.ts";

export interface RequireAuthOptions {
  logger?: {
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export type RequireAuthSuccess = {
  ok: true;
  user: User;
  supabase: SupabaseClient;
};

export type RequireAuthFailure = {
  ok: false;
  response: Response;
};

export type RequireAuthResult = RequireAuthSuccess | RequireAuthFailure;

export async function requireAuthUser(
  req: Request,
  options: RequireAuthOptions = {},
): Promise<RequireAuthResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    options.logger?.warn("missing Authorization header");
    return { ok: false, response: unauth("Missing Authorization header", req) };
  }

  const supabase = createClient("anon", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      options.logger?.warn("failed to resolve user", error);
      return {
        ok: false,
        response: unauth("Invalid or expired access token", req),
      };
    }

    if (!data.user) {
      options.logger?.warn("auth context missing user");
      return {
        ok: false,
        response: unauth("Invalid or expired access token", req),
      };
    }

    return { ok: true, user: data.user, supabase };
  } catch (err) {
    options.logger?.error("unexpected auth resolution failure", err);
    return {
      ok: false,
      response: unauth("Unable to resolve authenticated user", req),
    };
  }
}
