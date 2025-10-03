import { registerHandler } from "../_shared/serve.ts";
import { corsHeaders, json, mna, oops } from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { requireAuthUser } from "../_shared/auth.ts";

const logger = createLogger({
  function: "select-from-table-with-auth-rls",
});

export const handler = registerHandler(async (req) => {
  const headers = corsHeaders(req, "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (req.method !== "POST") {
    return mna();
  }

  const auth = await requireAuthUser(req, { logger });
  if (!auth.ok) {
    return auth.response;
  }

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("users")
    .select("*");

  if (error) {
    logger.error("query failed", error);
    return oops("Failed to fetch users", error.message, req);
  }

  return json({ user, data }, 200, {}, req);
});

export default handler;
