import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { bad, ok } from "../_shared/http.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return bad("Use POST");
  const { initData } = await req.json().catch(() => ({}));
  const passed = await verifyInitData(initData || "");
  return ok({ ok: passed });
}

serve(handler);
