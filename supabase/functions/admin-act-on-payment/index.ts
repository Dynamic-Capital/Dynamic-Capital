import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, createClientForRequest } from "../_shared/client.ts";
import { bad, json, mna, oops } from "../_shared/http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return mna();
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "unauthorized" }, 401, corsHeaders);
  }

  const supaAuth = createClientForRequest(req, {
    requireAuthorization: true,
    auth: { persistSession: false },
  });

  const { data: { user } } = await supaAuth.auth.getUser();
  if (!user) {
    return json({ error: "unauthorized" }, 401, corsHeaders);
  }

  // Check if user is admin
  const { data: profile } = await supaAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return json({ error: "admin_required" }, 403, corsHeaders);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  const supa = createClient();

  if (body.action === "approve") {
    const { error } = await supa
      .from("payments")
      .update({ status: "completed" })
      .eq("id", body.payment_id);

    if (error) return oops("Failed to approve payment");
  } else if (body.action === "reject") {
    const { error } = await supa
      .from("payments")
      .update({ status: "rejected" })
      .eq("id", body.payment_id);

    if (error) return oops("Failed to reject payment");
  }

  return json({ ok: true, success: true }, 200, corsHeaders);
}

serve(handler);
export default handler;
