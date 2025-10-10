import { createClient } from "../_shared/client.ts";
import {
  createErrorReference,
  internalError,
  toSafeError,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabase = createClient("service");
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await supabase
      .from("webhook_updates")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (error) throw error;
    return new Response(
      JSON.stringify({ success: true, deleted: count ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const reference = createErrorReference();
    const safeError = toSafeError(error);
    console.error(
      `Failed to cleanup webhook updates [${reference}]`,
      safeError,
    );
    return internalError(error, {
      req,
      message: "Cleanup failed.",
      extra: { success: false },
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      reference,
      safeError,
    });
  }
});

export default handler;
