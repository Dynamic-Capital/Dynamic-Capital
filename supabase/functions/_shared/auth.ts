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

function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export async function requireAuthUser(
  req: Request,
  options: RequireAuthOptions = {},
): Promise<RequireAuthResult> {
  const rawAuthHeader = req.headers.get("Authorization");

  if (!rawAuthHeader) {
    options.logger?.warn("missing Authorization header");
    return { ok: false, response: unauth("Missing Authorization header", req) };
  }

  const token = extractBearerToken(rawAuthHeader);

  if (!token) {
    options.logger?.warn("invalid Authorization header format");
    return {
      ok: false,
      response: unauth("Invalid Authorization header", req),
    };
  }

  const normalizedHeader = `Bearer ${token}`;
  const supabase = createClient("anon", {
    global: { headers: { Authorization: normalizedHeader } },
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase.auth.getUser(token);

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
