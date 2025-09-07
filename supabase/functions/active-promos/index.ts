import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { mna, oops, ok } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "active-promos");
  if (v) return v;
  
  if (req.method !== "GET") {
    return mna();
  }

  const supa = createClient("anon");

  const { data, error } = await supa
    .from("promotions")
    .select("code, description, discount_type, discount_value, valid_until")
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return oops(error.message);
  }

  return ok({ promotions: data || [] });
}

if (import.meta.main) serve(handler);