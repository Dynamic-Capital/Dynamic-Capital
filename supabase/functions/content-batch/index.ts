import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { mna, oops, ok } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "content-batch");
  if (v) return v;
  
  if (req.method !== "POST") {
    return mna();
  }

  const supa = createClient("anon");
  
  try {
    const { keys } = await req.json();
    
    if (!keys || !Array.isArray(keys)) {
      return oops("Missing or invalid keys array");
    }

    const { data, error } = await supa
      .from("bot_content")
      .select("content_key, content_value")
      .in("content_key", keys)
      .eq("is_active", true);

    if (error) {
      return oops(error.message);
    }

    return ok({ contents: data || [] });
  } catch (err) {
    return oops("Invalid request body");
  }
}

if (import.meta.main) serve(handler);