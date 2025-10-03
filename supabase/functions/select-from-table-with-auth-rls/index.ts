import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import { corsHeaders, json, mna, oops, unauth } from "../_shared/http.ts";

const logPrefix = "[select-from-table-with-auth-rls]";

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req, "POST,OPTIONS"),
    });
  }

  if (req.method !== "POST") {
    return mna();
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn(`${logPrefix} missing Authorization header`);
    return unauth("Missing Authorization header", req);
  }

  const supabaseClient = createClient("anon", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    console.warn(`${logPrefix} failed to resolve user`, userError);
    return unauth("Invalid or expired access token", req);
  }

  const { data, error } = await supabaseClient
    .from("users")
    .select("*");

  if (error) {
    console.error(`${logPrefix} query failed`, error);
    return oops("Failed to fetch users", error.message, req);
  }

  return json({ user, data }, 200, {}, req);
});

export default handler;
