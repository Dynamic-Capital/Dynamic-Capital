import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { mna, oops, ok } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "content-batch");
  if (v) return v;
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const supa = createClient("anon");
  
  try {
    const { keys } = await req.json();
    
    if (!keys || !Array.isArray(keys)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing or invalid keys array" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data, error } = await supa
      .from("bot_content")
      .select("content_key, content_value")
      .in("content_key", keys)
      .eq("is_active", true);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, contents: data || [] }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request body" }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

if (import.meta.main) serve(handler);