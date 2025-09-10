import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { mna, oops, ok, corsHeaders } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "plans");
  if (v) return v;

  // Handle CORS preflight requests
  const origin = req.headers.get('origin');
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    if (origin && !headers['access-control-allow-origin']) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { headers });
  }
  if (origin && !headers['access-control-allow-origin']) {
    return new Response(JSON.stringify({ ok: false, error: 'Origin not allowed' }), {
      status: 403,
      headers,
    });
  }
  
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }

  const supa = createClient("anon");

  const { data, error } = await supa
    .from("subscription_plans")
    .select("id,name,duration_months,price,currency,is_lifetime,features,created_at")
    .order("price", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, plans: data }),
    {
      headers: { ...headers, 'Content-Type': 'application/json' }
    }
  );
}

if (import.meta.main) serve(handler);

export default handler;
