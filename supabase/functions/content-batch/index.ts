import { createClient } from "../_shared/client.ts";
import { mna, ok, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "content-batch");
  if (v) return v;

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supa = createClient("anon");

    const { keys } = await req.json();

    if (!keys || !Array.isArray(keys)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing or invalid keys array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Fetching content for keys:", keys);

    const { data, error } = await supa
      .from("bot_content")
      .select("content_key, content_value")
      .in("content_key", keys)
      .eq("is_active", true);

    if (error) {
      console.error("Database error in content-batch:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${data?.length || 0} content items`);

    return new Response(
      JSON.stringify({ ok: true, contents: data || [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Error parsing request in content-batch:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

registerHandler(handler);
export default handler;
