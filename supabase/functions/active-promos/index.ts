import { createClient, type SupabaseClient } from "../_shared/client.ts";
import { mna, ok, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "active-promos");
  if (v) return v;

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return mna();
  }

  try {
    const testClient = (globalThis as {
      __TEST_SUPABASE_CLIENT__?: SupabaseClient;
    }).__TEST_SUPABASE_CLIENT__;

    const supa = testClient ?? createClient("anon");

    const nowIso = new Date().toISOString();

    const { data, error } = await supa
      .from("promotions")
      .select("code, description, discount_type, discount_value, valid_until")
      .eq("is_active", true)
      .or(`(valid_until.is.null,valid_until.gte.${nowIso})`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error in active-promos:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${data?.length || 0} active promotions`);

    return new Response(
      JSON.stringify({ ok: true, promotions: data || [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error in active-promos:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

registerHandler(handler);
export default handler;
