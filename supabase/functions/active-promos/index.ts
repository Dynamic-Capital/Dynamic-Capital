import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { mna, ok, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

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
    const supa = createClient("anon");

    const { data, error } = await supa
      .from("promotions")
      .select("code, description, discount_type, discount_value, valid_until")
      .eq("is_active", true)
      .gte("valid_until", new Date().toISOString())
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

serve(handler);
export default handler;
